#!/usr/bin/env node
/**
 * Hydrate support/contact_support from seeds with a provided hotel_config JSON (inline or file).
 * Usage:
 *   node scripts/hydrate_contact_support.js [lang] [config-json-or-@path]
 * Examples:
 *   node scripts/hydrate_contact_support.js es '{"contact":{"phone":"+54 11 4444 4444","whatsapp":"+54 9 11 4444 4444","email":"recepcion@hotel.com","hours":"24/7","otherChannels":"Instagram, Facebook"}}'
 *   node scripts/hydrate_contact_support.js pt @/path/to/config.json
 */

const fs = require('fs');
const path = require('path');

const CATEGORY_ID = 'support/contact_support';

function getIn(obj, p) {
  if (!obj || !p) return undefined;
  const parts = String(p).split('.');
  let cur = obj;
  for (const k of parts) {
    if (cur && typeof cur === 'object' && k in cur) {
      cur = cur[k];
    } else {
      return undefined;
    }
  }
  return cur;
}

function replaceTokenSyntax(text, cfg) {
  if (!text) return text;
  const re = /\[\[([^\]]+)\]\]/g;
  return text.replace(re, (m, inner) => {
    const innerTrim = String(inner).trim();
    // Skip iterator tokens if present
    if (innerTrim.toLowerCase().startsWith('each:') || innerTrim.toLowerCase().startsWith('join:')) {
      return m;
    }
    const parts = String(inner).split('|').map(s => s.trim());
    let keyPath = '';
    let def;
    for (const p of parts) {
      const km = p.match(/^key\s*:\s*(.+)$/i);
      if (km) { keyPath = km[1].trim(); continue; }
      const dm = p.match(/^default\s*:\s*(.+)$/i);
      if (dm) { def = dm[1].trim(); continue; }
    }
    if (!keyPath && parts.length === 1) {
      keyPath = parts[0];
    }
    const val = keyPath ? getIn(cfg, keyPath) : undefined;
    if (val == null || val === '') return def != null ? String(def) : m;
    return String(val);
  });
}

function pickTemplate(templates, lang) {
  if (!templates || typeof templates !== 'object') return null;
  const keys = Object.keys(templates);
  const preferred = Array.from(new Set([lang, lang?.toLowerCase?.(), 'es', 'en', 'pt', ...keys]));
  const chosen = preferred.find(k => templates[k]);
  if (!chosen) return null;
  return { lang: chosen, tpl: templates[chosen], available: keys };
}

function loadSeedCategory(categoryId) {
  const file = path.resolve(process.cwd(), 'seeds/category_registry.json');
  const raw = fs.readFileSync(file, 'utf8');
  const list = JSON.parse(raw);
  return list.find(x => x && x.categoryId === categoryId) || null;
}

function parseConfigArg(arg) {
  if (!arg) return null;
  if (arg.startsWith('@')) {
    const p = arg.slice(1);
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  }
  try { return JSON.parse(arg); } catch {
    return null;
  }
}

async function main() {
  const lang = (process.argv[2] || 'es').toLowerCase();
  const cfgArg = process.argv[3] || '';
  const cfg = parseConfigArg(cfgArg) || {
    // Minimal defaults to see hydration
    contact: {
      phone: '+1 (555) 555-5555',
      whatsapp: '+1 (555) 555-5555',
      email: 'frontdesk@hotel.com',
      hours: '24/7',
      otherChannels: 'Instagram, Facebook'
    }
  };

  const entry = loadSeedCategory(CATEGORY_ID);
  if (!entry) {
    console.error('Category not found in seeds:', CATEGORY_ID);
    process.exit(1);
  }
  const pick = pickTemplate(entry.templates || {}, lang);
  if (!pick) {
    console.error('Template lang not found. Available:', Object.keys(entry.templates || {}));
    process.exit(1);
  }

  const title = replaceTokenSyntax(pick.tpl.title || '', cfg);
  const body = replaceTokenSyntax(pick.tpl.body || '', cfg);

  const out = `# Hydrated: ${CATEGORY_ID} [${pick.lang}]\n\nTitle:\n${title}\n\nBody:\n${body}\n`;
  console.log(out);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
