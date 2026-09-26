# CenterTrack 资产门槛与参考向量实施计划

> 执行方式：按 superpowers:executing-plans 或 superpowers:subagent-driven-development 逐任务执行；清单以 `[ ]`/`[x]` 标记。任务1–7 为**按序资产门槛**，任一步未过即停止并归档失败原因，不得跳步或用估计值冒充实测。

> **2026-09-26 停止通知**：本计划在任务2 触发"任一步未过即停止"条款，**任务3–7 不再执行**，下方未勾项不是待办。
> 任务1 已通过：`mot17_half.pth` 79,987,301 字节、SHA-256 `2272af…eed6`。
> 任务2 归档为 `BLOCKED`：官方 checkpoint 实测含 16 个 DCN 模块（`dla_up` 12 ＋ `ida_up` 4），对应 32 个 `conv_offset_mask` 张量；`dla_node='dcn'` 构造即 `TypeError(NoneType)`，按裁定 R11 停止。键级最近证据为 `gcn` 分支 missing 104 / unexpected 144（含 32 个 `conv_offset_mask` 键），说明不存在"免 DCNv2 构造且键全匹配"的节点类型。第二阻断点是 backbone 无条件下载 `dla34` 预训练返回 HTTP 404，它与 `mot17_half` 键无交集，绕过也不解决第一阻断点。
> 本计划所依据的设计文档文首停止通知把 32 个 `conv_offset_mask` 键表述为"全部位于 `dla_up.*`"，与任务2 的键级证据不符（16 个 DCN 模块分布在 `dla_up` 与 `ida_up` 两处），以本条为准；设计原文已按仓库惯例就地划改更正。
> 两份证据（`asset.json`、`golden-manifest.json`）与新增的阶段回执 README 已于 2026-09-26 归档在 SDK 仓库 `web-sdk-PP-Tracking/reports/2026-09-23-centertrack-assets/`，提交 `b4849d2`，走 PR `chenmohan123/web-sdk-PP-Tracking#12`。
> 替代路线见 [ByteTrack + YOLOX 候选设计](../specs/2026-09-24-tracking-modeltracking-yolox-design.md)；被证伪的前提见 [CenterTrack 候选设计文首停止通知](../specs/2026-09-23-tracking-centertrack-design.md)。

**目标：** 完成 mot17_half 权重下载核验、官方前向 golden、ONNX 导出与算子清单、Python ORT 对齐、JS 参考夹具与模型身份注册，为候选模块实现提供全部可核验输入。

**架构：** 权重、官方源码与 Python 环境全部放在 gitignore 的 `.tmp/centertrack-reference/`，官方代码只读使用、不得复制进 `src/`；提交物只有三类：证据（`reports/2026-09-23-centertrack-assets/`）、模型身份（`models/centertrack/0.1.0/`）与测试夹具（`tests/fixtures/centertrack-forward.json`）。

**技术：** uv + Python 3.12、torch CPU、onnx + onnxruntime(Python)、Node 22+ / Vitest / esbuild、pnpm。

**设计：** [CenterTrack 候选设计](../specs/2026-09-23-tracking-centertrack-design.md)；**矩阵：** [模型型跟踪可行性](../../../reports/tracking/2026-09-23-model-tracking-feasibility/README.md)。

## 全局约束

- 仓库根目录 `F:/git/00_chenmohan/github/web-sdk-PP-Tracking`；pnpm 命令一律附加 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- 本计划不写 SDK runtime 代码、不加 package.exports、不改 manifest、不进公开 Demo、不发版本；JS 候选模块实现是下一份计划，依赖本计划的 `onnx-manifest.json` 与夹具。
- 模型身份只在 `models/centertrack/0.1.0/{model,sources}.json` 登记一次；未授权发布前 `downloadUrl` 必须为空并标注 `pending-authorization`，不得写成可用地址。
- 上传 ModelScope/Hugging Face 属远程写入，必须用户明确授权；未授权时任务7 停止并记录。
- 文档、注释与提交使用中文；手工编辑用 apply_patch；证据按任务归档，失败不粉饰。
- 上游固定 `xingyizhou/CenterTrack@e4e7534cc2ebfbd31e0cde680988f286c65fe34f`；许可链：根 MIT、DLA-34 无 DCN、MOT17/CrowdHuman 为非商业许可数据集（须披露）。

## 任务1：下载 mot17_half 并核验字节

