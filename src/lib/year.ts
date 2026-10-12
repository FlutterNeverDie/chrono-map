/** 연도 표시. 기원전은 음수로 저장한다. */
export function formatYear(year: number, approximate = false): string {
  const prefix = approximate ? "약 " : "";
  if (year < 0) return `${prefix}기원전 ${Math.abs(year)}년`;
  return `${prefix}${year}년`;
}

export function formatYearRange(start: number, end?: number | null): string {
  if (end == null || end === start) return formatYear(start);
  return `${formatYear(start)} – ${formatYear(end)}`;
}
