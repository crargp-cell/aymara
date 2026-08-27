export function checkText(rawAnswer: string, correctAnswer: string | null): boolean {
  const user = rawAnswer.trim().toLowerCase();
  const correct = (correctAnswer ?? "").trim().toLowerCase();
  return user === correct;
}

// Posicional (por índice de fila), no por texto de spanish_word: varias filas pueden compartir
// el mismo spanish_word (p.ej. "simple"/"aspirada"/"eyectiva" como categoría, no traducción
// única) — usar el texto como clave de estado colisiona y hace el ejercicio imposible de acertar.
export function checkMatching(rawAnswer: string, pairs: { aymara_word: string }[]): boolean {
  try {
    const userArr = JSON.parse(rawAnswer) as string[];
    if (pairs.length === 0) return false;
    return userArr.length === pairs.length && pairs.every((p, i) => userArr[i] === p.aymara_word);
  } catch {
    return false;
  }
}

export function checkFillInTheBlank(rawAnswer: string, validAnswers: string[]): boolean {
  try {
    const userArr = JSON.parse(rawAnswer) as string[];
    const expected = validAnswers.map((a) => a.trim().toLowerCase());
    return userArr.some((u) => expected.includes(u.trim().toLowerCase()));
  } catch {
    return false;
  }
}
