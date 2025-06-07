# convertir_pdf_a_txt.sh
#!/bin/bash

# Verifica que se pasó un archivo como argumento
if [ $# -eq 0 ]; then
    echo "Uso: $0 archivo.pdf"
    exit 1
fi

PDF="$1"
TXT="${PDF%.pdf}.txt"

# Convierte el PDF a TXT
pdftotext "$PDF" "$TXT"

if [ $? -eq 0 ]; then
    echo "Convertido exitosamente: $TXT"
else
    echo "Error al convertir el archivo."
fi
