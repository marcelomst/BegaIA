#SingleInstance, Force
^!r::
ClipWait
full := "Para que refactorices y me pases el archivo completo ready copy/paste, te paso mi actual:`n```ts`n" . Clipboard . "`n```"
SendInput %full%
return