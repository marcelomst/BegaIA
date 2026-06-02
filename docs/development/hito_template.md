// Path: hito_template.md

# HITO_TEMPLATE_V2

DOCUMENT_TYPE: WORK_TEMPLATE  
SCOPE: HITO_DEFINITION  
PRIORITY: HIGH  
USAGE: MANDATORY_FOR_AGPT

---

## PURPOSE

Esta plantilla define el formato estándar para la generación de hitos por parte de AGPT.

Su objetivo es:

- reducir ambigüedad operativa
- minimizar uso de tokens
- estandarizar interacción con agentes
- asegurar trazabilidad y coherencia con el System Operating Model
- permitir que los hitos de runtime declaren cajas conceptuales impactadas
- reducir regresiones por cambios difusos en `messageHandler.ts`
- conectar bugs, runtime map, código real, riesgos y tests de paridad

---

## USAGE OBLIGATORIO

AGPT DEBE usar esta plantilla para TODOS los hitos.

No es opcional.

Regla:

- no expandir contexto innecesario
- no copiar reasoning completo
- no duplicar reglas ya contenidas en `config.toml` o `system_operating_model.md`
- no pedir fixes genéricos sobre archivos grandes si existe una caja conceptual aplicable
- no pedir “corregir messageHandler.ts” sin declarar caja, riesgo y prueba esperada cuando el hito sea de runtime

Principio:

> AGPT no transporta razonamiento, transporta estado operativo.

---

## SOURCES OF TRUTH

Este template se alinea con:

- `system_operating_model.md` → contrato operativo global
- `config.toml` → definición operativa vigente de agentes
- `CAPSULE_TEMPLATE_V3.md` → contexto portable entre chats
- `Runtime Map V1` → mapa operativo de cajas, riesgos y code_refs para runtime
- `00-box-index.md` → índice machine-friendly de cajas
- `00-code-index.md` → evidencia recalculable de rangos de código

Cuando el hito afecte runtime conversacional, AGPT debe consultar preferentemente este set Runtime Map V1:

- `00-box-index.md`
- `00-code-index.md`
- `00-operating-protocol.md`
- `00-glossary.md`
- `00-snapshot.md`
- `02-bodyllm-level-2.md`
- `03-bodyllm-operational-corridors-level-3.md`
- `messageHandler_function_size_map.md`
- `bodyLLM_internal_scan.md`

Uso esperado:

- `00-box-index.md` define cajas y `box_id`.
- `00-code-index.md` define `code_refs`.
- `00-operating-protocol.md` define reglas de uso.
- `00-glossary.md` evita ambigüedad terminológica.
- `00-snapshot.md` define baseline vigente.
- `02-bodyllm-level-2.md` y `03-bodyllm-operational-corridors-level-3.md` ayudan a ubicar el bug.
- `messageHandler_function_size_map.md` y `bodyLLM_internal_scan.md` son evidencia recalculable.

REGLA:

- No copiar todo Runtime Map V1 dentro del hito.
- Usar `box_id`, `risk_tags`, `code_refs` y tests de paridad.
- Si los rangos parecen obsoletos, marcar `code_refs_status: needs_refresh`.

Regla:

```text
Si hay conflicto operativo, prevalece system_operating_model.md.
Si hay conflicto sobre agentes, leer config.toml.
Si hay conflicto sobre cajas runtime, refrescar Runtime Map V1 antes de usar code_refs.
```

---

## TEMPLATE

### HITO

- `id`: <HITO_ID>
- `agent_target`: <asistente_tecnico | repo_guardian | hdoc | arquitecto_sistema | arquitecto_kb>
- `flow_position`: <analysis | implementation | audit | documentation>
- `classification`: <runtime_bugfix | runtime_refactor | runtime_documentation | kb | ui | auth | docs | other>

---

### OBJETIVO

Una sola línea clara, ejecutable y verificable.

Ejemplo:

```text
Corregir la atribución de checkOut explícito en create flow sin afectar modify, cancel ni snapshot.
```

---

### CONTEXTO MÍNIMO

Máximo 3–5 bullets.

Incluir solo lo necesario para ejecutar el hito.

Ejemplo:

- bug manual reproducible en create flow
- `check out 25/5/2026, 2 personas` se interpreta como checkIn
- suite local verde, pero bug no cubierto por test
- runtime principal sigue siendo `messageHandler.ts`
- fix debe ser mínimo y con test de paridad

Prohibido:

- reasoning largo
- historia completa del problema
- duplicación de documentos
- explicación completa de Runtime Map V1
- pegar archivos completos si no hace falta

---

### EVIDENCIA

Incluir solo si aplica.

```yaml
archivos_afectados:
  - <path>

commit_hash: <si existe>

diff: <solo si es necesario y resumido>

suite_status:
  - <comando o resumen>

manual_case:
  input: <mensaje o secuencia mínima>
  current_output: <respuesta incorrecta>
  expected_output: <respuesta esperada>
```

---

### RESULTADO PREVIO

Salida del agente anterior en formato resumido.

Máximo 3–5 líneas.

Ejemplo:

```text
Guardian validó que el commit técnico existe, el hash fue informado y el push está confirmado.
Clasificación sugerida: solo_hito.
Acción siguiente: documentar.
```

---

### RUNTIME MAP

Completar esta sección cuando el hito impacte runtime conversacional, especialmente:

- `messageHandler.ts`
- `bodyLLM`
- reservas
- fechas
- slots
- confirmaciones
- fallback
- graph/classifier/policy
- persistencia conversacional
- respuestas por canal

Si no aplica, indicar:

```yaml
runtime_map:
  applies: false
```

Si aplica:

```yaml
runtime_map:
  applies: true
  version: runtime-map-v1
  baseline_commit: <commit_base_si_aplica>
  baseline_status: <estado_del_snapshot_si_aplica>
```

---

### RUNTIME BOXES IMPACTED

Cajas que el hito SÍ busca modificar o corregir.

```yaml
runtime_boxes_impacted:
  - <box_id>
```

Ejemplo:

```yaml
runtime_boxes_impacted:
  - runtime.messageHandler.bodyLLM.turnDecision
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
```

Regla:

```text
Si el hito toca bodyLLM, debe declarar al menos una caja específica debajo de bodyLLM.
```

Incorrecto:

```yaml
runtime_boxes_impacted:
  - runtime.messageHandler.bodyLLM
```

Correcto:

```yaml
runtime_boxes_impacted:
  - runtime.messageHandler.bodyLLM.turnDecision
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
```

---

### RUNTIME BOXES RELATED

Cajas que no son el objetivo principal, pero pueden compartir riesgo o lógica.

```yaml
runtime_boxes_related:
  - <box_id>
```

Ejemplo:

```yaml
runtime_boxes_related:
  - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
```

Uso:

```text
Sirven para revisar regresión cruzada sin ampliar innecesariamente el fix.
```

---

### RUNTIME BOXES FORBIDDEN

Cajas que el hito NO debe tocar.

```yaml
runtime_boxes_forbidden:
  - <box_id>
```

Ejemplo:

```yaml
runtime_boxes_forbidden:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
```

Regla:

```text
Si el diff toca una caja prohibida, Guardian debe marcar alerta.
```

---

### RISK TAGS

Declarar riesgos relevantes.

```yaml
risk_tags:
  - <risk_tag>
```

Tags frecuentes:

```text
precedence
temporal_repair
slot_attribution
confirmation_gating
quote_gating
target_resolution
fallback_permission
state_preservation
channel_copy
ux_regression
create_vs_modify_contamination
destructive_action
semantic_override
```

Ejemplo:

```yaml
risk_tags:
  - precedence
  - temporal_repair
  - slot_attribution
  - quote_gating
  - create_vs_modify_contamination
```

---

### CODE REFS

Referencias a código real.

```yaml
code_refs:
  - file: <path>
    range: <Lx-Ly | needs_refresh>
    confidence: <high | medium | low | needs_refresh>
```

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

Regla:

```text
box_id = estable
code_refs = recalculables
```

Si el código cambió desde el snapshot:

```yaml
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: needs_refresh
    confidence: needs_refresh
```

---

### PARITY TESTS REQUIRED

Declarar tests necesarios para evitar regresión.

```yaml
parity_tests_required:
  - <test esperado>
```

Ejemplo:

```yaml
parity_tests_required:
  - observable reply: checkOut explícito inválido debe pedir nuevo checkOut, no nuevo checkIn
  - preserved state: checkIn corregido debe conservarse
  - preserved slot: numGuests válido debe conservarse
  - no forbidden action: no debe cotizar ni confirmar
  - no contamination: no debe afectar modify, cancel ni snapshot
```

Regla:

```text
Todo fix sensible de runtime debe tener test de paridad.
```

---

### TAREA

Acción concreta que debe ejecutar el agente.

