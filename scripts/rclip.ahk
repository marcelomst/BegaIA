#SingleInstance, Force
^!r::
ClipWait, 2
if ErrorLevel {
    MsgBox, No se detectó texto en el portapapeles.
} else {
    MsgBox, Contenido del portapapeles:`n`n%Clipboard%
}
return