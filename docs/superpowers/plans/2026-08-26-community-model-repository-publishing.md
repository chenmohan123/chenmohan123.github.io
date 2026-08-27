# 社区模型仓库发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Hugging Face 和 ModelScope 发布三个 Web SDK 的当前模型资产，加入既有集合，并让三个 Demo 使用固定 revision 的公开 manifest 地址。

**Architecture:** 每个平台按 SDK 建一个公开模型仓库，上传经过白名单筛选的 ONNX、字典、manifest、模型卡和许可证材料。LCNet/OCRv6 使用相对资产地址；DocLayoutV3 先上传二进制，再生成引用不可变二进制 revision 的绝对地址 manifest。平台验证完成后才更新 Demo 来源配置和可用性。

**Tech Stack:** Hugging Face Hub、ModelScope、浏览器文件上传、ONNX、JSON manifest、TypeScript、Playwright、PowerShell、SHA-256。

---

## 文件结构

**门户仓库**

- Create: `.tmp/community-model-publish/huggingface/<repo>/`：Hugging Face 上传白名单暂存目录。
- Create: `.tmp/community-model-publish/modelscope/<repo>/`：ModelScope 上传白名单暂存目录。
- Create: `docs/reports/community-model-publish-2026-08-26.md`：记录仓库 URL、revision、字节数、SHA-256、CORS 和推理证据。

**DocLayoutV3**

- Modify: `apps/demo/src/model-sources.ts`：把 Hugging Face 和 ModelScope 映射为固定 revision 的远程 manifest。
- Modify: `apps/demo/tests/demo.spec.ts`：覆盖两个社区来源的可用性和 manifest URL。
- Delete: `apps/demo/public/model-sources/huggingface.json`（若存在）：移除不再使用的本地来源 manifest。

**LCNet**

- Modify: `apps/demo/src/model-sources.ts`：把两个社区来源映射为固定 revision 的远程 manifest。
- Modify: `apps/demo/tests/demo.spec.ts`：覆盖两个来源、固定 revision 和切换取消行为。
- Delete: `apps/demo/public/model-sources/huggingface.json`：移除不再使用的本地来源 manifest。

**OCRv6**

- Modify: `apps/demo/src/model-sources.ts`：把两个社区来源映射为固定 revision 的远程 manifest。
- Modify: `apps/demo/tests/demo.spec.ts`：覆盖两个来源、固定 revision、默认模型省略和切换销毁行为。
- Delete: `apps/demo/public/model-sources/huggingface.json`：移除不再使用的本地来源 manifest。

### Task 1: 准备受控上传目录

**Files:**

- Create: `.tmp/community-model-publish/huggingface/web-sdk-pp-doclayoutv3/`
- Create: `.tmp/community-model-publish/huggingface/web-sdk-pp-lcnet-x1-0-doc-ori/`
- Create: `.tmp/community-model-publish/huggingface/web-sdk-pp-ocrv6/`
- Create: `.tmp/community-model-publish/modelscope/web-sdk-pp-doclayoutv3/`
- Create: `.tmp/community-model-publish/modelscope/web-sdk-pp-lcnet-x1-0-doc-ori/`
- Create: `.tmp/community-model-publish/modelscope/web-sdk-pp-ocrv6/`

- [ ] **Step 1: 记录上传前资产清单**

运行以下 PowerShell，输出必须只包含 9 个 ONNX 和 3 个 OCR 字典：

```powershell
Get-ChildItem F:\git\00_chenmohan\github\web-sdk-PP-DocLayoutV3\models\pp-doclayoutv3\1.0.1 -File
Get-ChildItem F:\git\00_chenmohan\github\web-sdk-PP-LCNet_x1_0_doc_ori\models\v1.0.0 -File
Get-ChildItem F:\git\00_chenmohan\github\web-sdk-PP-OCRv6\models\pp-ocrv6\1.0.0 -File
Get-ChildItem F:\git\00_chenmohan\github\web-sdk-PP-OCRv6\models\pp-ocrv6\1.0.0\dictionaries -File
```

- [ ] **Step 2: 创建平台暂存目录**

```powershell
$modelPublishRoot = 'F:\git\00_chenmohan\github\chenmohan123.github.io\.tmp\community-model-publish'
New-Item -ItemType Directory -Force -Path $modelPublishRoot
```

