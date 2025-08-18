#!/usr/bin/env bash
# fifo.sh - Buscar y abrir sin cambiar workspace

buscar_archivo() {
  local pattern="$1"
  echo "🔍 Archivos que coinciden con: '$pattern'..."
  find . -type f -iname "*$pattern*" -not -path "*/node_modules/*" | while read -r file; do
    echo "$file"
  done
}

buscar_carpeta() {
  local pattern="$1"
  echo "📁 Carpetas que coinciden con: '$pattern'..."
  find . -type d -iname "*$pattern*" -not -path "*/node_modules/*" | while read -r dir; do
    echo "$dir"
  done
}

read -p "🧭 Buscar [-f archivo] o carpeta: " flag input

if [ "$flag" == "-f" ]; then
  buscar_archivo "$input"
else
  buscar_carpeta "$flag"
fi

read -p "Número de resultado a abrir (ENTER para salir): " idx

if [ -n "$idx" ]; then
  sel=$(find . -type f -iname "*$input*" -not -path "*/node_modules/*" | sed -n "$((idx+1))p")
  code -r -g "$sel"
fi
