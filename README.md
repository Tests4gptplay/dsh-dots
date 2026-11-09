# DSH Dots

在 DeepSeek Harness 内直接使用 [ChatGPT Dots](https://chatgpt.com/dots/home)，并通过 MCP 让真实 Dot 操作 DSH 的会话、工具和工作区。

桌面版启动时预加载 Dots，切换面板时保留网页与页面状态。工具栏与圆环图标随 DSH 明暗主题变化，支持中英文、刷新和在系统浏览器中打开。ChatGPT 账号在官方网页登录。

## 设置

在 **DSH → 设置 → Dots** 统一管理：

- **登录保持（Desktop）**：沿用 v1.0.12 的状态检查、一键应用及恢复功能。
- **MCP Server**：默认关闭，按需启用；选择保存在当前 DSH 配置中，重启后继续生效。
- **连接与引导**：服务状态、可复制的连接地址、本地检查、最近一次调用、工具清单，以及官方注册与隧道指南。

关闭 MCP 会停止外部接入，已经提交给 DSH 的会话任务继续由 DSH 管理。

## 让 Dot 连接 DSH

在设置页开启 MCP 并检查本地连接，然后选择接入方式：按 [官方 Secure MCP Tunnel 指南](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) 将隧道 HTTP 目标指向页面中的本机 MCP 地址；或将已有 HTTPS 转发指向本地端口，保留完整 MCP 路径，并保存对应的 HTTPS 地址。

按 [官方中文注册指南](https://help.openai.com/zh-hans-cn/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)，在 ChatGPT 网页的 **Plugins → + → Add custom MCP server** 选择隧道或填写 HTTPS MCP 地址。本服务以完整地址中的访问密钥授权连接，注册表单选择 **No authentication**。连接地址具有当前 DSH 环境的操作权限，应仅交给获授权的客户端；设置页可更新密钥撤销旧地址。

创建并安装连接后，在 [Dot 的插件配置](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot) 中启用它。先让 Dot 调用 `dsh_status` 并列出会话，再创建会话、下达任务，通过状态、事件和结果继续交互。账户与工作区权限以官方配置页面为准。

## MCP 能力

提供 16 个工具：环境与会话查询、创建会话、发送或追加指令、读取状态/事件/结果、取消、模型查询与选择，以及 DSH 原生 API 的发现、参数描述、调用、流式快照和原生工具调用。文件、命令、工作区及插件管理通过当前 DSH 已加载的原生能力执行，图片结果以 MCP 图片内容返回。

任务、会话记录、执行器和操作授权由 DSH 管理。桌面内嵌 Dot 与远程 Dot 使用同一套连接；远程使用时保持 DSH 与接入服务运行。

[项目主页](https://github.com/Tests4gptplay/dsh-dots) · [更新记录](https://github.com/Tests4gptplay/dsh-dots/releases) · [问题反馈](https://github.com/Tests4gptplay/dsh-dots/issues)
