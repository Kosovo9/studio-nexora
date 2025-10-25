# 🚀 Desplegar Studio Nexora en Vercel

## 📋 **Opciones para Ver Tu Proyecto en la Web:**

### **Opción 1: Desplegar en Vercel (Recomendado - GRATIS)**
### **Opción 2: Ejecutar Localmente (localhost:3000)**

---

## 🌐 **OPCIÓN 1: DESPLEGAR EN VERCEL (Recomendado)**

### **Paso 1: Ir a Vercel**
Ve a: https://vercel.com

### **Paso 2: Iniciar Sesión**
- Click en "Sign Up" o "Log In"
- Usa tu cuenta de GitHub (Kosovo9)
- Autoriza Vercel para acceder a tus repositorios

### **Paso 3: Importar Proyecto**
1. Click en "Add New..." → "Project"
2. Busca "StudioNexora" en la lista
3. Click en "Import"

### **Paso 4: Configurar Proyecto**
- **Framework Preset:** Next.js (detectado automáticamente)
- **Root Directory:** `./` (dejar por defecto)
- **Build Command:** `npm run build` (automático)
- **Output Directory:** `.next` (automático)

### **Paso 5: Variables de Entorno (Opcional)**
Si quieres que funcione completamente, agrega estas variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=tu_clerk_key
CLERK_SECRET_KEY=tu_clerk_secret
REPLICATE_API_TOKEN=tu_replicate_token
STRIPE_SECRET_KEY=tu_stripe_key
DATABASE_URL=tu_database_url
```

**NOTA:** Puedes saltarte esto por ahora y agregar las keys después.

### **Paso 6: Deploy**
1. Click en "Deploy"
2. Espera 2-3 minutos mientras Vercel construye tu proyecto
3. ¡Listo! Vercel te dará un link como:
   ```
   https://studio-nexora.vercel.app
   ```

### **Paso 7: Ver Tu Proyecto**
Tu proyecto estará disponible en:
```
https://studio-nexora-[tu-id].vercel.app
```

---

## 💻 **OPCIÓN 2: EJECUTAR LOCALMENTE**

Si prefieres verlo primero en tu computadora:

### **Paso 1: Instalar Dependencias**
```bash
cd C:\studio-nexora
npm install --legacy-peer-deps
```

### **Paso 2: Iniciar Servidor**
```bash
npm run dev
```

### **Paso 3: Abrir en Navegador**
```
http://localhost:3000
```

---

## 🎯 **MÉTODO RÁPIDO CON VERCEL CLI**

### **Instalar Vercel CLI:**
```bash
npm install -g vercel
```

### **Desplegar con un Comando:**
```bash
cd C:\studio-nexora
vercel
```

Sigue las instrucciones:
1. "Set up and deploy?" → Yes
2. "Which scope?" → Tu cuenta
3. "Link to existing project?" → No
4. "What's your project's name?" → studio-nexora
5. "In which directory is your code located?" → ./
6. "Want to override settings?" → No

**¡Listo!** Vercel te dará un link inmediatamente.

---

## 📊 **Comparación de Opciones:**

### **Vercel (Recomendado):**
- ✅ GRATIS
- ✅ Link público para compartir
- ✅ HTTPS automático
- ✅ Deploy automático en cada push
- ✅ CDN global (rápido en todo el mundo)
- ✅ No necesitas mantener tu PC encendida
- ⏱️ Tiempo: 5 minutos

### **Localhost:**
- ✅ GRATIS
- ✅ Pruebas rápidas
- ❌ Solo tú puedes verlo
- ❌ Necesitas mantener tu PC encendida
- ❌ No es accesible desde internet
- ⏱️ Tiempo: 2 minutos

---

## 🔑 **Variables de Entorno en Vercel:**

### **Para Agregar Después del Deploy:**

1. Ve a tu proyecto en Vercel
2. Click en "Settings"
3. Click en "Environment Variables"
4. Agrega cada variable:

```env
# Clerk (Autenticación)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Replicate (IA)
REPLICATE_API_TOKEN=r8_...

# Stripe (Pagos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Database
DATABASE_URL=postgresql://...

# Supabase (Storage)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

5. Click en "Save"
6. Redeploy el proyecto

---

## 🎨 **Personalizar Dominio (Opcional):**

### **Dominio Gratis de Vercel:**
```
https://studio-nexora.vercel.app
```

### **Tu Propio Dominio:**
1. Compra un dominio (ej: studionexora.com)
2. En Vercel → Settings → Domains
3. Agrega tu dominio
4. Configura DNS según instrucciones

---

## 🚀 **Deploy Automático:**

Una vez conectado con GitHub:
- ✅ Cada push a `main` → Deploy automático
- ✅ Pull requests → Preview deploy
- ✅ Rollback fácil a versiones anteriores

---

## 📱 **Después del Deploy:**

Tu proyecto estará disponible en:
```
https://studio-nexora-[random].vercel.app
```

Puedes compartir este link con:
- ✅ Clientes
- ✅ Amigos
- ✅ Portfolio
- ✅ Redes sociales

---

## 🔍 **Verificar Deploy:**

### **Checklist Post-Deploy:**
- [ ] Página principal carga correctamente
- [ ] UI se ve bien en móvil y desktop
- [ ] Botones responden (aunque sin API keys no procesarán)
- [ ] No hay errores en consola (F12)
- [ ] Imágenes y estilos cargan correctamente

---

## ⚠️ **Nota Importante:**

### **Sin Variables de Entorno:**
- ✅ La UI funcionará perfectamente
- ✅ Podrás ver el diseño
- ✅ Los botones responderán
- ❌ No procesará imágenes (necesita Replicate API)
- ❌ No aceptará pagos (necesita Stripe)
- ❌ No tendrá autenticación (necesita Clerk)

### **Con Variables de Entorno:**
- ✅ Todo funcionará al 100%
- ✅ Procesamiento de imágenes con IA
- ✅ Pagos reales
- ✅ Autenticación de usuarios

---

## 💡 **Recomendación:**

1. **Primero:** Despliega en Vercel SIN variables de entorno
2. **Verifica:** Que la UI se vea bien
3. **Después:** Agrega las API keys una por una
4. **Prueba:** Cada funcionalidad

---

## 🎯 **Comandos Rápidos:**

### **Deploy con Vercel CLI:**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Navegar al proyecto
cd C:\studio-nexora

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### **O Ejecutar Localmente:**
```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Iniciar servidor
npm run dev

# Abrir: http://localhost:3000
```

---

## 📞 **Recursos:**

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Documentación Vercel:** https://vercel.com/docs
- **Soporte Vercel:** https://vercel.com/support

---

## ✅ **Resumen:**

### **Para Ver en la Web (Público):**
1. Ve a https://vercel.com
2. Inicia sesión con GitHub
3. Importa "StudioNexora"
4. Click en "Deploy"
5. Espera 2-3 minutos
6. ¡Listo! Tendrás un link público

### **Para Ver Localmente (Solo tú):**
1. `cd C:\studio-nexora`
2. `npm install --legacy-peer-deps`
3. `npm run dev`
4. Abre `http://localhost:3000`

---

**¡Elige la opción que prefieras y tendrás tu proyecto funcionando en minutos!** 🚀
