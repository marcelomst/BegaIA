#!/bin/bash
# Uso: ./listar_fuentes.sh NOMBRE_CARPETA

if [ -z "$1" ]; then
  echo "Uso: $0 NOMBRE_CARPETA"
  exit 1
fi

CARPETA="$1"
ARCHIVO_SALIDA="fuentes${CARPETA##*/}.txt"

# Limpiar archivo si ya existe
> "$ARCHIVO_SALIDA"

# Recorrido ordenado, solo archivos
find "$CARPETA" -type f | sort | while read -r archivo; do
  nombre_archivo=$(basename "$archivo")
  echo '"""' >> "$ARCHIVO_SALIDA"
  echo "$nombre_archivo" >> "$ARCHIVO_SALIDA"
  echo '"""' >> "$ARCHIVO_SALIDA"
  echo >> "$ARCHIVO_SALIDA"
done

echo "Listo. Revisá $ARCHIVO_SALIDA"
