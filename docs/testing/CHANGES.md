# 变更与依据

- 语言切换后持续工具栏和错误文字更新，不重建页面guest。
- 重复/并发release按已有生命周期幂等收尾；外部打开错误可恢复。
- 装饰图形不再暴露固定中文标签；测试overlay与mock仅在测试夹具。
- 介绍明确打开官方网页、WebView页面复用、主题与外部打开；页面权限遵循宿主既有guest机制。

本次仅整理分支文档，没有改运行代码或重新打包。介绍修订对应的copyclarity包及其原功能包映射保留在[manifest](../../test-artifacts/copyclarity-manifest.json)。
