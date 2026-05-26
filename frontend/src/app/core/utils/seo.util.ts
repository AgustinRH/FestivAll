/** Meta description recomendada: 140–160 caracteres (Google suele truncar ~155). */
const META_DESC_MIN = 140;
const META_DESC_MAX = 160;

export function clampMetaDescription(
  text: string,
  minLen = META_DESC_MIN,
  maxLen = META_DESC_MAX,
): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  if (normalized.length <= maxLen) {
    return normalized;
  }

  const cut = normalized.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const trimmed =
    lastSpace >= minLen ? cut.slice(0, lastSpace) : cut.slice(0, maxLen - 3);
  return `${trimmed.trimEnd()}…`;
}

export function padMetaDescription(text: string, suffix: string): string {
  const base = text.replace(/\s+/g, ' ').trim();
  if (base.length >= META_DESC_MIN) {
    return clampMetaDescription(base);
  }
  return clampMetaDescription(`${base}${suffix}`);
}
