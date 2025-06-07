# convertir_txt_a_pdf.sh
#!/bin/bash

if [ $# -eq 0 ]; then
    echo "Uso: $0 archivo.txt"
    exit 1
fi

TXT="$1"
PDF="${TXT%.txt}.pdf"
PS="${TXT%.txt}.ps"

# -B elimina encabezados y pies de página
enscript -B "$TXT" -o "$PS"
ps2pdf "$PS" "$PDF"
rm "$PS"

if [ $? -eq 0 ]; then
    echo "Convertido exitosamente: $PDF"
else
    echo "Error al convertir el archivo."
fi
