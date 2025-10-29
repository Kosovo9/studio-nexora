const http = require('http');

console.log('🌍 Probando todas las rutas de idiomas...\n');

const baseUrl = 'http://localhost:3000';
const testRoutes = ['/'];
const locales = ['es', 'en', 'pt', 'fr', 'it', 'de', 'nl', 'sv', 'no', 'da', 'ja', 'ko', 'zh'];

async function testRoute(locale, route) {
  return new Promise((resolve) => {
    const url = `${baseUrl}/${locale}${route}`;
    
    const req = http.get(url, (res) => {
      const status = res.statusCode;
      const success = status >= 200 && status < 400;
      
      resolve({
        locale,
        route,
        url,
        status,
        success
      });
    });
    
    req.on('error', (err) => {
      resolve({
        locale,
        route,
        url,
        status: 'ERROR',
        success: false,
        error: err.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        locale,
        route,
        url,
        status: 'TIMEOUT',
        success: false,
        error: 'Request timeout'
      });
    });
  });
}

async function runTests() {
  const results = [];
  
  for (const locale of locales) {
    console.log(`🔍 Probando idioma: ${locale}`);
    
    for (const route of testRoutes) {
      const result = await testRoute(locale, route);
      results.push(result);
      
      const icon = result.success ? '✅' : '❌';
      const statusText = result.success ? result.status : `${result.status} - ${result.error || ''}`;
      console.log(`  ${icon} ${route}: ${statusText}`);
    }
    console.log('');
  }
  
  // Resumen
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  
  console.log('📊 Resumen de pruebas:');
  console.log(`  Total: ${totalTests}`);
  console.log(`  Exitosas: ${successfulTests}`);
  console.log(`  Fallidas: ${failedTests}`);
  
  if (failedTests > 0) {
    console.log('\n❌ Rutas con problemas:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.url}: ${r.status} ${r.error || ''}`);
    });
  } else {
    console.log('\n🎉 ¡Todas las rutas funcionan correctamente!');
  }
}

runTests().catch(console.error);