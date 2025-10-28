#!/usr/bin/env node
/**
 * Validador de documentos de conocimiento.
 * - Busca en knowledge_docs/ líneas que contengan '?' (pendientes sin confirmar)
 * - Reporta archivos afectados, número de líneas y muestra contexto
 * - Exit code: 0 (sin pendientes), 1 (pendientes encontrados) salvo que --no-fail
 *
 * Uso:
 *   node scripts/validate-knowledge.cjs [--strict] [--no-fail] [--pattern "glob"]
 *
 * Opciones:
 *   --strict    Considera también TODO|FIXME|TBD como pendientes
 *   --no-fail   No finaliza con código 1 si hay pendientes
 *   --pattern   Glob relativa a knowledge_docs/ para filtrar archivos
 */

const fs = require('fs');
const path = require('path');

let micromatch = null;
try { micromatch = require('micromatch'); } catch (_) {}

const root = process.cwd();
const docsDir = path.join(root, 'knowledge_docs');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const noFail = args.includes('--no-fail');
const includeTemplates = args.includes('--include-templates');
const checkFaq = args.includes('--check-faq');
const patternArg = (() => {
  const i = args.indexOf('--pattern');
  return i !== -1 ? args[i+1] : null;
})();

if (!fs.existsSync(docsDir)) {
  console.error(`[ERROR] No existe el directorio: ${docsDir}`);
  process.exit(2);
}

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const files = listFiles(docsDir).filter(f => {
  if (patternArg && micromatch) {
    const rel = path.relative(docsDir, f);
    return micromatch.isMatch(rel, patternArg);
  }
  // Ignorar plantillas por defecto a menos que se solicite
  if (!includeTemplates && f.includes(path.join('knowledge_docs', 'templates'))) return false;
  return f.endsWith('.txt');
});

const pendingPatterns = ['?'];
if (strict) pendingPatterns.push('TODO', 'FIXME', 'TBD');

let totalPending = 0;
const report = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const hits = [];
  let inFaqBlock = false;
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const isUrl = /(https?:\/\/|www\.)/i.test(line);

    // Detectar inicio de bloque FAQs en ES/EN/PT
    if (!checkFaq) {
      if (/^(faqs|preguntas frecuentes|faqs sugeridas|perguntas frequentes)[:]?/i.test(trimmed)) {
        inFaqBlock = true;
      } else if (inFaqBlock) {
        // Permanecer en FAQ mientras sean viñetas o líneas en blanco
        if (trimmed === '' || /^[*-]\s+/.test(trimmed)) {
          // stay in block
        } else {
          inFaqBlock = false;
        }
      }
    }

    if (inFaqBlock && !checkFaq) return; // ignorar contenido de FAQs por defecto

    let matched = false;
    for (const p of pendingPatterns) {
      if (p === '?') {
        // Evitar URLs; detectar placeholders tipo token? o "valor?" dentro de entity maps
        const hasQ = /\?/.test(line);
        if (!isUrl && hasQ) {
          // Heurística: marcar si hay palabra_token con ? (e.g., balcon?, yes?, 2-3?) o dentro de comillas
          if (/[A-Za-z0-9_\-] \?$/.test(trimmed)) {
            matched = true; break;
          }
          if (/[A-Za-z0-9_\-]\?\b/.test(line)) { matched = true; break; }
          if (/"[^"]*\?"/.test(line) || /'[^']*\?'/.test(line)) { matched = true; break; }
        }
      } else if (new RegExp(`\b${p}\b`, 'i').test(line)) { matched = true; break; }
    }
    if (matched) hits.push({ lineNo: idx + 1, text: trimmed });
  });
  if (hits.length) {
    totalPending += hits.length;
    report.push({ file, hits });
  }
}

if (report.length === 0) {
  console.log('[PASS] No se encontraron pendientes ("?") en knowledge_docs/.');
  process.exit(0);
}

console.log(`[FAIL] Pendientes encontrados: ${totalPending} en ${report.length} archivo(s).`);
for (const { file, hits } of report) {
  console.log(`\nArchivo: ${path.relative(root, file)} (pendientes: ${hits.length})`);
  hits.slice(0, 50).forEach(h => {
    console.log(`  ${String(h.lineNo).padStart(4, ' ')} | ${h.text}`);
  });
  if (hits.length > 50) console.log(`  ... (${hits.length - 50} más)`);
}

if (noFail) process.exit(0);
process.exit(1);
