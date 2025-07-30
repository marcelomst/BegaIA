Perfecto. Acá tenés el fragmento para agregar al `README.md`, documentando la diferencia entre los entornos:

---

### 🐳 Docker: Entorno de desarrollo vs producción

Este proyecto define dos configuraciones distintas para levantar la app con Docker:

#### 🔧 Desarrollo (`docker-compose.dev.yml`)

* Ideal para programar localmente con **hot reload**.
* Monta el código fuente (`.:/app`) y la carpeta de `.next` para actualizaciones automáticas.
* No monta `node_modules` para evitar conflictos con versiones de `pnpm` dentro del contenedor.
* Usa el siguiente comando:

```bash
docker compose -f docker-compose.dev.yml up --build
```

#### 🚀 Producción (`docker-compose.yml`)

* Construye y ejecuta la app como una **imagen cerrada** sin montar archivos locales.
* Usa el modo `NODE_ENV=production` para una ejecución optimizada.
* Recomendado para entornos reales o pruebas finales.
* Comando sugerido:

```bash
docker compose -f docker-compose.yml up --build -d
```


