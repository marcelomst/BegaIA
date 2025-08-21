¡Claro! Aquí tienes un resumen práctico de los comandos más comunes para el control de versiones con Git de forma **local** (sin interacción con repos remotos):

---

### 🚀 Inicializar y configuración básica

```bash
git init                     # Inicializa un repositorio Git en el directorio actual
git config user.name "Tu Nombre"
git config user.email "tu@correo.com"
```

---

### 📂 Estado y seguimiento de archivos

```bash
git status                  # Muestra el estado actual del repositorio
git add archivo.txt         # Agrega un archivo al staging area
git add .                   # Agrega todos los cambios al staging area
git restore archivo.txt     # Descarta cambios no confirmados en un archivo
```

---

### ✅ Confirmar cambios (commits)

```bash
git commit -m "Mensaje del commit"       # Crea un commit con los cambios del staging
git commit -am "Mensaje"                 # Agrega y commitea archivos ya seguidos por Git
```

---

### 📖 Historial y diferencias

```bash
git log                      # Muestra historial de commits
git log --oneline            # Versión resumida
git diff                     # Muestra diferencias entre el working directory y el staging
git diff --staged            # Muestra diferencias entre staging y el último commit
```

---

### ⏪ Revertir y deshacer

```bash
git checkout archivo.txt     # Restaura un archivo desde el último commit
git reset archivo.txt        # Quita el archivo del staging
git reset --soft HEAD~1      # Revierte el último commit, conserva los cambios
git reset --hard HEAD~1      # Revierte el último commit y borra los cambios
```

---

### 🧪 Ramas (branches)

```bash
git branch                   # Lista ramas
git branch nueva-rama        # Crea nueva rama
git checkout nueva-rama      # Cambia a una rama
git switch -c nueva-rama     # Crea y cambia a nueva rama (versión moderna)
git merge nombre-rama        # Une rama a la actual
```

