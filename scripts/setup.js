#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Studio Nexora...\n');

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
  } else {
    console.log('❌ .env.example file not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('pnpm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.log('❌ Failed to install dependencies');
  process.exit(1);
}

// Generate Prisma client
console.log('\n🗄️  Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');
} catch (error) {
  console.log('❌ Failed to generate Prisma client');
  process.exit(1);
}

// Check if database is configured
console.log('\n🔍 Checking database configuration...');
const envContent = fs.readFileSync(envPath, 'utf8');
if (envContent.includes('postgresql://username:password@localhost:5432/studio_nexora')) {
  console.log('⚠️  Please update DATABASE_URL in .env file with your actual database credentials');
} else {
  console.log('✅ Database URL appears to be configured');
}

// Check NextAuth secret
if (envContent.includes('your-nextauth-secret-here')) {
  console.log('⚠️  Please update NEXTAUTH_SECRET in .env file');
} else {
  console.log('✅ NextAuth secret appears to be configured');
}

console.log('\n🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Update your .env file with actual credentials');
console.log('2. Run: npx prisma db push (to create database tables)');
console.log('3. Run: pnpm dev (to start development server)');
console.log('\nFor more information, see README.md');
