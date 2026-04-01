# Technical Debt

## TEST-SUITE-STABILITY-01

Estado:

- pendiente

Prioridad:

- media

Problema:

- tests dependientes de timing real, mocks globales y sensibilidad a suite completa

Contexto:

- aparece tras fixes de pipeline y durante estabilización de comportamiento en runtime

Causa probable:

- timing
- mocks
- integración acoplada

Impacto:

- fragilidad de suite
- falsos negativos
