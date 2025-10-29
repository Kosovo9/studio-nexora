const fs = require('fs');
const path = require('path');

const messagesDir = './src/i18n/messages';
const files = fs.readdirSync(messagesDir).filter(file => file.endsWith('.json'));

console.log('🔍 Verificando archivos de traducción...\n');

// Función para obtener todas las claves de un objeto anidado
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

// Cargar todas las traducciones
const translations = {};
const allKeys = {};

for (const file of files) {
  const locale = path.basename(file, '.json');
  const filePath = path.join(messagesDir, file);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    translations[locale] = data;
    allKeys[locale] = getAllKeys(data);
    console.log(`✅ ${locale}: ${allKeys[locale].length} claves`);
  } catch (error) {
    console.log(`❌ Error en ${locale}: ${error.message}`);
  }
}

console.log('\n📊 Análisis de claves:');

// Encontrar el archivo con más claves (referencia)
let referenceLocale = '';
let maxKeys = 0;
for (const locale in allKeys) {
  if (allKeys[locale].length > maxKeys) {
    maxKeys = allKeys[locale].length;
    referenceLocale = locale;
  }
}

console.log(`\n🎯 Usando ${referenceLocale} como referencia (${maxKeys} claves)`);

const referenceKeys = allKeys[referenceLocale];
const issues = [];

// Verificar cada idioma
for (const locale in allKeys) {
  if (locale === referenceLocale) continue;
  
  const currentKeys = allKeys[locale];
  const missingKeys = referenceKeys.filter(key => !currentKeys.includes(key));
  const extraKeys = currentKeys.filter(key => !referenceKeys.includes(key));
  
  if (missingKeys.length > 0 || extraKeys.length > 0) {
    issues.push({
      locale,
      missing: missingKeys,
      extra: extraKeys
    });
  }
}

if (issues.length === 0) {
  console.log('\n🎉 ¡Todos los archivos de traducción están sincronizados!');
} else {
  console.log('\n⚠️  Problemas encontrados:');
  
  for (const issue of issues) {
    console.log(`\n📁 ${issue.locale}:`);
    
    if (issue.missing.length > 0) {
      console.log(`  ❌ Claves faltantes (${issue.missing.length}):`);
      issue.missing.forEach(key => console.log(`    - ${key}`));
    }
    
    if (issue.extra.length > 0) {
      console.log(`  ➕ Claves extra (${issue.extra.length}):`);
      issue.extra.forEach(key => console.log(`    + ${key}`));
    }
  }
}

console.log('\n🔧 Para corregir automáticamente, ejecuta: node fix-translations.js');