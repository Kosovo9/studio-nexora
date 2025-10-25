# 🔧 Studio Nexora - Troubleshooting Guide

## ❌ Issue: "Cannot connect to localhost:3000"

### **Root Cause:**
The development server isn't running or dependencies aren't installed properly.

---

## ✅ **Solution Steps:**

### **Step 1: Verify Dependencies Installation**

Open PowerShell or Command Prompt and run:

```bash
cd C:\studio-nexora
```

Check if `node_modules` folder exists:
```bash
dir
```

If you don't see `node_modules`, the installation didn't complete.

---

### **Step 2: Install Dependencies (Choose One Method)**

#### **Method A: Standard Installation**
```bash
npm install
```

#### **Method B: If Method A Fails (Peer Dependency Issues)**
```bash
npm install --legacy-peer-deps
```

#### **Method C: If Both Fail (Force Installation)**
```bash
npm install --force
```

#### **Method D: Clean Install**
```bash
# Delete package-lock.json if it exists
del package-lock.json

# Clear npm cache
npm cache clean --force

# Install again
npm install --legacy-peer-deps
```

---

### **Step 3: Verify Installation Completed**

Check that `node_modules` folder was created:
```bash
dir
```

You should see:
- ✅ `node_modules/` folder
- ✅ `package-lock.json` file

---

### **Step 4: Start Development Server**

```bash
npm run dev
```

**Expected Output:**
```
> studio-nexora@2.0.0 dev
> next dev

  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
```

---

### **Step 5: Open in Browser**

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🐛 **Common Issues & Solutions:**

### **Issue 1: Port 3000 Already in Use**

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Use a different port
npm run dev -- -p 3001

# Then open: http://localhost:3001
```

---

### **Issue 2: Node Version Incompatibility**

**Error:**
```
Error: The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Check your Node version
node --version

# Required: Node.js 18.0.0 or higher
# Download from: https://nodejs.org/
```

---

### **Issue 3: npm Install Hangs or Freezes**

**Solution:**
```bash
# Stop the process (Ctrl+C)

# Clear npm cache
npm cache clean --force

# Try with different registry
npm install --legacy-peer-deps --registry=https://registry.npmjs.org/
```

---

### **Issue 4: TypeScript Errors**

**Error:**
```
Type error: Cannot find module...
```

**Solution:**
```bash
# Generate Prisma Client
npm run db:generate

# Run type check
npm run type-check
```

---

### **Issue 5: Missing Environment Variables**

**Error:**
```
Error: Environment variable not found
```

**Solution:**
```bash
# Copy the example file
copy .env.example .env.local

# Edit .env.local with your API keys
notepad .env.local
```

**Minimum required for development:**
```env
# You can leave these empty for initial testing
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
REPLICATE_API_TOKEN=""
STRIPE_SECRET_KEY=""
DATABASE_URL="postgresql://user:password@localhost:5432/studio_nexora"
```

---

### **Issue 6: Database Connection Error**

**Error:**
```
PrismaClientInitializationError: Can't reach database server
```

**Solution:**

**Option A: Use Supabase (Recommended)**
1. Sign up at https://supabase.com
2. Create a new project
3. Copy the connection string
4. Add to `.env.local`:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
```

**Option B: Skip Database for Now**
Comment out database-related code in:
- `src/lib/prisma.ts`
- API routes that use Prisma

---

### **Issue 7: Clerk Authentication Error**

**Error:**
```
Clerk: Missing publishable key
```

**Solution:**

**Option A: Set up Clerk**
1. Sign up at https://clerk.com
2. Create application
3. Copy keys to `.env.local`

**Option B: Disable Clerk Temporarily**
Comment out Clerk middleware in `src/middleware.ts`:
```typescript
// export { authMiddleware } from '@clerk/nextjs';
// export default authMiddleware({
//   publicRoutes: ['/'],
// });

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

---

## 🚀 **Quick Fix: Run Without External Dependencies**

If you want to test the UI without setting up all integrations:

### **1. Create Minimal .env.local:**
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### **2. Comment Out Middleware:**
Edit `src/middleware.ts`:
```typescript
// Temporarily disable all middleware
export const config = {
  matcher: [],
};
```

### **3. Use Mock Data:**
The application will work with mock data for:
- Image upload (client-side only)
- UI interactions
- Style selection
- Form validation

### **4. Start Server:**
```bash
npm run dev
```

---

## 📊 **Verification Checklist:**

Before running the app, verify:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] `node_modules/` folder exists
- [ ] `package-lock.json` exists
- [ ] `.env.local` file created (even if empty)
- [ ] Port 3000 is available
- [ ] No firewall blocking localhost

---

## 🆘 **Still Having Issues?**

### **Option 1: Fresh Start**
```bash
# Navigate to parent directory
cd C:\

# Delete the project
rmdir /s /q studio-nexora

# Re-download or re-create the project
```

### **Option 2: Check System Requirements**
- Windows 10/11
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- 4GB RAM minimum
- 500MB free disk space

### **Option 3: Alternative Installation**
```bash
# Use Yarn instead of npm
npm install -g yarn
cd C:\studio-nexora
yarn install
yarn dev
```

---

## 📝 **Debug Commands:**

```bash
# Check Node version
node --version

# Check npm version
npm --version

# List installed packages
npm list --depth=0

# Check for outdated packages
npm outdated

# Verify Next.js installation
npx next --version

# Check port usage
netstat -ano | findstr :3000

# View npm logs
npm run dev --verbose
```

---

## ✅ **Success Indicators:**

When everything is working, you should see:

1. **Terminal Output:**
```
✓ Ready in 2.5s
○ Compiling / ...
✓ Compiled / in 1.2s
```

2. **Browser:**
- Page loads at http://localhost:3000
- Studio Nexora interface appears
- No console errors (F12 → Console)

3. **Features Working:**
- Can click buttons
- Can select styles
- Can drag/drop files
- UI is responsive

---

## 🎯 **Next Steps After Fixing:**

1. ✅ Configure API keys in `.env.local`
2. ✅ Set up database (Supabase recommended)
3. ✅ Test all features
4. ✅ Deploy to production

---

## 📞 **Need More Help?**

1. Check the main README.md
2. Review SETUP.md for detailed setup
3. See INSTALLATION-GUIDE.md for step-by-step instructions
4. Check package.json for correct dependencies

---

**Remember:** The application can run without external APIs for UI testing. You only need the integrations (Clerk, Replicate, Stripe, etc.) when you want to test those specific features.
