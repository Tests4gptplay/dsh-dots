# DSH Dots 2.0.1-test.4

**在 DSH 里使用 Dot，让 Dot 调用 DSH 完成工作。**

[English](README.en.md) · [2.0.0 更新记录与实机展示](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.0/docs/releases/v2.0.0.md) · [问题反馈](https://github.com/Tests4gptplay/dsh-dots/issues)

DSH Dots 将 [ChatGPT Dots](https://chatgpt.com/dots/home) 带入 DeepSeek Harness。你可以在 DSH 内与自己的 Dot 对话，也可以开启 MCP，让 Dot 使用 DSH 的 AI 会话、工具和工作区，提交任务并取回结果。

## 2.0.0 带来了什么

这一版从网页入口扩展到 **Dot 与 DSH 之间的双向协作**：在 DSH 中使用 Dot，同时让 Dot 调用这台电脑上的 DSH。

| 新能力 | 可以怎样使用 |
| --- | --- |
| MCP 连接 | 将 DSH 注册为 Dot 可用的工具服务，在对话中下达任务。 |
| 会话与任务管理 | 创建或继续会话、追加要求、查看进度和结果，也可以取消执行。 |
| 工作区与工具 | 读取和修改文件、取得图片结果，使用当前 DSH 已启用的命令及插件能力。 |
| 同页设置 | 在「设置 → Dots」管理 MCP 开关、连接地址、调用状态和登录保持。 |
| 完整接入引导 | 复制实际连接信息、检查本地服务，并通过官方指南完成注册和首次调用。 |

**MCP 默认关闭，按需开启。** 开关状态和连接设置随当前 DSH 配置保存，重启后继续生效。关闭 MCP 会结束外部接入；已经交给 DSH 的任务继续执行，取消任务则使用单独的取消操作。

原有体验继续保留：启动预加载、切换面板时保留页面、明暗主题适配、中英文界面、刷新、外部浏览器打开，以及 Desktop 登录保持的检查、应用和恢复。

## 安装 2.0.1-test.4 测试分支

在 DSH「插件 → 添加插件」的「包名或地址」中输入：

```text
github:Tests4gptplay/dsh-dots#2.0.1-test.4
```

本页对应 `2.0.1-test.4` 测试分支。正式发行版本和安装包见 [Releases](https://github.com/Tests4gptplay/dsh-dots/releases)。

安装后，从侧栏打开 **DSH Dots**，在 ChatGPT 官方页面登录。登录保持与 MCP 均在 **DSH → 设置 → Dots** 中管理。

## 2.0.1-test.4：持续事件订阅

新增 `dsh_api_subscribe`：直接将 DSH 原生流式 API 的每个事件通过 MCP 请求进度通知持续传递给客户端。支持原生流结束和客户端取消；`dsh_api_snapshot` 继续提供单次快照。客户端使用 MCP `progressToken` 接收事件，调用中不另设任务时限、事件数量上限或风险审核。

## 连接自己的 Dot

1. **开启 MCP。** 在「设置 → Dots」打开 MCP，点击「检查本地连接」。
2. **创建官方 Tunnel。** 打开页面中的 [Tunnel 设置](https://platform.openai.com/settings/organization/tunnels)。名称填 `DSH-Dots`，描述填 `Connect ChatGPT Dot to DeepSeek Harness`，选择自己的组织与工作区。本指南的个人连接方式保持 **Restrict client network access** 未勾选；有组织网络策略时按管理员配置。创建后复制完整 Tunnel ID，并在 [Runtime API Keys](https://platform.openai.com/settings/organization/api-keys) 准备运行密钥。
3. **在插件里完成本地连接。** 在 **OpenAI Secure MCP Tunnel** 区域确认默认安装目录，或选择自己的位置；点击 **下载并安装官方客户端**。已有客户端可直接填写可执行文件完整路径。填入 Tunnel ID 与 Runtime API Key，点击 **启动隧道**，再点击 **刷新隧道状态**。本地 MCP 地址自动填入官方客户端配置，无需复制命令或保持 PowerShell 窗口。安装位置和 Tunnel ID 会保存；运行密钥仅保留在本次 DSH 运行中。

**客户端更新：** 每次点击下载，都会从 OpenAI 官方 GitHub Releases 查询最新发行版、核对 SHA-256 后安装。插件内不包含隧道客户端二进制；安装目录只保留当前版本及一份上一版。若上一版仍在运行，会在停止后清理更早的版本。
4. **在 ChatGPT 注册和安装。** 网页版 [Plugins](https://chatgpt.com/plugins) → **＋ / Add → Add custom MCP server**，Connection 选择 **Tunnel** 并填写完整 Tunnel ID，Authentication 选择 **No authentication**；确认官方提示后点击 **Create as a plugin**，在个人 Plugins 中安装。然后到 Dot 的 **Customize → Plugins** 启用连接。
5. **做一次实际调用。** 让 Dot 调用 `dsh_status` 并列出会话；返回 DSH 点击「刷新状态」，核对最近一次工具调用。

使用已有 HTTPS 转发时，可直接填写上方转发地址并在 ChatGPT 选择 **Server URL**，无须运行隧道。MCP 完整地址中带有访问密钥；截图或反馈日志时隐藏该地址。

[本版更新与验证](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.4/docs/releases/v2.0.1-test.4.md) · [官方隧道指南](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) · [官方 MCP 注册指南](https://help.openai.com/zh-hans-cn/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)

## 日常使用

连接完成后，可以让 Dot「在指定工作区读取数据，整理成报告并保存」，也可以在同一会话中追加要求、查看执行结果或取消任务。可用工具由这台 DSH 的配置决定。

在 DSH 内嵌页面或手机 ChatGPT 中使用 Dot，都可以通过已配置的远程连接访问同一台 DSH；远程使用时，保持电脑上的 DSH 和隧道或 HTTPS 服务运行。

## 更新与反馈

实机截图、原生环境验证和两轮文件任务实验，集中在 [2.0.0 更新记录](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.0/docs/releases/v2.0.0.md)。其他版本见 [更新记录索引](CHANGELOG.md)。

遇到问题可在 [Issues](https://github.com/Tests4gptplay/dsh-dots/issues) 提交 DSH 版本、系统和错误提示；连接密钥请从截图与日志中移除。

## 支持项目

感谢支持 DSH Dots 的开发与维护。[捐赠与赞助](SPONSOR.md) · [Ko-fi](https://ko-fi.com/kou392350) · [支付宝](SPONSOR.md#alipay--支付宝)
