export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function html(
  strings: TemplateStringsArray,
  ...values: any[]
): string {
  let out = "";
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (v == null || v === false) {
        // skip
      } else if (Array.isArray(v)) {
        out += v.join("");
      } else if (typeof v === "object" && (v as any).__raw) {
        out += (v as any).__raw;
      } else {
        out += escapeHtml(String(v));
      }
    }
  }
  return out;
}

export function raw(s: string): { __raw: string } {
  return { __raw: s };
}

export function layout(
  title: string,
  bodyHtml: string,
  opts: { extraHead?: string; bodyClass?: string; clientBase?: boolean } = {}
): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/styles.css">
${opts.extraHead ?? ""}
</head>
<body${opts.bodyClass ? ` class="${escapeHtml(opts.bodyClass)}"` : ""}>
${bodyHtml}
${opts.clientBase ? '<script src="/client-base.js"></script>' : ""}
</body>
</html>`;
}
