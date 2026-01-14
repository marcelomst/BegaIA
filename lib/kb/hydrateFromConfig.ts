// Hydrate template text using hotel_config-like data.
// Supports [[key: path | default: ...]], [[path]], [[each: arr -> ...]], and [[join: arr -> ...]].
export function hydrateTextFromConfig(text: string, cfg: any): string {
  if (!text) return text;
  let out = expandIterators(text, cfg);
  out = replaceTokenSyntax(out, cfg).out;
  return out;
}

function getIn(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = (cur as any)[p];
    else return undefined;
  }
  return cur;
}

function replaceTokenSyntax(text: string, cfg: any): { out: string; used: Record<string, any> } {
  const used: Record<string, any> = {};
  if (!text) return { out: text, used };
  const re = /\[\[([^\]]+)\]\]/g;
  const out = text.replace(re, (m, inner) => {
    const innerTrim = String(inner).trim();
    if (innerTrim.toLowerCase().startsWith("each:") || innerTrim.toLowerCase().startsWith("join:")) {
      return m;
    }
    const parts = String(inner).split("|").map((s: string) => s.trim());
    let keyPath = "";
    let def: string | undefined;
    for (const p of parts) {
      const km = p.match(/^key\s*:\s*(.+)$/i);
      if (km) { keyPath = km[1].trim(); continue; }
      const dm = p.match(/^default\s*:\s*(.+)$/i);
      if (dm) { def = dm[1].trim(); continue; }
    }
    if (!keyPath && parts.length === 1) keyPath = parts[0];
    const val = keyPath ? getIn(cfg, keyPath) : undefined;
    if (val == null || val === "") return def != null ? String(def) : m;
    used[keyPath] = val;
    return String(val);
  });
  return { out, used };
}

function expandIterators(text: string, rootCfg: any): string {
  if (!text) return text;
  let out = parseEachTokens(text, rootCfg);
  out = expandJoins(out, rootCfg);
  return out;
}

function parseEachTokens(text: string, rootCfg: any): string {
  let result = text;
  let changed = true;
  while (changed) {
    changed = false;
    const eachStart = result.indexOf("[[each:");
    if (eachStart === -1) break;
    const arrowIndex = result.indexOf("->", eachStart);
    if (arrowIndex === -1) break;
    const pathAndOptions = result.substring(eachStart + 7, arrowIndex).trim();
    let bracketCount = 1;
    let endIndex = arrowIndex + 2;
    while (endIndex < result.length && bracketCount > 0) {
      if (result.substring(endIndex, endIndex + 2) === "[[") {
        bracketCount++;
        endIndex += 2;
      } else if (result.substring(endIndex, endIndex + 2) === "]]") {
        bracketCount--;
        endIndex += 2;
      } else {
        endIndex++;
      }
    }
    if (bracketCount > 0) break;
    const template = result.substring(arrowIndex + 2, endIndex - 2);
    const fullMatch = result.substring(eachStart, endIndex);
    const { path, options } = parsePathAndOptions(pathAndOptions);
    const arr = getIn(rootCfg, path);
    const defaultBlock = options.default || "";
    let replacement = "";
    if (!Array.isArray(arr) || arr.length === 0) {
      replacement = defaultBlock;
    } else {
      const rendered = arr.map((item: any) => {
        let itemOutput = template;
        // Permitir each anidados dentro de each (ej. rooms -> highlights/images)
        itemOutput = parseEachTokens(itemOutput, item);
        itemOutput = expandJoins(itemOutput, item);
        const tokenRe = /\[\[([^\]]+)\]\]/g;
        itemOutput = itemOutput.replace(tokenRe, (tokenMatch: string, inner: string) => {
          const segments = inner.split("|").map((s: string) => s.trim());
          let fieldPath = "";
          let fieldDefault: string | undefined;
          if (!segments.some(s => s.includes(":"))) {
            fieldPath = segments[0];
            fieldDefault = segments[1];
          } else {
            for (const segment of segments) {
              const keyMatch = segment.match(/^key\s*:\s*(.+)$/i);
              if (keyMatch) { fieldPath = keyMatch[1].trim(); continue; }
              const defaultMatch = segment.match(/^default\s*:\s*(.+)$/i);
              if (defaultMatch) { fieldDefault = defaultMatch[1].trim(); continue; }
              if (!segment.includes(":") && !fieldPath) fieldPath = segment;
            }
          }
          if (!fieldPath) return tokenMatch;
          if (fieldPath === "item") {
            return item == null ? (fieldDefault != null ? fieldDefault : tokenMatch) : String(item);
          }
          const value = getIn(item, fieldPath);
          if (value == null || value === "") {
            return fieldDefault != null ? fieldDefault : tokenMatch;
          }
          return String(value);
        });
        return itemOutput;
      });
      replacement = rendered.join("\n");
    }
    if (fullMatch !== replacement) {
      result = result.replace(fullMatch, replacement);
      changed = true;
    }
  }
  return result;
}

function expandJoins(text: string, rootCfg: any): string {
  if (!text) return text;
  const joinRe = /\[\[join:\s*([^\]\s]+)\s*([^\]]*?)\s*->\s*([\s\S]*?)\]\]/g;
  return text.replace(joinRe, (_full, pathRaw, optsRaw, template) => {
    const { path, options } = parsePathAndOptions((pathRaw + " " + (optsRaw || "")).trim());
    const arr = getIn(rootCfg, path);
    const sep = options.sep ?? ", ";
    const defaultText = options.default ?? "";
    if (!Array.isArray(arr) || arr.length === 0) return defaultText;
    const rendered = arr.map((item: any) => {
      let itemOutput = template;
      itemOutput = itemOutput.replace(/\[\[item\]\]/g, String(item));
      return itemOutput;
    });
    return rendered.join(sep);
  });
}

function parsePathAndOptions(raw: string): { path: string; options: Record<string, string> } {
  const parts = raw.split("|").map((s: string) => s.trim()).filter(Boolean);
  const path = (parts[0] || "").replace(/^each:\s*/i, "").replace(/^join:\s*/i, "").trim();
  const options: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const m = part.match(/^([a-z0-9_-]+)\s*:\s*(.+)$/i);
    if (m) options[m[1]] = m[2];
  }
  return { path, options };
}
