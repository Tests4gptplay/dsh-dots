# 候选测试文档

## 增量交接原则

已通过项采用原证据，不交给下一执行者整套重跑。先核本机已完成结果，划掉重复工作，当前轮适度收尾。33项组件与源码契约结果直接采用。Windows增量 D-W1–4 已全部通过，本轮不再重跑。具体证据与范围见验收报告；如实际使用macOS、新登录或非100%缩放，仅补对应使用环境。

修复仅复验受影响调用链及必要相邻恢复；无变化runtime的有效结果继续采用。报告分 `adopted_evidence` 与 `delta_cases`，不要把引用旧证据冒称本次重测。

- [安装与本机验收](../../test-artifacts/INSTALL.md)
- [包清单](../../test-artifacts/copyclarity-manifest.json)
- [实际验收范围](ACCEPTANCE.md)
- [变更依据](CHANGES.md)

与其他插件一致使用test-artifacts保存包与校验信息、docs/testing保存验收与变更。每个包的结果独立记录。
