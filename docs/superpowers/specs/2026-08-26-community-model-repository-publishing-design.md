# Web SDK 社区模型仓库发布设计

## 目标

在 `chenmohan` 账号下分别为 Hugging Face 和 ModelScope 创建三个公开模型仓库，发布三个 Web SDK 当前 Demo 使用且已通过浏览器验证的 ONNX 模型资产，并将仓库加入现有 `Web SDK Models` 集合。发布后，Demo 可通过固定版本的公开下载地址选择 Hugging Face 或 ModelScope 模型来源，SDK runtime/API 保持不变。

## 仓库

两个平台使用相同仓库名：

- `web-sdk-pp-doclayoutv3`
- `web-sdk-pp-lcnet-x1-0-doc-ori`
- `web-sdk-pp-ocrv6`

仓库均为公开仓库，使用 Apache-2.0 许可证。模型卡必须明确说明上游 PaddlePaddle 来源、ONNX 转换或镜像关系、版本、文件大小、SHA-256，以及 PaddlePaddle 未对这些个人仓库提供背书。

## 发布范围

只发布当前 Demo 对应版本：

| SDK | 版本 | 模型资产 |
| --- | --- | --- |
| PP-DocLayoutV3 | `1.0.2` | FP16、FP32 两个 ONNX |
| PP-LCNet_x1_0_doc_ori | `1.0.0` | FP32 ONNX |
| PP-OCRv6 | `1.0.0` | medium/small/tiny 的检测和识别 ONNX，共六个；三个识别字典 |

不发布 DocLayoutV3 `1.0.0`、`1.0.1` 历史目录。DocLayoutV3 `1.0.2` 继续使用已经验证的 `v1.0.1-models` 二进制内容，但在模型卡和 manifest 中保留该事实及原始 SHA-256。

## 目录结构

每个仓库采用版本目录，根目录保留模型卡、许可证和第三方声明：

```text
README.md
LICENSE
THIRD_PARTY_NOTICES.md
1.0.x/
  manifest.json
  *.onnx
  dictionaries/*.txt
```

不上传 SDK 源码、Demo、构建产物、测试缓存或 `node_modules`。

## 地址与版本固定

LCNet 和 OCRv6 SDK 会相对 manifest URL 解析 ONNX 和字典地址，因此社区仓库中的 manifest 使用相对路径。Demo 直接传入包含不可变 revision 的远程 manifest 下载地址，相关相对资产也保持在同一 revision。

DocLayoutV3 manifest 要求模型 URL 为绝对地址。其发布分两步完成：先上传 ONNX 并记录平台生成的 revision，再上传引用该 revision 的平台专用 manifest。Demo 直接传入该平台 manifest 的固定 revision 地址，因此不需要修改 SDK runtime。

Hugging Face 和 ModelScope 的 Demo manifest 均不得使用可变的 `main` 或 `master` 模型地址。允许仓库页面展示默认分支，但运行时地址必须固定到 commit/revision。

## 上传流程

1. 从三个 SDK 仓库的受控 `models` 目录准备白名单文件。
2. 上传前记录每个 ONNX 的字节数和 SHA-256。
3. 在两个平台创建三个公开模型仓库并设置 Apache-2.0。
4. 上传模型、字典、模型卡、许可证和第三方声明。
5. 取得不可变 revision，生成或校正平台 manifest。
6. 将三个仓库加入各自的 `Web SDK Models` 集合。
7. 更新三个 Demo 的 Hugging Face/ModelScope 来源配置。

## 验证与失败处理

每个平台逐个执行以下验收：

- 仓库和集合页面在未登录状态下可访问。
- manifest、ONNX 和字典返回成功状态并允许浏览器跨域下载。
- 下载文件的字节数和 SHA-256 与本地受控资产一致。
- manifest schema 和模型契约测试通过。
- 三个 Demo 的类型检查、构建、来源选择测试通过。
- 至少执行一次各平台的真实浏览器模型加载和推理。

任何资产上传不完整、哈希不一致、CORS 不可用或推理失败时，对应来源继续保持禁用，不用可变分支地址或跳过完整性检查进行规避。一个平台的失败不阻塞另一个平台已经验证的来源。

## 外部变更边界

本次授权仅包括上述六个公开模型仓库、两个既有集合的成员关系，以及三个本地 Demo 的来源配置。不得创建访问令牌、修改账号权限、删除或覆盖其他远程仓库，也不得推送四个本地 Git 仓库，除非用户另行明确授权。
