#!/usr/bin/env node

const lighthouse = require('lighthouse').default;
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

async function runLighthouse() {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility'],
    port: chrome.port,
  };
  
  const runnerResult = await lighthouse('http://localhost:3000', options);

  // Generate report
  const reportHtml = runnerResult.report;
  const reportPath = path.join(__dirname, '../lighthouse-report.html');
  fs.writeFileSync(reportPath, reportHtml);

  // Extract scores
  const lhr = runnerResult.lhr;
  const performance = Math.round(lhr.categories.performance.score * 100);
  const accessibility = Math.round(lhr.categories.accessibility.score * 100);

  console.log('\n🚀 Lighthouse Results:');
  console.log(`📊 Performance: ${performance}/100 ${performance >= 90 ? '✅' : '❌'}`);
  console.log(`♿ Accessibility: ${accessibility}/100 ${accessibility >= 90 ? '✅' : '❌'}`);
  console.log(`📄 Report saved to: ${reportPath}`);

  // Check specific metrics
  const metrics = lhr.audits;
  const fcp = metrics['first-contentful-paint'].displayValue;
  const lcp = metrics['largest-contentful-paint'].displayValue;
  const cls = metrics['cumulative-layout-shift'].displayValue;
  const fid = metrics['max-potential-fid'] ? metrics['max-potential-fid'].displayValue : 'N/A';

  console.log('\n📈 Core Web Vitals:');
  console.log(`🎨 First Contentful Paint: ${fcp}`);
  console.log(`🖼️  Largest Contentful Paint: ${lcp}`);
  console.log(`📐 Cumulative Layout Shift: ${cls}`);
  console.log(`⚡ First Input Delay: ${fid}`);

  await chrome.kill();
  
  return {
    performance,
    accessibility,
    fcp,
    lcp,
    cls,
    fid
  };
}

if (require.main === module) {
  runLighthouse().catch(console.error);
}

module.exports = runLighthouse;