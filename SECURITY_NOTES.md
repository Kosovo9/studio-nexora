# 🔒 Studio Nexora - Security Documentation

Este documento describe las medidas de seguridad implementadas en Studio Nexora y las mejores prácticas para mantener la aplicación segura en producción.

---

## 🛡️ Protección Anti-Scraping

### Implementación Actual

Studio Nexora utiliza múltiples capas de protección contra scraping y bots maliciosos:

#### 1. **Cloudflare Turnstile**
- **Ubicación**: Implementado en formularios críticos y endpoints de upload
- **Archivo**: `src/lib/cloudflare-turnstile.ts`
- **Configuración**: 
  - Site Key: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - Secret Key: `TURNSTILE_SECRET_KEY`
- **Validación**: Verificación server-side en todos los endpoints sensibles

**Uso:**
```typescript
// Client-side
<Turnstile siteKey={NEXT_PUBLIC_TURNSTILE_SITE_KEY} />

// Server-side validation
const isValid = await verifyTurnstileToken(token);
```

#### 2. **Rate Limiting**
- **Implementación**: Rate limiting por IP y usuario en endpoints críticos
- **Archivos**: 
  - `src/lib/ratelimit.ts`
  - `src/app/api/upload/route.ts`
  - `src/app/api/checkout/route.ts`
- **Configuración**:
  - Upload: 20 requests / 15 minutos
  - Checkout: 10 requests / 15 minutos
  - Burst limit: 3 requests simultáneos

