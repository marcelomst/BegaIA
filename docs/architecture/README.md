# Arquitectura

![Arquitectura Begasist](./architecture_diagram.png)

Este diagrama resume la arquitectura general de Begasist (SaaS multihotel):

- Inbound por canales (Web / WhatsApp / Email / Channel Manager)
- Normalización a `ChannelMessage`
- Persistencia (AstraDB)
- Orquestación (LangGraph)
- Respuesta (automática o supervisada)
