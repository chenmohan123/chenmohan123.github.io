import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`旋转框检测在 ${width}px 可筛选、搜索并打开完整发布详情`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.locator('astro-island[component-url*="ModelDirectory"]')).not.toHaveAttribute('ssr', '');
    await expect(page.getByText('7 个条目', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: '任务', exact: true }).selectOption({ label: '旋转框检测' });
    await page.getByRole('searchbox').fill('web-sdk-pp-rotated-detection');
    await expect(page.getByText('1 个条目', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'PP-Segmentation', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'PP-RotatedDetection', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('PP-RotatedDetection');
    await expect(page.getByText('baidu · 旋转框检测', { exact: true })).toBeVisible();
    await expect(page.getByText('web-sdk-pp-rotated-detection@0.1.0', { exact: true })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'ppyoloe-r-s-1024-fp32' })).toContainText('31.63 MiB');
    await expect(page.getByRole('link', { name: 'GitHub 仓库', exact: true })).toHaveAttribute('href', 'https://github.com/chenmohan123/web-sdk-PP-RotatedDetection');
    await expect(page.getByRole('link', { name: 'npm 包', exact: true })).toHaveAttribute('href', 'https://www.npmjs.com/package/web-sdk-pp-rotated-detection');
    await expect(page.getByRole('link', { name: '打开在线 Demo', exact: true })).toHaveAttribute('href', 'https://chenmohan123.github.io/web-sdk-PP-RotatedDetection/');
    await expect(page.getByText(/DOTA 15 类.*不是 COCO/)).toBeVisible();
    await expect(page.getByText(/单张图片.*大图切片.*视频.*摄像头.*跟踪/)).toBeVisible();
    await expect(page.getByText(/手机.*NPU.*尚未验证/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/rotated-detection-${width}.png`, fullPage: true });
    await page.goto('/tasks/rotated-detection/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('旋转框检测');
    await page.getByRole('link', { name: 'PP-RotatedDetection', exact: true }).click();
    await expect(page).toHaveURL(/\/models\/pp-rotated-detection\//);
  });

  test(`实例分割在 ${width}px 可筛选、搜索并打开完整发布详情`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.locator('astro-island[component-url*="ModelDirectory"]')).not.toHaveAttribute('ssr', '');
    await expect(page.getByText('7 个条目', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: '任务', exact: true }).selectOption({ label: '实例分割' });
    await page.getByRole('searchbox').fill('web-sdk-pp-segmentation');
    await expect(page.getByText('1 个条目', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'PP-TinyPose', exact: true })).toHaveCount(0);
    await page.getByRole('link', { name: 'PP-Segmentation', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('PP-Segmentation');
    await expect(page.getByText('baidu · 实例分割', { exact: true })).toBeVisible();
    await expect(page.getByText('web-sdk-pp-segmentation@0.1.0', { exact: true })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'ppyoloe-seg-s-640-fp32' })).toContainText('34.59 MiB');
    await expect(page.getByRole('link', { name: 'GitHub 仓库', exact: true })).toHaveAttribute('href', 'https://github.com/chenmohan123/web-sdk-PP-Segmentation');
    await expect(page.getByRole('link', { name: 'npm 包', exact: true })).toHaveAttribute('href', 'https://www.npmjs.com/package/web-sdk-pp-segmentation');
    await expect(page.getByRole('link', { name: '打开在线 Demo', exact: true })).toHaveAttribute('href', 'https://chenmohan123.github.io/web-sdk-PP-Segmentation/');
    await expect(page.getByText(/默认 ModelScope.*Hugging Face/)).toBeVisible();
    await expect(page.getByText(/不包含视频、摄像头/)).toBeVisible();
    await expect(page.getByText(/手机.*NPU.*尚未验证/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/segmentation-${width}.png`, fullPage: true });
    await page.goto('/tasks/instance-segmentation/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('实例分割');
    await page.getByRole('link', { name: 'PP-Segmentation', exact: true }).click();
    await expect(page).toHaveURL(/\/models\/pp-segmentation\//);
  });

  test(`TinyPose 0.3.0 在 ${width}px 展示三项资产、媒体边界和独立 SDK 链接`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator('astro-island[component-url*="ModelDirectory"]')).not.toHaveAttribute("ssr", "");
    await expect(page.getByText("7 个条目", { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "任务", exact: true }).selectOption({ label: "人体姿态" });
    await expect(page.getByText("1 个条目", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "PP-DocLayoutV3", exact: true })).toHaveCount(0);
    await page.getByRole("searchbox").fill("web-sdk-pp-tinypose");
    await expect(page.getByRole("link", { name: "PP-TinyPose", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "PP-TinyPose", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("PP-TinyPose");
    await expect(page.getByText("baidu · 人体姿态", { exact: true })).toBeVisible();
    await expect(page.getByText("web-sdk-pp-tinypose@0.3.0", { exact: true })).toBeVisible();
    await expect(page.getByText(/256×192.*128×96/)).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "tinypose-256x192-fp32" })).toContainText("5.42 MiB");
    await expect(page.getByRole("listitem").filter({ has: page.getByText("tinypose-enhance-128x96", { exact: true }) })).toContainText("5.42 MiB");
    await expect(page.getByRole("listitem").filter({ has: page.getByText("tinypose-enhance-128x96-w16a32", { exact: true }) })).toContainText("3.00 MiB");
    await expect(page.getByRole("link", { name: "GitHub 仓库", exact: true })).toHaveAttribute("href", "https://github.com/chenmohan123/web-sdk-PP-TinyPose");
    await expect(page.getByRole("link", { name: "npm 包", exact: true })).toHaveAttribute("href", "https://www.npmjs.com/package/web-sdk-pp-tinypose");
    await expect(page.getByRole("link", { name: "打开在线 Demo", exact: true })).toHaveAttribute("href", "https://chenmohan123.github.io/web-sdk-PP-TinyPose/");
    await expect(page.getByRole("link", { name: "规格与精度对比 →", exact: true })).toHaveAttribute("href", "https://github.com/chenmohan123/web-sdk-PP-TinyPose/blob/v0.3.0/README.md");
    await expect(page.getByText(/score 为热力图响应，不是可见性概率/)).toBeVisible();
    await expect(page.getByText(/默认 ModelScope.*Hugging Face/)).toBeVisible();
    await expect(page.getByText(/W16A32.*FP16 权重.*FP32 计算/)).toBeVisible();
    await expect(page.getByText(/普通 FP16.*256×192 W16A32.*未发布/)).toBeVisible();
    await expect(page.getByText(/24组合.*0\.3\.0/)).toBeVisible();
    await expect(page.getByText(/视频解码、摄像头权限和帧调度属于独立Demo/)).toBeVisible();
    await expect(page.getByText(/模拟摄像头不代表物理设备兼容/)).toBeVisible();
    await expect(page.getByText(/GT 框子集平均 OKS.*不是全量 COCO AP/)).toBeVisible();
    await expect(page.getByText(/手机.*尚未验证/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto("/tasks/pose-estimation/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("人体姿态");
    await expect(page).toHaveTitle("人体姿态 模型 · Web Model SDK");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "PP-TinyPose", exact: true }).click();
    await expect(page).toHaveURL(/\/models\/pp-tinypose\//);
  });
}