文件：新建 `.tmp/centertrack-reference/download.py`、`.tmp/centertrack-reference/venv/`（均已 gitignore）、`reports/2026-09-23-centertrack-assets/asset.json`。

接口：产出 `asset.json` = `{ "source": "Google Drive", "googleDriveId": "1rJ0fzRcpRQPjaN17lcqfKgsz-wJRifHh", "bytes": number, "sha256": string, "downloadedAt": "ISO8601", "upstreamRevision": "e4e7534...", "note": "MOT17 half val MOTA 66.1；训练数据非商业" }`；任务2、3、6 读取该文件。

- [ ] 建隔离环境并装 gdown：

```bash
cd F:/git/00_chenmohan/github/web-sdk-PP-Tracking
uv venv .tmp/centertrack-reference/venv
uv pip install --python .tmp/centertrack-reference/venv/Scripts/python.exe gdown
```

- [ ] 写 `.tmp/centertrack-reference/download.py`（流式落盘 + 边写边算 SHA-256，1 MiB 分块，失败重试 3 次，若返回 HTML 确认页直接判失败）：

```python
import hashlib, json, sys, time
from datetime import datetime, timezone
import gdown

OUT = '.tmp/centertrack-reference/mot17_half.pth'
FILE_ID = '1rJ0fzRcpRQPjaN17lcqfKgsz-wJRifHh'
URL = f'https://drive.google.com/uc?id={FILE_ID}'

# gdown 自带确认页处理；下载完成后分块重算摘要，避免任何边写边算的竞态。
for attempt in range(3):
    try:
        gdown.download(URL, OUT, quiet=False)
        break
    except Exception as error:
        print(f'attempt {attempt + 1} failed: {error}')
        time.sleep(3)
else:
    sys.exit('download failed')

digest, total = hashlib.sha256(), 0
with open(OUT, 'rb') as handle:
    for chunk in iter(lambda: handle.read(1 << 20), b''):
        digest.update(chunk)
        total += len(chunk)
asset = {
    'source': 'Google Drive',
    'googleDriveId': FILE_ID,
    'bytes': total,
    'sha256': digest.hexdigest(),
    'downloadedAt': datetime.now(timezone.utc).isoformat(),
    'upstreamRevision': 'e4e7534cc2ebfbd31e0cde680988f286c65fe34f',
    'note': 'MOT17 half val MOTA 66.1；MOT17 为非商业许可数据集',
}
with open('reports/2026-09-23-centertrack-assets/asset.json', 'w', encoding='utf-8') as handle:
    json.dump(asset, handle, ensure_ascii=False, indent=2)
print(total, digest.hexdigest())
```

- [ ] 运行 `.tmp/centertrack-reference/venv/Scripts/python.exe .tmp/centertrack-reference/download.py`；期望打印非零字节数与 64 位十六进制摘要。
- [ ] 独立复核：`powershell -Command "(Get-FileHash .tmp/centertrack-reference/mot17_half.pth -Algorithm SHA256).Hash.ToLower()"` 与 `asset.json` 的 `sha256` 一致；`(Get-Item ...).Length` 与 `bytes` 一致。
- [ ] 判据：两项独立核验一致才进入任务2；任一不符或下载失败，写 `reports/2026-09-23-centertrack-assets/failure.md`（时间、命令、错误、已完成步骤）并停止，不得用估计字节进入后续任务。

## 任务2：官方前向环境与 golden 输出

文件：`.tmp/centertrack-reference/CenterTrack/`（克隆，忽略）、`.tmp/centertrack-reference/golden.py`（忽略）、`reports/2026-09-23-centertrack-assets/golden-manifest.json`。

接口：`golden-manifest.json` = `{ "input": { "images": [1,3,544,960], "pre_images": [1,3,544,960], "pre_hms": [1,544,960] }, "inputsSha256": { "images": "...", "pre_hms": "..." }, "outputs": { "hm": { "shape": [1,1,136,240], "dtype": "float32", "sha256": "..." }, "reg": { "shape": [1,2,136,240], "dtype": "float32", "sha256": "..." }, "ltrb_amodal": { "shape": [1,4,136,240], "dtype": "float32", "sha256": "..." }, "tracking": { "shape": [1,2,136,240], "dtype": "float32", "sha256": "..." } }, "missingKeys": [], "unexpectedKeys": [], "torchVersion": "..." }`。