在 `$modelPublishRoot` 下为两个平台和三个仓库创建目录；每个仓库使用 `1.0.x` 版本子目录。

- [ ] **Step 3: 按白名单复制二进制和字典**

DocLayoutV3 只复制 `1.0.1/model-fp16.onnx`、`1.0.1/model-fp32.onnx` 到远程仓库的 `1.0.2/`；LCNet 复制 `inference.onnx` 到 `1.0.0/`；OCRv6 复制六个 ONNX 和三个 `dictionaries/*.txt` 到 `1.0.0/`。不要复制历史 manifest、验证缓存、metadata 或构建目录。

- [ ] **Step 4: 校验两个平台暂存副本**

```powershell
Get-ChildItem $modelPublishRoot -Recurse -File -Include *.onnx | Get-FileHash -Algorithm SHA256
```

预期：同一模型在 Hugging Face、ModelScope 和 SDK 原始目录的 SHA-256 完全一致；DocLayoutV3 两个文件分别为 `463ba56f...73f2`、`476da6d3...d269`，LCNet 为 `af9a0a4f...9c92`，OCRv6 六个文件与现有 manifest 一致。

### Task 2: 准备模型卡、许可证和 manifest

**Files:**

- Create: `.tmp/community-model-publish/<platform>/<repo>/README.md`
- Create: `.tmp/community-model-publish/<platform>/<repo>/LICENSE`
- Create: `.tmp/community-model-publish/<platform>/<repo>/THIRD_PARTY_NOTICES.md`
- Create: `.tmp/community-model-publish/<platform>/<repo>/<version>/manifest.json`

- [ ] **Step 1: 创建三个模型卡**

每个 `README.md` 使用对应平台支持的 YAML 元数据，并包含以下实际信息：

```yaml
---
license: apache-2.0
library_name: onnxruntime
tags:
  - onnx
  - web
  - paddlepaddle
---
```

正文必须列出：SDK 名称和版本、浏览器用途、上传文件表、每个 ONNX 的字节数和完整 SHA-256、上游 PaddlePaddle URL、转换或镜像说明、Apache-2.0、无官方背书声明，以及对应 SDK GitHub URL。

- [ ] **Step 2: 复制许可证与第三方声明**

从各 SDK 根目录复制 `LICENSE` 和 `THIRD_PARTY_NOTICES.md` 到对应远程仓库根目录。两个平台内容相同。

- [ ] **Step 3: 生成 LCNet 社区 manifest**

以 `models/v1.0.0/manifest.json` 为基准，保持 `variant.url` 为 `inference.onnx`。运行 JSON 解析检查：

```powershell
Get-Content -Raw $manifestPath | ConvertFrom-Json | Out-Null
```

预期：解析成功，bytes 为 `6788069`，SHA-256 为完整的 `af9a0a4f317ff0709ce752067807f819cb15d883f8ecad89f28df1c6ee2d9c92`。

- [ ] **Step 4: 生成 OCRv6 社区 manifest**

以 `models/pp-ocrv6/1.0.0/manifest.json` 为基准，将六个 `assets[].url` 改为同目录 ONNX 文件名，三个 `decoder.dictionary` 保持 `dictionaries/*.txt`。保留全部输入输出、预处理、后处理、bytes 和 SHA-256 契约。

- [ ] **Step 5: 准备 DocLayoutV3 第一阶段文件**

第一阶段只上传根目录文档和 `1.0.2/model-fp16.onnx`、`1.0.2/model-fp32.onnx`，暂不上传 manifest。二进制 revision 生成后，再基于 `models/pp-doclayoutv3/1.0.2/manifest.json` 写入平台对应的两个绝对下载 URL。

### Task 3: 发布 Hugging Face 仓库

**Remote:**

- Create: `https://huggingface.co/chenmohan/web-sdk-pp-doclayoutv3`
- Create: `https://huggingface.co/chenmohan/web-sdk-pp-lcnet-x1-0-doc-ori`
- Create: `https://huggingface.co/chenmohan/web-sdk-pp-ocrv6`

- [ ] **Step 1: 在外部提交前确认发布内容**

向用户列出 3 个公开仓库、约 400 MB 文件、Apache-2.0 模型卡和目标集合；取得操作时确认后再点击创建或提交上传。

- [ ] **Step 2: 创建三个公开模型仓库**