**Ejemplo:**
```typescript
const rateLimit = await checkRateLimit(request);
if (!rateLimit.allowed) {
  return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

#### 3. **Clerk Authentication Middleware**
- **Protección**: Rutas protegidas requieren autenticación
- **Archivo**: `middleware.ts`
- **Rutas protegidas**: `/studio/*`, `/admin/*`, `/upload/*`, `/success/*`

#### 4. **Request Headers Validation**
- Validación de User-Agent y headers comunes de navegadores
- Detección de herramientas de scraping conocidas
- Bloqueo de requests sin headers apropiados

---

## ☁️ Cloudflare Bot Check Integration

### Configuración

1. **Cloudflare Dashboard**:
   - Activa "Bot Fight Mode" en Security → Bots
   - Configura "Super Bot Fight Mode" para máxima protección
   - Añade reglas personalizadas para endpoints específicos

2. **Turnstile**:
   - Crea un sitio Turnstile en Cloudflare Dashboard
   - Copia Site Key y Secret Key a variables de entorno
   - Configura challenge difficulty según tus necesidades

3. **Cloudflare Workers** (Opcional):
   - Implementa validación adicional en edge
   - Verifica Cloudflare headers (`CF-Connecting-IP`, `CF-Ray`)
   - Bloquea IPs maliciosas conocidas

### Headers de Cloudflare

Cuando tu app está detrás de Cloudflare, puedes validar:

```typescript
// Verificar que la request viene de Cloudflare
const cfRay = request.headers.get('CF-Ray');
const cfConnectingIP = request.headers.get('CF-Connecting-IP');

if (!cfRay || !cfConnectingIP) {
  // Request no viene de Cloudflare - posible bypass
  return Response.json({ error: 'Invalid origin' }, { status: 403 });
}
```

---

## 📤 Manejo Seguro de Uploads

### Validaciones Implementadas

#### 1. **Validación de Tipo de Archivo**
- **Archivo**: `src/app/api/upload/route.ts`
- **Tipos permitidos**: Configurados en `ALLOWED_FILE_TYPES`
- **Validación**: 
  - Extensión del archivo
  - MIME type del contenido
  - Magic bytes (firma del archivo)

```typescript
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

// Validar MIME type
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}

// Validar magic bytes
const buffer = await file.arrayBuffer();
const uint8Array = new Uint8Array(buffer);
// Verificar firma del archivo (JPEG: FF D8 FF, PNG: 89 50 4E 47)
```

#### 2. **Validación de Tamaño**
- **Límite máximo**: Configurado en `MAX_FILE_SIZE` (default: 50MB)
- **Validación client-side y server-side**
- **Prevención de DoS**: Límite de batch size (`MAX_BATCH_SIZE`)

```typescript
if (file.size > MAX_FILE_SIZE) {
  return Response.json(
    { error: 'File size exceeds limit' },
    { status: 413 }
  );
}
```

#### 3. **Sanitización de Nombres de Archivo**
- Remover caracteres peligrosos
- Normalizar nombres de archivo
- Prevenir path traversal

```typescript
function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.\./g, '')
    .substring(0, 255);
}
```

#### 4. **Almacenamiento Seguro**
- **Storage**: AWS S3 / Cloudflare R2 con acceso restringido
- **URLs temporales**: Presigned URLs con expiración
- **CDN**: Cloudflare CDN con protección adicional

```typescript
// Generar presigned URL con expiración
const presignedUrl = await getSignedUrl(s3Client, command, {
  expiresIn: 3600 // 1 hora
});
```

#### 5. **Procesamiento Seguro de Imágenes**
- **Sharp**: Procesamiento server-side (no dependencias del cliente)
- **Validación de dimensiones**: Prevenir imágenes maliciosas
- **Stripping metadata**: Remover EXIF y otros metadatos

```typescript
import sharp from 'sharp';

const image = sharp(buffer);
const metadata = await image.metadata();

// Validar dimensiones razonables
if (metadata.width > 10000 || metadata.height > 10000) {
  throw new Error('Image dimensions too large');
}

// Strip metadata y optimizar
const processed = await image
  .removeAlpha()
  .resize(1920, 1920, { fit: 'inside' })
  .webp({ quality: 85 })
  .toBuffer();
```

#### 6. **Virus Scanning** (Recomendado)
Para producción, considera integrar:
- **ClamAV**: Escaneo de virus open-source
- **VirusTotal API**: Servicio de escaneo múltiple
- **AWS GuardDuty**: Detección de malware

---

## 🔐 Variables de Entorno Seguras

### Variables Sensibles (NUNCA en cliente)

```env
# ❌ NUNCA exponer estas variables al cliente
CLERK_SECRET_KEY=sk_...
STRIPE_SECRET_KEY=sk_...
SUPABASE_SERVICE_ROLE_KEY=...
STORAGE_SECRET=...
REPLICATE_API_TOKEN=...
DATABASE_URL=...
```

### Variables Públicas (Seguras para exponer)

```env
# ✅ Estas pueden ser públicas (client-side)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
```

**Nota**: Aunque son "públicas", estas keys tienen permisos limitados y están diseñadas para uso client-side.

---

## 🚨 Protección de Endpoints API

### Headers de Seguridad

Configurados en `next.config.js` y `vercel.json`:

```javascript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
}
```

### Content Security Policy (CSP)

Definido en `vercel.json`:

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.app *.stripe.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: *.replicate.delivery *.r2.cloudflarestorage.com;
connect-src 'self' *.stripe.com *.replicate.com;
frame-src 'self' *.stripe.com;
```

---

## 🔍 Monitoreo y Logging

### Recomendaciones

1. **Logging de Intentos Fallidos**:
   - Rate limit exceeded
   - Uploads rechazados
   - Autenticación fallida múltiple

2. **Alertas**:
   - Configurar alertas para patrones sospechosos
   - Volumen anormal de requests
   - Múltiples intentos de acceso no autorizado

3. **Analytics**:
   - Usar Vercel Analytics para detectar patrones
   - Cloudflare Analytics para tráfico y amenazas
   - Clerk Analytics para eventos de autenticación

---

## ✅ Checklist de Seguridad Pre-Deploy

Antes de ir a producción, verifica:

- [ ] ✅ Todas las variables sensibles están en `.env.local` (no en código)
- [ ] ✅ `.env.local` está en `.gitignore`
- [ ] ✅ Rate limiting está activo en todos los endpoints sensibles
- [ ] ✅ Turnstile está configurado y validando correctamente
- [ ] ✅ Validación de archivos (tipo, tamaño, contenido) está activa
- [ ] ✅ Storage está configurado con permisos mínimos necesarios
- [ ] ✅ Headers de seguridad están configurados
- [ ] ✅ CSP está configurado correctamente
- [ ] ✅ HTTPS está forzado (Vercel lo hace automáticamente)
- [ ] ✅ Webhooks tienen secretos configurados (Stripe, Clerk)
- [ ] ✅ Database tiene conexiones seguras (SSL)
- [ ] ✅ Admin routes están protegidos con verificación adicional
- [ ] ✅ Logs no contienen información sensible
- [ ] ✅ Error messages no exponen información interna

---

## 📚 Recursos Adicionales

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Cloudflare Security](https://www.cloudflare.com/learning/security/)
- [Stripe Security Guide](https://stripe.com/docs/security)
- [Clerk Security](https://clerk.com/docs/security/overview)

---

**Última actualización**: 2024

