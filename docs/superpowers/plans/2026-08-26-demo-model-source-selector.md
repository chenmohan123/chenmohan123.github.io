# Demo 模型来源选择实现计划

> **对于代理式执行者：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行本计划。步骤使用复选框跟踪。

**目标：** 在 PP-DocLayoutV3、PP-LCNet_x1_0_doc_ori、PP-OCRv6 三个 Demo 中增加统一的模型来源下拉框，默认沿用 SDK 默认 manifest，并在已验证的情况下支持 Hugging Face / ModelScope manifest URL，不修改 SDK runtime 契约。

**架构：** 每个 Demo 新增一个纯数据来源配置模块，定义 `default`、`huggingface`、`modelscope` 三个稳定键、显示文案、manifest URL 与可用状态。UI 只负责选择和展示；运行前将可用来源转换成 SDK 已有的自定义 manifest URL 参数，切换来源时销毁旧实例并清空结果。没有浏览器可用 ONNX manifest 的来源保持禁用并显示限制。

**技术栈：** React + TypeScript（DocLayoutV3、OCRv6）、Vanilla TypeScript/DOM（LCNet）、Vite、Playwright、现有 SDK `model` / `manifestUrl` API。

---

### 任务 1：建立来源配置与契约测试

**文件：**
- 新建：`F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo/src/model-sources.ts`
- 新建：`F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/public/model-sources/huggingface.json`
- 新建：`F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/src/model-sources.ts`
- 新建：`F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo/public/model-sources/huggingface.json`
- 新建：`F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo/src/model-sources.ts`
- 修改：三个仓库现有的 `apps/demo/tests/demo.spec.ts`

- [ ] **步骤 1：先写失败测试。** 在三个仓库现有的 Playwright spec 中增加来源选择用例，断言页面初始来源是 `default`、来源键完整包含三个值、ModelScope 在无兼容 manifest 时禁用，并通过浏览器模块导入验证 `selectionToModel("default")` 返回 `undefined`、可用远程来源返回 `{ manifestUrl }`。测试只读取固定配置，不访问网络。

```ts
test("默认来源沿用 SDK 默认 manifest", async ({ page }) => {
  await page.goto("/?fixture=1");
  await expect(page.getByLabel("模型来源")).toHaveValue("default");
  const result = await page.evaluate(async () => {
    const module = await import("/src/model-sources.ts");
    return { keys: module.MODEL_SOURCE_OPTIONS.map((entry: { key: string }) => entry.key), model: module.selectionToModel("default") };
  });
  expect(result.keys).toEqual(["default", "huggingface", "modelscope"]);
  expect(result.model).toBeUndefined();
});

test("远程来源转换为 SDK 已有的 manifestUrl 参数", async ({ page }) => {
  await page.goto("/?fixture=1");
  const result = await page.evaluate(async () => {
    const module = await import("/src/model-sources.ts");
    const option = module.MODEL_SOURCE_OPTIONS.find((entry: { key: string }) => entry.key === "huggingface");
    return { available: option?.available, model: module.selectionToModel("huggingface") };
  });
  if (result.available) expect(result.model).toEqual({ manifestUrl: expect.any(String) });
  else expect(result.model).toBeUndefined();
});
```

- [ ] **步骤 2：运行测试确认失败。**

```powershell
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo test -- --grep "模型来源"
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo test -- --grep "模型来源"
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo test -- --grep "模型来源"
```

预期：因来源模块或导出不存在而失败。

- [ ] **步骤 3：准备可用来源的静态 manifest。** LCNet 的 Hugging Face manifest 复制现有 `models/v1.0.0/manifest.json` 的契约字段，仅把 `source.url` 和 `variant.url` 固定为 Hugging Face 仓库及 revision `7330ab7039123e46af2dc03154b9969aa412c61d` 的 `inference.onnx`；OCRv6 的 Hugging Face manifest 复制现有 `models/pp-ocrv6/1.0.0/manifest.json`，保留六个固定 revision 的 ONNX URL、字典路径、字节数和 SHA-256。静态 manifest 放入各 Demo 的 `public/model-sources/huggingface.json`，模型二进制仍直接从官方 Hugging Face 下载。不得在 Demo 中改写字节数或校验值。

- [ ] **步骤 4：实现最小来源配置。** 每个配置导出 `ModelSourceKey`、`ModelSourceOption`、`MODEL_SOURCE_OPTIONS`、`DEFAULT_MODEL_SOURCE` 和 `selectionToModel`。`default` 不生成 `model` 参数；LCNet/OCRv6 的 Hugging Face 选项返回相对静态 manifest URL；ModelScope 选项先标记 `available: false`，直到有经过契约验证的 ONNX manifest；PP-DocLayoutV3 的 Hugging Face（当前仅 safetensors）和 ModelScope 选项均标记不可用。对没有对应兼容 manifest 的选项使用 `disabledReason`，不能拼仓库首页 URL。

