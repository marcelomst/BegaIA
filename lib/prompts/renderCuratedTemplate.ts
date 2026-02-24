type TemplateData = Record<string, any>;

const EMPTY_EVENTS_FALLBACK = "No hay eventos para este período.";

function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
  let cur: any = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function renderEachBlock(template: string, data: TemplateData): string {
  let out = "";
  let idx = 0;
  while (true) {
    const start = template.indexOf("[[each:", idx);
    if (start === -1) {
      out += template.slice(idx);
      break;
    }
    out += template.slice(idx, start);
    const headerEnd = template.indexOf("->", start);
    if (headerEnd === -1) {
      out += template.slice(start);
      break;
    }
    const header = template.slice(start + "[[each:".length, headerEnd).trim();
    let pathRaw = header;
    let defaultRaw: string | undefined = undefined;
    const defaultMatch = header.match(/\|\s*default:\s*/i);
    if (defaultMatch && typeof defaultMatch.index === "number") {
      pathRaw = header.slice(0, defaultMatch.index);
      defaultRaw = header.slice(defaultMatch.index + defaultMatch[0].length);
    }
    const path = String(pathRaw || "").trim();
    let endIdx = headerEnd + 2;
    let closeAt = -1;
    while (true) {
      const candidate = template.indexOf("]]", endIdx);
      if (candidate === -1) break;
      const lineStart = template.lastIndexOf("\n", candidate - 1) + 1;
      const before = template.slice(lineStart, candidate);
      if (/^\s*$/.test(before)) {
        closeAt = candidate;
        break;
      }
      endIdx = candidate + 2;
    }
    if (closeAt === -1) {
      out += template.slice(start);
      break;
    }
    const block = template.slice(headerEnd + 2, closeAt);
    const items = getValueByPath(data, path);
    if (!Array.isArray(items) || items.length === 0) {
      const fallback = defaultRaw ? String(defaultRaw).trim() : EMPTY_EVENTS_FALLBACK;
      out += fallback;
    } else {
      out += items
        .map((item) =>
          block.replace(/\[\[\s*([^[\]|]+?)\s*\]\]/g, (_m, rawKey) => {
            const key = String(rawKey || "").trim();
            if (key.startsWith("item.")) {
              const value = getValueByPath(item, key.slice(5));
              return value == null ? "" : String(value);
            }
            const value = getValueByPath(item, key);
            return value == null ? "" : String(value);
          })
        )
        .join("");
    }
    idx = closeAt + 2;
  }
  return out;
}

function renderKeys(template: string, data: TemplateData): string {
  const keyRe = /\[\[key:\s*([^\]|]+?)\s*(?:\|\s*default:\s*([^\]]+?))?\s*\]\]/g;
  return template.replace(keyRe, (_match, rawPath, rawDefault) => {
    const path = String(rawPath || "").trim();
    const value = getValueByPath(data, path);
    if (value == null || value === "") {
      return rawDefault ? String(rawDefault).trim() : "";
    }
    return String(value);
  });
}

export function renderCuratedTemplate(body: string, data: TemplateData): string {
  if (!body) return "";
  const withEach = renderEachBlock(body, data);
  return renderKeys(withEach, data);
}
