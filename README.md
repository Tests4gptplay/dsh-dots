# DSH Dots

[English](README.en.md)

面向 **DeepSeek Harness（DSH）** 的第三方 **ChatGPT Dots** 网页入口。默认中文、英文辅助。使用用户自己的 ChatGPT 网页登录，无需 API Key，不复刻 Dots 的记忆和云端任务。

- 独立的 DSH 主页面及侧边栏入口，图标是圆环，跟随浅色、深色和自定义皮肤使用 `currentColor`。
- 主页面尝试打开官方 `https://chatgpt.com/dots/home`。页面受官方网站 iframe 策略约束，**嵌入不保证成功**。
- 可一键打开 DSH 原生 Browser（Desktop 使用 Electron WebView；Web 使用 iframe）或在系统浏览器打开，避免把被阻止的嵌入冒充成功。
- 不收集 ChatGPT Cookies / Token，不通过 Codex App Server 伪造 Dot 访问权限。Dots 是否可用取决于账号资格和网站登录状态。
- 测试环境提供**明确标注的模拟 Dot**：输入框、回复、报错、皮肤和侧边栏均可回归测试；**模拟后端不在生产注入**。

> 本项目是非官方第三方插件，不隶属或代表 OpenAI。圆环图形按项目指定样式呈现。

## 安装

克隆仓库或下载源代码，使用 Node.js 22+：

```bash
npm run build
npm test
npm pack --ignore-scripts
```

构建产物 `lib/host.js` 与 `lib/client.js` 已收录在 Git 中以支持直接按 GitHub 源码安装。安装包只包含实际运行必需的文件。可在 DSH「插件」里从 GitHub 地址或本地 `.tgz` 安装；先在隔离 profile 验证，勿覆盖现有正式配置。

```text
github:Tests4gptplay/dsh-dots#main
```

## 兼容性与登录说明

使用 DSH 原生主页面 / 状态栏 Slot，**不主动按 DSH 版本号拒绝运行**，以宿主实际是否提供 Slot / Browser 能力为准。浏览器容器里的 ChatGPT 登录与 Codex app-server 的登录**不是相同的会话**；本插件不会读取 Codex 凭据。

DSH Desktop Browser 使用的 Cookie/Web Storage 可能不跨应用重启保留，需要实际安装验证；Web 环境 iframe 可能被 `frame-ancestors`/`X-Frame-Options` 等网站策略拒绝，此时请选择系统浏览器打开。**插件没有能力通过包装网页消除浏览器的安全限制，也没有公开的 Dots 专属 API。**

## 测试案例

详见 [docs/TEST-CASES.md](docs/TEST-CASES.md)。`npm test` 运行源码与原生 DSH 插件 Slot 的模拟加载/交互测试；`tests/browser` 可使用 Chromium 与 Playwright 在独立测试页里输入消息，让本地假后端模拟 Dot 回复和错误。截图只代表**模拟用例**，不代表在真正的 ChatGPT Dots 网页完成登录。

## 图标

`assets/dots-ring.svg` 用作插件管理器图标；侧边栏使用 React 内联 SVG `currentColor`，随 DSH 主题渲染。用户后续提供自定义图时再单独替换资产，不自动生成或改变原图。
