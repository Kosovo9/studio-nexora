# 🚀 Studio Nexora - Build & Deploy Guide (Producción)

Guía paso a paso para construir y desplegar Studio Nexora en producción usando Vercel. Esta guía está diseñada para operadores no-técnicos.

---

## 📋 A) Requisitos Previos

Antes de comenzar, asegúrate de tener:

1. **Node.js LTS instalado** (versión 20.x o superior)
   - Descarga desde: https://nodejs.org/
   - Verifica instalación: `node --version` (debe mostrar v20.x o superior)

2. **npm instalado** (viene con Node.js)
   - Verifica instalación: `npm --version` (debe mostrar 9.x o superior)

3. **Cuenta en Vercel** 
   - Regístrate en: https://vercel.com

4. **Cuentas/configuraciones necesarias:**
   - Clerk (autenticación) - https://dashboard.clerk.com
   - Stripe (pagos) - https://dashboard.stripe.com
   - Supabase (base de datos) - https://supabase.com
   - Cloudflare Turnstile (protección anti-bot) - https://dash.cloudflare.com
   - Storage (AWS S3 / Cloudflare R2) - Para almacenar imágenes
   - Replicate (procesamiento de imágenes con IA) - https://replicate.com

---

## 🔧 B) Primer Setup Local

### Paso 1: Navegar al proyecto

```bash
cd studio-nexora
```

### Paso 2: Instalar dependencias

```bash
npm install
```

Este comando:
- Instala todas las dependencias del proyecto (puede tomar 2-5 minutos)
- Ejecuta automáticamente `prisma generate` para generar el cliente de base de datos
- Si encuentras errores, asegúrate de tener Node.js 20.x o superior

### Paso 3: Configurar variables de entorno

Crea un archivo `.env.local` basado en `.env.example`:

**Windows:**
```bash
copy .env.example .env.local
```

**Mac/Linux:**
```bash
cp .env.example .env.local
```

Luego edita `.env.local` con un editor de texto y completa todas las variables con tus valores reales (keys de Clerk, Stripe, Supabase, etc.).

**⚠️ IMPORTANTE:** 
- Nunca commitees `.env.local` al repositorio (ya está en .gitignore)
- Usa keys de TEST para desarrollo local
- Usa keys de PRODUCCIÓN solo cuando despliegues a producción

### Paso 4: Ejecutar en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 🏗️ C) Build de Producción Local (Testing)

Antes de desplegar, verifica que el build funciona correctamente:

### Paso 1: Build de producción

```bash
npm run build
```

Este comando:
- Compila TypeScript y valida tipos
- Optimiza el código de Next.js para producción
- Genera bundles optimizados
- Puede tomar 3-5 minutos

**Si encuentras errores:**
- Revisa que todas las variables de entorno estén configuradas
- Verifica que no hay imports rotos
- Ejecuta `npm run type-check` para ver errores de TypeScript

### Paso 2: Probar en modo producción

```bash
npm start
```

Esto inicia el servidor de producción localmente en `http://localhost:3000`

**Verifica:**
- La aplicación carga correctamente
- Las imágenes se muestran
- Las rutas protegidas requieren autenticación
- Los idiomas funcionan (es, en, pt, etc.)

---

## 📦 D) Deploy en Vercel (Manual CLI)

### Opción 1: Deploy usando Vercel CLI

#### Paso 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

#### Paso 2: Autenticarse

```bash
vercel login
```

Sigue las instrucciones en el navegador para autenticarte.

#### Paso 3: Configurar variables de entorno en Vercel

**IMPORTANTE:** Debes configurar TODAS las variables de entorno en Vercel ANTES del deploy.

Ve a: https://vercel.com/dashboard → Tu Proyecto → Settings → Environment Variables

Agrega cada variable una por una (ver sección E abajo para la lista completa).

#### Paso 4: Deploy a producción

```bash
vercel --prod
```

Este comando:
- Construye el proyecto en Vercel
- Despliega a producción
- Te retorna la URL de tu aplicación (ej: `https://studio-nexora.vercel.app`)

---

## 🌐 E) Variables de Entorno Requeridas en Vercel

**CRÍTICO:** Configura TODAS estas variables en Vercel Dashboard antes del deploy.

### 🔐 Variables Críticas (Sin estas, la app NO funcionará)

Configura estas en Vercel → Settings → Environment Variables → Agregar:

```
# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ID=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRO_ID=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRICE_VIP_ID=price_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Database
DATABASE_URL=postgresql://...

# Storage (S3/R2)
STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com
STORAGE_KEY=...
STORAGE_SECRET=...
STORAGE_BUCKET=nexora-uploads
STORAGE_PUBLIC_URL=https://your-cdn.com

# Replicate AI
REPLICATE_API_TOKEN=r8_...
```

### 📊 Tabla de Variables: Públicas vs Privadas

| Variable | Tipo | Dónde Configurarla en Vercel |
|----------|------|------------------------------|
| `NEXT_PUBLIC_*` | **Pública** | Production + Browser-accessible |
| `CLERK_SECRET_KEY` | **Privada** | Production + Server-side only |
| `STRIPE_SECRET_KEY` | **Privada** | Production + Server-side only |
| `SUPABASE_SERVICE_ROLE_KEY` | **Privada** | Production + Server-side only |
| `REPLICATE_API_TOKEN` | **Privada** | Production + Server-side only |
| `STORAGE_SECRET` | **Privada** | Production + Server-side only |

**Nota:** Las variables `NEXT_PUBLIC_*` se exponen al navegador pero están diseñadas para ser seguras (tienen permisos limitados). Las variables sin `NEXT_PUBLIC_` NUNCA deben exponerse al cliente.

