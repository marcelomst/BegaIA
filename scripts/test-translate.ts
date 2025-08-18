// Path: /root/begasist/scripts/test-translate.ts
/**
 * Ejecutar:
 * 1) Traducción REAL (necesita OPENAI_API_KEY)
 *    OPENAI_API_KEY=sk-xxx ENABLE_TRANSLATION=true TRANSLATION_MODEL=gpt-4o ts-node scripts/test-translate.ts
 *
 * 2) Traducción DESHABILITADA (debe devolver el texto original)
 *    ENABLE_TRANSLATION=false ts-node scripts/test-translate.ts
 *
 * 3) Cambiar modelo/temperatura:
 *    TRANSLATION_TEMPERATURE=0 ENABLE_TRANSLATION=true ...
 */

type TestCase = {
  text: string;
  from: string;
  to: string;
  label?: string;
};

// ⚙️ Configurar ENV ANTES de importar el módulo (por su lazy init)
process.env.ENABLE_TRANSLATION = process.env.ENABLE_TRANSLATION ?? "true";
process.env.TRANSLATION_MODEL = process.env.TRANSLATION_MODEL ?? "gpt-4o";
process.env.TRANSLATION_TEMPERATURE = process.env.TRANSLATION_TEMPERATURE ?? "0";

async function run() {
  // Import dinámico para respetar ENV ya seteadas
  const { translateIfNeeded } = await import("../lib/i18n/translateIfNeeded");

  const cases: TestCase[] = [
    { label: "ES → EN", text: "Hola, ¿a qué hora es el check-in?", from: "es", to: "en" },
    { label: "EN → ES", text: "Can I get a late checkout?", from: "en", to: "es" },
    { label: "PT → ES", text: "O café da manhã está incluído?", from: "pt", to: "es" },
    { label: "ES → ES (no-op)", text: "Me hospedo dos noches.", from: "es", to: "es" },
  ];

  const enabled = process.env.ENABLE_TRANSLATION !== "false";
  const model = process.env.TRANSLATION_MODEL;
  const temp = process.env.TRANSLATION_TEMPERATURE;

  console.log("=== translateIfNeeded – smoke tests ===");
  console.log(`ENABLE_TRANSLATION=${enabled} | MODEL=${model} | TEMP=${temp}`);
  console.log("=======================================\n");

  for (const c of cases) {
    const start = Date.now();
    let out: string;
    try {
      out = await translateIfNeeded(c.text, c.from, c.to);
    } catch (err) {
      console.error(`❌ Error en caso "${c.label ?? `${c.from}->${c.to}`}"`, err);
      continue;
    }
    const ms = Date.now() - start;
    const changed = out !== c.text;
    console.log(
      [
        `→ ${c.label ?? `${c.from.toUpperCase()} → ${c.to.toUpperCase()}`}`,
        `from=${c.from} to=${c.to}`,
        `changed=${changed}`,
        `time=${ms}ms`,
      ].join(" | ")
    );
    console.log("  input: ", c.text);
    console.log("  output:", out);
    console.log("");
  }

  // ✅ Checks mínimos programáticos (útiles para CI)
  const noOp = await translateIfNeeded("Sin cambios", "es", "es");
  if (noOp !== "Sin cambios") {
    throw new Error("Caso no-op falló: ES→ES debería devolver el texto original.");
  }
  console.log("✅ Chequeos básicos OK.");
}

run().catch((e) => {
  console.error("❌ Test runner explotó:", e);
  process.exit(1);
});
