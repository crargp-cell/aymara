import { prisma } from "@/lib/prisma";
import { buildAllStudentFeatures, toVector, FEATURE_KEYS, MIN_ATTEMPTS_PARA_PREDECIR, type StudentFeatures } from "@/lib/ml/features";

/**
 * Regresión logística entrenable (gradiente descendente) — sin dependencias.
 * Predice el RIESGO de bajo rendimiento por alumno (Negocio.md §27).
 *
 * Etiqueta de entrenamiento (supervisión débil, con finalidad educativa real):
 * un alumno es "bajo rendimiento" si su ratio de aprobación de exámenes < 0.5
 * y su ratio de lecciones completadas < 0.4. El modelo aprende a anticiparlo a
 * partir del resto de señales (precisión por dificultad, tiempo, reintentos,
 * tendencia) para poder marcar a tiempo a quien todavía no cayó.
 *
 * Los alumnos con menos de `MIN_ATTEMPTS_PARA_PREDECIR` respuestas quedan FUERA
 * del entrenamiento y se etiquetan `sin_datos`: sin actividad no hay evidencia
 * de riesgo, y meterlos como positivos sesgaría el modelo y llenaría el panel
 * del profesor de falsos avisos.
 */

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

type Params = { weights: number[]; bias: number; mean: number[]; std: number[]; keys: string[] };

function standardize(rows: number[][]): { z: number[][]; mean: number[]; std: number[] } {
  const n = rows.length;
  const d = rows[0]?.length ?? 0;
  const mean = Array(d).fill(0);
  const std = Array(d).fill(1);
  for (let j = 0; j < d; j++) {
    let m = 0;
    for (let i = 0; i < n; i++) m += rows[i][j];
    m /= n || 1;
    let v = 0;
    for (let i = 0; i < n; i++) v += (rows[i][j] - m) ** 2;
    v = Math.sqrt(v / (n || 1)) || 1;
    mean[j] = m;
    std[j] = v;
  }
  const z = rows.map((r) => r.map((x, j) => (x - mean[j]) / std[j]));
  return { z, mean, std };
}

function trainLogReg(X: number[][], y: number[], epochs = 400, lr = 0.1): { weights: number[]; bias: number } {
  const d = X[0]?.length ?? 0;
  const w = Array(d).fill(0);
  let b = 0;
  const n = X.length || 1;
  for (let e = 0; e < epochs; e++) {
    const gw = Array(d).fill(0);
    let gb = 0;
    for (let i = 0; i < X.length; i++) {
      const p = sigmoid(X[i].reduce((s, x, j) => s + x * w[j], b));
      const err = p - y[i];
      for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
      gb += err;
    }
    for (let j = 0; j < d; j++) w[j] -= (lr * gw[j]) / n;
    b -= (lr * gb) / n;
  }
  return { weights: w, bias: b };
}

function labelLowPerformance(f: StudentFeatures): number {
  return f.examPassRatio < 0.5 && f.lessonsRatio < 0.4 ? 1 : 0;
}

function predictProb(params: Params, f: StudentFeatures): number {
  const v = toVector(f).map((x, j) => (x - params.mean[j]) / params.std[j]);
  return sigmoid(v.reduce((s, x, j) => s + x * params.weights[j], params.bias));
}

export type TrainResult = { version: string; nMuestras: number; nSinDatos: number; accuracy: number; positivos: number };

export async function trainRiskModel(): Promise<TrainResult> {
  const todos = await buildAllStudentFeatures();
  const conDatos = todos.filter((f) => f.totalAttempts >= MIN_ATTEMPTS_PARA_PREDECIR);
  const sinDatos = todos.filter((f) => f.totalAttempts < MIN_ATTEMPTS_PARA_PREDECIR);
  const version = `v${Date.now()}`;

  if (conDatos.length < 4) {
    // Muy pocos alumnos con actividad: modelo trivial basado en la etiqueta.
    const params: Params = { weights: Array(FEATURE_KEYS.length).fill(0), bias: 0, mean: Array(FEATURE_KEYS.length).fill(0), std: Array(FEATURE_KEYS.length).fill(1), keys: FEATURE_KEYS as string[] };
    await persist(version, params, conDatos, sinDatos, (f) => labelLowPerformance(f), 0);
    return { version, nMuestras: conDatos.length, nSinDatos: sinDatos.length, accuracy: 0, positivos: conDatos.filter((f) => labelLowPerformance(f) === 1).length };
  }

  const y = conDatos.map(labelLowPerformance);
  const { z, mean, std } = standardize(conDatos.map(toVector));
  const { weights, bias } = trainLogReg(z, y);
  const params: Params = { weights, bias, mean, std, keys: FEATURE_KEYS as string[] };

  // Exactitud in-sample (indicativa).
  let correct = 0;
  conDatos.forEach((f, i) => {
    if ((predictProb(params, f) >= 0.5 ? 1 : 0) === y[i]) correct++;
  });
  const accuracy = Math.round((correct / conDatos.length) * 1000) / 1000;

  await persist(version, params, conDatos, sinDatos, (f) => predictProb(params, f), accuracy);

  return { version, nMuestras: conDatos.length, nSinDatos: sinDatos.length, accuracy, positivos: y.filter((v) => v === 1).length };
}