在 Hugging Face 创建页面选择 owner `chenmohan`、类型 `Model`、visibility `Public`、license `Apache-2.0`，仓库名使用设计中确定的三个 slug。每次提交后核对地址栏与目标 URL 完全一致。

- [ ] **Step 3: 上传 LCNet 和 OCRv6 完整目录**

使用仓库的 Files 页面上传白名单目录，提交信息分别使用中文：

```text
发布 PP-LCNet_x1_0_doc_ori 1.0.0 Web ONNX 模型
发布 PP-OCRv6 1.0.0 Web ONNX 模型
```

上传完成后从 History 页面记录完整 commit SHA，分别记为 `HF_LCNET_REV` 和 `HF_OCR_REV`。

- [ ] **Step 4: 分两阶段上传 DocLayoutV3**

先提交 ONNX、模型卡和许可证，记录二进制提交 `HF_DOC_ASSET_REV`。将 DocLayoutV3 manifest 的两个 URL 写成：

```text
https://huggingface.co/chenmohan/web-sdk-pp-doclayoutv3/resolve/{HF_DOC_ASSET_REV}/1.0.2/model-fp16.onnx
https://huggingface.co/chenmohan/web-sdk-pp-doclayoutv3/resolve/{HF_DOC_ASSET_REV}/1.0.2/model-fp32.onnx
```

其中 `{HF_DOC_ASSET_REV}` 必须替换为 History 页面显示的完整实际 SHA。随后上传 manifest 并记录最终 `HF_DOC_MANIFEST_REV`。

- [ ] **Step 5: 加入 Hugging Face 集合**

在 `https://huggingface.co/collections/chenmohan/web-sdk-models` 使用“Add to collection”加入三个模型仓库。预期集合从 Empty collection 变为三项，并保持 Public。

### Task 4: 发布 ModelScope 仓库

**Remote:**

- Create: `https://modelscope.cn/models/chenmohan/web-sdk-pp-doclayoutv3`
- Create: `https://modelscope.cn/models/chenmohan/web-sdk-pp-lcnet-x1-0-doc-ori`
- Create: `https://modelscope.cn/models/chenmohan/web-sdk-pp-ocrv6`

- [ ] **Step 1: 创建三个公开模型仓库**

在 ModelScope 创建模型页面选择 owner `chenmohan`、公开模型、Apache-2.0，并使用三个既定 slug。若平台对模型名大小写或连字符做规范化，以创建后的 canonical URL 为准并立即记录，不猜测下载地址。

- [ ] **Step 2: 上传 LCNet 和 OCRv6 完整目录**

上传与 Hugging Face 完全相同的白名单资产。提交后从版本或文件历史页面记录不可变 revision，分别记为 `MS_LCNET_REV`、`MS_OCR_REV`。

- [ ] **Step 3: 分两阶段上传 DocLayoutV3**

先上传二进制和根目录文档，记录 `MS_DOC_ASSET_REV`。从平台文件详情复制实际的固定 revision 下载地址，写入 DocLayoutV3 manifest；不得根据 Hugging Face URL 结构类推。上传 manifest 后记录 `MS_DOC_MANIFEST_REV`。

- [ ] **Step 4: 加入 ModelScope 集合**

在 `https://modelscope.cn/collections/chenmohan/Web-SDK-Models` 使用“添加内容”加入三个模型仓库。预期集合内容数为 3。

### Task 5: 先写 Demo 来源契约测试

**Files:**

- Modify: `F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo/tests/demo.spec.ts`
- Modify: `F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/tests/demo.spec.ts`
- Modify: `F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo/tests/demo.spec.ts`

- [ ] **Step 1: 修改 DocLayoutV3 失败测试**

断言三项来源都可用，Hugging Face/ModelScope 的 `selectionToModel()` 返回各自远程 manifest URL，且 URL 包含记录的完整不可变 revision，不含 `/main/` 或 `/master/`。

- [ ] **Step 2: 修改 LCNet 失败测试**

保留默认来源为 `undefined` 的断言；把 ModelScope 从 disabled 改为 enabled，并断言两个远程 manifest URL 的 owner、仓库名和 revision。

- [ ] **Step 3: 修改 OCRv6 失败测试**

保留默认 `small/small` 不传 `model` 的断言；把 ModelScope 改为 enabled，并断言 `selectionToModel()` 为两个远程 `{ manifestUrl }`。

