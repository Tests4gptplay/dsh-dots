# DSH Dots 测试案例、证据和验收边界

截至 2026-10-25。**以下模拟用例不等于真实 ChatGPT Dots 登录，更不等于真实 DSH 安装。**

## 自动化测试

| 案例 | 输入/条件 | 必须观察到的结果 |
| --- | --- | --- |
| SLOT-01 | 真实编译好的 `lib/client.js` 注入模拟 DSH Slot 宿主 | 注册独立 `main` 与 `sidebar.panellist`，加载中文语言与样式 |
| ICON-02 | 模拟浅色/深色与 sidebar SVG | 同一原始圆环形状，`stroke=currentColor`，不依赖硬编码主题判断 |
| WEB-03 | 生产模式、无任何模拟 backend | iframe URL 仅为 `https://chatgpt.com/dots/home`，不出现“模拟 Dot” |
| BROWSER-04 | 点击“在 DSH 浏览器打开” | DSH Browser `openTab('browser',{params:{url}})` 收到确切 URL |
| FAIL-05 | DSH Browser 插件不可用 | 给出可见错误，支持系统浏览器，不假称已经登录 |
| LOCALE-06 | zh/en | 中文为主，英文 UI 有完整替代文案 |
| COMPAT-07 | Host peerDependencies | 不按 DSH RC 版本字符串硬拒绝 |
| DOT-08 | 输入“前台测试消息” | 本地替身返回标记“模拟 Dot 回复”，消息在页面内显示 |
| DOT-09 | 模拟后端报错再重试 | 可见错误、未假造成功、后续消息仍可正常回复 |
| DOT-10 | 测试模式切换为生产模式 | 测试后台消失，生产环境绝不使用模拟 Dot 回复 |
| SOURCE-11 | 真实 DSH 0.2.1-rc.3 源码 | 验证 Slot 注册、Browser Electron/iframe 分支、嵌入限制 |
| BROWSER-12 | Chromium、测试 UI 实际渲染 | 输入/发送/回复、故障恢复、主题切换、圆环均正确；无浏览器 JS 异常 |

开发隔离环境运行：

```bash
DSH_SOURCE_DIR=/path/to/deepseek-harness-dsh-v0.2.1-rc.3 npm test
npm run test:browser  # 有 Chromium 和 Python Playwright 的环境
npm pack --dry-run --ignore-scripts
```

浏览器截图示例：[浅色](screenshots/mock-dot-light.png) · [深色](screenshots/mock-dot-dark.png)。截图中会明确显示“模拟 Dot · 仅供测试”，**不得用这些截图声称真实 Dot 已联网或登录成功**。

## 需实际 DSH / ChatGPT 登录验收的项目

1. 在隔离的 DSH Web profile 中安装 GitHub/TGZ 插件，确认 sidebar 按钮、主页面加载、中文英文和浅深色主题都与原生 DSH 一致。
2. 在 DSH Desktop 中点击“在 DSH 浏览器打开”并检查 WebView 能否访问 `https://chatgpt.com/dots/home`、交互/登录、网页权限与 Cookie 重启保存行为。
3. 在 Web profile 里确认 ChatGPT 页面允许/拒绝 iframe 的真实结果；若拒绝，点击系统浏览器后仍可使用真实 Dot。不能使用非官方 API 绕过网站限制。
4. 真实账户授权登录后，应在同一浏览器容器出现**该用户自己有权限的 Dot**；若浏览器拒绝 cookie/第三方登录，要原样报告，不能用模拟数据替代。
5. 安装和关闭后不得产生后台常驻任务、定时 AI 请求、读取 ChatGPT Token、复写用户 Workspace 数据、破坏其他 DSH 插件。

### DSH 实际环境注意

用户提供了 DSH 0.2.1-rc.3 官方源码归档，已用于对照 Slot/Browser 的真实接口；此处仅静态核验源码，**在隔离环境未安装其完整工作区依赖时不能自称启动了 DSH Host**。Windows `.exe` 安装包无法在 Linux 测试容器里直接运行。

## 统一安装与发行检查（参照 Kujira）

- `npm run build` 后的 `lib/host.js` / `lib/client.js` 与 Git 提交一致，不靠用户安装时触发构建。
- `npm run pack:check` 检查包内完整运行白名单：Host、Client、双语插件元数据、SVG、patch、README、LICENSE、CHANGELOG；**排除**源码、测试、模拟后台、Chromium 截图、CI 脚本。
- 在插件管理器识别 `locale/zh.json` 的中文名称和简介，选英文时显示 `locale/en.json`；两份 `meta.title` / `meta.description` 实际能被安装器读取。
- 正式预发布 `#v0.1.0-alpha.1` 已由 Release 工作流创建并附上预编译 TGZ；`#main` 仅用于未发布的后续开发测试。真实 DSH Desktop 登录仍待实机核验。
- Release 文件名与 `package.json` 一致（`dsh-dots-0.1.0-alpha.1.tgz`），标签内提交包含已编译运行文件，Git 标记与 TGZ 校验一致。
- Desktop：插件管理器安装、启用和重启；Web：`dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v0.1.0-alpha.1'`（Tag 发布后）。
- 旧版升级只处理 Dots 包；不删除其他插件、整个 Profile、用户 ChatGPT Cookies。兼容性按能力和宿主实际报错，不锁 DSH RC 字符串。
- 通过手动触发或明确更新 `docs/releases/v*.md` 启动 `Publish prerelease`；普通源码推送和 PR 不会自动创建 Release，已存在的固定版本不可静默覆盖。
