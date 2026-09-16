import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { parse } from "yaml";
import { tinyPrecisionRun } from "./tiny-precision.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sdkCommit = "e535ba6a04d715e064847769742b5243523eb0c8";
const sdkUrl = `https://github.com/chenmohan123/web-sdk-PP-Detection/blob/${sdkCommit}`;
const reportPath = "reports/sdk-standard/2026-09-16-tiny-precision";
const dataPath = "src/data/pp-detection-comparison.json";
const annotationSha =
  "d398fc9b09d97135e9b92d28d170681ed50bcd3a5518f16f559e6e379adc1b79";
const imageSetSha =
  "1a36e342e8b8f00a4709d60f9f90d783ec61b179f89d64f041192d350281a99c";
const backends = ["wasm", "webgpu"];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
};

/** 保留每个原报告自己的耗时轮次，AP 始终汇总三个真实轮次。 */
export function summarizeVariant(asset, runs, timingRounds) {
  assert.deepEqual(
    [...new Set(runs.map((r) => r.backend))].sort(),
    ["wasm", "webgpu"],
    "后端不完整",
  );
  return Object.fromEntries(
    backends.map((backend) => {
      const selected = runs
        .filter((r) => r.backend === backend)
        .sort((a, b) => a.round - b.round);
      assert.deepEqual(
        selected.map((r) => r.round),
        [1, 2, 3],
        "轮次缺失或重复",
      );
      for (const row of selected) {
        assert(
          row.bytes === asset.bytes && row.sha256 === asset.sha256,
          "权重身份不匹配",
        );
        assert(
          [row.apPoints, row.apDeltaPoints, row.warmInferenceMs].every(
            Number.isFinite,
          ),
          "非有限数值",
        );
        assert(
          row.apPoints >= 0 && row.apPoints <= 100 && row.warmInferenceMs > 0,
          "非法数值",
        );
        assert(row.apDeltaPoints >= -0.5, "AP 未达到发布门槛");
        if (row.retention !== null)
          assert(
            Number.isFinite(row.retention) &&
              row.retention >= 0.95 &&
              row.retention <= 1,
            "保留率未达到发布门槛",
          );
      }
      const retained = selected.filter((r) => r.retention !== null);
      assert(retained.length > 0, "缺少保留率证据");
      const times = selected.filter((r) => timingRounds.includes(r.round));
      assert.deepEqual(
        times.map((r) => r.round),
        timingRounds,
        "耗时轮次不匹配",
      );
      return [
        backend,
        {
          apRange: [
            Math.min(...selected.map((r) => r.apPoints)),
            Math.max(...selected.map((r) => r.apPoints)),
          ],
          minimumApDeltaPoints: Math.min(
            ...selected.map((r) => r.apDeltaPoints),
          ),
          minimumRetention: Math.min(...retained.map((r) => r.retention)),
          warmInferenceMs: median(times.map((r) => r.warmInferenceMs)),
          timingRounds,
        },
      ];
    }),
  );
}

/** Tiny的FP32是自身基线；逐轮核对原始模型/图集/后端身份和热推理。 */
export function tinyRun(asset, summary, raw, backend, round, sdkSha256) {
  assert.equal(raw.status, "passed");
  assert.equal(raw.artifacts.model.bytes, asset.bytes);
  assert.equal(raw.artifacts.model.sha256, asset.sha256);
  assert.equal(raw.artifacts.sdk.sha256, sdkSha256);
  assert.equal(raw.artifacts.annotations.sha256, annotationSha);
  assert.equal(raw.artifacts.imageSetSha256, imageSetSha);
  assert.equal(raw.runtime.backend, backend);
  assert.equal(raw.runtime.requestedBackend, backend);
  assert.equal(raw.runtime.mode, "main");
  assert.equal(raw.runtime.precision, "fp32");
  assert.deepEqual(raw.runtime.fallbacks, []);
  assert.equal(raw.images.length, 64);
  assert.equal(new Set(raw.images.map((image) => image.imageId)).size, 64);
  const selected = summary.rounds.filter((item) => item.round === round);
  assert.equal(selected.length, 1, "Tiny缺少或重复轮次");
  const item = selected[0];
  const warmInferenceMs = median(
    raw.images.slice(1).map((image) => image.timings.inferenceMs),
  );
  assert.equal(warmInferenceMs, item.warmInferenceMs);
  return {
    backend,
    round,
    bytes: asset.bytes,
    sha256: asset.sha256,
    apPoints: item.AP,
    apDeltaPoints: 0,
    retention: 1,
    warmInferenceMs,
  };
}

