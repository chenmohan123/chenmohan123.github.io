# Detection 0.3.0 门户同步与标准检查

日期：2026-09-12。门户记录从 SDK 0.2.0 更新到已发布的 0.3.0，登记 PicoDet-L-320 与 PP-YOLOE+ S 640 两款 FP32 稳定模型的固定 ModelScope 来源、大小与 SHA-256。模型资源展示现有资产 ID，以区分同为 FP32 的两款模型；没有复制 SDK runtime。

## 验证

- 门户单测：50 项通过。
- Astro 类型检查：0 errors，3 条既有 Zod 弃用提示。
- 静态构建：9 个页面成功，输出 `.tmp/sdk-followup/portal-dist`。
- 门户浏览器：5 项通过。
- 1440 / 390 像素宽度详情页：无页面错误或横向溢出，模型资源、安装信息及独立 Demo 入口可见。截图保存在本机 `.tmp/sdk-followup/`。
- SDK 标准 before / after：required 18 通过、0 失败、4 项远程检查 skip，状态为 locally-compliant，不扩大为远程合规结论。

原默认 `dist` 含历史文件 ACL 限制，本轮使用独立构建输出目录。首次浏览器命令误用了 SDK 的缓存版本，随后改用门户版本匹配的本机 Playwright 缓存，全部用例通过。

直接运行 `pnpm sdk:check -- --repo ../web-sdk-PP-Detection` 被历史 `.tmp/release-0.3.0-pytest` 目录的 ACL 拒绝。没有改缓存权限或标准检查器。以 `git ls-files -co --exclude-standard` 获取全部 Git 可见文件（含本轮新增与未提交改动），逐文件复制并比对 SHA-256，然后用同一检查器扫描：

```powershell
pnpm sdk:check -- --repo "$env:TEMP/codex-detection-followup-01a090a2-20260912/web-sdk-PP-Detection" --format json --out reports/sdk-standard/2026-09-12-detection-followup/after.json
```

快照的源路径、文件列表、字节数和摘要见 `snapshot.json`；检查结果保留规则 ID、证据路径与 remediation。

SDK 对应报告位于 `reports/evaluation/2026-09-12-ppyoloe-fp16/README.md`。本次 FP16 实验候选未登记为门户稳定资产：体积约减半，但本机推理没有明显加速，移动端仍待验证。

快照最终移到系统临时目录，避免门户 Vitest 收集 SDK 快照中的测试；移走后重新执行门户单测。
