#!/bin/bash

# Archivo de salida
OUTPUT_FILE="arquitectura.txt"

# Limpiar el archivo de salida si existe
> "$OUTPUT_FILE"

# Imprimir encabezado
echo "📂 Estructura del Proyecto" >> "$OUTPUT_FILE"
echo "=========================" >> "$OUTPUT_FILE"

# Generar tree sin node_modules ni .git
tree -I "node_modules|.git|noselect|.vscode|.next|DALL*.*|*.exe|*.zip|C:UsersmarceAppDataLocalpnpmstorev3" >> "$OUTPUT_FILE"

# Separador
echo -e "\n=========================\n" >> "$OUTPUT_FILE"

# # Buscar archivos clave y agregar su contenido
# echo "📜 Scripts Claves" >> "$OUTPUT_FILE"
# echo "=================" >> "$OUTPUT_FILE"
# find ./lib/*/ \
#      ./test \
#      ./app/*/ \
#      ./app/layout.tsx\
#      ./app/globals.css\
#      ./tailwind.config.cjs\
#      ./postcss.config.cjs\
#      -type f \
#      \( -name "*.ts" \
#      -o -name "*.tsx" \
#      -o -name "*.css" \
#      \) |
# while read file; do
#   echo -e "\n🔹 Archivo: $file" >> "$OUTPUT_FILE"
#   echo "---------------------------------" >> "$OUTPUT_FILE"
#   cat "$file" >> "$OUTPUT_FILE"
#   echo -e "\n---------------------------------\n" >> "$OUTPUT_FILE"
# done

# Buscar archivos clave y agregar su contenido
echo "📜 Scripts Claves" >> "$OUTPUT_FILE"
echo "=================" >> "$OUTPUT_FILE"
find ./lib ./test ./app ./tailwind.config.cjs ./postcss.config.cjs \
  -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) |
while read file; do
  echo -e "\n🔹 Archivo: $file" >> "$OUTPUT_FILE"
  echo "---------------------------------" >> "$OUTPUT_FILE"
  cat "$file" >> "$OUTPUT_FILE"
  echo -e "\n---------------------------------\n" >> "$OUTPUT_FILE"
done

# Mensaje de finalización
echo "✅ Arquitectura guardada en $OUTPUT_FILE"
