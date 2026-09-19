import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { modelSchema } from "../../lib/registry/schema";

describe("model registry", () => {
  it("登记 TinyPose 0.3.0 并保留单帧SDK与媒体Demo边界", () => {
    const models = readdirSync("src/content/models")
      .filter((file) => file.endsWith(".yaml"))
      .map((file) => modelSchema.parse(parse(readFileSync(`src/content/models/${file}`, "utf8"))));
    expect(models).toHaveLength(8);
    const model = models.find((entry) => entry.id === "pp-tinypose");
    expect(model).toBeDefined();
    expect(model?.task).toBe("pose-estimation");
    expect(model?.package).toEqual({ name: "web-sdk-pp-tinypose", version: "0.3.0" });
    expect(model?.runtime.backends).toEqual([
      { name: "wasm", status: "stable" },
      { name: "webgpu", status: "stable" },
    ]);
    expect(model?.runtime.capabilities).toEqual(expect.arrayContaining(["w16a32", "input-size"]));
    expect(model?.assets).toEqual([
      {
        id: "tinypose-256x192-fp32",
        precision: "fp32",
        bytes: 5685847,
        url: "https://www.modelscope.cn/models/chenmohan/web-sdk-pp-tinypose/resolve/68e7b987b5daf36080fb16ed90bf67b64d722b20/tinypose-256x192/0.1.0/tinypose-256x192-fp32.onnx",
        sha256: "7614d17acbe957200a8505e11a4fb8445103f9e44a7087115d8a1ea85f88b1b9",
      },
      {
        id: "tinypose-enhance-128x96",
        precision: "fp32",
        bytes: 5685846,
        url: "https://www.modelscope.cn/models/chenmohan/web-sdk-pp-tinypose/resolve/97c04100baef646f1b9c4d83295d8e2f14b4324d/tinypose-128x96/0.2.0/fp32/tinypose-128x96-fp32.onnx",
        sha256: "a0e2edd5272f48243a9cbd571151eda966f1bfa865a954f39e1e344aa5a14cf8",
      },
      {
        id: "tinypose-enhance-128x96-w16a32",
        precision: "w16a32",
        bytes: 3150847,
        url: "https://www.modelscope.cn/models/chenmohan/web-sdk-pp-tinypose/resolve/97c04100baef646f1b9c4d83295d8e2f14b4324d/tinypose-128x96/0.2.0/w16a32/tinypose-128x96-w16a32.onnx",
        sha256: "8671c7b424d85d4f017b6410602de6095b1fbb9fffca38ad5489039dd2a0cfea",
      },
    ]);
    expect(model?.runtime.verifiedEnvironments).toHaveLength(2);
    expect(model?.runtime.verifiedEnvironments.every((environment) => environment.testedAt === "2026-09-18")).toBe(true);
    expect(model?.limitations.join(" ")).toContain("视频解码、摄像头权限和帧调度属于独立Demo");
    expect(model?.limitations.join(" ")).toContain("模拟摄像头不代表物理设备兼容");
    expect(model?.io.input).toEqual(["Blob", "RGBA", "region（调用者提供的人体框）"]);
    expect(model?.io.output).toContain("17 个 COCO 关键点（原图坐标与 score）");
  });

  it("登记 PP-RotatedDetection 0.1.0 并保留单图桌面边界", () => {
    const value = parse(readFileSync("src/content/models/pp-rotated-detection.yaml", "utf8"));
    const model = modelSchema.parse(value);
    expect(model.task).toBe("rotated-detection");
    expect(model.package).toEqual({ name: "web-sdk-pp-rotated-detection", version: "0.1.0" });
    expect(model.runtime.backends).toEqual([
      { name: "wasm", status: "stable" },
      { name: "webgpu", status: "stable" },
    ]);
    expect(model.runtime.verifiedEnvironments).toHaveLength(2);
    expect(model.io.output).toContain("DOTA 15 类类别与分数");
    expect(model.assets).toEqual([{
      id: "ppyoloe-r-s-1024-fp32",
      precision: "fp32",
      bytes: 33161415,
      url: "https://www.modelscope.cn/models/chenmohan/web-sdk-pp-rotated-detection/resolve/20632e3f350c664c2f88ea56b68bca0fe8a03349/ppyoloe-r-s-1024/0.1.0/ppyoloe-r-s-1024-fp32.onnx",
      sha256: "de2f4c94061bda4bfaa0773ed5bc3aabdc59cf5b2f72301d15ae500b8f971089",
    }]);
    expect(model.limitations.join(" ")).toMatch(/单张图片.*大图切片.*视频.*摄像头.*跟踪/);
    expect(model.limitations.join(" ")).toMatch(/手机.*NPU.*尚未验证/);
  });

  it("accepts the PP-DocLayoutV3 catalog record", () => {
    const value = parse(
      readFileSync("src/content/models/pp-doclayoutv3.yaml", "utf8"),
    );
    const model = modelSchema.parse(value);
    expect(model.package.version).toBe("1.2.0");
    expect(model.assets[0].bytes).toBe(74279796);
    expect(model.demo.url).toBe(
      "https://chenmohan123.github.io/web-sdk-PP-DocLayoutV3/",
    );
  });

  it("登记 Detection 0.4.0 及十四个规格的三十九个稳定变体", () => {
    const value = parse(
      readFileSync("src/content/models/pp-detection.yaml", "utf8"),
    );
    const model = modelSchema.parse(value);
    expect(model.task).toBe("detection");
    expect(model.package).toEqual({
      name: "web-sdk-pp-detection",
      version: "0.4.0",
    });
    expect(model.repository).toBe(
      "https://github.com/chenmohan123/web-sdk-PP-Detection",
    );
    expect(model.demo.url).toBe(
      "https://chenmohan123.github.io/web-sdk-PP-Detection/",
    );
    expect(model.runtime.backends.map((backend) => backend.name)).toEqual(
      expect.arrayContaining(["wasm", "webgpu"]),
    );
    expect(model.io.input).toEqual(
      expect.arrayContaining(["Blob", "Canvas", "ImageBitmap", "VideoFrame"]),
    );
    expect(model.io.output).toEqual(
      expect.arrayContaining(["bounding boxes", "labels", "scores"]),
    );
    expect(model.assets[0].bytes).toBe(23243834);
    expect(model.assets[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(model.assets).toHaveLength(39);
    expect(model.assets.map((asset) => asset.bytes)).toEqual([
      23243834, 14813981, 6117685, 31954220, 16054567, 8225467, 94022904,
      47104975, 23818631, 209181400, 104700181, 52698311, 394163636, 197207187,
      99048805, 23261512, 23320381, 13905160, 13922843, 4807906, 4825589,
      2886024, 2903707, 14836820, 6135363, 14874912, 6194232, 8869567, 3736832,
      8885644, 3754515, 3082899, 1380421, 3097823, 1398104, 1863376, 1875659,
      4511117, 2357376,
    ]);
    expect(
      model.assets.some((asset) =>
        /^picodet-xs-(320|416)-w8a32$/.test(asset.id),
      ),
    ).toBe(false);
    expect(model.limitations.join(" ")).toMatch(/微信/);
    expect(model.limitations.join(" ")).toMatch(/FP16|INT8|INT4|FP8/);
  });

  it("登记 PP-OCRv6 0.2.0 的六个 FP32 资产", () => {
    const value = parse(
      readFileSync("src/content/models/pp-ocrv6.yaml", "utf8"),
    );
    const model = modelSchema.parse(value);
    expect(model.task).toBe("ocr");
    expect(model.package).toEqual({
      name: "web-sdk-pp-ocrv6",
      version: "0.2.0",
    });
    expect(model.repository).toBe(
      "https://github.com/chenmohan123/web-sdk-PP-OCRv6",
    );
    expect(model.demo.url).toBe(
      "https://chenmohan123.github.io/web-sdk-PP-OCRv6/",
    );
    expect(model.assets).toHaveLength(6);
    expect(model.assets.every((asset) => asset.precision === "fp32")).toBe(
      true,
    );
    expect(model.assets.map((asset) => asset.bytes)).toEqual([
      62032837, 9880512, 1780590, 76554979, 21159378, 4462639,
    ]);
    expect(model.runtime.backends.map((backend) => backend.name)).toEqual([
      "wasm",
      "webgpu",
    ]);
    expect(model.limitations.join(" ")).toMatch(/WebGPU/);
  });

  it("rejects a stable backend without a backend name", () => {
    expect(() =>
      modelSchema.parse({ runtime: { backends: [{ status: "stable" }] } }),
    ).toThrow();
  });
});
