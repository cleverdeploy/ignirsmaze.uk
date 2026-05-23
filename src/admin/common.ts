export function escAdmin(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function ADMIN_NAV(active: string): string {
  const items: [string, string, string][] = [
    ["overview", "/", "Overview"],
    ["apps", "/apps", "Apps"],
    ["experiments", "/experiments", "Experiments"],
    ["json", "/api/summary.json", "JSON"],
  ];
  return `<nav>${items
    .map(
      ([k, href, label]) =>
        `<a href="${href}" class="${k === active ? "active" : ""}">${label}</a>`
    )
    .join("")}</nav>`;
}

export const ADMIN_STYLES = `
<style>
  body.admin {
    background: #0d0a08; color: #e8d8be; font-family: ui-monospace,"SF Mono",Menlo,monospace;
    margin: 0; padding: 2rem; min-height: 100vh; overflow: auto !important; display:block !important;
  }
  body.admin::before, body.admin::after { display:none !important; }
  body.admin h1 { font-family: "Cormorant Garamond","EB Garamond",Georgia,serif; font-weight: 400; font-size: 1.8rem; letter-spacing: 0.02em; margin: 0 0 0.4rem; color: #f3e2c4; }
  body.admin h2 { font-family: ui-monospace,monospace; font-weight:500; font-size: 0.7rem; letter-spacing: 0.32em; text-transform: uppercase; color: #a89074; margin: 1.5rem 0 0.8rem; }
  body.admin h3 { font-family: "Cormorant Garamond",serif; font-weight: 400; font-size: 1.3rem; color: #f3e2c4; margin: 0 0 0.2rem; }
  body.admin .muted { color: #6c5a45; }
  body.admin .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
  body.admin .card { background: #15110d; border: 1px solid #2a2118; border-radius: 6px; padding: 1.2rem 1.4rem; margin-bottom: 1rem; }
  body.admin .stat-num { font-family: "Cormorant Garamond",serif; font-size: 2.4rem; font-weight: 400; color: #f3e2c4; line-height: 1; }
  body.admin .stat-label { font-size: 0.68rem; letter-spacing: 0.28em; text-transform: uppercase; color: #6c5a45; margin-top: 0.4rem; }
  body.admin a { color: #f4a261; text-decoration: none; }
  body.admin a:hover { text-decoration: underline; }
  body.admin table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  body.admin th { text-align: left; font-weight: 500; color: #a89074; font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; padding: 0.4rem 0.6rem; border-bottom: 1px solid #2a2118; }
  body.admin td { padding: 0.5rem 0.6rem; border-bottom: 1px solid #1c1610; }
  body.admin .bars { display: flex; flex-direction: column; gap: 0.4rem; }
  body.admin .bar-row { display: grid; grid-template-columns: 10rem 1fr 4rem; gap: 0.7rem; align-items: center; font-size: 0.85rem; }
  body.admin .bar-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #d9c9b4; }
  body.admin .bar-track { height: 6px; background: #1c1610; border-radius: 3px; overflow: hidden; }
  body.admin .bar-fill { display: block; height: 100%; }
  body.admin .bar-value { text-align: right; color: #f3e2c4; font-variant-numeric: tabular-nums; }
  body.admin nav { margin-bottom: 1.5rem; display: flex; gap: 1.4rem; font-size: 0.7rem; letter-spacing: 0.28em; text-transform: uppercase; }
  body.admin nav a { color: #a89074; }
  body.admin nav a.active { color: #f4a261; }
  body.admin .exp-head { display: flex; justify-content: space-between; align-items: flex-start; }
  body.admin .exp-notes { color: #a89074; font-style: italic; margin: 0.6rem 0 0.8rem; }
  body.admin .exp-variants { margin-top: 0.6rem; }
  body.admin .btn-small {
    background: transparent; border: 1px solid #6c5a45; color: #d9c9b4;
    padding: 0.3rem 0.8rem; font-family: ui-monospace, monospace; font-size: 0.65rem;
    letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer; border-radius: 4px;
  }
  body.admin .btn-small:hover { border-color: #f4a261; color: #f4a261; }
  body.admin .exp-create label { display: block; margin-bottom: 0.7rem; font-size: 0.7rem; letter-spacing: 0.25em; text-transform: uppercase; color: #a89074; }
  body.admin .exp-create input, body.admin .exp-create select {
    display: block; width: 100%; margin-top: 0.3rem; padding: 0.5rem 0.7rem;
    background: #0a0805; border: 1px solid #2a2118; color: #f3e2c4; border-radius: 4px;
    font-family: ui-monospace, monospace; font-size: 0.85rem; letter-spacing: normal; text-transform: none;
  }
  body.admin .exp-create button {
    background: transparent; border: 1px solid #6c5a45; color: #d9c9b4;
    padding: 0.6rem 1.6rem; font-family: ui-monospace, monospace; font-size: 0.72rem;
    letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer; border-radius: 4px;
    margin-top: 0.5rem;
  }
  body.admin .exp-create button:hover { border-color: #f4a261; color: #f4a261; }
  body.admin .apps-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
  body.admin .app-card a { display: block; padding: 1.2rem 1.4rem; background: #15110d; border: 1px solid #2a2118; border-radius: 6px; }
  body.admin .app-card a:hover { border-color: #f4a261; text-decoration: none; }
  body.admin .app-card h3 { margin-bottom: 0.6rem; }
  body.admin .app-card .meta { font-size: 0.72rem; color: #6c5a45; letter-spacing: 0.2em; text-transform: uppercase; }
</style>
`;
