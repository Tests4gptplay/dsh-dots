# DSH Dots 2.0.1-test.1

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

## 安装 2.0.0 分支

在 DSH「插件 → 添加插件」的「包名或地址」中输入：

```text
github:Tests4gptplay/dsh-dots#2.0.1-test.1
```

本页对应 `2.0.1-test.1` 测试分支。正式发行版本和安装包见 [Releases](https://github.com/Tests4gptplay/dsh-dots/releases)。

安装后，从侧栏打开 **DSH Dots**，在 ChatGPT 官方页面登录。登录保持与 MCP 均在 **DSH → 设置 → Dots** 中管理。

## 连接自己的 Dot

1. **启用服务。** 打开 MCP 开关，点击「检查本地连接」，复制设置页提供的本机 MCP 地址。
2. **接通访问。** 按 [官方 Secure MCP Tunnel 指南](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) 将隧道目标设为该地址；或使用已有 HTTPS 转发，保留完整 MCP 路径，在设置页保存转发域名并复制生成的注册地址。
3. **在 ChatGPT 创建 MCP 连接。** 在网页版 [Plugins](https://chatgpt.com/plugins) 选择 **＋ / Add → Add custom MCP server**，输入名称，在 **Connection** 选择完整 HTTPS MCP 地址或 **Tunnel**。本插件的访问密钥位于完整连接地址中，因此 **Authentication** 选 **No authentication**；阅读官方提示并勾选 **I understand and want to continue**，点击 **Create as a plugin**。[官方注册指南](https://help.openai.com/zh-hans-cn/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
4. **安装并交给 Dot 使用。** 在个人 **Plugins** 列表找到刚创建的连接，点击 **＋ 安装**。可以先在 ChatGPT 聊天中用 `@` 选择插件查询 DSH 状态，再打开 Dot 的 **Customize → Plugins** 确认该共享连接可用。[Dot 插件官方指南](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot)

连接地址带有当前 DSH 的访问权限，请仅交给获授权的客户端。需要更换访问凭据时，可在设置页更新连接密钥。ChatGPT 账户与工作区的可用选项以官方注册页面为准。

## 日常使用

连接完成后，可以让 Dot「在指定工作区读取数据，整理成报告并保存」，也可以在同一会话中追加要求、查看执行结果或取消任务。可用工具由这台 DSH 的配置决定。

在 DSH 内嵌页面或手机 ChatGPT 中使用 Dot，都可以通过已配置的远程连接访问同一台 DSH；远程使用时，保持电脑上的 DSH 和隧道或 HTTPS 服务运行。

## 更新与反馈

实机截图、原生环境验证和两轮文件任务实验，集中在 [2.0.0 更新记录](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.0/docs/releases/v2.0.0.md)。其他版本见 [更新记录索引](CHANGELOG.md)。

遇到问题可在 [Issues](https://github.com/Tests4gptplay/dsh-dots/issues) 提交 DSH 版本、系统和错误提示；连接密钥请从截图与日志中移除。

## 支持项目

感谢支持 DSH Dots 的开发与维护。[捐赠与赞助](SPONSOR.md) · [Ko-fi](https://ko-fi.com/kou392350) · [支付宝](SPONSOR.md#alipay--支付宝)
