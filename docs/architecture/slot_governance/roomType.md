# Slot Governance — roomType

## Hito

REF-PIPELINE-ROOM-TYPE-INGESTION-HARDENING-01

---

## Objetivo

Definir la regla canónica de ingestión y canonicalización de `roomType`.

---

## Principio

```text
schema = source of truth canónica
helper = detección + mapeo al canon
runtime = uso conversacional
```

---

## Canon

### Tipos válidos

- `single`
- `double`
- `triple`
- `quadruple`
- `twin`
- `suite`

---

### Aliases

- `simple` → `single`
- `individual` → `single`
- `doble` → `double`
- `matrimonial` → `double`
- `familiar` → `quadruple`

---

### Fuera del canon

No deben absorberse como `roomType`:

- `king`
- `queen`
- `standard`
- `deluxe`

---

## Jerarquía de interpretación

### 1. Tipo canónico explícito

- `double`
- `twin`
- `suite`

---

### 2. Alias canónico

- `matrimonial`
- `familiar`

---

### 3. Frases naturales

- `una doble`
- `habitación doble`
- `quiero una twin`
- `para dos en doble`

---

## Precedencia

```text
1. canónico directo
2. alias
3. contexto natural
```

---

## Manejo de contradicciones

Ejemplos:

- `doble twin`
- `matrimonial triple`

Regla:

- el helper NO decide
- devolver `undefined`
- runtime pide aclaración

---

## Frontera de responsabilidad

### Helper

Responsable de:

- detección léxica
- mapping a canon
- uso de regex robusto

No debe:

- inferir por cantidad de huéspedes
- definir un canon propio
- dejar valores no canónicos

---

### Schema

Responsable de:

- definir el canon
- normalizar valores
- ser fuente única de verdad

---

### Runtime

Responsable de:

- continuidad conversacional
- modify
- prompts
- uso del valor ya canónico

---

## Capacidad

```text
roomType → maxGuestsFor(...)
```

Debe usar el mismo canon.

---

## Reglas clave

- no valores “flotantes”
- no substring matching débil
- no canonicalización duplicada

---

## Criterio de éxito

- un solo canon consistente
- helper y schema alineados
- create y modify coherentes
- eliminación de falsos positivos
