Sí. Para confirmar esa **precondición de Nivel 0** yo diseñaría una **mini batería manual específica de motor de referencias**, antes de seguir con create/cancel/modify completos.

La idea es no testear todavía “todo reservas”, sino aislar esto:

- selección explícita
- selección ordinal
- anáfora básica
- lifecycle del target

Como el widget real reusa `conversationId` entre turnos y el backend procesa cada turno dentro de esa misma conversación, estos tests manuales tienen sentido como conversación secuencial real.

## Propuesta de serie de tests manuales

### A. Selección explícita del target

Objetivo: verificar que el sistema fija correctamente `selectedReservationTarget`.

**Precondición manual**
Tener un guest con al menos 2 reservas activas distinguibles.

**Caso A1 — selección por código**

1. `mostrame mi reserva ABC123`
2. `quiero cambiar esa`

**Esperado**

- En el paso 1 responde con snapshot/resumen de `ABC123`.
- En el paso 2 interpreta “esa” como `ABC123`.
- No deriva a otra reserva.

**Caso A2 — cambio directo sobre código**

1. `quiero cancelar la reserva ABC123`
2. `si`

**Esperado**

- El flujo queda centrado en `ABC123`.
- La confirmación afecta esa reserva y no otra.

---

### B. Resolución ordinal estable

Objetivo: verificar que ordinales apuntan bien y de forma consistente.

**Precondición manual**
Guest con 3 reservas ordenables de forma visible.

**Caso B1 — primera / segunda / última**

1. `mostrame mis reservas`
2. `mostrame la primera`
3. `mostrame la segunda`
4. `mostrame la ultima`

**Esperado**

- Cada referencia ordinal resuelve una reserva distinta y coherente con el orden mostrado.
- “última” no colapsa a “primera” ni a una aleatoria.

**Caso B2 — ordinal + acción**

1. `quiero cambiar mi reserva`
2. `la segunda`
3. `cambiame la fecha`

**Esperado**

- El sistema toma la segunda como target.
- El turno 3 sigue sobre esa misma reserva.

**Caso B3 — fuera de rango**

1. `mostrame mis reservas`
2. `cancelá la cuarta`

**Esperado**

- Pide aclaración.
- No inventa una cuarta reserva.
- No ejecuta cancelación.

---

### C. Anáforas básicas

Objetivo: verificar que “esa” hereda el target correcto.

**Caso C1 — anáfora inmediata**

1. `mostrame la segunda`
2. `cancelá esa`

**Esperado**

- “esa” refiere a la segunda.
- No pide de nuevo código si el target ya quedó claro.

**Caso C2 — anáfora tras snapshot**

1. `cual es mi reserva ABC123`
2. `modificá esa`

**Esperado**

- “esa” sigue apuntando a `ABC123`.

**Caso C3 — anáfora con ambigüedad previa**

1. `mostrame mis reservas`
2. `quiero cambiar una`
3. `esa`

**Esperado**

- Si no hubo selección concreta antes, “esa” no debería resolver mágicamente.
- Debe pedir precisión.

---

## D. Lifecycle del target

Acá está lo más importante. Hay que probar explícitamente los 4 comportamientos: `preserve / replace / clear / ignore`.

---

### D1. PRESERVE

Objetivo: una vez elegido target, un turno compatible no debe perderlo.

**Caso D1.1**

1. `mostrame la primera`
2. `quiero cambiarla`
3. `cambiame la fecha de entrada`

**Esperado**

- El target sigue siendo la primera durante todo el flujo.
- No vuelve a preguntar cuál reserva.

**Caso D1.2**

1. `quiero cancelar la reserva ABC123`
2. `si, esa misma`

**Esperado**

- Conserva `ABC123`.
- “esa misma” no rompe el target.

---

### D2. REPLACE

Objetivo: una selección nueva y explícita reemplaza la anterior.

**Caso D2.1**

1. `mostrame la primera`
2. `en realidad la segunda`
3. `cancelala`

**Esperado**

- El target pasa de primera a segunda.
- El paso 3 actúa sobre la segunda.

