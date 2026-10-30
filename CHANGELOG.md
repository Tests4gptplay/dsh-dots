# 更新记录

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
