# 🚀 Studio Nexora - GitHub Setup Guide

## 📋 Guía Completa para Subir a GitHub

---

## ✅ **Paso 1: Instalar Dependencias Primero**

Antes de subir a GitHub, necesitas instalar las dependencias:

```bash
cd C:\studio-nexora
npm install --legacy-peer-deps
```

**Espera a que termine** (puede tomar 2-5 minutos)

---

## 🔧 **Paso 2: Verificar Git**

Verifica si tienes Git instalado:

```bash
git --version
```

**Si no tienes Git:**
- Descarga desde: https://git-scm.com/download/win
- Instala con opciones por defecto
- Reinicia PowerShell/CMD

---

## 🎯 **Paso 3: Configurar Git (Primera vez)**

Si es tu primera vez usando Git:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

---

## 📦 **Paso 4: Inicializar Repositorio Local**

```bash
cd C:\studio-nexora
git init
```

---

## 📝 **Paso 5: Agregar Archivos**

```bash
# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit: Studio Nexora 10000x optimized"
```

---

## 🌐 **Paso 6: Crear Repositorio en GitHub**

### **Opción A: Desde GitHub Website**

1. Ve a https://github.com
2. Inicia sesión
3. Click en el botón **"+"** (arriba derecha)
4. Selecciona **"New repository"**
5. Configura:
   - **Repository name:** `studio-nexora`
   - **Description:** `AI-powered professional photography platform - 10000x optimized`
   - **Visibility:** Public o Private (tu elección)
   - **NO marques** "Initialize with README" (ya tienes uno)
6. Click **"Create repository"**

### **Opción B: Usando GitHub CLI**

```bash
# Instalar GitHub CLI primero
# Descarga desde: https://cli.github.com/

# Autenticarse
gh auth login

# Crear repositorio
gh repo create studio-nexora --public --source=. --remote=origin --push
```

---

## 🔗 **Paso 7: Conectar con GitHub**

Después de crear el repositorio en GitHub, copia la URL y ejecuta:

```bash
# Reemplaza YOUR-USERNAME con tu usuario de GitHub
git remote add origin https://github.com/YOUR-USERNAME/studio-nexora.git

# Verificar
git remote -v
```

---

## ⬆️ **Paso 8: Push a GitHub**

```bash
# Cambiar nombre de rama a main (si es necesario)
git branch -M main

# Hacer push
git push -u origin main
```

**Si pide credenciales:**
- Username: tu usuario de GitHub
- Password: usa un **Personal Access Token** (no tu contraseña)

---

## 🔑 **Crear Personal Access Token (Si es necesario)**

1. Ve a GitHub → Settings → Developer settings
2. Click en **"Personal access tokens"** → **"Tokens (classic)"**
3. Click **"Generate new token"** → **"Generate new token (classic)"**
4. Configura:
   - **Note:** "Studio Nexora"
   - **Expiration:** 90 days (o lo que prefieras)
   - **Scopes:** Marca `repo` (todos los permisos de repositorio)
5. Click **"Generate token"**
6. **COPIA EL TOKEN** (no podrás verlo de nuevo)
7. Usa este token como contraseña cuando hagas push

---

## 📋 **Comandos Completos (Resumen)**

```bash
# 1. Navegar al proyecto
cd C:\studio-nexora

# 2. Instalar dependencias (si no lo has hecho)
npm install --legacy-peer-deps

# 3. Inicializar Git
git init

# 4. Agregar archivos
git add .

# 5. Commit inicial
git commit -m "Initial commit: Studio Nexora 10000x optimized"

# 6. Conectar con GitHub (reemplaza YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/studio-nexora.git

# 7. Cambiar a rama main
git branch -M main

# 8. Push a GitHub
git push -u origin main
```

---

## 🎨 **Paso 9: Agregar README Badge (Opcional)**

Después del push, puedes agregar badges al README:

```markdown
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
```

---

## 🔄 **Comandos para Actualizaciones Futuras**

Cuando hagas cambios:

```bash
# Ver cambios
git status

# Agregar cambios
git add .

# Commit con mensaje
git commit -m "Descripción de los cambios"

# Push a GitHub
git push
```

