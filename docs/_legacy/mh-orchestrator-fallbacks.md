Yo ahora frenaría un poquito la ola de código y **haría documentación**, justo porque:

- Ya migraste 3 caminos (saludo, structured fallback, fallback determinista).
- Tenés flags y `fallbackReason` nuevos.
- El “orquestador” ya es real, no solo un proxy.

Si no lo documentás ahora, en 2 semanas va a ser un lío entender qué decide qué 😅

Te dejo directamente un **doc listo para pegar** en el repo.

---

## 📝 Archivo de documentación propuesto

Guardalo como algo tipo:

`/root/begasist/documentacion/mh-orchestrator-fallbacks.md`
(en el proyecto se subiría como `root_begasist_documentacion_mh-orchestrator-fallbacks.md`).

````md
// Path: /root/begasist/documentacion/mh-orchestrator-fallbacks.md

# Orquestador de Respuestas: Caminos Seguros y Fallbacks

## Contexto

Este documento describe cómo funciona hoy el **orquestador de respuestas** sobre el flujo `messageHandler.ts`, con foco en:

- Los **caminos seguros** ya migrados al `orchestratorAgent`.
- Los distintos tipos de **fallback** (structured y determinista).
- El uso del flag `USE_ORCHESTRATOR_AGENT` para migraciones graduales.

El objetivo es que cualquier persona pueda entender por qué el sistema responde como responde cuando el grafo (`agentGraph`) no produce un texto final directo.

---

## Visión General

Flujo simplificado cuando `USE_ORCHESTRATOR_AGENT` está activo:

1. `messageHandler.ts` arma el contexto `pre`.
2. `runOrchestratorProxy(pre, runBodyPhase)` se encarga de:
   - Marcar `pre.__orchestratorActive = true`.
   - Ejecutar:
     - **Camino 1**: saludo simple fast-test (si aplica).
     - Luego `bodyLLM(pre)` (flujo original).
   - Evaluar el resultado de `bodyLLM`:
     - Si el grafo produce una respuesta estructurada sin texto final → **structured fallback**.
     - Si después de todo `finalText` sigue vacío → **fallback determinista**.
3. El restultado final (`finalText`, categoría, flags) se pasa al resto del flujo (supervisión, conv_state, output).

Cuando `USE_ORCHESTRATOR_AGENT` está **desactivado**, `runOrchestratorProxy` no se usa y el flujo se comporta exactamente como antes de la migración.

---

## Tipos del Orquestador

### `OrchestratorInput`

Campos principales (resumen):

- `lang`: `"es" | "en" | "pt"`
- `msg`: `{ content?: string }`
- `inModifyMode`: `boolean`
- `currSlots`: `any`
- `prevCategory`: `string | null`
- `fallbackReason?`: `"structured_fallback" | "empty_final_text"`
- `priorNeedsSupervision?`: `boolean`
- `graphResult?`: `any` (cuando el grafo devuelve algo estructurado sin texto final)

### `OrchestratorOutput`

- `finalText`: `string`
- `nextCategory`: `string | null`
- `nextSlots`: `any`
- `needsSupervision`: `boolean`
- `graphResult?`: `any` (se propaga solo si tiene sentido para el resto del flujo)

---

## Caminos Migrados al Orquestador

### Camino 1: Saludo simple (fast-path de test)

**Cuándo se dispara**

- Entorno de test / fast-path.
- No está activo `inModifyMode`.
- El contenido del mensaje matchea un saludo simple (`looksGreeting`).

**Qué hace**

- `runOrchestratorPlanner` devuelve:
  - `finalText`: el mismo `ruleBasedFallback` que usaba `bodyLLM` para este caso.
  - `nextCategory`: `"retrieval_based"`.
  - `nextSlots`: igual que `currSlots`.
  - `needsSupervision`: `false`.

**Por qué es seguro**

- No llama a tools ni grafo.
- No modifica reservas ni `conv_state`.
- Solo devuelve un texto breve y una categoría neutral.

---

### Camino 2: Structured Fallback (`fallbackReason = "structured_fallback"`)

**Escenario**

- El grafo (`agentGraph`) devuelve un resultado estructurado (por ejemplo, datos parciales o una respuesta que requiere formateo).
- No hay `finalText` directo, pero **hay información útil** en `graphResult`.
- Antes, el texto de “structured fallback” se armaba ad hoc en `bodyLLM`.

**Nuevo comportamiento**

- `runOrchestratorProxy` detecta que:
  - Hay `graphResult` utilizable.
  - Aún no hay `finalText`.
  - El flujo está marcado como `__orchestratorActive`.
- Construye un `OrchestratorInput` con:
  - `fallbackReason: "structured_fallback"`.
  - `graphResult` con la información que devolvió el grafo.
  - `priorNeedsSupervision` según lo que traía el pre-body.
