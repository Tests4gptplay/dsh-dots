# 候选安装与本机验收

## 增量交接原则

已通过项采用原证据，不交给下一执行者整套重跑。先核本机已完成结果，划掉重复工作，当前轮适度收尾。33项组件与源码契约结果直接采用。Windows增量 D-W1–4 已全部通过，本轮不再重跑。具体证据与范围见验收报告；如实际使用macOS、新登录或非100%缩放，仅补对应使用环境。

修复仅复验受影响调用链及必要相邻恢复；无变化runtime的有效结果继续采用。报告分 `adopted_evidence` 与 `delta_cases`，不要把引用旧证据冒称本次重测。

版本 `1.0.10-uiqa.20261029.1`。下载本目录 [dsh-dots-1.0.10-uiqa.20261029.1-copyclarity.tgz](dsh-dots-1.0.10-uiqa.20261029.1-copyclarity.tgz)；大小15909字节，SHA256 `9ef0f7b5e501eb23814e0aec29c081314a07707972503c98c02a00fd2b96a466`。完整清单见[copyclarity-manifest.json](copyclarity-manifest.json)。原包仍保留用于追溯，当前介绍版选择文件名带copyclarity的包。

Windows PowerShell：

```powershell
Get-FileHash .\dsh-dots-1.0.10-uiqa.20261029.1-copyclarity.tgz -Algorithm SHA256
```

通过DSH正常插件管理入口安装本地TGZ，按宿主提示重载，再核插件版本与设置。沿用宿主官方安装方式，不凭文档猜测机器路径或启动参数。已有使用说明见[项目README](../README.md)。

## 本机验收状态

33项组件与源码契约结果直接采用。Windows增量 D-W1–4 已全部通过，本轮不再重跑。具体证据与范围见验收报告；如实际使用macOS、新登录或非100%缩放，仅补对应使用环境。

Windows D-W1–4已收尾，具体既有覆盖见[验收报告](../docs/testing/ACCEPTANCE.md)。仅做原生平台或真实服务尚缺的项，记录新增结果和当前已完成的本机证据，不重新盘点所有入口、全量双语矩阵或模拟后端。
