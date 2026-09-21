import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base = process.env.PORTAL_BASE_URL || 'https://chenmohan123.github.io';
const local = base.startsWith('http://127.0.0.1');
const output = `.tmp/tracking-02-release/portal-${local ? 'local' : 'online'}`;
await mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true});
const results=[];
try {
  for(const width of [1440,390]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    assert.equal((await page.goto(base+'/',{waitUntil:'networkidle',timeout:60000})).status(),200);
    await expect(page.locator('astro-island[component-url*="ModelDirectory"]')).not.toHaveAttribute('ssr','');
    await expect(page.getByText('8 个条目',{exact:true})).toBeVisible();
    await page.getByRole('combobox',{name:'后端',exact:true}).selectOption('cpu');
    await page.getByRole('combobox',{name:'任务',exact:true}).selectOption('multi-object-tracking');
    await expect(page.getByText('1 个条目',{exact:true})).toBeVisible();
    await expect(page.getByText(/独立 Demo 展示 RC/)).toBeVisible();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${output}/directory-${width}.png`,fullPage:true});
    await page.getByRole('link',{name:'PP-Tracking',exact:true}).click();
    await expect(page.getByRole('heading',{level:1})).toHaveText('PP-Tracking');
    await expect(page.getByText('web-sdk-pp-tracking@0.1.0',{exact:true})).toBeVisible();
    await expect(page.getByText('CPU / JavaScript',{exact:true})).toBeVisible();
    await expect(page.getByText(/本条包版本、算法、后端和无权重元数据对应稳定 latest 0.1.0/)).toBeVisible();
    await expect(page.getByText(/预发布使用 npm install web-sdk-pp-tracking@0.2.0-rc.0/)).toBeVisible();
    await expect(page.getByText(/ReID 保留实验状态/)).toBeVisible();
    for(const [name,url] of Object.entries({'GitHub 仓库':'https://github.com/chenmohan123/web-sdk-PP-Tracking','npm 包':'https://www.npmjs.com/package/web-sdk-pp-tracking','打开在线 Demo':'https://chenmohan123.github.io/web-sdk-PP-Tracking/'})) {
      await expect(page.getByRole('link',{name,exact:true})).toHaveAttribute('href',url);
    }
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${output}/detail-${width}.png`,fullPage:true});
    assert.equal((await page.goto(base+'/tasks/multi-object-tracking/')).status(),200);
    await expect(page.getByRole('link',{name:'PP-Tracking',exact:true})).toHaveAttribute('href','/models/pp-tracking/');
    assert.deepEqual(errors,[]);
    results.push({width,checks:['目录八项、CPU/跟踪筛选','稳定 0.1.0 字段与 RC 预览说明','RC 安装与 ReID 实验边界','独立链接','目录/详情无横向溢出','跟踪分类页'],pageErrors:errors});
    await page.close();
  }
  const report={verifiedAt:new Date().toISOString(),url:base,browser:browser.version(),results,boundary:'桌面 Chromium；390px 不是手机实机验证'};
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
