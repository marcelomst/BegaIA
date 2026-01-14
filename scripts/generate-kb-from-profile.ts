// scripts/generate-kb-from-profile.ts
// Usage: pnpm tsx scripts/generate-kb-from-profile.ts path/to/profile.json [--out docs/kb]
import * as fs from 'fs';
import * as path from 'path';
import { buildHydrationConfigFromProfile, generateKbFilesFromTemplates, type Profile } from '../lib/kb/generator';
import { ChatOpenAI } from '@langchain/openai';


function ensureDir(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeFile(p: string, content: string) { fs.writeFileSync(p, content, 'utf8'); }


async function main() {
    const args = process.argv.slice(2);
    if (!args.length) {
        console.error('Uso: pnpm tsx scripts/generate-kb-from-profile.ts path/to/profile.json [--out docs/kb]');
        process.exit(2);
    }
    const profilePath = path.resolve(args[0]);
    const outIdx = args.indexOf('--out');
    const outBase = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.resolve('docs/kb');
    if (!fs.existsSync(profilePath)) {
        console.error(`❌ No existe el archivo de perfil: ${profilePath}`);
        process.exit(2);
    }
    const p = JSON.parse(fs.readFileSync(profilePath, 'utf8')) as Profile;
    if (!p.hotelId) {
        console.error('❌ El perfil debe incluir hotelId');
        process.exit(2);
    }
    const baseDir = path.join(outBase, p.hotelId);
    ensureDir(baseDir);

    const autoIdx = args.indexOf('--auto-enrich');
    const auto = autoIdx >= 0;
    let profile: Profile = p;
    if (auto) {
        try {
            const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
            const city = p.location?.city || '';
            const country = p.location?.country || '';
            const coords = p.location?.coordinates ? `${p.location.coordinates.lat},${p.location.coordinates.lng}` : '';
            const prompt = `Devuelve SOLO JSON con forma {"airports":[{"code":"","name":"","distanceKm":n,"driveTime":""}],"transport":{"hasPrivateTransfer":true,"transferNotes":"","taxiNotes":"","busNotes":""},"attractions":[{"name":"","distanceKm":n,"notes":""}]}. Ciudad: ${city}, País: ${country}, Coords: ${coords}.`;
            const res = await model.invoke([{ role: 'user', content: prompt }]);
            const txt = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
            const json = JSON.parse(txt);
            profile = {
                ...p,
                airports: json.airports ?? p.airports,
                transport: json.transport ? { ...(p.transport ?? {}), ...json.transport } : p.transport,
                attractions: json.attractions ?? p.attractions,
            };
        } catch { /* fallback silently */ }
    }

    const hydration = buildHydrationConfigFromProfile(profile);
    const files = generateKbFilesFromTemplates({ hotelConfig: hydration, defaultLanguage: profile.defaultLanguage });
    // Write to disk
    for (const [rel, content] of Object.entries(files) as Array<[string, string]>) {
        const full = path.join(baseDir, rel);
        ensureDir(path.dirname(full));
        writeFile(full, content);
    }

    console.log(`✅ KB generado en ${baseDir} para ${p.hotelId}`);
}

main().catch(err => { console.error('❌ Error generando KB:', err); process.exit(1); });