async function main() {
  const sdkIndex = process.argv.indexOf("--sdk");
  assert(
    sdkIndex >= 0 && process.argv[sdkIndex + 1],
    "用法：node tools/detection-comparison/build.mjs --sdk <SDK检出路径> [--check]",
  );
  const sdk = resolve(process.argv[sdkIndex + 1]);
  const sources = [];
  function source(path) {
    const bytes = execFileSync("git", ["show", `${sdkCommit}:${path}`], {
      cwd: sdk,
      maxBuffer: 32 * 1024 * 1024,
    });
    sources.push({
      path,
      bytes: bytes.length,
      sha256: sha(bytes),
      url: `${sdkUrl}/${path}`,
    });
    return bytes;
  }
  const json = (path) => JSON.parse(source(path).toString("utf8"));
  const oldPath = "reports/evaluation/2026-09-12-precision-variants";
  const mlxPath = "reports/evaluation/2026-09-14-ppyoloe-mlx-release";
  const picoPath = "reports/evaluation/2026-09-15-picodet-series-precision";
  const tinyPath = "reports/evaluation/2026-09-15-2d-candidates";
  const precisionPath = "reports/evaluation/2026-09-16-tiny-precision";
  const precisionReceipt = json(`${precisionPath}/quality-receipt.json`);
  for (const [path, digest] of Object.entries(precisionReceipt.files))
    assert.equal(sha(source(`${precisionPath}/${path}`)), digest, `Tiny质量收据不匹配：${path}`);
  const tinyPrecision = json(`${precisionPath}/summary.json`);
  const precisionIndex = json(`${precisionPath}/artifact-index.json`);
  assert.deepEqual(precisionReceipt.evidence, precisionIndex);
  assert.equal(precisionReceipt.browserRunCount, 18);
  assert.equal(tinyPrecision.browserRunCount, 18);
  assert.deepEqual(tinyPrecision.qualityGate, {
    maximumApDropPoints: 0.5, minimumReferenceRetention: 0.95,
    scoreThreshold: 0.5, iouThreshold: 0.5, strictIouDiagnostic: 0.99,
  });
  assert.equal(tinyPrecision.candidates.find((row) => row.precision === "fp16").qualityGatePassed, true);
  assert.equal(tinyPrecision.candidates.find((row) => row.precision === "w8a32").qualityGatePassed, false);
  function precisionRuns(asset) {
    const rows = tinyPrecision.rows.filter((row) => row.precision === asset.precision);
    return rows.map((row) => {
      const references = tinyPrecision.rows.filter((r) => r.precision === "fp32" && r.backend === row.backend && r.round === row.round);
      assert.equal(references.length, 1, "Tiny FP32对照缺失或重复");
      const path = `evidence/round-${row.round}/ppyolo-tiny-320-${asset.precision}-${row.backend}.json.gz`;
      const entries = precisionIndex.filter((item) => item.path === path);
      assert.equal(entries.length, 1);
      const entry = entries[0];
      const packed = source(`${precisionPath}/${path}`);
      assert.equal(sha(packed), entry.compressedSha256);
      const bytes = gunzipSync(packed);
      assert.equal(bytes.length, entry.bytes);
      assert.equal(sha(bytes), entry.sha256);
      assert.equal(row.sha256, entry.sha256);
      return tinyPrecisionRun(asset, row, references[0], JSON.parse(bytes), row.backend, row.round, tinyPrecision.sdkSha256);
    });
  }
  const tiny = json(`${tinyPath}/summary.json`);
  const tinyIndex = json(`${tinyPath}/evidence-index.json`);
  assert.equal(tiny.annotationsSha256, annotationSha);
  assert.equal(tiny.imageSetSha256, imageSetSha);
  assert.equal(tiny.imageCount, 64);
  assert.equal(tiny.annotationCount, 716);
  const old = json(`${oldPath}/summary.json`);
  const mlx = json(`${mlxPath}/summary.json`);
  const pico = json(`${picoPath}/summary.json`);
  const lock = json(`${picoPath}/inputs.lock.json`);
  const oldIndex = json(`${oldPath}/artifact-index.json`);
  assert.equal(old.status, "passed");
  assert.equal(mlx.qualityGatePassed, true);
  assert.equal(lock.annotationsSha256, annotationSha);
  assert.equal(lock.imageSetSha256, imageSetSha);
  assert.equal(mlx.dataset.sha256, annotationSha);
  assert.equal(old.datasetImages, 64);
  assert.equal(old.annotations, 716);
  assert.equal(mlx.rows.length, 54);
  assert.equal(pico.rows.length, 144);
  assert.equal(
    sources.find((s) => s.path === `${picoPath}/inputs.lock.json`).sha256,
    pico.inputsLockSha256,
  );
  const groups = [
    {
      id: "tiny-precision", title: "PP-YOLO Tiny 320 精度对比", date: "2026-09-16",
      sdk: "0.4.0", sdkSha256: tinyPrecision.sdkSha256, timingRounds: [1, 2, 3],
      timingMethod: "各轮排除首图，取63图推理中位数，再取三轮中位数",
      retentionMethod: "相对本批次同轮同后端FP32，取三轮最小保留率",
      report: `${sdkUrl}/${precisionPath}/README.md`,
    },
    {
      id: "tiny",
      title: "PP-YOLO Tiny 320",
      date: "2026-09-15",
      sdk: "0.4.0",
      sdkSha256: tiny.sdkSha256,
      timingRounds: [1, 2, 3],
      timingMethod: "各轮排除首图，取63图推理中位数，再取三轮中位数",
      retentionMethod: "FP32自身基线，不是量化保留率或Python匹配率",
      report: `${sdkUrl}/${tinyPath}/README.md`,
    },
    {
      id: "pico",
      title: "PicoDet XS/S/M 与 L-416/640",
      date: "2026-09-15",
      sdk: "0.4.0",
      sdkSha256: pico.sdkSha256,
      timingRounds: [1, 2, 3],
      timingMethod: "各轮排除首图，取63图推理中位数，再取三轮中位数",
      retentionMethod: "三轮最小保留率",
      report: `${sdkUrl}/${picoPath}/README.md`,
    },
    {
      id: "mlx",
      title: "PP-YOLOE+ M/L/X",
      date: "2026-09-14",
      sdk: "0.4.0",
      sdkSha256: mlx.sdkSha256,
      timingRounds: [1, 2, 3],
      timingMethod: "各轮排除首图，取63图推理中位数，再取三轮中位数",
      retentionMethod: "三轮最小保留率",
      report: `${sdkUrl}/${mlxPath}/README.md`,
    },
    {
      id: "early",
      title: "PicoDet L-320 与 PP-YOLOE+ S",
      date: "2026-09-12",
      sdk: "0.3.1",
      sdkSha256: old.sdkSha256,
      timingRounds: [3],
      timingMethod:
        "仅第三轮排除首图后的63图推理中位数；前两轮可能与界面测试重叠",
      retentionMethod: "原发布报告的汇总保留率",
      report: `${sdkUrl}/${oldPath}/README.md`,
    },
  ];
  const catalog = parse(
    await readFile(
      resolve(root, "src/content/models/pp-detection.yaml"),
      "utf8",
    ),
  );
  const baselineAsset = catalog.assets.find((asset) => asset.id === "ppyolo-tiny-320-fp32");
  assert(baselineAsset, "缺少Tiny FP32目录资产");
  groups[0].reference = {
    label: "本批次 FP32 对照", bytes: baselineAsset.bytes, sha256: baselineAsset.sha256,
    ...summarizeVariant(baselineAsset, precisionRuns(baselineAsset), [1, 2, 3]),
  };
  const rows = [];
  for (const asset of catalog.assets) {
    const precision = asset.id.split("-").at(-1);
    const key = asset.id.slice(0, -(precision.length + 1));
    const isTiny = key === "ppyolo-tiny-320";
    const isEarly = ["picodet-l-320", "ppyoloe-plus-s-640"].includes(key);
    const group = groups.find(
      (g) =>
        g.id ===
        (isTiny
          ? precision === "fp32" ? "tiny" : "tiny-precision"
          : isEarly
            ? "early"
            : key.startsWith("picodet")
              ? "pico"
              : "mlx"),
    );
    const manifestPath = isTiny
      ? `models/ppyolo-tiny-320/${precision === "fp32" ? "0.1.0" : "0.1.1"}/manifest.json`
      : key === "picodet-l-320"
        ? "models/pp-detection/1.0.2/manifest.json"
        : key.startsWith("picodet")
          ? `models/pp-detection/${key}/1.0.1/manifest.json`
          : `models/${key}/0.1.1/manifest.json`;
    const manifest = json(manifestPath);
    const variant = manifest.variants.find((v) => v.id === precision);
    assert(variant && variant.status === "stable", `不是稳定变体：${asset.id}`);
    assert.equal(variant.bytes, asset.bytes);
    assert.equal(variant.sha256, asset.sha256);
    assert.equal(variant.precision, asset.precision);
    const remote = variant.sources.find((s) => s.kind === "modelscope");
    assert.equal(remote.downloadUrl, asset.url);
    let runs;
    if (isTiny && precision !== "fp32") {
      runs = precisionRuns(asset);
    } else if (isTiny) {
      runs = backends.flatMap((backend) => {
        const summaries = tiny.rows.filter(
          (row) => row.model === "tiny" && row.backend === backend,
        );
        assert.equal(summaries.length, 1);
        const summary = summaries[0];
        assert.equal(summary.bytes, asset.bytes);
        assert.equal(summary.sha256, asset.sha256);
        assert.deepEqual(
          summary.rounds.map((item) => item.round).sort(),
          [1, 2, 3],
        );
        return [1, 2, 3].map((round) => {
          const path = `evidence/round-${round}/tiny-${backend}.json.gz`;
          const entries = tinyIndex.filter((item) => item.path === path);
          assert.equal(entries.length, 1);
          const entry = entries[0];
          const packed = source(`${tinyPath}/${path}`);
          assert.equal(packed.length, entry.bytes);
          assert.equal(sha(packed), entry.sha256);
          const bytes = gunzipSync(packed);
          assert.equal(bytes.length, entry.uncompressedBytes);
          assert.equal(sha(bytes), entry.uncompressedSha256);
          return tinyRun(
            asset,
            summary,
            JSON.parse(bytes),
            backend,
            round,
            group.sdkSha256,
          );
        });
      });
    } else if (isEarly) {
      const oldKey = key.startsWith("picodet") ? "picodet" : "ppyoloe";
      const model = old.models[oldKey][precision];
      runs = backends.flatMap((backend) =>
        [1, 2, 3].map((round) => {
          const result = old.runs[`${oldKey}-${backend}-${precision}-${round}`];
          const reference = old.runs[`${oldKey}-${backend}-fp32-${round}`];
          assert(result && reference, "早期记录缺轮");
          return {
            backend,
            round,
            bytes: model.bytes,
            sha256: model.sha256,
            apPoints: result.AP,
            apDeltaPoints: result.AP - reference.AP,
            retention:
              round === 3
                ? (model.backends[backend].parity?.matchedReferenceFraction ??
                  (precision === "fp32" ? 1 : NaN))
                : null,
            warmInferenceMs: result.inferenceMs,
          };
        }),
      );
      // 从原始记录核实图片集、运行时和权重，不把“同为64图”当作身份一致。
      for (const backend of backends) {
        const path = `browser/${oldKey}-${backend}-${precision}-3.json.gz`;
        const entry = oldIndex.find((item) => item.path === path);
        const packed = source(`${oldPath}/${path}`);
        assert.equal(sha(packed), entry.storedSha256);
        const unpacked = gunzipSync(packed);
        assert.equal(sha(unpacked), entry.sha256);
        const raw = JSON.parse(unpacked.toString("utf8"));
        assert.equal(raw.artifacts.annotations.sha256, annotationSha);
        assert.equal(raw.artifacts.imageSetSha256, imageSetSha);
        assert.equal(raw.artifacts.model.sha256, asset.sha256);
        assert.equal(raw.artifacts.sdk.sha256, old.sdkSha256);
        assert.equal(raw.runtime.backend, backend);
      }
    } else if (group.id === "pico") {
      runs = pico.rows
        .filter((r) => r.key === key && r.precision === precision)
        .map((r) => {
          assert.equal(r.artifacts.annotations.sha256, annotationSha);
          assert.equal(r.artifacts.imageSetSha256, imageSetSha);
          assert.equal(r.artifacts.sdk.sha256, group.sdkSha256);
          assert.equal(r.qualityGatePassed, true);
          return {
            backend: r.backend,
            round: r.round,
            bytes: r.artifacts.model.bytes,
            sha256: r.artifacts.model.sha256,
            apPoints: r.metrics.metrics.AP * 100,
            apDeltaPoints: r.apDeltaPoints,
            retention: r.retention.fraction,
            warmInferenceMs: r.warmInferenceMedianMs,
          };
        });
    } else {
      runs = mlx.rows
        .filter(
          (r) => r.size === key.split("-")[2] && r.precision === precision,
        )
        .map((r) => {
          assert.equal(r.qualityGatePassed, true);
          return {
            backend: r.backend,
            round: r.round,
            bytes: r.bytes,
            sha256: r.sha256,
            apPoints: r.metrics.AP * 100,
            apDeltaPoints: r.apDeltaPoints,
            retention: r.recognitionParity.matchedReferenceFraction,
            warmInferenceMs: r.performance.warmInferenceMedianMs,
          };
        });
    }
    const modelLabel = isTiny
      ? "PP-YOLO Tiny 320"
      : key.startsWith("picodet")
        ? `PicoDet-${key.split("-")[1].toUpperCase()} ${key.split("-")[2]}`
        : `PP-YOLOE+ ${key.split("-")[2].toUpperCase()} 640`;
    rows.push({
      id: asset.id,
      model: modelLabel,
      family: isTiny
        ? "ppyolo"
        : key.startsWith("picodet")
          ? "picodet"
          : "ppyoloe",
      precision,
      bytes: asset.bytes,
      sha256: asset.sha256,
      manifest: `${sdkUrl}/${manifestPath}`,
      modelVersion: manifest.model.version,
      group: group.id,
      ...summarizeVariant(asset, runs, group.timingRounds),
    });
  }
  assert.equal(rows.length, 39);
  assert.equal(new Set(rows.map((r) => r.id)).size, 39);
  assert.equal(new Set(rows.map((r) => r.model)).size, 14);
  const excluded = pico.candidates
    .filter((r) => !r.qualityGatePassed)
    .map((r) => ({
      id: `${r.key}-${r.precision}`,
      minimumRetention: r.minimumRetention,
    }));
  excluded.push(...tinyPrecision.candidates.filter((row) => !row.qualityGatePassed).map((row) => ({
    id: `${row.key}-${row.precision}`, minimumRetention: row.minimumRetention,
    minimumApDeltaPoints: row.minimumApDeltaPoints, reason: "AP下降超过0.5点",
  })));
  assert.equal(excluded.length, 3);
  assert(excluded.every((e) => !rows.some((r) => r.id === e.id)));
  const data = {
    date: "2026-09-16",
    sdkCommit,
    dataset: {
      images: 64,
      annotations: 716,
      annotationSha256: annotationSha,
      imageSetSha256: imageSetSha,
    },
    environment: {
      os: "Windows 11 10.0.26200",
      cpu: "Intel Core i5-10400F",
      gpu: "NVIDIA Blackwell（物理适配器）",
      browser: "Chromium 153.0.8010.12",
      ort: "1.27.0",
      mode: "主线程，WASM单线程，关闭SDK后端回退",
    },
    groups,
    excluded,
    rows,
  };
  const content = JSON.stringify(data, null, 2) + "\n";
  const uniqueSources = [...new Map(sources.map((s) => [s.path, s])).values()];
  const receipt =
    JSON.stringify(
      {
        sdkCommit,
        sourceRepository: "chenmohan123/web-sdk-PP-Detection",
        sources: uniqueSources,
        output: {
          path: dataPath,
          bytes: Buffer.byteLength(content),
          sha256: sha(content),
        },
        interpretation:
          "原始发布证据的可追溯汇编；不新增推理运行，不改写旧批次，不生成跨批次性能排名。",
      },
      null,
      2,
    ) + "\n";
  const markdown = makeMarkdown(data);
  for (const [path, text] of [
    [dataPath, content],
    [`${reportPath}/sources.json`, receipt],
    ["docs/zh-CN/pp-detection-selection.md", markdown],
  ]) {
    const output = resolve(root, path);
    if (process.argv.includes("--check"))
      assert.equal(
        await readFile(output, "utf8"),
        text,
        `生成结果已漂移：${path}`,
      );
    else {
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, text);
    }
  }
  console.log(
    `已核对39个稳定变体、78组后端汇总与${uniqueSources.length}份固定来源；${process.argv.includes("--check") ? "生成结果一致" : "数据和文档已生成"}。`,
  );
}

