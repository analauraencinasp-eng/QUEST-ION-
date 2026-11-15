// content.js — every text and number of the game lives in data/content/*.json.
// BootScene loads the files listed in data/manifest.json and fills this object;
// scenes read it with `content.<file>` (e.g. content.stations) or `t('ui.key')`.
export const content = {};

export function setContent(name, data) { content[name] = data; }

// t('title.start') → content.ui.title.start ; {placeholders} are replaced from vars
export function t(path, vars) {
  const parts = path.split('.');
  let cur = content.ui;
  for (const p of parts) { cur = cur ? cur[p] : undefined; }
  if (cur === undefined) return path;
  return vars ? fill(String(cur), vars) : cur;
}

export function fill(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (all, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : all));
}

// the list of sources used by any loaded content (for the SOURCES screen)
export function allSources() {
  return content.sources ? content.sources.sources || [] : [];
}
