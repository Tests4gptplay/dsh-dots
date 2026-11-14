# DSH Dot MCP 1.0.1 · 正式发布

2026-11-15 · DSH Dot MCP

## 功能与更新

- Dot 优先直接调用 DSH 原生 API、已安装插件和工具；确需持续 Agent 对话时才建立会话。
- MCP 创建的对话进入指定或当前工作区，命令、回复与记录正常可见。
- DSH 左侧入口为 Dot，设置页为 Dot MCP，中英文界面一致。
- 修复单次 HTTP 探测错误污染全局 MCP 连接状态的问题。
- 保留 Dots 网页入口、预加载、页面状态保持、Secure MCP Tunnel 管理、主动通知与 Desktop 登录保持。

## 安装

DSH「插件 → 添加插件」输入：

```text
github:Tests4gptplay/dsh-dots#dsh-dot-mcp-v1.0.1
```

npm 包：`dsh-dot-mcp@1.0.1`；本版 Release 附件：`dsh-dot-mcp-1.0.1.tgz`。
简洁版独立保留：`github:Tests4gptplay/dsh-dots#v1.0.12` / `@tests4gptplay/dsh-dots@1.0.12`。

## 验收

- Windows / Linux 源码回归：156 通过、1 跳过；正式候选包另行执行 CI。
- Linux 原生 DSH 0.2.2-rc.1：32 项原生验证通过。
- Windows 实机：直接调用与新建 DSH Agent 两种 MCP 归档操作成功，侧栏实际截图验证两条会话逐次移除，原记录保留。

[English](dsh-dot-mcp-v1.0.1.en.md) · [GitHub 项目](https://github.com/Tests4gptplay/dsh-dots) · [问题反馈](https://github.com/Tests4gptplay/dsh-dots/issues)