- [ ] 克隆并锁定上游提交：

```bash
git clone --depth 1 https://github.com/xingyizhou/CenterTrack .tmp/centertrack-reference/CenterTrack
git -C .tmp/centertrack-reference/CenterTrack fetch --depth 1 origin e4e7534cc2ebfbd31e0cde680988f286c65fe34f
git -C .tmp/centertrack-reference/CenterTrack checkout --detach FETCH_HEAD
git -C .tmp/centertrack-reference/CenterTrack rev-parse HEAD
```

- [ ] 安装 CPU 版 torch：`uv pip install --python .tmp/centertrack-reference/venv/Scripts/python.exe --index-url https://download.pytorch.org/whl/cpu torch numpy`；运行 `uv run --python .tmp/centertrack-reference/venv/Scripts/python.exe -c "import torch;print(torch.__version__, torch.cuda.is_available())"`，期望版本非空且第二个值为 `False`。
- [ ] 写 `.tmp/centertrack-reference/golden.py`：固定种子 `torch.manual_seed(20260923)` 生成 `images=torch.rand(1,3,544,960)`、`pre_images=images.clone()`、`pre_hms=torch.zeros(1,544,960)`；按以下参数构建官方 `GenericNetwork`，加载 `mot17_half.pth`（`torch.load(..., map_location='cpu')`，取 `state_dict`，`load_state_dict(strict=False)` 并打印 missing/unexpected），`eval()` 后前向，保存四头到 `golden.npz` 并计算各张量 SHA-256：

```python
from types import SimpleNamespace
import sys, hashlib, json
import numpy as np, torch
sys.path.insert(0, '.tmp/centertrack-reference/CenterTrack/src')
from lib.model.networks.generic_network import GenericNetwork

opt = SimpleNamespace(
    backbone='dla34', neck='dlaup', head_kernel=3, prior_bias=-2.19,
    pre_img=True, pre_hm=True, model_output_list=False,
)
heads = {'hm': 1, 'reg': 2, 'ltrb_amodel': 4, 'tracking': 2}
head_convs = {'hm': [256], 'reg': [256], 'ltrb_amodel': [256], 'tracking': [256]}
model = GenericNetwork(34, heads, head_convs, 1, opt)
state = torch.load('.tmp/centertrack-reference/mot17_half.pth', map_location='cpu', weights_only=True)
state = state.get('state_dict', state)
missing, unexpected = model.load_state_dict(state, strict=False)
print('missing:', missing); print('unexpected:', unexpected)
model.eval()
torch.manual_seed(20260923)
images = torch.rand(1, 3, 544, 960)
pre_images = images.clone()
pre_hms = torch.zeros(1, 544, 960)
with torch.no_grad():
    out = model(images, pre_images, pre_hms)[0]   # num_stacks=1，取第一个 stack
np.savez('.tmp/centertrack-reference/golden.npz',
         images=images.numpy(), pre_hms=pre_hms.numpy(),
         **{k: v.numpy() for k, v in out.items()})
```

- [ ] 运行 golden.py；判据：`missing`/`unexpected` 均为空列表；四头形状分别为 `[1,1,136,240]`、`[1,2,136,240]`、`[1,4,136,240]`、`[1,2,136,240]`。
- [ ] 若 missing/unexpected 非空：打印差异清单，只调整 `heads`/`head_convs`/`opt` 后重跑并记录调整项到 `golden-manifest.json` 的 `adjustments`；三次仍非空即停止并归档（说明权重与配置推断不符，不得继续）。
- [ ] golden.npz 保留在忽略目录；`golden-manifest.json` 落盘 `reports/2026-09-23-centertrack-assets/` 并包含 `torchVersion`。

## 任务3：ONNX 导出与算子清单

文件：`.tmp/centertrack-reference/export_onnx.py`（忽略）、`.tmp/centertrack-reference/centertrack-mot17-half.onnx`（忽略）、`reports/2026-09-23-centertrack-assets/onnx-manifest.json`。

