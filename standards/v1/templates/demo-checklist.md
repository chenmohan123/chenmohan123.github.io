# Demo Checklist

- [ ] Demo focuses on this SDK/model or algorithm only.
- [ ] Initial document language is Chinese (`zh-CN`).
- [ ] In-page Chinese/English toggle works without reloading model state.
- [ ] Brand bar shows SDK name, package version, GitHub, and Demo link.
- [ ] Input, backend/precision selection, run/reset, and disabled/loading states exist.
- [ ] Empty preview does not render a broken image.
- [ ] Status uses the standard state names and accessible text/icons.
- [ ] （仅模型）Model name, version, bytes, parameter count, precision, format, source, license, and SHA-256 are visible.
- [ ] Requested backend, actual backend, execution mode, runtime version, and verification matrix are visible.
- [ ] （仅模型）Download, cache read, integrity, session, preprocess, inference, postprocess, and total timings are visible.
- [ ] （仅模型）Current-model cache cleanup and global cache cleanup are user initiated and report results.
- [ ] Local-processing/privacy statement is visible.
- [ ] 390px viewport has no horizontal overflow.
- [ ] （仅算法）data-sdk-algorithm-info 展示算法身份、来源、许可、输入输出与状态限制。
- [ ] （仅算法）保留 data-sdk-runtime-info 和 data-sdk-timing，展示五个算法耗时字段及新实例/复用状态语义。
- [ ] （仅算法）data-sdk-state-reset 实际触发复位；重播/切换序列/seek 遵循状态契约，切语言不复位。
- [ ] （仅算法）不展示虚构模型下载或缓存操作；浏览器实测复位及错误状态。