- `runOrchestratorPlanner`:
  - Usa la misma lógica de structured fallback que antes.
  - Produce un `finalText` equivalente al previo (texto “amigable” armado en base a `graphResult`).
  - Fija `nextCategory` y `nextSlots` igual que el flujo original.
  - Preserva `needsSupervision` (si el caso ya venía marcado como sensible).

**Resultado**

- El texto de structured fallback es idéntico al anterior.
- La categoría/slots resultantes se mantienen.
- El resto del flujo (supervisión, posLLM, conv_state) ve exactamente lo mismo que veía antes.

---

### Camino 3: Fallback determinista (`fallbackReason = "empty_final_text"`)

**Escenario**

- Se activó el grafo y el structured fallback (si aplica).
- Aún así, `finalText` queda vacío tras los intentos de structured/graph.
- Antes, `messageHandler.ts` llamaba directamente a `ruleBasedFallback(lang, content)`.

**Nuevo comportamiento**

- `messageHandler.ts` ahora hace:

  ```ts
  if (!finalText) {
    if (!(pre as any).__orchestratorActive) {
      finalText = ruleBasedFallback(pre.lang, String(pre.msg.content || ""));
      console.warn("[graph] finalText vacío → fallback determinista");
    } else {
      console.warn(
        "[graph] finalText vacío → delegando fallback determinista al OrchestratorPlanner"
      );
    }
  }
  ```
````

- Cuando `__orchestratorActive` está presente, `runOrchestratorProxy` construye un `OrchestratorInput` con:

  - `fallbackReason: "empty_final_text"`.
  - `priorNeedsSupervision` según la lógica previa.

- `runOrchestratorPlanner`:

  - Llama internamente a la misma `ruleBasedFallback(lang, content)` que antes.
  - Usa `prevCategory` o cae en `"retrieval_based"` si no hay categoría previa.
  - Devuelve:

    - `finalText` con el texto de fallback determinista.
    - `nextCategory` y `nextSlots` equivalentes.
    - `needsSupervision` preservado.

**Resultado**

- Mismo mensaje de fallback determinista que el flujo viejo.
- Misma categoría final.
- `needsSupervision` sin cambios.
- El resto del flujo ni se entera de que ahora lo hace el orquestador.

---

## Flag `USE_ORCHESTRATOR_AGENT`

- **Desactivado** (por defecto):

  - `messageHandler.ts` llama directamente a `bodyLLM`.
  - El orquestador no participa.
  - El comportamiento es 100% el original.

- **Activado**:

  ```bash
  export USE_ORCHESTRATOR_AGENT=1
  pnpm test:run
  ```

  - `messageHandler.ts` usa `runOrchestratorProxy(pre, bodyLLM)`.
  - El proxy habilita:

    - Camino saludo simple fast-test.
    - Structured fallback.
    - Fallback determinista.

  - Cualquier caso que no cumpla las condiciones migradas sigue pasando por `bodyLLM` original.

Para volver al comportamiento por defecto:

```bash
unset USE_ORCHESTRATOR_AGENT
pnpm test:run
```

---

## Estado Actual de Migración

- ✅ Caminos migrados y estables:

  - Saludo simple (fast-test).
  - Structured fallback.
  - Fallback determinista empty_final_text.

- ✅ Paridad validada:

  - 134/134 tests pasando con flag ON y OFF.

- ✅ Helpers restaurados:

  - `getRecentHistorySafe`
  - `extractTextFromLCContent`

Próximos candidatos a migrar:

- Flujos de recotización de huéspedes.
- Confirmación de horario de check-in/check-out sin side-effects.
- Extracción del posLLM (auditoría) hacia el orquestador.

---

## Notas para futuras fases

- A medida que más caminos se migren a `runOrchestratorPlanner`, `messageHandler.ts` se puede simplificar hasta convertirse en un coordinador fino.
- El esqueleto de grafo (`mhFlowGraph.ts`) puede alinearse con estos caminos:

  - `normalize → plan → fallback/structured → decide → state → format`.

- La bandera `USE_ORCHESTRATOR_AGENT` permite seguir haciendo este trabajo de manera incremental y segura, sin romper la API hacia `/app/api/chat` ni el frontend.

```

---

Con esto cubrís la parte de **documentación** muy bien.

Si después de pegar este archivo en el repo querés seguir con código, mi sugerencia sería:

1. Migrar un flujo de negocio concreto (por ejemplo la parte de **recotización de huéspedes**).
2. O empezar a extraer **posLLM/auditoría** a un `auditAgent` o al propio `orchestratorAgent`.

Si me decís cuál de los dos te interesa más atacar ahora (recotización vs auditoría), te preparo el prompt específico para tu agente de VSCode como hicimos antes.
```