接口：`onnx-manifest.json` = `{ "bytes": number, "sha256": "...", "opset": 17, "inputs": [{ "name": "images", "dtype": "float32", "shape": [1,3,544,960] }, { "name": "pre_images", "dtype": "float32", "shape": [1,3,544,960] }, { "name": "pre_hms", "dtype": "float32", "shape": [1,544,960] }], "outputs": [{ "name": "hm", "dtype": "float32", "shape": [1,1,136,240] }, { "name": "reg", "shape": [1,2,136,240] }, { "name": "ltrb_amodel", "shape": [1,4,136,240] }, { "name": "tracking", "shape": [1,2,136,240] }], "ops": [{ "op": "Conv", "count": 0 }], "webGpuMissing": ["..."], "wasmMissing": [] }`；任务4、5 与 JS 计划读取该清单。

- [ ] 安装导出依赖：`uv pip install --python .tmp/centertrack-reference/venv/Scripts/python.exe onnx onnxruntime`。
- [ ] 写 `.tmp/centertrack-reference/export_onnx.py`：复用任务2 的模型构建与输入（固定种子、`pre_images=images.clone()`、`pre_hms=zeros`），导出并校验：

```python
import numpy as np, onnx, torch, hashlib, json
from export_common import build_model, make_inputs   # 与 golden.py 共用的构建函数

model = build_model()
images, pre_images, pre_hms = make_inputs()
torch.onnx.export(
    model, (images, pre_images, pre_hms),
    '.tmp/centertrack-reference/centertrack-mot17-half.onnx',
    input_names=['images', 'pre_images', 'pre_hms'],
    output_names=['hm', 'reg', 'ltrb_amodel', 'tracking'],
    opset_version=17, do_constant_folding=True, dynamo=False,
)
graph = onnx.load('.tmp/centertrack-reference/centertrack-mot17-half.onnx')
onnx.checker.check_model(graph)
counts = {}
for node in graph.graph.node:
    counts[node.op_type] = counts.get(node.op_type, 0) + 1
print(json.dumps(counts, indent=2))
```

注：把任务2 的模型构建与输入生成抽成 `export_common.py`（`build_model()`、`make_inputs()`），golden.py 与 export_onnx.py 共用，避免两处漂移；`dynamo=False` 指定传统导出路径，torch 版本不支持时按报错改用 `dynamo=True` 并记录差异。

- [ ] 写算子审计 `.tmp/centertrack-reference/audit_ops.py`：解析 `web-sdk-PP-Tracking/node_modules/onnxruntime-web/docs/webgpu-operators.md` 的算子名列，与导出的 `counts` 求差集；WASM 侧按 `ai.onnx` 标准算子全量认定（脚本内置 opset 17 算子名集合）。输出 `webGpuMissing`、`wasmMissing` 与 `ops` 到 `onnx-manifest.json`，并计算 onnx 文件的 `bytes`/`sha256`。
- [ ] 判据：`wasmMissing` 必须为空；`NonMaxSuppression`/`TopK` 不得出现在 `ops`（出现即失败：说明解码被塞进模型图，回到导出台脚本拆分）；`webGpuMissing` 允许非空，但必须逐项列出并带入 JS 计划做后端差异处理。
- [ ] 若导出失败（不支持的算子/动态形状）：最多三次调整（opset 在 13–17 间选择、拆分导出、`do_constant_folding` 开关）并逐次记录；仍失败即停止并归档，禁止修改模型数学或替换权重。

## 任务4：Python ORT 与官方前向对齐

文件：`.tmp/centertrack-reference/parity_ort.py`（忽略）、`reports/2026-09-23-centertrack-assets/parity.json`。

接口：`parity.json` = `{ "tolerance": 1e-4, "maxAbsDiff": { "hm": 0, "reg": 0, "ltrb_amodel": 0, "tracking": 0 }, "passed": true, "ortVersion": "...", "torchVersion": "..." }`。

- [ ] 写 `parity_ort.py`：创建 `onnxruntime.InferenceSession(providers=['CPUExecutionProvider'])`，喂任务2 的同一 `images`/`pre_images`/`pre_hms`（从 `golden.npz` 读），与 golden 四头逐元素比较：

```python
import numpy as np, onnxruntime as ort
golden = np.load('.tmp/centertrack-reference/golden.npz')
session = ort.InferenceSession('.tmp/centertrack-reference/centertrack-mot17-half.onnx', providers=['CPUExecutionProvider'])
outputs = session.run(None, {'images': golden['images'], 'pre_images': golden['images'], 'pre_hms': golden['pre_hms']})
names = [o.name for o in session.get_outputs()]
print(list(zip(names, (o.shape for o in outputs))))
diffs = {name: float(np.max(np.abs(out - golden[name]))) for name, out in zip(names, outputs)}
print(diffs)
```

