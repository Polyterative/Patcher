export function normalizeUrlPath(url: string): string {
  const path = url.split(/[?#]/, 1)[0].toLowerCase();
  return path || '/';
}
