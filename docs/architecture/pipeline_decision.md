# Pipeline Decision — Risk Policy D1

Fecha: 2026-03-06  
Estado: vigente

## Contexto

Se cierra el hito `FIX-PIPELINE-RISK-POLICY-1A` para corregir regresión conceptual de D1.

Antes del ajuste, `riskPolicy` podía degradar decisiones válidas del supervisor
al forzar `pending` por `riskLevel=HIGH` incluso cuando ya existía
`supervisorStatus="sent"`.

## Orden conceptual del pipeline

`combinedMode` + decisión de supervisor -> `riskPolicy` -> `finalStatus`

La decisión primaria sigue siendo la del supervisor.

## Definición de D1 (cierre arquitectónico)

D1 se define como capa de promoción para LOW en modo supervisado.

Reglas:

- si `combinedMode !== "supervised"`: no hay override especial
- si `supervisorStatus === "sent"`: preservar `sent`
- si `supervisorStatus === "pending"` y `riskLevel === "LOW"`: promover a `sent`
- si `supervisorStatus === "pending"` y `riskLevel === "HIGH"`: mantener `pending`

## Regla arquitectónica explícita

`riskPolicy` nunca debe degradar una decisión válida del supervisor desde `sent` a `pending`.

## Evidencia funcional del hito

- `pnpm run ts-check` -> PASS
- `pnpm exec vitest run test/golden` -> PASS
- `pnpm exec vitest run test/unit/messageHandler.autosend.safe_general.test.ts test/unit/messageHandler.autosend.snapshot_verify.test.ts` -> PASS

## Deuda separada (Twilio)

La suite completa reporta fallos en
`test/api.webhooks.whatsapp.twilio.route.spec.ts`, diagnosticados como deuda
independiente:

- el webhook Twilio corta antes del pipeline si no resuelve `to -> hotelId`
- en ese escenario no se invoca `handleChannelMessage`
- no hay relación causal con `riskPolicy`