- [ ] **步骤 5：运行三个来源 Playwright 用例确认通过。**

```powershell
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo test -- --grep "模型来源"
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo test -- --grep "模型来源"
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo test -- --grep "模型来源"
```

- [ ] **步骤 6：提交。**

```powershell
git -C F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3 add apps/demo/src/model-sources.ts apps/demo/tests/demo.spec.ts
git -C F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori add apps/demo/public/model-sources/huggingface.json apps/demo/src/model-sources.ts apps/demo/tests/demo.spec.ts
git -C F:/git/00_chenmohan/github/web-sdk-PP-OCRv6 add apps/demo/public/model-sources/huggingface.json apps/demo/src/model-sources.ts apps/demo/tests/demo.spec.ts
git -C F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3 commit -m "feat: 增加 Demo 模型来源配置"
git -C F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori commit -m "feat: 增加 Demo 模型来源配置"
git -C F:/git/00_chenmohan/github/web-sdk-PP-OCRv6 commit -m "feat: 增加 Demo 模型来源配置"
```

### 任务 2：PP-DocLayoutV3 React Demo 接入来源选择

**文件：**
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo/src/App.tsx`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo/src/i18n/zh-CN.ts`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo/src/i18n/en.ts`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo/tests/demo.spec.ts`

- [ ] **步骤 1：先写失败端到端测试。** 在 `?fixture=1` 页面断言存在 `#model-source`（或等价稳定 `data-testid`），初始值为 `default`，远程来源显示 disabled 原因；切换来源后断言当前结果、错误和计时被清空，下一次运行不会复用旧 detector。测试不触发真实网络。

```ts
await expect(page.getByLabel("模型来源")).toHaveValue("default");
await expect(page.getByRole("option", { name: /ModelScope/ })).toBeDisabled();
```

- [ ] **步骤 2：运行该 Playwright 用例确认失败。**

```powershell
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo test -- --grep "模型来源"
```

- [ ] **步骤 3：实现受控来源选择。** 在 `App` 中增加 `modelSource` 状态；从 `MODEL_SOURCE_OPTIONS` 渲染 `<select>`，保留中文默认文案与英文切换。选择变化时调用 `cancel()` / dispose detector、清空 `result`、`error`、`notice`、下载进度和 canvas 状态，回到 `ready`。在 `runDetection` 中把 `selectionToModel(modelSource)` 与 fixture 分支合并：`default` 不传 `model`，远程来源传 `{ model: modelSelection }`；自定义 manifest 弹窗继续独立工作。

- [ ] **步骤 4：在模型信息区域显示来源。** 增加来源行和稳定 `data-sdk-model-info` 内容；默认显示 `SDK 默认`，远程显示来源名称及 manifest URL 的可读短文本，不暴露无意义的长 URL 造成移动端溢出。

- [ ] **步骤 5：补充中英文文案并运行用例确认通过。**

- [ ] **步骤 6：运行 DocLayoutV3 Demo 类型检查、单元测试和构建。**

```powershell
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo typecheck
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3 test
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo build
```

- [ ] **步骤 7：提交。**

```powershell
git -C F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3 add apps/demo/src/App.tsx apps/demo/src/model-sources.ts apps/demo/src/i18n/zh-CN.ts apps/demo/src/i18n/en.ts apps/demo/tests/demo.spec.ts
git -C F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3 commit -m "feat: 为版面 Demo 增加模型来源选择"
```

### 任务 3：PP-LCNet Vanilla Demo 接入来源选择

**文件：**
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/src/render.ts`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/src/main.ts`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/src/i18n/types.ts`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/src/i18n/zh-CN.ts`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/src/i18n/en.ts`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/tests/demo.spec.ts`

- [ ] **步骤 1：先写失败测试。** 断言 Vanilla Demo 的控制带包含来源 `<select>`，默认值为 `default`，来源切换会清空已渲染的结果占位并在下一次 `createDocOrientation` 调用中使用配置的 manifest URL。对不可用 ModelScope 选项断言 `disabled`。

- [ ] **步骤 2：运行 Playwright 用例确认失败。**

```powershell
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo test -- --grep "模型来源"
```

