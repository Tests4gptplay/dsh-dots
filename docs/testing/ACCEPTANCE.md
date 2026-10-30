# Dots候选1验收

## 增量交接原则

已通过项采用原证据，不交给下一执行者整套重跑。先核本机已完成结果，划掉重复工作，当前轮适度收尾。33项组件与源码契约结果直接采用。Windows增量 D-W1–4 已全部通过，本轮不再重跑。具体证据与范围见验收报告；如实际使用macOS、新登录或非100%缩放，仅补对应使用环境。

修复仅复验受影响调用链及必要相邻恢复；无变化runtime的有效结果继续采用。报告分 `adopted_evidence` 与 `delta_cases`，不要把引用旧证据冒称本次重测。

版本 `1.0.10-uiqa.20261029.1`。原功能包SHA256 `50d04fc3f3fa56447a0df940a99bd7a469b195cee3f0f2d8679a95bad4809acd`。copyclarity包更新README/元数据/介绍显示文字，7项其余文件不变，12项payload逐hash映射见安装清单。

## 已完成

完整冻结组件与源码契约轮33 PASS、0 FAIL、0 SKIP，使用已固定的官方DSH源码；其中3项明确为测试替身覆盖。验证持续工具栏/错误翻译更新而不重建guest、重复/并发release幂等性、外部打开失败恢复及正式包白名单。冻结前后运行文件一致，测试UI与诊断overlay不进入安装包。

官方固定源码为 `dsh-v0.2.1-rc.2`，commit `687f282e8625c6b8d11ff58211a90524be2e4317`。其Desktop启动解析支持macOS与Windows目标，Linux目标预检返回unsupported target linux-x64；本轮没有伪造Desktop或以Web iframe替代原生guest验收。

## Windows 增量验收：D-W1–4 全部通过

依据《Windows三插件增量报告-20261030(1).zip》的 dots/REPORT.md、results.json 及过程证据；28项证据索引大小与SHA一致。实际平台Windows、DSH 0.2.1-rc.3，安装原冻结功能包；lib/client.js与lib/host.js均与介绍版运行字节一致。

- D-W1：原生网页切换复用与内容保留通过。
- D-W2：隐藏/恢复、禁用退出、启用重建与完整宿主重启通过。
- D-W3：既有已登录状态在完整重启后保留，外部打开成功交接Chrome/ChatGPT页面；不是仅登录页面保留。
- D-W4：中英、明暗主题及96 DPI（100%）通过。

本轮收尾，不重复上述验证。如实际使用新登录流程、非100%缩放或macOS，按对应环境补实际操作；外部打开未直接读取完整目标地址。内部lease ID未采集，生命周期结论依据实际进程/窗口过程。app.asar持久化脚本未执行。