### Opción 2: Deploy desde Vercel Dashboard

1. Ve a https://vercel.com/new
2. Conecta tu repositorio de GitHub (si lo subiste)
3. Selecciona el proyecto `studio-nexora`
4. Vercel detectará automáticamente:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: `.next`

5. **Configurar Environment Variables:**
   - Ve a Settings → Environment Variables
   - Agrega TODAS las variables de la lista anterior
   - Marca cada variable para Production

6. Click en "Deploy"

---

## 🔒 F) Nota Legal / Privacidad

### Procesamiento de Datos con IA

**IMPORTANTE:** Esta aplicación procesa fotos subidas por usuarios usando inteligencia artificial (IA).

1. **Fotos subidas:**
   - Se procesan con IA para generar variaciones y efectos
   - Los resultados se almacenan temporalmente

2. **Retención de datos:**
   - Los resultados se guardan máximo 24 horas salvo que el usuario tenga un plan premium de almacenamiento seguro
   - Después de 24 horas, las imágenes se eliminan automáticamente

3. **Uso de datos:**
   - NO vendemos ni reutilizamos las fotos del cliente para otros fines sin permiso explícito
   - Las fotos solo se procesan para generar los resultados solicitados por el usuario
   - Cumplimos con GDPR y regulaciones de privacidad

4. **Permisos requeridos:**
   - Al subir fotos, el usuario acepta que procesemos sus imágenes con IA
   - El usuario conserva todos los derechos sobre sus imágenes originales y generadas

---

## 🛡️ G) Seguridad

### Cloudflare Bot Challenge

**Configuración Requerida:**

1. **Activar Cloudflare en tu dominio:**
   - Si tu dominio está en Cloudflare, activa "Bot Fight Mode" en Security → Bots
   - Configura "Super Bot Fight Mode" para máxima protección

2. **Turnstile (Protección Anti-Bot):**
   - Crea un sitio Turnstile en Cloudflare Dashboard
   - Configura las keys `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`
   - Esto bloquea scraping automatizado y clones

3. **Headers de Seguridad:**
   - Ya están configurados en `next.config.js`:
     - `X-Frame-Options: DENY` (previene clickjacking)
     - `X-Content-Type-Options: nosniff` (previene MIME sniffing)
     - `Strict-Transport-Security` (fuerza HTTPS)
     - `Referrer-Policy` (controla qué información se envía)
     - `Permissions-Policy` (bloquea cámara/micrófono salvo que se necesiten)

### Rate Limiting

- Los endpoints de generación de IA tienen rate limiting configurado
- Los usuarios pueden hacer un número limitado de requests por ventana de tiempo
- Esto previene abuso y scraping automatizado

---

## ✅ Checklist Pre-Deploy

Antes de hacer deploy, verifica:

- [ ] ✅ Node.js 20.x instalado
- [ ] ✅ `npm install` completado sin errores
- [ ] ✅ `npm run build` completado sin errores
- [ ] ✅ `.env.local` creado con todas las variables (para desarrollo)
- [ ] ✅ Todas las variables configuradas en Vercel Dashboard
- [ ] ✅ Keys de TEST usadas para development/preview
- [ ] ✅ Keys de PRODUCCIÓN listas para production (si aplica)
- [ ] ✅ Clerk configurado con webhooks
- [ ] ✅ Stripe configurado con productos y price IDs
- [ ] ✅ Supabase configurado y migraciones aplicadas
- [ ] ✅ Storage (S3/R2) configurado y accesible
- [ ] ✅ Cloudflare Turnstile configurado
- [ ] ✅ Replicate API token configurado
- [ ] ✅ Dominio personalizado configurado (si aplica)

---

## 🐛 Troubleshooting

### Build falla en Vercel

**Error:** `Module not found` o `Cannot find module`
- ✅ Verifica que todas las dependencias están en `package.json`
- ✅ Asegúrate que `package.json` no tiene referencias a `pnpm`

**Error:** `Environment variable not found`
- ✅ Verifica que TODAS las variables están en Vercel Dashboard
- ✅ Asegúrate de marcar "Production" en el dropdown
- ✅ Verifica que no hay espacios extra en los valores

**Error:** TypeScript errors
- ✅ Ejecuta `npm run type-check` localmente
- ✅ Si es crítico y temporal, puedes setear `typescript.ignoreBuildErrors: true` en `next.config.js` (NO recomendado)

### Variables de entorno no funcionan

- ✅ Verifica que están en el ambiente correcto (Production/Preview/Development)
- ✅ Verifica que `NEXT_PUBLIC_*` están marcadas como "Browser-accessible"
- ✅ Verifica que variables privadas NO tienen `NEXT_PUBLIC_` al inicio
- ✅ Revisa los logs de Vercel Functions para ver errores

---

## 📝 Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Build local
npm run build

# Producción local
npm start

# Type checking
npm run type-check

# Linting
npm run lint

# Prisma
npm run db:generate
npm run db:push
npm run db:studio

# Deploy
vercel --prod

# Ver logs
vercel logs
```

---

## 🎯 Workflow Recomendado

1. **Desarrollo Local:**
   ```bash
   npm run dev
   ```

2. **Testing Pre-Deploy:**
   ```bash
   npm run build
   npm start
   ```

3. **Deploy Preview:**
   ```bash
   git push origin feature-branch
   # Vercel crea preview automáticamente
   ```

4. **Deploy Producción:**
   ```bash
   git push origin main
   # O manualmente:
   vercel --prod
   ```

---

**✅ Listo para producción!**

Última actualización: 2024
