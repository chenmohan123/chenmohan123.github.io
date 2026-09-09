import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.env.SDK_E2E_REPORT_DIR ?? `.tmp/page-assets-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(root, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const reports = [];
try {
  for (const name of ['PP-Detection', 'PP-DocLayoutV3', 'PP-OCRv6', 'PP-LCNet_x1_0_doc_ori']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const row = { name, errors: [] };
    page.on('response', response => {
      if (response.status() >= 400) {
        const url = new URL(response.url());
        row.errors.push({ status: response.status(), url: url.origin + url.pathname });
      }
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        const raw = message.location().url;
        const url = raw ? new URL(raw) : null;
        row.errors.push({ console: message.text(), url: url ? url.origin + url.pathname : null });
      }
    });
    await page.goto(`https://chenmohan123.github.io/web-sdk-${name}/`, { waitUntil: 'networkidle' });
    row.brokenImages = await page.evaluate(() => [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src));
    reports.push(row);
    await context.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(path.join(root, 'page-assets.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), reports }, null, 2));
  console.log(JSON.stringify(reports));
}
