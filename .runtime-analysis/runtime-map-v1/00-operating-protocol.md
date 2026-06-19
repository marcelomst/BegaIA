// Path: .runtime-analysis/runtime-map-v1/00-operating-protocol.md

# Runtime Map V1 — Operating Protocol

## Propósito

Este protocolo define cómo usar Runtime Map V1 en el flujo real de trabajo del proyecto.

El objetivo es que el mapa no sea solo documentación visual, sino una herramienta operativa para:

```text
AGPT
agente técnico
Guardian
HDOC
Marcelo
```

Este protocolo no modifica código.  
No autoriza refactor.  
No reemplaza tests.  
No reemplaza revisión humana.  
No convierte cajas conceptuales en módulos físicos.

---

## Regla principal

```text
Bug → caja conceptual → código real → riesgos → tests → fix mínimo
```

La nueva operativa evita pedir:

```text
Corregir messageHandler.ts
```

y reemplaza eso por:

```text
Corregir una caja específica,
con riesgos declarados,
cajas relacionadas,
cajas prohibidas
y tests de paridad.
```

---

## Principios

### 1. El mapa es una herramienta de precisión

Runtime Map V1 sirve para reducir ambigüedad.

Permite ubicar un problema en:

```text
runtime
sub-runtime
decisión de turno
corredor operacional
compuerta
estado
reply
fallback
```

---

### 2. El mapa no autoriza extracción

```text
Identificar cajas no significa extraer cajas.
```

Una caja puede existir solo como frontera conceptual.

Para extraerla físicamente se requiere:

```text
contrato claro
tests de paridad
snapshot de comportamiento observable
inventario de estado leído/escrito
validación de precedencia
aprobación explícita del hito
```

---

### 3. box_id estable, code_refs recalculables

```text
box_id = estable
code_refs = recalculables
```

Los nombres de cajas deben mantenerse estables.

Los rangos de línea pueden cambiar.

Antes de usar rangos como evidencia para un hito técnico, se debe verificar si el código cambió.

---

### 4. Fix mínimo

Todo hito runtime debe buscar el fix mínimo compatible con:

```text
bug observado
caja impactada
cajas prohibidas
tests de paridad
riesgo de regresión
```

No se debe convertir un bug en refactor amplio salvo que el hito lo declare explícitamente.

---

## Artefactos del Runtime Map V1

### Human-friendly

```text
.runtime-analysis/runtime-map-v1/00-runtime-map-level-0.md
.runtime-analysis/runtime-map-v1/01-messagehandler-level-1.md
.runtime-analysis/runtime-map-v1/02-bodyllm-level-2.md
.runtime-analysis/runtime-map-v1/03-bodyllm-turn-decision-level-3.md
.runtime-analysis/runtime-map-v1/03-bodyllm-operational-corridors-level-3.md
.runtime-analysis/runtime-map-v1/00-glossary.md
```

Uso:

```text
comprensión
lectura humana
discusión arquitectónica
preparación de hitos
```

---

### Evidence / code mapping

```text
.runtime-analysis/runtime-map-v1/00-snapshot.md
.runtime-analysis/runtime-map-v1/01-phase-1-evidence-summary.md
.runtime-analysis/runtime-map-v1/00-code-index.md
.runtime-analysis/messageHandler_function_size_map.md
.runtime-analysis/bodyLLM_internal_scan.md
```

Uso:

```text
rangos reales
hotspots
evidencia actual
confianza de rangos
```

---

### Machine-friendly

```text
.runtime-analysis/runtime-map-v1/00-box-index.md
```

Uso:

```text
box_id
risk_tags
code_refs
related_boxes
forbidden_assumptions
alcance de hitos
auditoría de Guardian
```

---

## Roles

## AGPT

AGPT actúa como arquitecto/orquestador.

### Responsabilidades

AGPT debe:

```text
1. interpretar el problema
2. ubicar cajas impactadas
3. revisar cajas relacionadas
4. declarar cajas prohibidas
5. definir riesgos
6. pedir tests de paridad
7. generar prompt técnico con alcance controlado
8. evitar prompts genéricos sobre messageHandler.ts
```

### AGPT no debe