---

## 🌿 **Crear Ramas (Opcional)**

Para trabajar en features:

```bash
# Crear y cambiar a nueva rama
git checkout -b feature/nueva-funcionalidad

# Hacer cambios y commit
git add .
git commit -m "Add nueva funcionalidad"

# Push de la rama
git push -u origin feature/nueva-funcionalidad
```

---

## 📊 **Verificar en GitHub**

Después del push, ve a:
```
https://github.com/YOUR-USERNAME/studio-nexora
```

Deberías ver:
- ✅ Todos los archivos
- ✅ README.md renderizado
- ✅ Estructura de carpetas
- ✅ Commit history

---

## 🚫 **Archivos que NO se subirán (por .gitignore)**

El `.gitignore` ya está configurado para excluir:
- `node_modules/` (dependencias)
- `.next/` (build files)
- `.env.local` (variables de entorno secretas)
- `*.log` (archivos de log)

**Esto es correcto** - no quieres subir estos archivos.

---

## 🔒 **Seguridad: Variables de Entorno**

**IMPORTANTE:** Nunca subas `.env.local` con tus API keys reales.

El repositorio incluye:
- ✅ `.env.example` (plantilla sin valores reales)
- ❌ `.env.local` (excluido por .gitignore)

Otros usuarios deberán:
1. Copiar `.env.example` a `.env.local`
2. Agregar sus propias API keys

---

## 📱 **Clonar el Repositorio (Para otros)**

Otros usuarios pueden clonar tu proyecto:

```bash
# Clonar
git clone https://github.com/YOUR-USERNAME/studio-nexora.git

# Entrar al directorio
cd studio-nexora

# Instalar dependencias
npm install --legacy-peer-deps

# Configurar variables de entorno
copy .env.example .env.local

# Iniciar
npm run dev
```

---

## 🎯 **GitHub Actions (CI/CD) - Opcional**

Puedes agregar GitHub Actions para:
- ✅ Verificar TypeScript
- ✅ Ejecutar linter
- ✅ Ejecutar tests
- ✅ Deploy automático

Archivo: `.github/workflows/ci.yml`

---

## 🌟 **Hacer el Repositorio Atractivo**

1. **README.md completo** ✅ (ya lo tienes)
2. **LICENSE** ✅ (ya lo tienes)
3. **CONTRIBUTING.md** ✅ (ya lo tienes)
4. **Screenshots** - Agrega capturas de pantalla
5. **Demo Link** - Agrega link a demo en vivo
6. **Topics** - Agrega tags en GitHub:
   - `nextjs`
   - `typescript`
   - `ai`
   - `photography`
   - `stripe`
   - `prisma`

---

## 🐛 **Solución de Problemas**

### **Error: "remote origin already exists"**
```bash
git remote remove origin
git remote add origin https://github.com/YOUR-USERNAME/studio-nexora.git
```

### **Error: "failed to push"**
```bash
# Pull primero
git pull origin main --allow-unrelated-histories

# Luego push
git push -u origin main
```

### **Error: "Authentication failed"**
- Usa Personal Access Token en lugar de contraseña
- O configura SSH keys

---

## 📞 **Recursos Adicionales**

- **Git Documentation:** https://git-scm.com/doc
- **GitHub Guides:** https://guides.github.com/
- **GitHub CLI:** https://cli.github.com/

---

## ✅ **Checklist Final**

Antes de hacer push, verifica:

- [ ] `npm install` completado
- [ ] Git instalado y configurado
- [ ] Repositorio creado en GitHub
- [ ] `.gitignore` presente
- [ ] `.env.local` NO incluido
- [ ] README.md actualizado
- [ ] Commit inicial hecho
- [ ] Remote origin configurado
- [ ] Push exitoso

---

## 🎉 **¡Listo!**

Tu proyecto Studio Nexora ahora está en GitHub y disponible para:
- ✅ Colaboración
- ✅ Versionamiento
- ✅ Backup en la nube
- ✅ Deploy automático
- ✅ Compartir con otros

---

**¿Necesitas ayuda?** Revisa la documentación o contacta al equipo.
