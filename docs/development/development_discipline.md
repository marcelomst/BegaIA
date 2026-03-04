# CONTEXTO — DISCIPLINA GIT Y DOCUMENTACIÓN BEGASIST

Este repositorio sigue una disciplina de desarrollo basada en hitos.

Principios:

1 commit = 1 hito.

Prefijos de commit:

HITO-
FEAT-
FIX-
DOC-

Ejemplo:

HITO-WA-TEMPLATE-1
FEAT-WA-TWILIO-2
FIX-WA-TWILIO-MW-1

Documentación principal de hitos:

/home/marcelo/begasist/hito_mcp.md

Este documento representa:

- evolución real del sistema
- hitos implementados
- estado del proyecto

No representa roadmap futuro.

Cuando se implementa un hito:

1 commit en Git
↓
actualización en hito_mcp.md

Se mantiene consistencia entre:

git log
hito_mcp.md

Auditorías periódicas comparan:

git log --grep="HITO-"
vs
IDs presentes en hito_mcp.md

Objetivo:

mantener trazabilidad completa del desarrollo.

Roles:

Marcelo → controla commits y push (llave de la caja fuerte)
ChatGPT → apoyo arquitectónico
MVC → ejecución de cambios de código

El flujo típico es:

ChatGPT diseña arquitectura o hito
↓
Se genera prompt para MVC
↓
MVC modifica código
↓
Se revisa diff
↓
Commit disciplinado
↓
Actualización documental