Debe ser:

- específica
- acotada
- ejecutable sin ambigüedad
- compatible con cajas impactadas
- respetuosa de cajas prohibidas

Ejemplo:

```text
Implementar un fix mínimo para que, dentro del create flow, una fecha marcada explícitamente como checkOut no sea reinterpretada como checkIn cuando sea inválida. Debe preservar numGuests si es seguro, pedir nuevo checkOut y bloquear cotización hasta tener rango válido.
```

---

### RESTRICCIONES

Reglas generales:

- usar `config.toml` como fuente de verdad de agentes
- respetar `system_operating_model.md`
- mantener cambios mínimos y auditables
- no introducir capas paralelas
- no duplicar lógica
- no adelantar refactors fuera del roadmap
- no crear archivos nuevos si no son necesarios
- no mover lógica fuera del runtime vigente salvo hito explícito
- no tocar Git write; Marcelo ejecuta comandos de escritura

Reglas runtime, si aplica:

- no corregir `messageHandler.ts` de forma genérica
- no tocar cajas prohibidas
- no convertir un bugfix en refactor amplio
- no cambiar copy por canal si no está declarado
- no cambiar persistencia si no está declarado
- no confirmar acciones sensibles sin target o proposal válido
- no usar fallback para acciones sensibles
- no tratar structured analyze como verdad final sin arbitraje
- no cotizar con fechas inválidas
- no modificar ni cancelar sin target

---

### OUTPUT ESPERADO

Definir explícitamente qué debe devolver el agente.

#### Para `asistente_tecnico`

Debe responder usando este formato:

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

#### Para `repo_guardian`

Debe responder usando este formato:

```text
1. STATUS
2. VALIDACIÓN
3. PUREZA DEL HITO
4. RUNTIME_BOXES_AUDIT
5. TESTS
6. RIESGOS
7. CLASIFICACIÓN DOCUMENTAL
8. CANONICIDAD
9. COMMIT SUGERIDO
10. READY_FOR_HDOC
```

Debe verificar:

```text
- diff real
- tests
- cajas declaradas vs cajas tocadas
- cajas prohibidas respetadas
- ausencia de refactor encubierto
- pureza del hito
```

#### Para `hdoc`

Debe responder usando el contrato vigente de HDOC:

```text
- validar commit
- validar hash
- validar push
- clasificar cierre documental
- documentar si corresponde
```

HDOC no reinterpreta el diff salvo inconsistencia material.

#### Para `arquitecto_sistema`

Debe responder con análisis estructural, sin implementar, cuando:

```text
- el problema no está suficientemente entendido
- el hito puede cruzar dominios
- hay duda sobre evolución estructural
- hay posible impacto de roadmap
```

---

## REGLA DE EFICIENCIA CRÍTICA

AGPT debe:

- minimizar tokens por hito
- evitar redundancia
- no repetir contexto ya conocido por agentes
- no incluir system prompts
- no incluir documentación completa
- no pegar todo Runtime Map V1
- referenciar `box_id` en lugar de explicar todo el mapa
- usar `code_refs` solo cuando ayuden

---

## REGLA ESPECIAL PARA RUNTIME BUGFIX

Para todo bugfix de runtime:

```text
Bug → caja conceptual → código real → riesgos → tests → fix mínimo
```

AGPT debe evitar:

```text
Corregir messageHandler.ts.
```

AGPT debe formular:

```text
Corregir <box_id> con riesgos <risk_tags>,
sin tocar <runtime_boxes_forbidden>,
con tests de paridad <parity_tests_required>.
```

---

## RELACIÓN CON EL SISTEMA

Esta plantilla se alinea con:

- `system_operating_model.md` → contrato operativo
- `CAPSULE_TEMPLATE_V3.md` → contexto portable
- `config.toml` → comportamiento de agentes
- `Runtime Map V1` → cajas conceptuales del runtime
- `00-box-index.md` → índice machine-friendly
- `00-code-index.md` → evidencia recalculable de código

---

## PRINCIPIO FINAL

```text
1 hito = 1 intención clara
1 agente = 1 responsabilidad
1 bug runtime = cajas declaradas
1 fix sensible = test de paridad
```

---

## NOTAS

- Esta plantilla es obligatoria para AGPT.
- No debe simplificarse sin justificación.
- Su objetivo es reducir costo, mejorar precisión y disminuir regresiones.
- Runtime Map V1 no autoriza refactor.
- Identificar cajas no significa extraer cajas.