- [ ] **步骤 3：实现 Vanilla 绑定。** `render.ts` 生成来源选择和说明文本；`main.ts` 保存 `modelSource`，在 `applyCopy` 同步文案，在来源 change handler 中 dispose detector、清空结果/预览/计时并重新渲染占位。运行时构造 `createDocOrientation({ model: selectionToModel(modelSource), ... })`，`default` 时省略 `model` 字段。

- [ ] **步骤 4：补充模型/计时详情中的来源信息，确保 390px 视口不横向溢出。**

- [ ] **步骤 5：运行 LCNet 单元测试、类型检查、构建和 Playwright。**

```powershell
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori test
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori build
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo test
```

- [ ] **步骤 6：提交。**

```powershell
git -C F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori add apps/demo/src/render.ts apps/demo/src/main.ts apps/demo/src/model-sources.ts apps/demo/src/i18n apps/demo/tests/demo.spec.ts
git -C F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori commit -m "feat: 为方向 Demo 增加模型来源选择"
```

### 任务 4：PP-OCRv6 React Demo 接入来源选择

**文件：**
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo/src/App.tsx`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo/src/i18n/zh-CN.ts`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo/src/i18n/en.ts`
- 修改：`F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo/tests/demo.spec.ts`

- [ ] **步骤 1：先写失败测试。** 断言来源选择默认 `default`，Hugging Face 选项可选，ModelScope 在没有兼容 manifest 时禁用；选择来源后 session manager 的配置键变化，旧 OCR 实例被 dispose，结果和状态重置。

- [ ] **步骤 2：运行用例确认失败。**

```powershell
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo test -- --grep "模型来源"
```

- [ ] **步骤 3：实现来源选择与 SDK 参数映射。** 增加 `modelSource` 状态；将 `selectionToModel(modelSource)` 产生的 `{ manifestUrl }` 同时用于 det/rec 的 `RuntimeOptions.model`，默认来源时保留现有 `detPreset` / `recPreset`。把来源键加入 `configKey`，确保切换来源不复用旧 session；切换时主动清理结果、选择行、进度和错误。

- [ ] **步骤 4：更新模型信息与中英文文案。** 显示来源名称；保留用户已有的“自定义 manifest URL”输入，来源下拉选择后以预置来源覆盖该输入，切换回 `default` 恢复 SDK 默认。

- [ ] **步骤 5：运行 OCR 单元测试、类型检查、构建和 Playwright。**

```powershell
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-OCRv6 test
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-OCRv6 build
pnpm --dir F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo test
```

- [ ] **步骤 6：提交。**

```powershell
git -C F:/git/00_chenmohan/github/web-sdk-PP-OCRv6 add apps/demo/src/App.tsx apps/demo/src/model-sources.ts apps/demo/src/i18n/zh-CN.ts apps/demo/src/i18n/en.ts apps/demo/tests/demo.spec.ts
git -C F:/git/00_chenmohan/github/web-sdk-PP-OCRv6 commit -m "feat: 为 OCR Demo 增加模型来源选择"
```

### 任务 5：标准检查与跨 Demo 验证

**文件：**
- 可能修改：`F:/git/00_chenmohan/github/chenmohan123.github.io/standards/v1`（仅当检查器发现新的标准字段需求；默认不改）
- 可能修改：三个 SDK 的 `CHANGELOG.md`（记录用户可见 Demo 变化）

- [ ] **步骤 1：运行三个 SDK 标准检查。**

```powershell
pnpm --dir F:/git/00_chenmohan/github/chenmohan123.github.io sdk:check -- --repo F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3 --format table
pnpm --dir F:/git/00_chenmohan/github/chenmohan123.github.io sdk:check -- --repo F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori --format table
pnpm --dir F:/git/00_chenmohan/github/chenmohan123.github.io sdk:check -- --repo F:/git/00_chenmohan/github/web-sdk-PP-OCRv6 --format table
```

- [ ] **步骤 2：运行三套 Demo 的移动端和桌面端 smoke test。** 重点确认来源下拉、禁用提示、状态区域和模型信息在 390px viewport 不溢出。

- [ ] **步骤 3：检查差异和未跟踪文件。**

```powershell
git -C F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3 diff --check
git -C F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori diff --check
git -C F:/git/00_chenmohan/github/web-sdk-PP-OCRv6 diff --check
git -C F:/git/00_chenmohan/github/chenmohan123.github.io status --short
```

- [ ] **步骤 4：记录限制。** 在三个 Demo 文档或 CHANGELOG 中明确：默认来源仍由 SDK 决定；远程来源只有在固定 manifest/ONNX/校验信息完整时启用；未验证 ModelScope 或 safetensors 来源保持禁用。

- [ ] **步骤 5：提交各仓库的文档变更，并保留标准检查报告。**
