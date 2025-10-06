```mermaid
flowchart LR
  %% =========================
  %% Flujo preventa → venta → posventa (nombres reales)
  %% =========================

  subgraph A[preVenta]
    U[ChatPage.tsx (Usuario)] -->|mensaje libre| NLU[messageHandler.ts → guards + señales]
    NLU -->|slots parciales / señales (fechas,pax,modo)| GRAPH[graph.ts → agentGraph.invoke]
    GRAPH -->|cuando faltan datos| FILL[reservations.ts → fillSlotsWithLLM()]
    FILL -->|JSON (slots)| NLU
    GRAPH -->|intención ≠ reservar| FAQ[hotelAssistantStructuredPrompt.ts → respuesta LLM]
  end

  subgraph B[venta (motor de reservas)]
    GRAPH -->|slots completos| PREP[messageHandler.ts → preparar consulta]
    PREP --> AVQ[reservations.ts → askAvailability(slots)]
    AVQ --> TOOL_CHECK[[mcp.ts → checkAvailability (Zod)]]
    TOOL_CHECK -->|ok & available=true| PROP[reservations.ts → formatear propuesta (LLM/UI)]
    TOOL_CHECK -->|ok & available=false| NOAVL[UI: sin disponibilidad + alternativas]
    TOOL_CHECK -->|error técnico| TECHERR[UI: error técnico + handoff]

    PROP -->|“¿CONFIRMAR?”| CONF[messageHandler.ts → confirmar intención]
    CONF --> CREATE[reservations.ts → confirmAndCreate()]
    CREATE --> TOOL_CREATE[[mcp.ts → createReservation (Zod)]]
    TOOL_CREATE -->|created| CREATED[UI: confirmación + reservationId]
    TOOL_CREATE -->|error| CREERR[UI: error + handoff]
  end

  subgraph C[posVenta]
    CREATED --> POST1[Automations: enviar confirmación (email/WhatsApp)]
    POST1 --> POST2[Upsell/Extras (LLM + reglas)]
    NOAVL --> HANDOFF1[[Recepción (Handoff)]]
    TECHERR --> HANDOFF2[[Recepción (Handoff)]]
    CREERR --> HANDOFF3[[Recepción (Handoff)]]
  end

  %% Estados y persistencia
  PROP --> SNAP[lib/db/convState → lastProposal/salesStage]
  CREATED --> SNAP2[lib/db/convState → última reserva]
  NOAVL --> PENDING1[(messages: pending)]
  TECHERR --> PENDING2[(messages: pending)]
  CREERR --> PENDING3[(messages: pending)]
  PENDING1 --> SENT1[(messages: sent)]
  PENDING2 --> SENT2[(messages: sent)]
  PENDING3 --> SENT3[(messages: sent)]

  %% Ramas especiales (modificar)
  NLU -->|modo modificar| MODIFY[UI: menú “cambiar fechas/habitación/huéspedes”]
  MODIFY --> FILL

  %% === Estilos por tipo ===
  classDef llm fill:#e8f0fe,stroke:#3b82f6,stroke-width:1px,color:#0f172a;
  classDef det fill:#f3f4f6,stroke:#6b7280,stroke-width:1px,color:#111827;
  classDef api fill:#ecfeff,stroke:#06b6d4,stroke-width:1px,color:#083344;
  classDef ui fill:#fff7ed,stroke:#f97316,stroke-width:1px,color:#7c2d12;
  classDef human fill:#fef2f2,stroke:#ef4444,stroke-width:1px,color:#7f1d1d;
  classDef state fill:#eef2ff,stroke:#6366f1,stroke-width:1px,color:#1e1b4b;
  classDef db fill:#f0fdf4,stroke:#16a34a,stroke-width:1px,color:#052e16;

  class FILL,FAQ,PROP llm
  class NLU,GRAPH,PREP,CONF det
  class TOOL_CHECK,TOOL_CREATE api
  class U,NOAVL,TECHERR,CREERR,CREATED,POST1,POST2,MODIFY ui
  class HANDOFF1,HANDOFF2,HANDOFF3 human
  class PENDING1,PENDING2,PENDING3,SENT1,SENT2,SENT3 state
  class SNAP,SNAP2 db
```
