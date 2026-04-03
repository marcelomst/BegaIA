# Slot Governance — numGuests

## Hito

REF-PIPELINE-GUEST-COUNT-INGESTION-HARDENING-01

---

## Objetivo

Definir la regla canónica de ingestión e interpretación de `numGuests` dentro del dominio `reservation`.

---

## Principio

```text
numGuests = total final de huéspedes de la reserva
```

No representa:

- adultos
- niños
- capacidad
- inferencias por roomType

---

## Jerarquía de interpretación

### 1. Total directo explícito

Ejemplos:

- `2 personas`
- `3 huéspedes`
- `somos 3`
- `vamos 2`
- `seríamos 4`

Regla:

- tiene prioridad máxima
- define directamente `numGuests`

---

### 2. Composición explícita

Ejemplos:

- `2 adultos y 1 menor`
- `2 mayores y 1 niño`
- `2 adultos, 1 menor y 1 bebé`

Regla:

- `numGuests = suma de componentes`

---

### 3. Respuesta corta contextual

Ejemplos:

- `2`
- `3`

Regla:

- solo válida en contexto conversacional
- responsabilidad del runtime

---

## Precedencia

```text
1. total directo
2. composición
3. respuesta contextual
```

---

## Manejo de contradicciones

Ejemplo:

- `somos 2, 2 adultos y 1 menor`

Regla:

- el helper NO resuelve
- no elegir arbitrariamente
- dejar al runtime la aclaración

---

## Frontera de responsabilidad

### Helper

Responsable de:

- parsing semántico
- total directo
- composición

No debe:

- interpretar números ambiguos
- manejar contexto conversacional
- resolver contradicciones

---

### Runtime

Responsable de:

- follow-up corto (`2`)
- continuidad conversacional
- modify
- validación final

---

## Reglas clave

- misma frase → mismo resultado en create y modify
- no inferir huéspedes por roomType
- no absorber números ambiguos sin contexto

---

## Criterio de éxito

- una única semántica clara
- helper y runtime no compiten
- reducción de repreguntas innecesarias
- comportamiento consistente en create y modify
