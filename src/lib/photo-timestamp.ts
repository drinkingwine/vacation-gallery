export function parsePhotoTimestamp(value: string | undefined | null): number | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();
  const exifMatch = trimmed.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (exifMatch) {
    const [, year, month, day, hour, minute, second] = exifMatch;
    const parsed = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    if (Number.isFinite(parsed)) return parsed;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toDatetimeLocalValue(value?: string | null): string {
  if (!value?.trim()) return "";

  const parsed = parsePhotoTimestamp(value);
  if (parsed === null) return "";

  const date = new Date(parsed);
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return parsed.toISOString();
}
