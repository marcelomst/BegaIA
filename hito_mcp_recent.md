# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01

- Identificador: `FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01`
- Nombre: `FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01`
- Commit message: `fix(runtime): preserve proposal dominance over confirmed modify fallback`
- Hash: `d6656276b3bc1f4451cb5a178ec697d31311239b`
- Descripción breve: Corrige la frontera proposal-vs-confirmed en `modify`, evita fallback implícito sobre target confirmado cuando domina un draft/proposal y refresca Runtime Map V1 sin cambio arquitectónico.

## 2. TECH-DEMO-LOCAL-ORCHESTRATION-HEALTHCHECKS-01

- Identificador: `TECH-DEMO-LOCAL-ORCHESTRATION-HEALTHCHECKS-01`
- Nombre: `TECH-DEMO-LOCAL-ORCHESTRATION-HEALTHCHECKS-01`
- Commit message: `chore(demo): add local orchestration stack and healthchecks`
- Hash: `df8ee0dce93c28146e2524392852fae19ee4eaa5`
- Descripción breve: Consolida una unidad reproducible y observable para la demo local de BegaIA con Docker Compose, core mínimo `redis/suite/hotel-demo`, perfiles opcionales `email-worker/cloudflared`, healthchecks, smoke no destructivo y documentación operativa mínima, sin tocar el runtime conversacional.

## 3. FIX-ADMIN-BEGAIA-DOCUMENT-TITLE-01

- Identificador: `FIX-ADMIN-BEGAIA-DOCUMENT-TITLE-01`
- Nombre: `FIX-ADMIN-BEGAIA-DOCUMENT-TITLE-01`
- Commit message: `FIX-ADMIN-BEGAIA-DOCUMENT-TITLE-01`
- Hash: `1f1775d4e7f21b72420fec406fc7cf0261eddba8`
- Descripción breve: Corrige exclusivamente la grafía canónica del título global del documento en `app/layout.tsx`, cambiando `BegAI` por `BegaIA` sin tocar favicon, widget, runtime ni otras ocurrencias fuera de alcance.

## 4. IMPROVE-APP-DEMO-FAVICONS-01

- Identificador: `IMPROVE-APP-DEMO-FAVICONS-01`
- Nombre: `IMPROVE-APP-DEMO-FAVICONS-01`
- Commit message: `IMPROVE-APP-DEMO-FAVICONS-01`
- Hash: `634ee69fcf269e3403a3e1a21c16c599d47fc9be`
- Descripción breve: Alinea los favicons finales de BegaIA/Admin y Hotel Demo, usa el asset oficial `begaia-favicon-base-512.png` para la app principal, regenera `app/favicon.ico` en 16x16, 32x32 y 48x48, y agrega favicon HD propio al Hotel Demo.

## 5. IMPROVE-WIDGET-ASSISTANT-PERSONA-AVATAR-01

- Identificador: `IMPROVE-WIDGET-ASSISTANT-PERSONA-AVATAR-01`
- Nombre: `IMPROVE-WIDGET-ASSISTANT-PERSONA-AVATAR-01`
- Commit message: `IMPROVE-WIDGET-ASSISTANT-PERSONA-AVATAR-01`
- Hash: `0fdc5b9eaf5ac95bd0f74bd59c1483bc9693c32f`
- Descripción breve: Incorpora identidad visual configurable del asistente en el widget con `assistantBranding.avatarVariant`, selector visual en Admin, resolución tenant-aware vía `/widget/embed`, fallback legacy oficial BegaIA y render final normalizado de avatar.

## 6. IMPROVE-ADMIN-BEGAIA-BRAND-IDENTITY-01

- Identificador: `IMPROVE-ADMIN-BEGAIA-BRAND-IDENTITY-01`
- Nombre: `IMPROVE-ADMIN-BEGAIA-BRAND-IDENTITY-01`
- Commit message: `IMPROVE-ADMIN-BEGAIA-BRAND-IDENTITY-01`
- Hash: `4c3cdea0f609c5e80ac0f9c6fde134ef32635df0`
- Descripción breve: Alinea el shell global del Admin con la identidad oficial de BegaIA, incorpora una única presencia global de marca en el sidebar usando el símbolo monocromático blanco y la grafía exacta `BegaIA`, sin alterar navegación ni comportamiento funcional.

## 7. COM-03-ALIGN-15MIN-COMMERCIAL-DEMO-01

- Identificador: `COM-03-ALIGN-15MIN-COMMERCIAL-DEMO-01`
- Nombre: `COM-03-ALIGN-15MIN-COMMERCIAL-DEMO-01`
- Commit message: `docs(demo): align commercial demo with governed operations`
- Hash: `c7333c58ef7e53475e9bef3102a5e5fbc2ab904a`
- Descripción breve: Alinea el demo comercial de 15 minutos con el framing de operaciones gobernadas, reforzando estructura, yes-guard, identidad, multicanalidad, confirmación, supervisión y trazabilidad sin tocar runtime ni arquitectura.

## 8. COM-03-REFRAME-NARRATIVE-CAPABILITIES-DEMO-01

- Identificador: `COM-03-REFRAME-NARRATIVE-CAPABILITIES-DEMO-01`
- Nombre: `COM-03-REFRAME-NARRATIVE-CAPABILITIES-DEMO-01`
- Commit message: `docs(product): reframe COM-03 around governed operations`
- Hash: `1710f10fd5a42910a00caa594ede78b8e96a1c8a`
- Descripción breve: Reencuadra COM-03 alrededor de operaciones gobernadas, alineando narrativa, mapa de capacidades y selección de demos para reforzar posicionamiento comercial sin tocar arquitectura ni runtime.

## 9. DOC-HOTEL-CONVERSATIONAL-MARKET-OBSERVATION-01

- Identificador: `DOC-HOTEL-CONVERSATIONAL-MARKET-OBSERVATION-01`
- Nombre: `DOC-HOTEL-CONVERSATIONAL-MARKET-OBSERVATION-01`
- Commit message: `docs(product): add hotel conversational market observation`
- Hash: `a5c2b8882b84d1494bb6874b1e1a6004d3670dc2`
- Descripción breve: Incorpora una observación de mercado sobre el espacio de hotelería conversacional como referencia estratégica interna, no normativa y orientada a discovery comercial, posicionamiento y revisión futura de materiales.

## 10. DOC-PXSOL-BEGAIA-COMPETITIVE-ANALYSIS-V2-01

- Identificador: `DOC-PXSOL-BEGAIA-COMPETITIVE-ANALYSIS-V2-01`
- Nombre: `DOC-PXSOL-BEGAIA-COMPETITIVE-ANALYSIS-V2-01`
- Commit message: `docs: add PXSol vs BegaIA competitive analysis v2`
- Hash: `d1c7d3a442d306d0e7c78d47d219a81dd4241c4a`
- Descripción breve: Incorpora un análisis estratégico comparativo PXSol vs BegaIA V2 como referencia interna no normativa, sensible en el tiempo y orientada a diagnóstico comercial, revisión de claims y preparación futura de demos.
