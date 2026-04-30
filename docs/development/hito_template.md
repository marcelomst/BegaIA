# HITO_TEMPLATE_V1

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

---

## USAGE (OBLIGATORIO)

AGPT DEBE usar esta plantilla para TODOS los hitos.

No es opcional.

Regla:

- no expandir contexto innecesario
- no copiar reasoning completo
- no duplicar reglas ya contenidas en `config.toml` o `system_operating_model.md`

Principio:

> AGPT no transporta razonamiento, transporta estado operativo.

---

## TEMPLATE

### HITO

- `id`: <HITO_ID>
- `agent_target`: <asistente_tecnico | repo_guardian | hdoc | arquitecto_sistema | arquitecto_kb>
- `flow_position`: <analysis | implementation | audit | documentation>

---

### OBJETIVO

Una sola línea clara, ejecutable y verificable.

---

### CONTEXTO MÍNIMO

Máximo 3–5 bullets.

Incluir solo lo necesario para ejecutar el hito.

Ejemplo:

- fix en create date parsing
- afecta messageHandler
- no cambia estructura de estado

Prohibido:

- reasoning largo
- historia completa del problema
- duplicación de documentos

---

### EVIDENCIA

Incluir solo si aplica:

- `archivos_afectados`: <lista corta>
- `commit_hash`: <si existe>
- `diff`: <solo si es necesario y resumido>

---

### RESULTADO PREVIO

Salida del agente anterior en formato resumido.

Máximo 3–5 líneas.

---

### TAREA

Acción concreta que debe ejecutar el agente.

Debe ser:

- específica
- acotada
- ejecutable sin ambigüedad

---

### RESTRICCIONES

- usar `config.toml` como fuente de verdad de agentes
- respetar `system_operating_model.md`
- mantener cambios mínimos y auditables
- no introducir capas paralelas
- no duplicar lógica
- no adelantar refactors fuera del roadmap

---

### OUTPUT ESPERADO

Definir explícitamente qué debe devolver el agente.

Ejemplos:

- Técnico → explicación + diff
- Guardian → dictamen + salida estructurada
- HDOC → diagnóstico o cierre documental

---

## REGLA DE EFICIENCIA (CRÍTICO)

AGPT debe:

- minimizar tokens por hito
- evitar redundancia
- no repetir contexto ya conocido por agentes
- no incluir system prompts
- no incluir documentación completa

---

## RELACIÓN CON EL SISTEMA

Esta plantilla se alinea con:

- `system_operating_model.md` → contrato operativo
- `CAPSULE_TEMPLATE_V3.md` → contexto portable
- `config.toml` → comportamiento de agentes

---

## PRINCIPIO FINAL

1 hito = 1 intención clara
1 agente = 1 responsabilidad

NOTAS
Esta plantilla es obligatoria para AGPT
No debe simplificarse sin justificación
Su objetivo es reducir costo y mejorar precisión del sistema
