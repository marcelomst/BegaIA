# Serie mínima de tests manuales de estrés

## E1. Replace después de acción iniciada

**Objetivo**
Verificar que una corrección tardía reemplaza el target correcto sin ejecutar sobre la reserva anterior.

**Precondición manual**
Tener al menos 2 reservas activas visibles.

**Turnos**

1. `cancelá la primera`
2. `no, la segunda`

**Esperado**

- no cancela todavía la primera
- cambia el target a la segunda
- sigue en flujo de cancelación
- la confirmación posterior afecta solo a la segunda

---

## E2. Confirmación no debe ejecutarse sobre target viejo

**Objetivo**
Verificar que después de un replace, el `confirmar` aplica al target nuevo.

**Precondición manual**
Continuación de E1.

**Turnos**

1. `confirmar`

**Esperado**

- se cancela la segunda
- la primera queda intacta
- `mostrame mis reservas` refleja eso correctamente

---

## E3. Ambigüedad real no inventa target

**Objetivo**
Verificar que el sistema no “adivina” una reserva cuando no hay selección suficiente.

**Precondición manual**
Tener más de una reserva activa.

**Turnos**

1. `quiero modificar mi reserva`
2. `esa`

**Esperado**

- no inventa target
- pide precisión
- no entra en snapshot mágico
- no entra en create

---

## E4. Fuera de rango ordinal

**Objetivo**
Verificar seguridad ante ordinal inexistente.

**Precondición manual**
Tener 2 reservas visibles.

**Turnos**

1. `mostrame mis reservas`
2. `cancelá la cuarta`

**Esperado**

- no ejecuta cancelación
- pide aclaración o marca que no existe esa referencia
- no elige una reserva arbitraria

---

## E5. Cambio de dominio fuerte limpia arrastre indebido

**Objetivo**
Verificar que un target de reserva no contamina una FAQ y no genera acciones raras.

**Precondición manual**
Tener una reserva seleccionada por snapshot o modify reciente.

**Turnos**

1. `mostrame la segunda`
2. `a qué hora es el check-in`
3. `cancelala`

**Esperado**

- el turno 2 responde FAQ normal
- el turno 3 se comporta de forma coherente con la política actual:
  - o preserva correctamente el target si ese es el contrato
  - o pide precisión si el dominio fuerte limpió el target

- nunca inventa una reserva distinta

---

## E6. Small talk no debe romper target

**Objetivo**
Verificar que un turno irrelevante no borra ni reemplaza target.

**Precondición manual**
Tener una reserva seleccionada.

**Turnos**

1. `mostrame la primera`
2. `gracias`
3. `cancelala`

**Esperado**

- `gracias` no cambia el target
- `cancelala` sigue refiriendo a la primera
- no pide código otra vez sin motivo

---

## E7. Snapshot posterior a cancelación

**Objetivo**
Verificar consistencia después de una operación terminal.

**Precondición manual**
Haber cancelado una reserva correctamente.

**Turnos**

1. `mostrame esa`

**Esperado**

- comportamiento coherente:
  - o muestra el estado cancelado de esa reserva
  - o pide precisión si el target terminal se limpió

- no muestra otra reserva por error
- no revive una reserva activa equivocada

---

## E8. Modify con corrección múltiple

**Objetivo**
Verificar estabilidad cuando el usuario corrige dos veces el target.

**Precondición manual**
Tener 3 reservas activas.

**Turnos**

1. `quiero modificar mi reserva`
2. `la primera`
3. `no, la segunda`
4. `perdón, la última`
5. `cambiar huéspedes`

**Esperado**

- el target final debe ser la última
- no debe ejecutar nada sobre primera ni segunda
- `cambiar huéspedes` opera sobre la última
- no cae en snapshot incorrecto ni create

---

# Orden recomendado

1. **E1**
2. **E2**
3. **E3**
4. **E4**
5. **E6**
6. **E5**
7. **E7**
8. **E8**

---

# Criterio de aprobación

Esta batería queda bien si confirmás que el sistema:

- reemplaza target correctamente
- no ejecuta sobre target viejo
- no inventa reservas
- maneja ambigüedad con seguridad
- no arrastra target de forma peligrosa
- no lo pierde por small talk
- mantiene coherencia después de cancelación

Si querés, te los convierto en una **planilla Markdown con columnas ID / precondición / turnos / esperado / resultado / estado**.
