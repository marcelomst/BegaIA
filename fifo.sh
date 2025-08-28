#!/usr/bin/env bash
# fifo.sh - Buscar y abrir sin cambiar workspace (solo carpetas de fuentes)

while true; do
    buscar_carpeta() {
      local pattern="$1"
      echo "📁 Carpetas que coinciden con: '$pattern'..."
      find . \
        -path ./node_modules -prune -o \
        -path ./.git -prune -o \
        -path ./dist -prune -o \
        -path ./out -prune -o \
        -path ./.next -prune -o \
        -path ./.pnpm-store -prune -o \
        -type d -iname "*$pattern*" -print | sort
    }

    read -p "🧭 Buscar  carpeta: " input
    [[ -z "$input" ]] && break   # ENTER para salir

    buscar_carpeta "$input"
done