async function persist(
  version: string,
  params: Params,
  conDatos: StudentFeatures[],
  sinDatos: StudentFeatures[],
  score: (f: StudentFeatures) => number,
  accuracy: number,
) {
  await prisma.mlModelo.updateMany({ data: { activo: false } });
  await prisma.mlModelo.create({
    data: {
      version,
      tipo: "logistic_regression_risk",
      params: params as unknown as object,
      metricas: { accuracy, sin_datos: sinDatos.length, min_intentos: MIN_ATTEMPTS_PARA_PREDECIR },
      n_muestras: conDatos.length,
      activo: true,
    },
  });

  // Alumnos sin actividad suficiente: se registran como `sin_datos`, no como riesgo.
  for (const f of sinDatos) {
    await prisma.prediccionAlumno.upsert({
      where: { alumno_id_tipo_modelo_version: { alumno_id: f.alumnoId, tipo: "riesgo_bajo_rendimiento", modelo_version: version } },
      create: { alumno_id: f.alumnoId, paralelo_id: f.paraleloId, tipo: "riesgo_bajo_rendimiento", valor: 0, etiqueta: "sin_datos", confianza: 0, features: f as unknown as object, modelo_version: version },
      update: { valor: 0, etiqueta: "sin_datos", confianza: 0, paralelo_id: f.paraleloId, calculado_at: new Date() },
    });
  }

  for (const f of conDatos) {
    const risk = Math.max(0, Math.min(1, score(f)));
    const buckets: { key: "accDificil" | "accMedio" | "accFacil"; label: "dificil" | "medio" | "facil" }[] = [
      { key: "accDificil", label: "dificil" },
      { key: "accMedio", label: "medio" },
      { key: "accFacil", label: "facil" },
    ];
    const worstBucket = [...buckets].sort((a, b) => f[a.key] - f[b.key])[0];
    const worst = worstBucket.key;
    const refuerzo = worstBucket.label;

    await Promise.all([
      prisma.prediccionAlumno.upsert({
        where: { alumno_id_tipo_modelo_version: { alumno_id: f.alumnoId, tipo: "riesgo_bajo_rendimiento", modelo_version: version } },
        create: { alumno_id: f.alumnoId, paralelo_id: f.paraleloId, tipo: "riesgo_bajo_rendimiento", valor: risk, etiqueta: risk >= 0.6 ? "alto" : risk >= 0.35 ? "medio" : "bajo", confianza: accuracy, features: f as unknown as object, modelo_version: version },
        update: { valor: risk, etiqueta: risk >= 0.6 ? "alto" : risk >= 0.35 ? "medio" : "bajo", confianza: accuracy, paralelo_id: f.paraleloId, features: f as unknown as object, calculado_at: new Date() },
      }),
      prisma.prediccionAlumno.upsert({
        where: { alumno_id_tipo_modelo_version: { alumno_id: f.alumnoId, tipo: "tendencia", modelo_version: version } },
        create: { alumno_id: f.alumnoId, paralelo_id: f.paraleloId, tipo: "tendencia", valor: f.trend, etiqueta: f.trend > 0.05 ? "positiva" : f.trend < -0.05 ? "negativa" : "estable", modelo_version: version },
        update: { valor: f.trend, etiqueta: f.trend > 0.05 ? "positiva" : f.trend < -0.05 ? "negativa" : "estable", paralelo_id: f.paraleloId, calculado_at: new Date() },
      }),
      prisma.prediccionAlumno.upsert({
        where: { alumno_id_tipo_modelo_version: { alumno_id: f.alumnoId, tipo: "refuerzo_sugerido", modelo_version: version } },
        create: { alumno_id: f.alumnoId, paralelo_id: f.paraleloId, tipo: "refuerzo_sugerido", valor: 1 - f[worst], etiqueta: refuerzo, modelo_version: version },
        update: { valor: 1 - f[worst], etiqueta: refuerzo, paralelo_id: f.paraleloId, calculado_at: new Date() },
      }),
    ]);
  }
}

/** Predicciones vigentes (del modelo activo) para un conjunto de paralelos. */
export async function getPredicciones(paraleloIds: number[]) {
  const model = await prisma.mlModelo.findFirst({ where: { activo: true }, orderBy: { entrenado_at: "desc" } });
  if (!model) return [];
  return prisma.prediccionAlumno.findMany({
    where: { modelo_version: model.version, ...(paraleloIds.length ? { paralelo_id: { in: paraleloIds } } : {}) },
    include: { alumno: { select: { nombre: true, apellido: true, username: true } } },
    orderBy: [{ tipo: "asc" }, { valor: "desc" }],
  });
}
