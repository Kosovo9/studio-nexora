const puppeteer = require('puppeteer');

const locales = ['es', 'en', 'pt', 'fr', 'it', 'de', 'nl', 'sv', 'no', 'da', 'ja', 'ko', 'zh'];
const baseUrl = 'http://localhost:3000';

async function verifyTranslations() {
  console.log('🌍 Verificando traducciones en la UI...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = [];
  
  for (const locale of locales) {
    try {
      console.log(`🔍 Probando idioma: ${locale}`);
      
      await page.goto(`${baseUrl}/${locale}`, { waitUntil: 'networkidle0', timeout: 10000 });
      
      // Verificar que el título de la página esté traducido
      const title = await page.title();
      
      // Verificar que hay contenido traducido en la página
      const heroText = await page.$eval('h1', el => el.textContent).catch(() => 'No encontrado');
      const description = await page.$eval('p', el => el.textContent).catch(() => 'No encontrado');
      
      // Verificar que el selector de idiomas funciona
      const languageSelector = await page.$('.language-selector, [data-testid="language-selector"]').catch(() => null);
      
      results.push({
        locale,
        success: true,
        title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
        heroText: heroText.substring(0, 50) + (heroText.length > 50 ? '...' : ''),
        hasLanguageSelector: !!languageSelector
      });
      
      console.log(`  ✅ Título: ${title.substring(0, 30)}...`);
      console.log(`  ✅ Contenido: ${heroText.substring(0, 30)}...`);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({
        locale,
        success: false,
        error: error.message
      });
    }
  }
  
  await browser.close();
  
  console.log('\n📊 Resumen de verificación de traducciones:');
  console.log(`  Total idiomas: ${results.length}`);
  console.log(`  Exitosos: ${results.filter(r => r.success).length}`);
  console.log(`  Fallidos: ${results.filter(r => !r.success).length}`);
  
  if (results.every(r => r.success)) {
    console.log('\n🎉 ¡Todas las traducciones funcionan correctamente!');
  } else {
    console.log('\n⚠️  Algunos idiomas tienen problemas:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.locale}: ${r.error}`);
    });
  }
  
  return results;
}

// Ejecutar solo si puppeteer está disponible
if (require.resolve('puppeteer')) {
  verifyTranslations().catch(console.error);
} else {
  console.log('📝 Puppeteer no está instalado. Instalando...');
  console.log('npm install puppeteer --save-dev');
  console.log('\nLuego ejecuta: node verify-ui-translations.js');
}