**Caso D2.2**

1. `quiero modificar ABC123`
2. `mejor DEF456`
3. `cambiá el checkout`

**Esperado**

- El target final es `DEF456`.

---

### D3. CLEAR

Objetivo: ciertas transiciones deben limpiar el target para evitar arrastre indebido.

**Caso D3.1 — cierre de flujo**

1. `quiero cancelar ABC123`
2. `si`
3. `quiero reservar una habitación doble`

**Esperado**

- Tras cancelación cerrada, el target anterior no debe contaminar la nueva intención de create.
- El sistema arranca flujo nuevo.

**Caso D3.2 — cambio de dominio**

1. `mostrame la segunda`
2. `a que hora es el check in`

**Esperado**

- La FAQ no debe quedar contaminada por el target de reserva.
- Responde FAQ normal.
- Luego, si volvés a “cancelala”, ahí se ve si el sistema limpió o preservó demasiado. Idealmente, si el dominio cambió de forma fuerte, debería pedir precisión o requerir reselección.

---

### D4. IGNORE

Objetivo: mensajes irrelevantes no deben reemplazar ni borrar target.

**Caso D4.1**

1. `mostrame la segunda`
2. `gracias`
3. `cancelala`

**Esperado**

- “gracias” no reemplaza target.
- “cancelala” sigue refiriendo a la segunda.

**Caso D4.2**

1. `quiero cambiar ABC123`
2. `ok`
3. `la fecha`

**Esperado**

- `ok` no rompe el target.
- Continúa sobre `ABC123`.

---

## E. Casos frontera que conviene incluir

Estos son los que más valor te van a dar.

### E1. Replace después de anáfora

1. `mostrame la primera`
2. `cancelá esa`
3. `no, mejor la segunda`

**Esperado**

- El motor admite reemplazo correcto.
- No queda “pegado” a la primera.

### E2. Clear tras operación terminal

1. `cancelá la segunda`
2. `si`
3. `mostrame esa`

**Esperado**

- No debería mostrar una reserva ya cancelada como target activo sin aclaración.
- O bien responde con estado final, o pide precisión.

### E3. Ignore de small talk

1. `mostrame la ultima`
2. `perfecto`
3. `modificala`

**Esperado**

- `perfecto` no altera target.

### E4. Ambigüedad real

1. `quiero cambiar mi reserva`
2. `esa`

**Esperado**

- No debe inventar target.
- Debe pedir cuál reserva.

---

## Formato sugerido para ejecutar el testing manual

Para cada caso, registrar:

- **ID**: `REF-L0-D2-01`
- **Precondición**
- **Turnos exactos**
- **Respuesta esperada**
- **Resultado real**
- **Estado**: pass / fail
- **Notas**: si hubo loop, fallback incorrecto, pérdida de target o invención

---

## Orden recomendado de ejecución

1. **Selección explícita**
2. **Ordinales**
3. **Anáfora**
4. **Preserve**
5. **Replace**
6. **Ignore**
7. **Clear**
8. **Casos frontera**

Ese orden te ayuda porque, si falla lo básico, no tiene sentido interpretar todavía fallos de lifecycle.

## Criterio de aprobación de Nivel 0

Yo diría que Nivel 0 queda “realmente confirmado” si pasa esto:

- selección explícita correcta
- ordinales correctos y fuera de rango seguros
- “esa” funciona solo cuando corresponde
- preserve no pierde target
- replace sí reemplaza
- clear evita arrastre entre flujos
- ignore no borra ni muta target
- nunca inventa reservas

## Próximo paso sugerido

Después de esto, el siguiente bloque manual natural sería:

**NIVEL 1 — Snapshot + Reference Continuity**

- `mi reserva`
- `mostrame la segunda`
- `cancelá esa`
- `modificá la primera`
- `mostrame la última`

Ahí ya empezás a validar paridad real con UX observable.

Si querés, en el próximo mensaje te lo convierto en una **tabla lista para pegar en Markdown** con IDs de caso, pasos y expected result.