function makeMarkdown(data) {
  let text =
    "# PP-Detection 模型选型与对比\n\n2026-09-16：14个规格、39个稳定变体。当前SDK/npm为0.4.0，默认PicoDet-L-320 / FP32 / ModelScope。\n\n[交互选型表](https://chenmohan123.github.io/models/pp-detection/compare/) · [在线Demo](https://chenmohan123.github.io/web-sdk-PP-Detection/)\n\n## 如何选择\n\n- 小体积：PicoDet-S-320 W8A32约1.38 MB，是当前39个稳定文件中最小的；适合优先减少首次下载量。\n- Tiny下载量优先：FP16为2.36MB，比FP32减少47.7%，最差AP下降0.175点、检测保留率至少99.52%；本机没有加速收益。\n- CPU速度优先：可比较Tiny 320 FP32与PicoDet-XS-320。Tiny独立批次CPU热推理47.46ms，相较同批次XS对照少约28%，文件大约56%、AP低1.21点；表中旧XS行保留原PicoDet批次64.10ms，不跨批次排名。\n- 识别质量优先：先比较PP-YOLOE+ M/L/X FP32；该批次X的子集AP更高，但文件和CPU耗时也更大。需要压缩下载量时再比较同规格FP16/W8A32。\n- 常规起点：继续使用默认PicoDet-L-320 FP32；需要框坐标尽量接近基线时保留FP32。\n\n## 数据口径\n\n体积采用十进制MB。AP为0–100的COCO AP@[.50:.95]，表中显示三个真实轮次的最小值至最大值；固定64图、716标注，不是全量COCO成绩。保留率指score≥0.5、同类别IoU≥0.5的一对一匹配，分母是同规格、同后端FP32检测数，并非对人工标注的召回率。Tiny首发FP32保留原批次；FP16精度批次单独列出本轮FP32对照，不把旧批次耗时、Python匹配率或相较PicoDet的AP差值用于本轮精度比较。\n\n同一图集和设备不等于同一性能批次：五组的SDK摘要、执行日期和耗时汇总规则不同，保留分组，不形成全局速度排名。热推理只计模型inference，复用会话、排除首图；不包含下载、初始化和预处理，不可直接换算摄像头FPS。\n\n环境：Windows 11 10.0.26200；Intel Core i5-10400F；物理NVIDIA Blackwell；Chromium 153.0.8010.12；ORT Web 1.27.0；main模式，WASM单线程，关闭SDK后端回退。没有新增手机或峰值内存验证。W8A32仅压缩权重，激活/卷积仍为FP32；文件缩小不代表运行内存同比下降。\n";
  const n = (x) => x.toFixed(2);
  const range = (x) =>
    n(x[0]) === n(x[1]) ? n(x[0]) : `${n(x[0])}–${n(x[1])}`;
  for (const group of data.groups) {
    const baseline = group.reference ? `本批次FP32对照：${n(group.reference.bytes / 1e6)} MB；CPU/GPU AP ${range(group.reference.wasm.apRange)}/${range(group.reference.webgpu.apRange)}；CPU/GPU热推理 ${n(group.reference.wasm.warmInferenceMs)}/${n(group.reference.webgpu.warmInferenceMs)} ms。该对照不重复计入稳定变体。\n\n` : "";
    text += `\n## ${group.title}\n\n${group.date}；SDK ${group.sdk}；${group.timingMethod}。保留率口径：${group.retentionMethod}。[原始报告](${group.report})\n\n${baseline}| 模型 | 精度 | MB | CPU AP | GPU AP | CPU热推理ms | GPU热推理ms | CPU保留率 | GPU保留率 |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
    for (const row of data.rows.filter((r) => r.group === group.id))
      text += `| ${row.model} | ${row.precision.toUpperCase()} | ${n(row.bytes / 1e6)} | ${range(row.wasm.apRange)} | ${range(row.webgpu.apRange)} | ${n(row.wasm.warmInferenceMs)} | ${n(row.webgpu.warmInferenceMs)} | ${n(row.wasm.minimumRetention * 100)}% | ${n(row.webgpu.minimumRetention * 100)}% |\n`;
  }
  text +=
    "\n## 未发布项与复现\n\nPicoDet-XS-320/416 W8A32的最低检测保留率为94.38%/94.12%，未达到95%门槛，保留labs，不列入39个稳定变体。Tiny W8A32为1.57MB，但最差AP下降0.537点，超过0.5点门槛，同样保留labs。原有实验报告不改写。\n\n本页与门户使用同一份自动生成数据，输入固定在SDK提交`" +
    sdkCommit +
    "`，来源文件摘要见[汇编记录](../../" +
    reportPath +
    "/sources.json)。已有记录覆盖39个稳定变体的两后端质量和耗时，因此本轮不重复推理；跨批次统一排名、手机性能和峰值内存仍需另立同条件基准，当前不提供这些结论。\n\n```powershell\nnode tools/detection-comparison/build.mjs --sdk <包含固定提交的SDK路径> --check\n```\n";
  return text;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
