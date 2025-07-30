#!/bin/bash
# find-folder.sh - Busca carpetas relevantes en fuentes (ignora node_modules, .git, dist, out, .next)

while true; do
  read -p "🔍 Nombre de la carpeta a buscar (ENTER para salir): " folder
  if [ -z "$folder" ]; then
    echo "Saliendo."
    break
  fi
  echo "Buscando carpetas que contengan: '$folder'..."

  find . \
    -path './node_modules' -prune -o \
    -path './.git' -prune -o \
    -path './dist' -prune -o \
    -path './out' -prune -o \
    -path './.next' -prune -o \
    -type d -iname "*$folder*" -print \
  | grep -v 'node_modules\|\.git/\|dist/\|out/\|\.next/' || echo "No se encontraron carpetas."

  echo
done