- [ ] 判据：四个 `maxAbsDiff` 均 ≤ `1e-4` 才写 `passed: true`；任一超限即停止并归档（导出有损，回到任务3 排查），不得放宽容差后重复到通过为止。

## 任务5：生成 JS 参考夹具

文件：`.tmp/centertrack-reference/make_fixture.py`（忽略）、`tests/fixtures/centertrack-forward.json`（提交）、`reports/2026-09-23-centertrack-assets/fixture-manifest.json`。

接口：`tests/fixtures/centertrack-forward.json` = `{ "version": 1, "image": { "width": 960, "height": 544, "seed": 20260923 }, "inputs": { "images": { "shape": [1,3,544,960] }, "pre_images": { "shape": [1,3,544,960] }, "pre_hms": { "shape": [1,544,960] } }, "onnxOutputs": { "hm": { "shape": [1,1,136,240], "base64": "..." }, "reg": { "shape": [1,2,136,240], "base64": "..." }, "ltrb_amodel": { "shape": [1,4,136,240], "base64": "..." }, "tracking": { "shape": [1,2,136,240], "base64": "..." } }, "expectedDetections": [{ "score": 0, "classId": 1, "ct": [0, 0], "bbox": [0, 0, 0, 0], "tracking": [0, 0] }] }`。

- [ ] 写 `make_fixture.py`：从 `golden.npz` 取四头输出，按小端 float32 base64 写入 JSON；同时用 numpy 独立实现参考解码（sigmoid → 3×3 极大值抑制 → top-100 → `ltrb_amodel` 相对 `xs0/ys0` 展开 → 过滤 `score < 0.4` → 按分数降序），输出 `expectedDetections`（上限 100 条，字段含 score/classId/ct/bbox/tracking）。注意夹具图像为 960×544（w×h），与输入 544×960 同尺寸，官方仿射在此尺寸下为恒等映射，避免把仿射误差混进解码对齐；仿射本身由 JS 单元测试单独覆盖。
- [ ] 运行脚本；判据：JSON ≤ 3 MB；`base64` 解码后元素数与 shape 一致；`expectedDetections` 条数 ≤ 100 且脚本打印的头尾条目的 score 与手工抽样一致。
- [ ] 写 `fixture-manifest.json`：夹具 `sha256`、字节数、生成命令、`ortVersion`、`torchVersion`、golden 提交号。
- [ ] 提交夹具本身（`git add tests/fixtures/centertrack-forward.json` 仅在用户要求的提交步骤执行，见收尾）。

## 任务6：模型身份注册

文件：新建 `models/centertrack/0.1.0/model.json`、`sources.json`、`README.md`、`README.en.md`。

接口：`model.json` = `{ "id": "centertrack-mot17-half-fp32", "version": "0.1.0", "format": "onnx", "precision": "fp32", "opset": 17, "path": "centertrack/0.1.0/centertrack-mot17-half-fp32.onnx", "bytes": number, "sha256": "...", "parameterCount": null, "inputs": [{ "name": "images", "dtype": "float32", "shape": [1,3,544,960] }, { "name": "pre_images", "shape": [1,3,544,960] }, { "name": "pre_hms", "shape": [1,544,960] }], "outputs": [{ "name": "hm", "shape": [1,1,136,240] }, { "name": "reg", "shape": [1,2,136,240] }, { "name": "ltrb_amodel", "shape": [1,4,136,240] }, { "name": "tracking", "shape": [1,2,136,240] }], "preprocessingId": "bgr-affine-544x960-centernet-meanstd-f32-v1", "normalizationId": "sigmoid-hm-v1", "defaultSource": "modelscope", "backends": ["wasm", "webgpu"], "license": "...", "licenseBasis": "...", "upstreamRevision": "e4e7534..." }`；`sources.json` 含 `upstream`、`modelscope`、`huggingface` 三块。

