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
  for (const key of ["xs-320", "xs-416", "s-320", "s-416", "m-320", "m-416", "l-416", "l-640"]) {
    await expect(page.getByText(`picodet-${key}-fp16`, { exact: true })).toBeVisible();
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
