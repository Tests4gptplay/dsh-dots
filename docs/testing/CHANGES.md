# 变更与依据

## 本次更新

- 切换语言时已打开页面的工具栏与错误文字随之更新，保持页面复用。
- 修复多处程序错误，改善运行稳定性。

本次没有新增网页服务或模型代理。Windows Desktop四项增量已验证；macOS原生路径按实际使用环境验证。Linux官方Desktop目标不支持，本次不将Web iframe视为Linux原生guest验收。介绍包只有文案变化，运行文件与验收包一致。

[具体用例步骤、预期、实际结果与净化证据](EVIDENCE.md)

- 语言切换后持续工具栏和错误文字更新，不重建页面guest。
- 重复/并发release按已有生命周期幂等收尾；外部打开错误可恢复。
- 装饰图形不再暴露固定中文标签；测试overlay与mock仅在测试夹具。
- 介绍明确打开官方网页、WebView页面复用、主题与外部打开；页面权限遵循宿主既有guest机制。

本次仅整理分支文档，没有改运行代码或重新打包。介绍修订对应的copyclarity包及其原功能包映射保留在[manifest](../../test-artifacts/copyclarity-manifest.json)。
