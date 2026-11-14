# 更新记录

## 2.0.1-test.10（测试分支）

针对“隧道已启用但未运行”，将 MCP 就绪时的 Tunnel 自动恢复改为一次性延后 1.5 秒启动。已排队的启动会在插件卸载时取消；启动执行一次后不保留任何定时器，也没有后台轮询或重试循环。保留 2.0.0 已确认的界面和所有功能。

[测试版说明](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.10/docs/releases/v2.0.1-test.10.md)

## 2.0.0（正式版，2026-11-14）

正式发布 DSH Dots 2.0.0，集成 ChatGPT Dot 与 DSH 的双向 MCP 协作、17 个工具入口、请求内事件流与按指定 Session 的主动通知，提供 OpenAI Secure MCP Tunnel 的安装和连接管理。保留并采用测试版 2.0.1-test.9 验收通过的 UI 和运行逻辑：网页后退、点击 Dots 返回首页、统一设置页及底部可折叠配置指南、Tunnel 启停状态和运行密钥持久化。

Windows、Linux 各 142 项源码测试通过，Chromium 16 组组件布局检查通过，Linux 真实 DSH 0.2.2-rc.1 完成 31 项原生验收。正式版的安装包及发行记录见 [GitHub Releases](https://github.com/Tests4gptplay/dsh-dots/releases/tag/v2.0.0)。

[正式发行说明](https://github.com/Tests4gptplay/dsh-dots/blob/v2.0.0/docs/releases/v2.0.0.md)

## 2.0.1-test.9（2026-11-14）

保持 test.8 设置页视觉设计。Dots 主页面新增“后退”，点击顶部 Dots 圆环和文字返回 Dot 首页。原有五步接入说明移到 MCP、Tunnel、主动通知卡片之后，使用独立折叠卡片展示；中英文 README 顶部增加配置指南入口。

Tunnel Client 记住上次启动／停止选择，在 DSH 本地 MCP 服务就绪后自动恢复已启用的隧道。Runtime API Key 保存在当前 DSH 用户配置目录的独立权限受限凭据文件中，避免每次重新输入。

[本版安装与功能说明](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.9/docs/releases/v2.0.1-test.9.md)

## 2.0.1-test.8（2026-11-14）

调整 Dots 设置页的字号、卡片层级与控件对齐。MCP 开关、主动通知开关和事件勾选框统一为左侧控件、右侧标签；客户端目录与选择按钮并排，隧道安装与连接操作分组。长说明和诊断使用可展开区域，中英文及明暗主题采用统一布局。

[界面与验证记录](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.8/docs/releases/v2.0.1-test.8.md)

## 2.0.1-test.7（2026-11-11）

新增可选择的 **Dot 主动通知开关**。在 DSH「设置 → Dots」中独立启用，默认关闭；逐项选择明确的原生 Session ID 和「轮次结束／执行错误」事件类型。只有通过用户选择的范围并由 Dot 建立 MCP Events 订阅后，才发送官方签名 Webhook 通知。关闭开关清除订阅；更换 MCP 连接密钥也会撤销旧订阅。

使用 DSH 已有 `session/event` 与 `agent/error` 事件，不轮询任务；通知包含会话 ID 和状态，不上传完整会话内容。保留原有 17 个 MCP 工具、请求内进度流及 Tunnel Client 管理。

[功能说明与验收](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.7/docs/releases/v2.0.1-test.7.md)


## 2.0.1-test.6（2026-11-11）

- 修复 Dots 卸载资源清理：即使官方隧道进程停止失败，也继续注销设置接口、释放 MCP 监听与 DSH Peer，并返回实际清理错误。
- 轮换 MCP 连接密钥后，若官方隧道原本在运行，会使用新的本地 MCP 地址重新启动；原本停止的隧道维持停止。
- 健康检查调用实际运行中的客户端版本；客户端自行退出时完成已存在的旧安装版本清理，保留当前版和一份旧版。
- 根据 OpenAI MCP Events 官方说明，明确请求内 `notifications/progress` 流与 Dot 主动事件 Webhook 订阅的区别，不将两者测试结果混同。
- 保留原有 MCP 转发、工具行为、端口及下载逻辑；不增加定时轮询或内容审查。

[本版修复与验证](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.6/docs/releases/v2.0.1-test.6.md)


## 2.0.1-test.5（2026-11-11）

修复 MCP 停用与隧道清理之间的错误耦合：即使官方客户端停止失败，MCP 仍完成关闭状态保存并反馈真实清理错误，重启不会重新启用已关闭的 MCP。

官方 Tunnel Client 更新后，设置页明确提示正在运行的仍是旧客户端；点击「启动隧道」会切换到已经下载并选中的新客户端。保留旧版回退与清理规则，其他 MCP 工具、流订阅、端口策略不变。

[本版修复与验证](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.5/docs/releases/v2.0.1-test.5.md)

## 2.0.1-test.4（2026-11-11）

补齐 DSH 原生流式 API 的持续订阅：新增 `dsh_api_subscribe`，通过 MCP 官方请求进度通知连续转发完整事件；原生流结束或客户端停止请求时释放该订阅，`dsh_api_snapshot` 继续承担一次性快照。订阅不附加独立时限、事件数量配额或内容审核。

校准 MCP Tools 元数据：仅对确定的只读操作声明 `readOnlyHint: true`，对通用转发、会话创建和执行类工具省略无法从桥接层确定的危险性与网络范围标签；具体操作及权限仍按 DSH 原生行为执行。

[本版说明](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.4/docs/releases/v2.0.1-test.4.md)

## 2.0.1-test.3（2026-11-11）

官方 Tunnel Client 继续按每次点击从 OpenAI GitHub Releases 读取最新版本并核对 SHA-256。下载完成后只保留当前客户端与上一份可回退版本，清理更早的插件托管目录；正在运行的旧客户端在停止后清理。插件安装包仍只包含管理代码。

## 2.0.1-test.2（2026-11-11）

在 Dots 设置页管理 OpenAI 官方隧道客户端：官方下载与校验、默认或自选目录、已有客户端路径、Tunnel ID 与运行密钥、启动、停止和诊断。本地 MCP 地址自动接入，客户端进程状态与官方连接就绪状态分开展示；关闭 MCP 或卸载 Dots 时停止本插件启动的隧道。

完善 Tunnel 创建和 ChatGPT 注册引导。网页入口、登录保持和现有 MCP 工具保持原有行为。

[更新与验证](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.2/docs/releases/v2.0.1-test.2.md)

## 2.0.0（2026-11-09）

新增 MCP 连接，让 Dot 在对话中使用 DSH 的会话、工具和工作区：创建任务、追加指令、查看结果、取消执行，并读取文件与图片结果。

MCP 默认关闭，与登录保持统一放在「设置 → Dots」。同页提供连接地址、复制、本地检查、调用状态和官方接入指南；开关选择随 DSH 配置保存。保留原有网页预加载、切换保留、主题适配及 Desktop 登录保持。

改进原生参数与大文件请求的传递、带路径前缀的 HTTPS 接入，以及连接检查期间的开关操作。

进一步完善 MCP 开关与配置保存的状态反馈、图片附件回传和 Desktop 浏览器资源释放。连接检查结果随服务启停更新，图片数据通过 MCP 图片内容传输，保留原生附件信息。

根据新版 ChatGPT Plugins 界面更新中英文 MCP 注册与安装引导，覆盖连接创建、授权提示、个人插件安装和 Dot 侧调用。

[完整更新、实机截图与验证记录](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.0/docs/releases/v2.0.0.md) · [English release notes](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.0/docs/releases/v2.0.0.en.md)

## 1.0.12（2026-11-09）

在 DSH「设置 → Dots 登录保持」提供状态检查、一键应用和恢复原版；为 Dots 浏览器使用独立持久化分区。保留原版备份、升级后按需重新应用和退出后单次修复流程。

修复网页切换时的误销毁、设置页初始化时序、持久化状态误报与归档恢复异常；保持既有 `dsh-dots` 安装身份，并沿用独立 npm 包构建流程。

完整改动与测试记录见 `docs/releases/v1.0.12.md`。

## 1.0.11（2026-10-30）

修复安装包内的发行说明、验收记录和支持页面链接；现在解压安装包后也可正确打开。运行功能、设置和既有数据处理方式不变。

Repair release-note, acceptance and support links when reading the extracted installation package. Runtime behavior, settings and data handling are unchanged.

## 1.0.10（2026-10-30）

- Keep mock conversation views and diagnostics out of the production package.
- Refresh persistent toolbar and error text on locale changes without recreating the guest.
- Make guest disposal idempotent and improve localized error recovery.

33 cloud component/source-contract checks and production package whitelist passed. Existing Windows D-W1–4 evidence is adopted: page reuse, lifecycle/restart, existing-login retention, external opening, Chinese/English and 100% DPI light/dark coverage. This release does not claim new-login, macOS or other DPI validation. The optional host archive script was not executed; no credentials or host security policy changed.

## 1.0.9（2026-10-27）

- **启动预加载**：DSH Desktop 加载插件后即在后台打开 Dots。
- **切换保留**：切到聊天或其他页面时只隐藏网页，返回时显示同一个页面，不重新加载、不丢失状态；刷新按钮仍主动重载。
- **原生布局**：常驻页面放在 DSH 原生的中间内容列，不使用窗口外层悬浮载体。
- **皮肤兼容**：页面使用独立堆叠上下文，修复部分皮肤给插件面板叠加半透明毛玻璃层、导致页面发淡发糊的问题。
- **兜底**：常驻页面无法显示时自动退回页面内渲染，不留下空白面板。
- **登录态**：提供 Desktop 持久分区配套更新脚本，将 Dots 存储固定到 `persist:dsh-dots-personal-browser`；包含备份、头部偏移与完整性校验，其他网页仍使用原有分区策略。
- 禁用插件或退出 DSH 时释放网页；已应用配套更新的用户直接升级插件即可。

## 0.1.1（正式修复版，2026-10-26）

- 修复 DSH Desktop 的 pnpm 安装 ENOENT：清除本地 TGZ 自依赖，发行包增设 pnpm 安装回归测试。
- 扩大安装与运行环境兼容性：按宿主实际提供的 WebView 浏览器接口能力启用桌面载体，移除打包清单中不必要的 Node 引擎版本要求。保留 DSH 运行时依赖通配符。

- 修复 DSH Desktop 实机反馈：ChatGPT 登录网页只露出顶部一小条、剩余页面显示宿主背景。之前错误地将 Electron `<webview>` 的 `display:flex` 覆盖成 `display:block`，导致内部 Shadow iframe 无法撑满视口；现在恢复 `display:flex` 和尺寸约束。
- 主面板作为 DSH 原生 flex 子元素填满可用高度；窗口大小变化时 WebView 和网页视口跟随缩放，不另做独立浏览器卡片。
- 新增真实生产 Client CSS 的单元检查及 Chromium Shadow iframe 尺寸/缩放回归测试，防止再次出现顶部短条。
- 仅修正承载布局；不读取 ChatGPT Cookie/Token、不干预站点认证或绕过 DSH 的原生隔离，真正网页登录仍由用户在 DSH 实机确认。


## 0.1.0（正式 Release，2026-10-25）

- 改为 **DSH 原生全幅 Dots 页面**：背景、顶部工具栏、圆环及按钮跟随宿主皮肤，去掉重复的网页外框、说明段落与红色侧栏浏览器报错。
- DSH Desktop 直接使用宿主批准的 Electron WebView 租约加载官方 Dots 网页；不再依赖仅对会话右栏有效的 Browser 插件，修复“当前 DSH 浏览器不可用”。
- 桌面 Guest 由 DSH 原生主进程约束：不可用额外 Node/Electron 权限，禁止本插件读取 Cookies/Token；页面关闭释放自身 guest。
- DSH Web 保持全幅 iframe（网站允许时），并提供在浏览器中打开的可靠回退；跨域 Dot 内部皮肤由网站控制，不能强行覆盖。
- 修复打开浏览器时 `noopener` 返回 null 的误判；新增原生 WebView 建立/跳转/释放/失败与页面边框回归用例。
- Windows/Ubuntu CI 重新验证、Chrome 测试与严格预构建安装包白名单；以 **非 Pre-release** 的 GitHub Release 提供固定 Tag / TGZ。
- 实际 ChatGPT 登录、Dot 内容和 Cookies 持久性仍需用户在 DSH Desktop／Web 中实测确认；不以模拟回执代替。

## 0.1.0-alpha.1（预发布，2026-10-25）

- 首个 DSH 原生页面与侧边栏入口；圆环图标随主题变化。
- 官方 Dots 网页 iframe 入口与 DSH Browser 链接候选；该 Browser 链接后来被确认在独立主页面无法使用，已由正式版替换。
- 预编译 Host/Client、模拟 Dot 对话与错误处理用例。
