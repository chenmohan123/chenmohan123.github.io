import { test, expect } from "@playwright/test";

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
    "38 个稳定变体 · CPU / WASM",
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
