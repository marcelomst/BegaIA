#!/bin/bash
# find-folder-or-file.sh - Busca carpetas o archivos ignorando carpetas irrelevantes

IGNORED_DIRS="-path ./node_modules -prune -o -path ./.git -prune -o -path ./dist -prune -o -path ./out -prune -o -path ./.next -prune -o"

function buscar_archivo() {
  local pattern="$1"
  echo "🔍 Buscando archivos que coincidan con: '$pattern'..."
  eval find . $IGNORED_DIRS -type f -iname "\"*$pattern*\"" -print | grep -v 'node_modules\|.git/\|dist/\|out/\|.next/' || echo "No se encontraron archivos."
}

function buscar_carpeta() {
  local pattern="$1"
  echo "📁 Buscando carpetas que coincidan con: '$pattern'..."
  eval find . $IGNORED_DIRS -type d -iname "\"*$pattern*\"" -print | grep -v 'node_modules\|.git/\|dist/\|out/\|.next/' || echo "No se encontraron carpetas."
}

while true; do
  read -p "🧭 Buscar [-f nombre_archivo] o nombre_carpeta (ENTER para salir): " flag input
  if [ -z "$flag" ]; then
    echo "Saliendo."
    break
  fi

  if [ "$flag" == "-f" ]; then
    if [ -z "$input" ]; then
      echo "⚠️  Debes proporcionar un nombre de archivo después de -f"
    else
      buscar_archivo "$input"
    fi
  else
    buscar_carpeta "$flag"
  fi

  echo
done