- [ ] **Step 4: 运行三仓定向测试并确认失败原因**

```powershell
pnpm --dir apps/demo test -- --grep "模型来源"
```

预期：只因 ModelScope 仍禁用、URL 仍指向本地 manifest 而失败，不出现语法、fixture 或浏览器启动错误。

### Task 6: 更新三个 Demo 来源配置

**Files:**

- Modify: `F:/git/00_chenmohan/github/web-sdk-PP-DocLayoutV3/apps/demo/src/model-sources.ts`
- Modify: `F:/git/00_chenmohan/github/web-sdk-PP-LCNet_x1_0_doc_ori/apps/demo/src/model-sources.ts`
- Modify: `F:/git/00_chenmohan/github/web-sdk-PP-OCRv6/apps/demo/src/model-sources.ts`
- Delete: 三仓 `apps/demo/public/model-sources/huggingface.json`（存在时）

- [ ] **Step 1: 启用两个社区来源**

三个 `MODEL_SOURCE_OPTIONS` 都保持顺序 `default`、`huggingface`、`modelscope`。默认来源无 manifest URL；两个社区来源设置 `available: true`，删除 `disabledReason`，manifest URL 使用发布报告记录的完整固定 revision 地址。

- [ ] **Step 2: 运行类型检查与定向测试**

```powershell
pnpm --dir apps/demo typecheck
pnpm --dir apps/demo test -- --grep "模型来源"
```

预期：三仓类型检查和模型来源测试退出 0。

- [ ] **Step 3: 删除失效的本地来源 manifest**

确认代码和测试不再引用 `./model-sources/huggingface.json` 后，用补丁删除对应文件。重新运行 `git diff --check`。

### Task 7: 验证远程文件与浏览器推理

**Files:**

- Create: `docs/reports/community-model-publish-2026-08-26.md`

- [ ] **Step 1: 验证公开下载和 CORS**

对六个固定 revision manifest 执行无凭据 GET，并在浏览器执行 `fetch()`。预期 HTTP 200、JSON 可解析，响应允许跨域。对每个 ONNX 下载地址读取 Content-Length；平台未返回 Content-Length 时执行完整下载再计算字节数。

- [ ] **Step 2: 校验远程 SHA-256**

完整下载 18 份平台 ONNX（每个平台 9 份）到独立临时目录，运行：

```powershell
Get-ChildItem $downloadRoot -Recurse -File -Include *.onnx | Get-FileHash -Algorithm SHA256
```

预期：每个哈希与 SDK 原始 manifest 完全一致。

- [ ] **Step 3: 执行真实推理**

在三个 Demo 中分别选择 Hugging Face、ModelScope 并使用示例图片运行。预期六组来源组合均完成模型加载和推理，无控制台 error，来源信息显示平台名和固定 manifest 地址。

- [ ] **Step 4: 运行完整本地验证**

对三个 SDK 依次执行治理检查、Demo typecheck、build、lint（存在时）、Playwright 和 SDK 契约测试。门户执行 `pnpm sdk:check -- --repo <SDK绝对路径>`。记录 DocLayoutV3/LCNet 的既有 partial 项，不把既有治理缺口误报为本次回归。

- [ ] **Step 5: 写发布报告**

报告必须逐仓列出：公开仓库 URL、集合 URL、manifest revision、资产 revision、文件表、SHA-256、CORS 结果、推理结果、验证日期，以及未解决限制。不得记录登录信息、cookie、访问令牌或其他凭据。

### Task 8: 最终差异与提交边界检查

**Files:**

- Verify: 四个本地 Git 仓库

- [ ] **Step 1: 检查工作区差异**

分别运行 `git status --short`、`git diff --check`、`git diff --stat`。确认 SDK runtime 未修改，门户除设计、计划、报告外无产品代码变更。

- [ ] **Step 2: 清理暂存副本**

在确认两个平台远程哈希和报告均完成后，删除 `.tmp/community-model-publish`。删除前解析绝对路径，确认目标严格位于门户仓库 `.tmp` 下，不删除 SDK 原始模型。

- [ ] **Step 3: 交付但不推送**

向用户报告六个仓库、两个集合、固定 manifest URL、验证结果和本地差异。除非用户另行明确要求，不提交 SDK 改动、不推送四个 Git 仓库。
