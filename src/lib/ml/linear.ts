import { prisma } from "@/lib/prisma";
import { buildAllStudentFeatures, toVector, FEATURE_KEYS, MIN_ATTEMPTS_PARA_PREDECIR, type StudentFeatures } from "@/lib/ml/features";

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

function trainLinear(X: number[][], y: number[], epochs = 500, lr = 0.05): { weights: number[]; bias: number } {
  const d = X[0]?.length ?? 0;
  const w = Array(d).fill(0);
  let b = 0;
  const n = X.length || 1;
  for (let e = 0; e < epochs; e++) {
    const gw = Array(d).fill(0);
    let gb = 0;
    for (let i = 0; i < X.length; i++) {
      const pred = X[i].reduce((s, x, j) => s + x * w[j], b);
      const err = pred - y[i];
      for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
      gb += err;
    }
    for (let j = 0; j < d; j++) w[j] -= (lr * gw[j]) / n;
    b -= (lr * gb) / n;
  }
  return { weights: w, bias: b };
}

function scoreFromFeatures(f: StudentFeatures): number {
  return Math.max(0, Math.min(1, f.accuracy * 0.5 + f.lessonsRatio * 0.3 + f.examPassRatio * 0.2));
}

function predictLinear(params: Params, f: StudentFeatures): number {
  const v = toVector(f).map((x, j) => (x - params.mean[j]) / params.std[j]);
  const raw = v.reduce((s, x, j) => s + x * params.weights[j], params.bias);
  return Math.max(0, Math.min(1, raw));
}

export type TrainLinearResult = { version: string; nMuestras: number; nSinDatos: number; mse: number; rmse: number; r2: number };

export async function trainScoreModel(): Promise<TrainLinearResult> {
  const todos = await buildAllStudentFeatures();
  const conDatos = todos.filter((f) => f.totalAttempts >= MIN_ATTEMPTS_PARA_PREDECIR);
  const sinDatos = todos.filter((f) => f.totalAttempts < MIN_ATTEMPTS_PARA_PREDECIR);
  const version = `v${Date.now()}`;

  if (conDatos.length < 4) {
    const params: Params = { weights: Array(FEATURE_KEYS.length).fill(0), bias: 0.5, mean: Array(FEATURE_KEYS.length).fill(0), std: Array(FEATURE_KEYS.length).fill(1), keys: FEATURE_KEYS as string[] };
    await persist(version, params, conDatos, sinDatos, 0, 0, 0);
    return { version, nMuestras: conDatos.length, nSinDatos: sinDatos.length, mse: 0, rmse: 0, r2: 0 };
  }

  const y = conDatos.map(scoreFromFeatures);
  const { z, mean, std } = standardize(conDatos.map(toVector));
  const { weights, bias } = trainLinear(z, y);
  const params: Params = { weights, bias, mean, std, keys: FEATURE_KEYS as string[] };

  let sse = 0;
  let sst = 0;
  const yMean = y.reduce((a, b) => a + b, 0) / y.length;
  conDatos.forEach((f, i) => {
    const p = Math.max(0, Math.min(1, z[i].reduce((s, x, j) => s + x * weights[j], bias)));
    sse += (y[i] - p) ** 2;
    sst += (y[i] - yMean) ** 2;
  });
  const mse = sse / conDatos.length;
  const rmse = Math.sqrt(mse);
  const r2 = sst === 0 ? 0 : 1 - sse / sst;

  await persist(version, params, conDatos, sinDatos, mse, rmse, r2);
  return { version, nMuestras: conDatos.length, nSinDatos: sinDatos.length, mse: Math.round(mse * 1000) / 1000, rmse: Math.round(rmse * 1000) / 1000, r2: Math.round(r2 * 1000) / 1000 };
}

async function persist(version: string, params: Params, conDatos: StudentFeatures[], sinDatos: StudentFeatures[], mse: number, rmse: number, r2: number) {
  await prisma.mlModelo.updateMany({ where: { tipo: "linear_regression_score" }, data: { activo: false } });
  await prisma.mlModelo.create({
    data: {
      version,
      tipo: "linear_regression_score",
      params: params as unknown as object,
      metricas: { mse, rmse, r2, sin_datos: sinDatos.length, min_intentos: MIN_ATTEMPTS_PARA_PREDECIR },
      n_muestras: conDatos.length,
      activo: true,
    },
  });

  for (const f of sinDatos) {
    await prisma.prediccionAlumno.upsert({
      where: { alumno_id_tipo_modelo_version: { alumno_id: f.alumnoId, tipo: "score_predicho", modelo_version: version } },
      create: { alumno_id: f.alumnoId, paralelo_id: f.paraleloId, tipo: "score_predicho", valor: 0, etiqueta: "sin_datos", confianza: 0, features: f as unknown as object, modelo_version: version },
      update: { valor: 0, etiqueta: "sin_datos", confianza: 0, paralelo_id: f.paraleloId, calculado_at: new Date() },
    });
  }

  for (const f of conDatos) {
    const pred = predictLinear(params, f);
    const nota = Math.round(pred * 100);
    const etiqueta = nota >= 70 ? "aprobado" : nota >= 50 ? "en_riesgo" : "reprobado";
    await prisma.prediccionAlumno.upsert({
      where: { alumno_id_tipo_modelo_version: { alumno_id: f.alumnoId, tipo: "score_predicho", modelo_version: version } },
      create: { alumno_id: f.alumnoId, paralelo_id: f.paraleloId, tipo: "score_predicho", valor: pred, etiqueta, confianza: r2, features: f as unknown as object, modelo_version: version },
      update: { valor: pred, etiqueta, confianza: r2, paralelo_id: f.paraleloId, features: f as unknown as object, calculado_at: new Date() },
    });
  }
}

export async function getScorePredicciones(paraleloIds: number[]) {
  const model = await prisma.mlModelo.findFirst({ where: { tipo: "linear_regression_score", activo: true }, orderBy: { entrenado_at: "desc" } });
  if (!model) return [];
  return prisma.prediccionAlumno.findMany({
    where: { modelo_version: model.version, tipo: "score_predicho", ...(paraleloIds.length ? { paralelo_id: { in: paraleloIds } } : {}) },
    include: { alumno: { select: { nombre: true, apellido: true, username: true } } },
    orderBy: { valor: "asc" },
  });
}
