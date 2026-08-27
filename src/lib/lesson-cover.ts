const COVER_COUNT = 4;

export function lessonCoverUrl(orden: number) {
  const n = ((Math.max(1, orden) - 1) % COVER_COUNT) + 1;
  return `/covers/${n}.jpg`;
}