- [ ] 写 `model.json`：`bytes`/`sha256`/`opset`/inputs/outputs 全部取自 `onnx-manifest.json` 与 `parity.json` 的实测值；`path` 为分发名 `centertrack/0.1.0/centertrack-mot17-half-fp32.onnx`（上传时把任务3 的工作文件 `centertrack-mot17-half.onnx` 按此名重命名，字节与 sha256 不变）；`license` 写 `MIT（上游 xingyizhou/CenterTrack@e4e7534；权重由 MOT17 训练数据导出，MOT17 为非商业许可数据集，分发与商业使用受该边界约束）`；`licenseBasis` 写 `上游根 LICENSE 为 MIT（sha256 已在门户 sources.lock.json 固定）；DLA-34 无 DCN 自定义算子；MOT17/CrowdHuman 数据集非商业许可见 MODEL_ZOO 原文`。
- [ ] 写 `sources.json`：`upstream` 记录 Google Drive id、pth `bytes`/`sha256`（来自 `asset.json`）、克隆 revision、许可链（根 MIT、无 DCN、数据集非商业）；`modelscope` 与 `huggingface` 两块写 `repository: "chenmohan/web-sdk-pp-tracking"`、`path: "centertrack/0.1.0/centertrack-mot17-half-fp32.onnx"`，`downloadUrl`、`revision` 留空字符串并加 `status: "pending-authorization"`。
- [ ] 写 `README.md` 与 `README.en.md`：模型身份与版本、三输入/四输出契约与形状、预处理身份（BGR、affine 544×960、mean/std）、许可与非商业披露、已知限制（未做真实 MOT 评测、来源未发布、候选状态、WebGPU 算子差异以 onnx-manifest.json 为准）。
- [ ] 校验：`node -e "const m=require('./models/centertrack/0.1.0/model.json');const o=require('./reports/2026-09-23-centertrack-assets/onnx-manifest.json');if(m.bytes!==o.bytes||m.sha256!==o.sha256||m.opset!==o.opset)throw new Error('identity mismatch');console.log('ok',m.bytes,m.opset)"` 期望 `ok`；`sources.json` 两个来源的 `status` 均为 `pending-authorization`。

## 任务7：分发上传（远程写入授权门）

文件：`reports/2026-09-23-centertrack-assets/distribution.md`（授权通过后写）。

- [ ] 先确认用户授权：未获得明确授权时，本任务标记为**待授权**并停止；`sources.json` 维持 `pending-authorization`，任何文档不得把 ModelScope/Hugging Face 地址标为可用。
- [ ] 授权后上传 ONNX 到 ModelScope `chenmohan/web-sdk-pp-tracking`（默认）与 Hugging Face 同名仓库（可选），取回不可变 revision、下载地址与实际字节。
- [ ] 回读核验：从两个 downloadUrl 各拉一次 SHA-256，与 `model.json` 一致；记录上传日期、revision、回读结果到 `distribution.md`。
- [ ] 更新 `sources.json`：两个来源 `status: "published"`，填入真实 `downloadUrl`、`revision`、`path`、`bytes`、`sha256`；`model.json` 的 `defaultSource` 保持 `modelscope`。
- [ ] 判据：双源回读一致才可被后续 JS 计划的网络获取路径使用；任一来源失败即保持 `pending-authorization` 并在报告中如实记录。

## 收尾：证据、基线与报告

- [ ] 写 `reports/2026-09-23-centertrack-assets/README.md`：七道门槛逐项状态（通过/失败/待授权）、每项的实测数值、失败与补救记录、证据文件索引、环境锁（`uv pip freeze` 输出为 `environment.lock.txt`）。
- [ ] 运行基线检查并留证：门户 `pnpm sdk:check --repo ../web-sdk-PP-Tracking --format json --out reports/sdk-standard/tracking-centertrack-assets-after-<YYYYMMDD>.json`（相对门户仓库执行），以及 SDK 的 `pnpm … typecheck`、`pnpm … test`、`pnpm … check:package`，确认新增 `models/` 与 `tests/fixtures/` 未破坏既有检查。
- [ ] 独立复审（requesting-code-review）：核对七门槛证据链完整、`model.json` 与 `onnx-manifest.json` 一致、夹具可复算、无官方代码进入 `src/`。
- [ ] 提交需用户明确指示；提交范围仅限 `models/centertrack/0.1.0/`、`tests/fixtures/centertrack-forward.json`、`reports/2026-09-23-centertrack-assets/`（不含 `.tmp/`、不含权重）。
- [ ] 全部通过后进入下一份计划：JS 候选模块实现（`src/centertrack/`），其输入依赖本计划的 `onnx-manifest.json`、`tests/fixtures/centertrack-forward.json` 与 `models/centertrack/0.1.0/`。


