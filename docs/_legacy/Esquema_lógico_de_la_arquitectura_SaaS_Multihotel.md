¡Excelente enfoque!
Un **diagrama visual** (tipo arquitectura lógica y de datos) es clave para revisar y ajustar *antes* de seguir agregando código o datos.

---

## 1️⃣ **Esquema lógico de la arquitectura SaaS Multihotel**

Te hago el esquema **lógico-funcional** primero, y luego te paso el **esquema de colecciones/datos** con los campos más relevantes.

---

### A. **Vista de Componentes y Flujo de Datos**

```
┌────────────────────┐
│   Hotel Admin UI   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Next.js API Routes │
└─────────┬──────────┘
          │
          ▼
┌─────────────────────────────┐
│      Lógica de Servicios    │
│ (Alta hotel, usuarios, etc) │
└─────────┬──────────┬────────┘
          │          │
          ▼          ▼
   ┌────────────┐  ┌───────────────┐
   │ AstraDB    │  │ Servicios ext │
   │ (colecciones)│ │ (email, WhatsApp, etc) │
   └────────────┘  └───────────────┘
```

---

### B. **Colecciones principales en AstraDB**

```
+-----------------+
| hotel_config    | ← Config y usuarios de cada hotel
+-----------------+
| hotelId         |
| hotelName       |
| timezone        |
| defaultLanguage |
| channelConfigs  |
| users[]         |
| emailSettings   |
| verification    |
| ...             |
+-----------------+

+-----------------+
| prompts         | ← Prompts curados (standard y custom)
+-----------------+
| hotelId         | (system para estándar)
| promptKey       |
| category        |
| content         |
| ...             |
+-----------------+

+-----------------+
| knowledge_base  | ← Documentos vectorizados
+-----------------+
| hotelId         |
| chunkId         |
| content         |
| embedding       |
| category        |
| ...             |
+-----------------+

+-----------------+
| messages        | ← Conversaciones por canal/hotel
+-----------------+
| hotelId         |
| messageId       |
| channel         |
| content         |
| sender          |
| status          |
| ...             |
+-----------------+

+-----------------+
| users           | ← (opcional si se desacopla de hotel_config)
+-----------------+
| userId          |
| hotelId         |
| email           |
| ...             |
+-----------------+
```

---

### C. **Flujo de creación de hotel (Onboarding)**

1. **Admin da de alta hotel**
   → API: `/api/hotels/create`
2. **Se crea el hotel en `hotel_config`**
   → Se crea admin inicial
   → Se copia la configuración de canales (solo web habilitado)
3. **Se clonan prompts estándar (`hotelId: "system"`) a prompts del hotel nuevo**
4. **Se habilita canal web por default**
   → Otros canales aparecen deshabilitados en el panel
5. **El admin puede cargar documentos a `knowledge_base`**
6. **Listo para usar canal web**

---

### D. **Relación entre colecciones**

```
[hotel_config]──────┐
   │  hotelId       │
   │                │
   ▼                ▼
[prompts]        [knowledge_base]
   │                │
   ▼                ▼
[messages] <──── [users]
    │
    ▼
[Servicios de canales externos]
```

---

### **Notas para optimización**

* **Prompts:**

  * Tener prompts “system” como fallback y copiados a cada hotel para customización.
* **Knowledge base:**

  * Una colección global con campo `hotelId` optimiza búsquedas y costos.
* **Canales:**

  * Estructura escalable: añadir canales es solo agregar config.
* **Usuarios:**

  * Si querés escalabilidad, desacoplarlos a una colección `users` global.

