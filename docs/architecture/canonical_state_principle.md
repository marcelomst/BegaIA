````md
// Path: /docs/architecture/canonical_state_principle.md

# CANONICAL STATE PRINCIPLE

## Propósito

Definir un principio operativo transversal para el pipeline conversacional de Begasist:

```text
El sistema debe operar sobre una representación canónica, consistente y confiable del estado de cada dominio.
```
````

Este principio guía la evolución del runtime sin modificar su arquitectura actual.

---

## Definición

Se entiende por **estado canónico**:

```text
una representación única, no ambigua y consistente de las entidades del dominio
sobre las que el sistema toma decisiones y ejecuta acciones
```

En el contexto actual (reservas), implica:

- una única representación por `reservationId`
- estado válido (`active`, `cancelled`, etc.)
- ausencia de duplicaciones lógicas
- coherencia entre memoria y ejecución

---

## Principios clave

### 1. El estado es la fuente de verdad

```text
El sistema debe basar sus decisiones en el estado interno,
no en interpretaciones del input del usuario.
```

---

### 2. Unicidad de entidad

```text
Cada entidad del dominio debe tener una única representación operativa.
```

Ejemplo:

- una reserva no puede existir duplicada en memoria o resolución

---

### 3. Consistencia antes de ejecución

```text
Ninguna acción puede ejecutarse sobre entidades inconsistentes o ambiguas.
```

Esto incluye:

- referencias múltiples
- targets no resueltos
- estado inválido

---

### 4. Resolución sobre estado, no sobre texto

```text
La resolución de targets debe operar sobre estructuras internas,
no sobre coincidencias textuales del input.
```

---

### 5. No duplicación de fuentes de verdad

```text
El sistema no debe introducir representaciones paralelas del mismo estado.
```

Ejemplo de anti-pattern:

- mantener lista de reservas en dos estructuras no sincronizadas

---

## Invariantes operativos

```text
1. Toda acción se ejecuta sobre una entidad única
2. Toda entidad tiene estado válido
3. No existen duplicaciones estructurales
4. El estado interno prevalece sobre el input del usuario
```

---

## Alcance actual

Este principio se aplica inicialmente al dominio:

```text
reservation
```

Y se implementa dentro de:

```text
messageHandler (runtime actual)
```

---

## Restricciones

```text
- No modificar el runtime actual
- No introducir nuevas capas arquitectónicas
- No generalizar a otros dominios en esta etapa
- No separar lógica fuera de messageHandler
```

---

## Evolución futura

Este principio será la base para:

- focus governance (Nivel 2)
- cross-domain governance (Nivel 3)
- futura formalización de capas semánticas

Pero en esta etapa:

```text
se aplica localmente por dominio
```

---

## Criterio de evaluación de hitos

Todo hito del pipeline debe cumplir:

```text
✔ mejora la canonicidad
✔ mantiene la canonicidad
❌ nunca la degrada
```

---

## Resumen

```text
El sistema no ejecuta sobre lo que el usuario dice.
Ejecuta sobre lo que el sistema sabe de forma consistente.
```

```

```
