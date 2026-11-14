# DSH Dot MCP 1.0.0

独立的 **dsh-dot-mcp** 插件，沿用经过 Windows 实机确认的 DSH Dots MCP 2.0.2 实现。

## 功能

- DSH 原生 Dots 网页入口：预加载、页面切换保留、后退和返回 Dot 首页
- MCP 连接：17 个工具，面向 DSH 会话、工作区、文件、模型和原生 API
- 官方 OpenAI Secure MCP Tunnel 的安装、运行配置和启动恢复
- 按指定 Session 的主动事件通知，保持已有 MCP Events 实现
- 中英文设置页、明暗主题、五步连接指南和 Desktop 登录保持

## 两款插件

| 插件 | 包名 | DSH 安装地址 |
| --- | --- | --- |
| 简洁版 Dots | `dsh-dots` | `github:Tests4gptplay/dsh-dots#1.0.12` |
| MCP 完整版 | `dsh-dot-mcp` | `github:Tests4gptplay/dsh-dots#dsh-dot-mcp-v1.0.0` |

两款版本分别使用独立的 Cordis ID、Client 注册名和 UI 入口，源码位于同一个 GitHub 仓库的不同版本线。登录保持使用当前 DSH 已应用的浏览器分区，Tunnel 的既有用户配置沿用原路径。

## 发布验收

源码基于经过 Windows 用户验证的 v2.0.2。新版本打包后应完成 Windows/Linux 测试、生产包清单、npm 包与 DSH 原生安装验收，正式发行内容以 GitHub Actions 结果与 Release 附件为准。
