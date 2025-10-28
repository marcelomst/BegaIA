# Checklist de Migración y Deprecación de system_playbook

## 1. Migración de Playbooks Globales

- [ ] Ejecutar el script de migración para templates estáticos, asegurando que todos los playbooks globales estén en la nueva tabla `hotel_content` con:
  - `hotelId: "system"`
  - `type: "playbook"`
  - Categoría y promptKey según contrato
  - Versionado y metadatos correctos

## 2. Validación de Datos

- [ ] Verificar que todos los registros de `system_playbook` existen en `hotel_content` y son accesibles por el backend/admin.
- [ ] Validar que los overrides y fallback funcionan correctamente con la nueva lógica.

## 3. Actualización de Backend y Admin

- [ ] Refactorizar el backend para consultar únicamente la tabla `hotel_content` y el índice `hotel_version_index`.
- [ ] Actualizar el admin para mostrar, editar y versionar playbooks desde la nueva tabla.

## 4. Deprecación y Eliminación

- [ ] Marcar la colección `system_playbook` como deprecada en la documentación interna y README.
- [ ] Eliminar o archivar la colección `system_playbook` en Astra DB.

## 5. Documentación

- [ ] Registrar los cambios y el estado final en el README o en un archivo de migración (`MIGRATION.md`).
- [ ] Documentar el nuevo flujo de consulta, edición y override para playbooks globales y por hotel.

---

Este checklist asegura una migración ordenada, sin pérdida de datos y con trazabilidad para futuras auditorías o refactorizaciones.
