## 🧠 PROMPT — CHECKPOINT ARQUITECTÓNICO

### Contexto

Estamos evaluando el estado del runtime de BEGASIST para determinar readiness hacia Nivel 4 (refactor), sin alterar la arquitectura actual.

El sistema:

- mantiene `messageHandler` como runtime principal
- NO ha migrado a graph
- ha incorporado múltiples fixes en:
  - create
  - modify
  - verify
  - laterales (faq/policies)

---

### HITO

`<NOMBRE_DEL_HITO_O_BLOQUE>`

---

### OBJETIVO

Evaluar condiciones de entrada a Nivel 4 según el roadmap.

---

### INSTRUCCIONES

Analizá el estado del sistema considerando:

- comportamiento real observado (tests + validación manual)
- consistencia entre slices (create / modify / verify / laterales)
- gobernanza de dominio y precedencia
- continuidad multi-turno
- evidencia acumulada (no un solo hito)

---

### OUTPUT REQUERIDO (OBLIGATORIO)

```text
estado: A) Listo / B) Parcialmente listo / C) No listo

- comportamiento estable: ✔ / ⚠ / ❌
- slices claros: ✔ / ⚠ / ❌
- tests sólidos: ✔ / ⚠ / ❌
- evidencia cross-slice: ✔ / ⚠ / ❌
- readiness para refactor: ✔ / ⚠ / ❌
```

---

### CONDICIONES

- NO sugerir refactor aún
- NO proponer graph
- NO diseñar soluciones nuevas

👉 Solo evaluar estado actual del sistema

---

### SALIDA ADICIONAL

Breve justificación (máx 10 líneas):

- qué está sólido
- qué sigue siendo incierto
- qué bloquea readiness real de Nivel 4