```text
pedir refactor amplio sin hito explícito
ignorar box-index
mezclar bugfix con reorganización
usar code_refs viejos sin advertencia
omitir cajas prohibidas en fixes sensibles
```

---

## Agente técnico

El agente técnico implementa.

### Responsabilidades

El agente técnico debe:

```text
1. leer el hito
2. respetar runtime_boxes_impacted
3. revisar runtime_boxes_related
4. no tocar runtime_boxes_forbidden
5. implementar fix mínimo
6. agregar o ajustar tests de paridad
7. reportar cajas tocadas
8. reportar riesgos residuales
```

### Informe esperado

El informe técnico debe incluir:

```text
1. PROBLEMA
2. CAUSA
3. SOLUCIÓN
4. RIESGOS
5. CAMBIOS
6. DIFF
7. RUNTIME_BOXES_TOUCHED
8. RUNTIME_BOXES_REVIEWED
9. RUNTIME_BOXES_NOT_TOUCHED
10. TESTS
11. READY_FOR_GUARDIAN
```

---

## Guardian

Guardian audita.

### Responsabilidades

Guardian debe verificar:

```text
1. diff real
2. tests
3. cajas declaradas vs cajas tocadas
4. cajas prohibidas respetadas
5. ausencia de refactor encubierto
6. pureza del hito
7. si corresponde commit
```

### Guardian debe marcar alerta si

```text
el diff toca cajas no declaradas
el diff toca cajas prohibidas
el hito se expandió a otro dominio
no hay test de paridad en fix sensible
hay cambios de copy no declarados
hay cambios de persistencia no declarados
hay code_refs marcados needs_refresh
```

---

## HDOC

HDOC documenta solo después de commit/push confirmado.

### Responsabilidades

HDOC debe:

```text
1. registrar hito cerrado
2. documentar hash técnico
3. documentar hash documental
4. actualizar hito_mcp.md o documento correspondiente
5. no documentar supuestos no confirmados
6. preservar trazabilidad
```

### HDOC no debe

```text
documentar antes del commit técnico
inventar cierre de hito
convertir análisis temporal en arquitectura canónica sin decisión
```

---

## Marcelo

Marcelo conserva la llave operativa.

### Responsabilidades

Marcelo:

```text
1. ejecuta comandos locales
2. decide commit
3. decide push
4. valida pruebas manuales
5. acepta o rechaza avanzar de fase
6. mantiene control del repo
```

---

## Flujo operativo para bugs de runtime

### Paso 1 — Describir bug

Registrar:

```text
mensaje del huésped
estado previo relevante
respuesta actual incorrecta
respuesta esperada
si ejecutó acción real o no
si persiste estado incorrecto o no
```

---

### Paso 2 — Ubicar cajas

AGPT identifica:

```yaml
runtime_boxes_impacted:
  - ...

runtime_boxes_related:
  - ...

runtime_boxes_forbidden:
  - ...
```

---

### Paso 3 — Definir riesgos

AGPT declara:

```yaml
risk_tags:
  - precedence
  - temporal_repair
  - slot_attribution
  - quote_gating
  - confirmation_gating
```

Los tags dependen del bug.

---

### Paso 4 — Asociar code_refs

AGPT usa:

```text
00-code-index.md
00-box-index.md
```

para proponer rangos candidatos.

Ejemplo:

```yaml
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L6314-L6813
    confidence: medium
  - file: lib/handlers/messageHandler.ts
    range: L4314-L4813
    confidence: medium
```

---

### Paso 5 — Definir tests de paridad

Todo fix sensible debe incluir pruebas que congelen:

```text
respuesta observable
estado persistido
acción ejecutada o bloqueada
ruta no contaminada
cajas prohibidas no afectadas
```

---

### Paso 6 — Generar prompt técnico

El prompt al agente técnico debe incluir:

```text
hito_id
problema
contexto
runtime_boxes_impacted
runtime_boxes_related
runtime_boxes_forbidden
risk_tags
code_refs
parity_tests_required
restricciones
output esperado
```

---

### Paso 7 — Implementación

El agente técnico implementa fix mínimo.

No debe hacer:

```text
refactor amplio
renombrados masivos
cambios de estilo no pedidos
cambios en cajas prohibidas
cambios de copy no declarados
```

---

### Paso 8 — Guardian

Guardian valida:

```text
diff
tests
cajas tocadas
cajas prohibidas
pureza
riesgos
```

---

### Paso 9 — Commit / push

Marcelo ejecuta:

```text
git status
git diff
git add
git commit
git push
```

según instrucciones.

---

### Paso 10 — HDOC

HDOC documenta solo con hash real.

---

## Flujo operativo para refactor de runtime

Un refactor de runtime requiere una condición más fuerte que un bugfix.

Debe declarar:

```text
objetivo de refactor
cajas a extraer o aislar
contratos esperados
tests de paridad existentes
tests nuevos
plan de rollback
riesgos de precedencia
estado leído/escrito
impacto en agentes
```

Regla:

```text
No extraer bodyLLM por intuición.
Extraer solo fronteras con contrato y tests.
```

---

## Formato recomendado para hito runtime

```yaml
hito_id: <ID>
classification: runtime_bugfix | runtime_refactor | runtime_documentation
target_file:
  - lib/handlers/messageHandler.ts

runtime_map:
  version: runtime-map-v1
  baseline_commit: e67ba49
  baseline_status: committed_fix_pushed_runtime_map_refresh_applied_v20

runtime_boxes_impacted:
  - runtime.messageHandler.bodyLLM.turnDecision

runtime_boxes_related:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create

runtime_boxes_forbidden:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot

risk_tags:
  - precedence
  - temporal_repair
  - slot_attribution

code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L4861-L5610
    confidence: medium

parity_tests_required:
  - observable reply
  - preserved state
  - no forbidden action

expected_agent_report:
  - runtime_boxes_touched
  - runtime_boxes_reviewed
  - runtime_boxes_not_touched
  - tests_added
```

---

## Formato recomendado para informe técnico

```yaml
runtime_boxes_touched:
  - runtime.messageHandler.bodyLLM.turnDecision

runtime_boxes_reviewed:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create

runtime_boxes_not_touched:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot

risk_tags_observed:
  - precedence
  - temporal_repair

tests_added:
  - test/unit/example.spec.ts

tests_run:
  - pnpm test -- ...
```

---

## Cuándo refrescar el mapa

Refrescar evidencia cuando:

```text
messageHandler.ts cambie significativamente
bodyLLM cambie de rango
se agregue una función relevante
se mueva lógica entre corredores
un hito toque zonas internas del runtime
Guardian detecte cajas tocadas no declaradas
```

---

## Comandos de refresh

```bash
cd /home/marcelo/begasist

node .runtime-analysis/function-size-map.mjs lib/handlers/messageHandler.ts \
  > .runtime-analysis/messageHandler_function_size_map.md
```

Luego tomar el nuevo rango de `bodyLLM` y ejecutar:

```bash
node .runtime-analysis/analyze-bodyLLM.mjs lib/handlers/messageHandler.ts <BODY_START> <BODY_END> 250 \
  > .runtime-analysis/bodyLLM_internal_scan.md
```

Actualizar después:

```text
.runtime-analysis/runtime-map-v1/00-snapshot.md
.runtime-analysis/runtime-map-v1/01-phase-1-evidence-summary.md
.runtime-analysis/runtime-map-v1/00-code-index.md
.runtime-analysis/runtime-map-v1/00-box-index.md
```

---

## Reglas de seguridad

```text
1. No fix sin caja.
2. No fix sensible sin test de paridad.
3. No tocar caja prohibida.
4. No usar fallback para acción sensible.
5. No tratar structured analyze como verdad final sin arbitraje.
6. No cotizar con fechas inválidas.
7. No confirmar sin proposal o target válido.
8. No cancelar sin target y confirmación.
9. No modificar sin target.
10. No asumir que respuesta correcta implica estado correcto.
```

---

## Estado

```yaml
phase: FASE_4_9
artifact: 00-operating-protocol.md
status: ready_for_template_updates
next_artifacts:
  - hito_template.md
  - CAPSULE_TEMPLATE_V3.md
  - config.toml
  - system_operating_model.md
```
