// Tiny SVG chart helpers — no external library.

export function sparkline(
  values: number[],
  opts: { width?: number; height?: number; color?: string; fill?: string } = {}
): string {
  const w = opts.width ?? 320;
  const h = opts.height ?? 60;
  const color = opts.color ?? "#f4a261";
  const fill = opts.fill ?? "rgba(244,162,97,0.12)";
  if (values.length === 0) {
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"></svg>`;
  }
  const max = Math.max(...values, 1);
  const min = 0;
  const xs = (i: number) => (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w);
  const ys = (v: number) => h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
  const pts = values.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`);
  const linePath = `M ${pts.join(" L ")}`;
  const areaPath = `M ${xs(0).toFixed(1)},${h} L ${pts.join(" L ")} L ${xs(values.length - 1).toFixed(1)},${h} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <path d="${areaPath}" fill="${fill}" stroke="none"/>
    <path d="${linePath}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;
}

export function bars(
  rows: { label: string; value: number }[],
  opts: { maxLabel?: number; color?: string } = {}
): string {
  if (rows.length === 0) return `<p class="muted">no data</p>`;
  const maxLabel = opts.maxLabel ?? 32;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const color = opts.color ?? "#f4a261";
  return `<div class="bars">
    ${rows
      .map((r) => {
        const label = r.label.length > maxLabel ? r.label.slice(0, maxLabel - 1) + "…" : r.label;
        const pct = (r.value / max) * 100;
        return `<div class="bar-row">
          <span class="bar-label">${escapeHtml(label)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></span></span>
          <span class="bar-value">${r.value.toLocaleString()}</span>
        </div>`;
      })
      .join("")}
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
