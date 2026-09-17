# TinyPose 0.3.0 门户同步

2026-09-18（北京时间），门户登记已经发布的 TinyPose 0.3.0，补充图片、本地视频及摄像头 Demo 能力。SDK 输入仍为单帧 Blob/RGBA/region，三项模型身份、默认来源与独立链接保持原契约。

- 本地65项单测通过；Astro检查0错误、0警告，保留7项既有提示；14页构建成功。
- `../tinypose-media-portal-browser.json`：1280px与390px两项浏览器检查通过，覆盖目录筛选、详情、三项资产、版本、边界、独立链接及无横向溢出。
- 发布后的线上截图、浏览器回读与GitHub部署提交归档于SDK的 `reports/2026-09-17-media/release/portal-*`。

媒体12组合385帧和图片24组合是桌面验证；摄像头使用Chromium fake-device，不声明物理摄像头、手机、微信或NPU兼容。门户不复制推理runtime。
