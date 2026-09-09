import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// 图标使用共享 UI 令牌；通过浏览器栅格化，生成包含四种尺寸的 ICO。
const root = new URL('../', import.meta.url);
const tokens = JSON.parse(await fs.readFile(new URL('standards/v1/ui-tokens.json', root), 'utf8'));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>Web Model SDK</title>
  <rect width="64" height="64" rx="${parseInt(tokens.radius.md, 10)}" fill="${tokens.color.action}" />
  <path d="M14 20 22 44 32 28 42 44 50 20" fill="none" stroke="${tokens.color.actionText}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;
await fs.mkdir(new URL('public/', root), { recursive: true });
await fs.writeFile(new URL('public/favicon.svg', root), svg);
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const entries = [];
try {
  for (const size of [16, 32, 48, 64]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:100%;height:100%}</style>${svg}`);
    entries.push({ size, png: await page.screenshot({ omitBackground: true }) });
    await page.close();
  }
} finally {
  await browser.close();
}
const header = Buffer.alloc(6 + entries.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);
let offset = header.length;
entries.forEach(({ size, png }, index) => {
  const start = 6 + index * 16;
  header[start] = size;
  header[start + 1] = size;
  header.writeUInt16LE(1, start + 4);
  header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(png.length, start + 8);
  header.writeUInt32LE(offset, start + 12);
  offset += png.length;
});
const target = new URL('public/favicon.ico', root);
await fs.writeFile(target, Buffer.concat([header, ...entries.map(entry => entry.png)]));
console.log(`已生成 SVG 和 ICO（16、32、48、64 像素）：${fileURLToPath(target)}`);
