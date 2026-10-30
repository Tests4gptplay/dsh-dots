# Dots候选1验收

版本 `1.0.10-uiqa.20261029.1`。原功能包SHA256 `50d04fc3f3fa56447a0df940a99bd7a469b195cee3f0f2d8679a95bad4809acd`。copyclarity包更新README/元数据/介绍显示文字，7项其余文件不变，12项payload逐hash映射见安装清单。

## 已完成

完整冻结组件与源码契约轮33 PASS、0 FAIL、0 SKIP，使用已固定的官方DSH源码；其中3项明确为测试替身覆盖。验证持续工具栏/错误翻译更新而不重建guest、重复/并发release幂等性、外部打开失败恢复及正式包白名单。冻结前后运行文件一致，测试UI与诊断overlay不进入安装包。

官方固定源码为 `dsh-v0.2.1-rc.2`，commit `687f282e8625c6b8d11ff58211a90524be2e4317`。其Desktop启动解析支持macOS与Windows目标，Linux目标预检返回unsupported target linux-x64；本轮没有伪造Desktop或以Web iframe替代原生guest验收。

## 后续本机验收

Windows/macOS真实Desktop的main/preload/BrowserGuestService、guest attach策略、lease释放、正常登录及重启保留仍需独立实测。已有组件结果不是这些原生链路的PASS。用户应在正常官方页面自行登录，不导出账号存储。app.asar持久化脚本只做过只读审查，尚未执行。
