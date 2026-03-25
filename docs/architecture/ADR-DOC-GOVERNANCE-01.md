<!-- Path: docs/architecture/ADR-DOC-GOVERNANCE-01.md -->
# ADR-DOC-GOVERNANCE-01 -- Gobernanza documental explicita de Begasist

## Estado

Aprobado.

Esta ADR formaliza una decision ya adoptada y operativa en el proyecto.
No introduce un experimento ni una propuesta abierta; consolida una disciplina
que ya se esta aplicando sobre hitos, arquitectura viva y operacion documental.

## Contexto

Begasist ya opera con una disciplina fuerte de trazabilidad tecnica:

`CODE -> COMMIT -> HASH -> PUSH -> DOC`

Esa disciplina permitio ordenar el cierre de hitos reales, separar evidencia de
interpretacion y mantener `hito_mcp.md` como bitacora historica del sistema.

Sin embargo, la evolucion del proyecto mostro una limitacion clara: no toda la
informacion documental pertenece al mismo plano ni debe gobernarse con la misma
logica.

En la practica conviven al menos cinco clases de artefactos distintos:

- historia de cambios y cierres reales
- arquitectura viva del sistema
- operacion y disciplina de trabajo
- decisiones arquitectonicas explicitas
- artefactos derivados como diagramas, snapshots o material auxiliar

Cuando esas capas no se distinguen con precision, aparecen problemas
recurrentes:

- documentos historicos usados como si fueran arquitectura vigente
- documentos vivos contaminados con narrativa de hitos o secuencia temporal
- decisiones de arquitectura implícitas pero no formalizadas como ADR
- ambiguedad sobre que documento manda en cada dominio
- dificultad para decidir si un hito requiere solo registro historico o tambien
  actualizacion de documentacion estable

La necesidad de esta ADR es explicitar la gobernanza documental de Begasist para
que el sistema documental tenga la misma disciplina que el sistema tecnico:
clasificacion clara, fuente de verdad por dominio, impacto documental graduado y
responsabilidades operativas definidas.

## Decision

Begasist adopta un modelo documental explicito, con categorias separadas,
fuente de verdad por dominio, niveles de impacto documental y roles operativos
claros para sostener la disciplina `CODE -> COMMIT -> HASH -> PUSH -> DOC`.

### Modelo documental adoptado

La documentacion del proyecto se organiza en cinco categorias principales:

1. Historia: registra hitos reales ya cerrados y publicados.
2. Arquitectura viva: describe como funciona hoy el sistema real.
3. Operacion: fija reglas, convenciones y disciplina de trabajo.
4. ADR: formaliza decisiones arquitectonicas aprobadas.
5. Artefactos derivados: diagramas, imagenes, snapshots, mapas y otros soportes
   auxiliares.

Cada categoria tiene finalidad distinta y no debe absorber responsabilidades de
las otras.

### Fuente de verdad por dominio

Se declara la siguiente fuente de verdad documental:

- `hito_mcp.md`: historia de hitos reales publicados.
- `docs/architecture/*.md`: arquitectura viva y ADRs del sistema.
- `docs/architecture/system_operating_model.md` y documentos operativos afines:
  disciplina de operacion documental y tecnica.
- artefactos derivados (`.mmd`, `.png`, `.svg`, tablas auxiliares): soporte
  visual o complementario, nunca fuente primaria si existe documento textual
  rector.
- `~/.codex/config.toml` en lo relativo al comportamiento operativo del agente:
  fuente de verdad de la disciplina del agente, por encima de instrucciones
  heredadas dispersas.

### Niveles de impacto documental

Todo hito cerrado debe evaluarse con una de estas tres clasificaciones:

- Nivel 1 - `solo hito`: el cambio requiere registro historico en
  `hito_mcp.md`, pero no modifica conocimiento estable del sistema.
- Nivel 2 - `hito + doc existente`: el cambio modifica conocimiento persistente
  y obliga a actualizar un documento vivo ya existente.
- Nivel 3 - `hito + doc nueva`: el cambio introduce una decision, modelo o
  dominio sin hogar documental suficiente y exige crear un documento nuevo.

La clasificacion no depende del tamano del commit sino del impacto persistente
sobre el conocimiento del sistema.

### Rol de HDOC

`HDOC` es el rol responsable de gobernar el cierre documental. Su funcion no es
reescribir la arquitectura ni producir codigo, sino:

- verificar evidencia real de commit, hash y push
- registrar el hito historico cuando corresponde
- decidir el nivel de impacto documental
- exigir actualizacion de documentacion estable cuando el cambio lo amerita
- evitar cierres documentales sin trazabilidad real

