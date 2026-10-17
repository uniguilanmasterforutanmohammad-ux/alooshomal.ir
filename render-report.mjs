import { chromium } from 'playwright-core';
import path from 'node:path';

const htmlPath = path.resolve(
  'docs/reports/security-perf-seo-report.html',
);
const outPath = path.resolve('docs/reports/security-perf-seo-report.pdf');

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: outPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
});
await browser.close();
console.log('written', outPath);
