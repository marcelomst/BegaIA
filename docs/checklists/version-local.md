// Path: /docs/checklists/version-local.md

# Checklist para versión local de BegaIA (modo offline por hotel)

> ✅ Objetivo: permitir que un hotel ejecute BegaIA localmente, sin dependencia de la nube, pero manteniendo la misma arquitectura de bots y panel web.

---

## 🌐 Infraestructura

* [ ] Docker instalado localmente
* [ ] Docker Compose instalado
* [ ] Hardware mínimo (RAM, CPU, disco)
* [ ] Acceso local a puertos: 3000 (suite), 6379 (Redis)

---

## 📦 Archivos requeridos

* [ ] `docker-compose.yml` para hotel individual
* [ ] `.env` con credenciales locales (SMTP, Astra opcional, etc.)
* [ ] Imagen de `begasist-suite`
* [ ] Imagen de `begasist-channelbot`
* [ ] (Opcional) `redis_data` como volumen persistente

---

## ⚙️ Servicios incluidos

* [ ] `suite` corriendo en `localhost:3000`
* [ ] `redis` local compartido
* [ ] `channelbot` con `HOTEL_ID` preconfigurado
* [ ] Soporte para `email`, `whatsapp`, `channelManager`

---

## 🚀 Flujo de instalación local

* [ ] Script de instalación (ej: `./install-local.sh`)
* [ ] Carga de datos iniciales (config y conocimiento)
* [ ] Activación de bots automática post-install

---

## 🌎 Integración opcional con nube

* [ ] `sendTelemetry(hotelId, status)` cada 5 minutos
* [ ] `checkForUpdate()` que consulta una versión remota
* [ ] Enlace a dashboard central (solo si el hotel lo autoriza)

---

## 📃 Documentación necesaria

* [ ] README local para el hotel (PDF/Markdown)
* [ ] Instrucciones para reinicio manual
* [ ] Método de backup local
* [ ] Comandos para actualizar desde `.tar` o `git pull`

---

## ✅ Estado actual

* [x] Arquitectura de contenedores por canal/hotel lista
* [x] Dockerfile.channelbot funcional
* [x] Redis compartido entre bots y suite
* [ ] Script de generación de `docker-compose.yml` por hotel
* [ ] Versión autoinstalable empaquetada