### Rol del arquitecto

El rol de arquitectura define o valida decisiones estructurales, modelos,
fronteras y documentos vivos de sistema. Cuando una decision supera el plano de
la bitacora historica, el arquitecto debe expresarla en documentacion estable o
ADR. HDOC no reemplaza ese criterio; lo operacionaliza y controla su cierre.

### Integracion con Git

La gobernanza documental queda integrada al flujo tecnico real:

1. primero existe el cambio real en codigo o documentacion estable
2. luego existe commit real
3. luego existe hash real
4. luego existe push real
5. recien entonces se registra el cierre historico y se completa el paso DOC

No se acepta documentacion de hitos no publicados ni cierres documentales sin
soporte en Git.

## Reglas explicitas

### Regla 1

Ningun hito se considera documentable si no existe evidencia real de cambio,
commit, hash y push. La documentacion nunca reemplaza la realidad del repositorio.

### Regla 2

`hito_mcp.md` es la bitacora historica del proyecto. Debe registrar hechos ya
cerrados y publicados, no planes, borradores ni interpretaciones prospectivas.

### Regla 3

La arquitectura viva no debe contaminarse con narrativa historica innecesaria.
Los documentos de `docs/architecture/` describen el sistema vigente, no la
secuencia completa de como se llego hasta el estado actual.

### Regla 4

Toda decision arquitectonica estable que cambie criterios, fronteras,
responsabilidades o modelo operativo debe expresarse como actualizacion de
arquitectura viva o como ADR explicita. No debe quedar solamente implicita en
commits o en la bitacora de hitos.

### Regla 5

Cada hito debe clasificarse por nivel de impacto documental antes de cerrarse:
Nivel 1, Nivel 2 o Nivel 3. Esa clasificacion determina si alcanza con registrar
historia o si tambien corresponde tocar documentacion estable.

### Regla 6

La fuente de verdad debe declararse por dominio y respetarse. Un artefacto
secundario nunca manda sobre un documento rector, y un documento historico nunca
manda sobre una ADR o sobre la arquitectura viva del sistema.

### Regla 7

HDOC controla disciplina y trazabilidad documental, pero no inventa
arquitectura. Si un cambio exige redefinir modelo o criterio estructural, debe
intervenir el plano arquitectonico correspondiente antes del cierre definitivo.

### Regla 8

La documentacion derivada debe mantenerse subordinada a su fuente primaria.
Diagramas, snapshots, mapas o representaciones visuales pueden complementar, pero
no sustituir, el documento textual que define el criterio oficial.

## Consecuencias

En la practica, esta ADR obliga a evaluar cada hito no solo por su cierre
tecnico sino tambien por su impacto sobre el conocimiento estable del sistema.
A partir de ahora, un commit puede quedar correctamente cerrado en Git y aun asi
seguir abierto en terminos documentales si no se actualizo la fuente de verdad
adecuada.

Tambien cambia la forma de leer la documentacion: `hito_mcp.md` pasa a ser
claramente historia publicada; `docs/architecture/` pasa a ser arquitectura
viva; los documentos operativos fijan disciplina; y las ADRs formalizan las
 decisiones que deben sobrevivir al paso de los hitos puntuales.

Esto obliga a:

- clasificar el impacto documental de cada hito
- mantener separadas historia, arquitectura y operacion
- actualizar documentos vivos cuando el sistema real cambia
- crear ADR cuando la decision lo justifica

Y evita:

- usar la bitacora historica como sustituto de arquitectura
- dejar decisiones estructurales escondidas en commits
- cerrar hitos sin trazabilidad real
- acumular deriva entre el sistema implementado y su documentacion estable

## Notas y fuera de alcance

Esta ADR no corrige por si sola inconsistencias previas de naming en la serie de
ADRs. Ese ajuste queda fuera de alcance y puede resolverse en una pasada futura
si se decide normalizar convenciones de nombres.

Tambien queda fuera de alcance cualquier redisenio inmediato de `docs/README.md`.
Ese documento puede ajustarse mas adelante si se quiere reflejar de manera mas
explicita el nuevo modelo de gobernanza documental.

Del mismo modo, puede ser razonable declarar de forma mas visible la fuente de
verdad documental dentro de `docs/architecture/README.md`, pero ese ajuste no es
parte de esta ADR. Esta decision solo fija el marco de gobernanza; no ejecuta
las actualizaciones derivadas.
