// Path: README.md

# Begasist

[![ci-core](https://github.com/marcelomst/BegaIA/actions/workflows/ci-core.yml/badge.svg?branch=main)](https://github.com/marcelomst/BegaIA/actions/workflows/ci-core.yml)

## 1. Project Overview

Begasist es un sistema SaaS conversacional para hotelería, diseñado para operar
como concierge digital del hotel a través de múltiples canales.

Su objetivo general es asistir la interacción entre huéspedes y hotel mediante
un runtime conversacional que puede:

- responder consultas operativas e informativas
- guiar flujos de reserva
- soportar follow-ups sobre reservas, como snapshot, modify y cancel
- mantener continuidad conversacional entre turnos
- integrarse con operación asistida por humanos cuando la automatización total
  no corresponde

Begasist no debe entenderse como un chatbot genérico. Es un sistema
conversacional orientado por dominio para operación hotelera.

## 2. System Context

Begasist opera como un sistema SaaS multicanal dentro del dominio hotelero.

Tecnologías y bloques principales:

- `Next.js`
- `TypeScript`
- `LangChain`
- `LangGraph`
- runtime conversacional centrado en `messageHandler`
- contexto conversacional persistido y proyecciones locales de estado

Canales soportados o documentados:

- web
- WhatsApp
- email
- integraciones externas conectadas cuando corresponda

Dentro del negocio, el sistema cumple el rol de capa conversacional entre
huéspedes, conocimiento operativo del hotel y flujos vinculados a reservas.

## 3. Architecture Overview

A alto nivel, Begasist se organiza alrededor de un runtime conversacional
central que coordina:

- ingreso por canal
- contexto conversacional
- routing por dominio
- guards deterministas
- interpretación semántica
- ejecución de dominio
- composición de respuesta

La arquitectura actual es híbrida. No es puramente graph-driven ni puramente
LLM-driven, y ese estado responde a una evolución controlada del runtime cuya
dirección y restricciones están ancladas en
`docs/architecture/ADR-PIPELINE-RUNTIME-TARGET.md`.

Conceptos arquitectónicos relevantes:

- pipeline conversacional
- estado canónico local para reservas
- separación entre fuente externa de verdad y proyecciones del runtime
- ejecución por dominios
- manejo explícito del lifecycle de reservas
- separación entre arquitectura, operación, historia y artefactos derivados

El comportamiento detallado del runtime se documenta en los documentos de
arquitectura, no en este README.

## 4. Project Structure

Directorios principales y propósito:

- `app/`
  - rutas de Next.js, endpoints API y puntos de entrada de UI

- `components/`
  - componentes frontend y administrativos

- `lib/`
  - runtime central, handlers, agentes, adaptadores de persistencia y lógica
    de dominio

- `test/`
  - suites unitarias, de integración y guardrails de comportamiento

- `docs/`
  - índice global de documentación y organización por plano documental

- `docs/architecture/`
  - arquitectura viva, ADRs, modelo operativo y documentación del runtime

- `docs/product/`
  - documentación conceptual de producto

- `docs/development/`
  - documentación orientada a desarrollo y disciplina de trabajo

- `public/`
  - assets estáticos y archivos públicos

- `_legacy/`
  - documentos históricos de raíz preservados fuera de la ruta documental
    principal

- `hito_mcp.md`
  - historial de hitos y cierres documentales

## 5. Working with this Project (ChatGPT / agentes)

Begasist está organizado para que humanos y agentes trabajen sobre el mismo
modelo documental.

Fuentes de verdad:

- `docs/architecture/system_operating_model.md`
  - contrato operativo global

- `/home/marcelo/.codex/config.toml`
  - definición operativa de agentes en VSCode Codex
  - modelos, prompts y responsabilidades reales

REGLA:

- el operating model gobierna la disciplina
- `config.toml` gobierna la ejecución de agentes

Al usar este proyecto desde ChatGPT o mediante agentes especializados:

- usar este README como puerta de entrada general
- usar la documentación de arquitectura para entender cómo funciona el sistema
- usar el historial de hitos para entender la evolución del sistema
- usar el modelo operativo para entender cómo se gobierna el trabajo sobre el
  sistema

This project is governed by `docs/architecture/system_operating_model.md` as the operational contract.

Ese documento es la fuente de verdad para la operación del proyecto. Este
README no redefine esas reglas.

## 6. Documentation Hierarchy

La jerarquía documental del proyecto puede leerse así:

- `README.md`
  - puerta de entrada general al sistema

- `docs/architecture/system_operating_model.md`
  - contrato operativo del sistema
  - fuente de verdad para gobernanza del trabajo y cierre documental

- `docs/architecture/*`
  - arquitectura viva, decisiones estructurales y comportamiento del runtime

- `hito_mcp.md`
  - trazabilidad histórica de hitos y cierres

Si existe conflicto de interpretación operativa, prevalece:

- `docs/architecture/system_operating_model.md`

Si existe una afirmación arquitectónica cuya dirección depende de una decisión
estructural, debe leerse junto con su ADR correspondiente.

## 7. Documentation Map

Documentos principales:

- `docs/README.md`
  - punto de entrada global de la documentación

- `docs/architecture/system_operating_model.md`
  - contrato operativo y gobernanza documental

- `docs/architecture/README.md`
  - taxonomía y navegación de la documentación de arquitectura

- `docs/architecture/message_pipeline.md`
  - arquitectura viva del runtime conversacional y del pipeline

- `docs/architecture/ADR-DOC-GOVERNANCE-01.md`
  - decisión estructural sobre gobernanza documental

- `docs/architecture/ADR-PIPELINE-RUNTIME-TARGET.md`
  - decisión arquitectónica sobre el runtime target

- `docs/architecture/ADR-EMAIL-TRANSPORT-TARGET.md`
  - decisión arquitectónica sobre el transporte email objetivo

- `docs/product/architecture_concierge.md`
  - explicación del modelo de producto tipo concierge

- `hito_mcp.md`
  - historial de hitos y registro de cierres documentales

## Quick Start

Instalar dependencias:

```bash
pnpm install
```

Levantar entorno de desarrollo:

```bash
pnpm dev
```

Ejecutar suite core:

```bash
pnpm test:core
```

Ejecutar chequeo de tipos:

```bash
pnpm run ts-check
```

## Notes

Si la documentación parece entrar en conflicto:

- usar `docs/architecture/system_operating_model.md` para interpretación
  operativa
- usar `docs/architecture/message_pipeline.md` para arquitectura viva del
  runtime
- usar `hito_mcp.md` para trazabilidad histórica de hitos
- usar las ADRs para decisiones estructurales explícitas