test("homepage exposes the model SDK directory and Models navigation", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "浏览器端模型 SDK 目录",
  );
  await expect(page.getByRole("navigation")).toContainText("Models");
});

test("PP-DocLayoutV3 detail exposes package, assets, and live demo", async ({
  page,
}) => {
  await page.goto("/models/pp-doclayoutv3/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "PP-DocLayoutV3",
  );
  await expect(page.getByText("web-sdk-pp-doclayoutv3@1.2.0")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "打开在线 Demo" }),
  ).toHaveAttribute(
    "href",
    "https://chenmohan123.github.io/web-sdk-PP-DocLayoutV3/",
  );
  await expect(page.getByText("70.84 MiB")).toBeVisible();
});

test("PaddleDetection 详情展示 0.4.0、三十七个模型变体和独立 Demo，窄屏不溢出", async ({
  page,
}) => {
  await page.goto("/models/pp-detection/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "PaddleDetection PicoDet / PP-YOLOE",
  );
  await expect(page.getByRole("link", { name: "GitHub 仓库" })).toHaveAttribute(
    "href",
    "https://github.com/chenmohan123/web-sdk-PP-Detection",
  );
  await expect(page.getByRole("link", { name: "npm 包" })).toHaveAttribute(
    "href",
    "https://www.npmjs.com/package/web-sdk-pp-detection",
  );
  await expect(
    page.getByRole("link", { name: "打开在线 Demo" }),
  ).toHaveAttribute(
    "href",
    "https://chenmohan123.github.io/web-sdk-PP-Detection/",
  );
  await expect(page.getByText("web-sdk-pp-detection@0.4.0")).toBeVisible();
  await expect(page.getByText("22.17 MiB")).toBeVisible();
  await expect(page.getByText("30.47 MiB")).toBeVisible();
  for (const model of ["picodet-l-320", "ppyoloe-plus-s-640"]) {
    for (const precision of ["fp32", "fp16", "w8a32"]) {
      await expect(
        page.getByText(`${model}-${precision}`, { exact: true }),
      ).toBeVisible();
    }
  }
  for (const size of ["m", "l", "x"]) {
    for (const precision of ["fp32", "fp16", "w8a32"]) {
      await expect(
        page.getByText(`ppyoloe-plus-${size}-640-${precision}`, {
          exact: true,
        }),
      ).toBeVisible();
    }
  }
  for (const key of [
    "xs-320",
    "xs-416",
    "s-320",
    "s-416",
    "m-320",
    "m-416",
    "l-416",
    "l-640",
  ]) {
    await expect(
      page.getByText(`picodet-${key}-fp16`, { exact: true }),
    ).toBeVisible();
    const quantized = page.getByText(`picodet-${key}-w8a32`, { exact: true });
    if (key.startsWith("xs-")) await expect(quantized).toHaveCount(0);
    else await expect(quantized).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("LCNet 长模型标题在390px视口完整换行，不撑宽页面", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/models/pp-lcnet-x1-0-doc-ori/");
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText("PP-LCNet_x1_0_doc_ori");
  expect(
    await title.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Detection选型入口支持精度和后端筛选，390px保留完整可滚动表格", async ({
  page,
}) => {
  await page.goto("/models/pp-detection/");
  await page.getByRole("link", { name: "模型选型与对比 →" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "找到适合的检测模型",
  );
  await expect(page.getByRole("status")).toHaveText(
    "39 个稳定变体 · CPU / WASM",
  );
  await page
    .getByRole("combobox", { name: "模型系列", exact: true })
    .selectOption("ppyolo");
  await page
    .getByRole("combobox", { name: "模型精度", exact: true })
    .selectOption("fp32");
  const tiny = page.locator('tr[data-variant="ppyolo-tiny-320-fp32"]');
  await expect(tiny).toContainText("22.60");
  await expect(tiny).toContainText("47.46");
  await page.getByRole("combobox", { name: "模型精度", exact: true }).selectOption("fp16");
  const fp16 = page.locator('tr[data-variant="ppyolo-tiny-320-fp16"]');
  await expect(fp16).toContainText("2.36");
  await expect(fp16).toContainText("53.00");
  await expect(page.locator(".batch-reference")).toContainText("48.50 ms");
  await page.getByRole("radio", { name: "GPU / WebGPU" }).check();
  await expect(fp16).toContainText("37.13");
  await expect(page.locator(".batch-reference")).toContainText("30.61 ms");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("combobox", { name: "模型精度", exact: true }).selectOption("w8a32");
  await expect(page.getByRole("status")).toHaveText("0 个稳定变体 · GPU / WebGPU");
  await page.getByRole("radio", { name: "CPU / WASM" }).check();
  await page
    .getByRole("combobox", { name: "模型系列", exact: true })
    .selectOption("picodet");
  await page
    .getByRole("combobox", { name: "模型系列", exact: true })
    .selectOption("picodet");
  await page
    .getByRole("combobox", { name: "模型精度", exact: true })
    .selectOption("w8a32");
  await expect(page.getByRole("status")).toHaveText(
    "7 个稳定变体 · CPU / WASM",
  );
  await expect(page.locator('tr[data-variant^="picodet-xs-"]')).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "模型精度", exact: true })
    .selectOption("fp32");
  const row = page.locator('tr[data-variant="picodet-xs-320-fp32"]');
  await expect(row).toContainText("64.10");
  await page.getByRole("radio", { name: "GPU / WebGPU" }).check();
  await expect(row).toContainText("36.69");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const table = page.getByRole("region", {
    name: /PicoDet XS\/S\/M.*可横向滚动/,
  });
  await table.focus();
  await page.keyboard.press("End");
  expect(
    await table.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await page.getByText("评测口径与环境", { exact: true }).click();
  await expect(page.getByText(/不是对人工标注的召回率/)).toBeVisible();
  await expect(
    page.locator(".batch-method").filter({ hasText: "仅第三轮" }),
  ).toBeVisible();
});

test("PP-OCRv6 详情展示 0.2.0、六个 FP32 资产和独立 Demo", async ({ page }) => {
  await page.goto("/models/pp-ocrv6/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "PP-OCRv6 Web SDK",
  );
  await expect(page.getByText("web-sdk-pp-ocrv6@0.2.0")).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub 仓库" })).toHaveAttribute(
    "href",
    "https://github.com/chenmohan123/web-sdk-PP-OCRv6",
  );
  await expect(
    page.getByRole("link", { name: "打开在线 Demo" }),
  ).toHaveAttribute("href", "https://chenmohan123.github.io/web-sdk-PP-OCRv6/");
  await expect(page.getByText("experimental", { exact: true })).toBeVisible();
  for (const asset of [
    "PP-OCRv6_medium_det",
    "PP-OCRv6_small_det",
    "PP-OCRv6_tiny_det",
    "PP-OCRv6_medium_rec",
    "PP-OCRv6_small_rec",
    "PP-OCRv6_tiny_rec",
  ]) {
    await expect(page.getByText(asset, { exact: true })).toBeVisible();
  }
});

test("brand and task routes are statically generated", async ({ page }) => {
  await page.goto("/brands/baidu/");
  await expect(page.getByText("PP-DocLayoutV3")).toBeVisible();
  await page.goto("/tasks/document-layout/");
  await expect(page.getByText("PP-DocLayoutV3")).toBeVisible();
});

test("docs distinguish stable backends from Labs", async ({ page }) => {
  await page.goto("/docs/");
  await expect(
    page.getByRole("heading", { name: "SDK 生命周期" }),
  ).toBeVisible();
  await expect(page.getByText("WebNN 仅属于 Labs")).toBeVisible();
  await expect(page.getByText("COOP/COEP")).toBeVisible();
});
