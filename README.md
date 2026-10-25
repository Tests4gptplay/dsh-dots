# DSH Dots

[English](README.en.md)

**通过 DeepSeek Harness（DSH）打开真正的 ChatGPT Dots 网页。** 使用你自己的 ChatGPT 网页登录，不需要 API Key，不重做 Dots 的长期记忆和云端任务。中文为主页，英文作为辅助。

- DSH 原生主页面与侧边栏入口，圆环图标根据浅色、深色和自定义皮肤自动适配。
- 访问官方 [Dots 网页](https://chatgpt.com/dots/home)；支持在 DSH Browser、系统浏览器中打开。
- 页内嵌入仅尽力尝试，实际能否加载、登录取决于 ChatGPT 网站策略和浏览器功能。
- 不收集 ChatGPT Cookie、Token，也不借用 Codex App Server 凭据登录网页。
- 测试框架有明确标注的 **Mock Dot** 对话、错误与恢复案例，**不会打入生产包或在真实用户页面模拟 Dot**。

**非官方第三方插件，不隶属或代表 OpenAI。**

## 安装与升级

安装标准与 [Kujira](https://github.com/Tests4gptplay/dsh-kujira-persona) 相同：**固定 GitHub 版本 Tag、仓库自带已编译运行文件、GitHub Release 提供备用 `.tgz`、Desktop 和 Web 分别安装**。用户安装不需要克隆源码、不需要 npm 编译、不需要 npm 账号。

### ① DSH Desktop

打开 **插件 → 添加插件**，打开 **插件 → 添加插件**，输入以下已经发布的固定版本：

```text
github:Tests4gptplay/dsh-dots#v0.1.0-alpha.1
```

**已发布 [v0.1.0-alpha.1 预发布版本](https://github.com/Tests4gptplay/dsh-dots/releases/tag/v0.1.0-alpha.1)**，并附有可直接安装的同版本 TGZ。开发测试仍可使用最新的 `main` 分支：

```text
github:Tests4gptplay/dsh-dots#main
```

安装并启用后，完整退出并重启 DSH 一次，再从侧边栏打开 **DSH Dots**。已有旧版要升级时，参照 Kujira 的操作：先通过 DSH 插件列表卸载旧包，再安装目标版本、启用并重启。**不删除整个 DSH profile、其他插件或浏览器登录数据。** DSH Desktop 与 Web 是两个安装环境，不会自动替对方安装。

### ② DSH Web（CLI）

正式版本 Tag 发布后，使用：

```bash
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v0.1.0-alpha.1'
```

仅在验证最新开发代码时使用：

```bash
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#main'
```

### ③ 备用 TGZ 安装包

每个实际发布的版本在 [GitHub Releases](https://github.com/Tests4gptplay/dsh-dots/releases) 提供同版本命名的 `dsh-dots-0.1.0-alpha.1.tgz` 备用安装包，安装方式和 Kujira 一致。已发布的备用安装包：[dsh-dots-0.1.0-alpha.1.tgz](https://github.com/Tests4gptplay/dsh-dots/releases/download/v0.1.0-alpha.1/dsh-dots-0.1.0-alpha.1.tgz)。在 GitHub Desktop/Web 安装失败时，可改用这个同版本文件。

### Windows 安装错误

如遇 DSH 插件目录重命名 `EPERM`，先退出 DSH（包括托盘），确认只有 **dsh-dots** 失败安装的临时目录，再清理该插件的残留并重新安装。切勿清空所有 `node_modules`、整个 profile、用户其他插件或浏览器会话。不应因插件升级要求用户清除 ChatGPT Cookies。

## 使用与兼容

在 DSH Dots 页面选择「在 DSH 浏览器打开」，或「在系统浏览器打开」，在 ChatGPT 官方网站完成登录。**DSH 里的网页登录会话不同于 Codex app-server 的登录状态**。当前 DSH Desktop Browser 的 WebView Cookie 不保证跨应用重启保存；Web profile 的 iframe 也可能遭网站 `frame-ancestors` / `X-Frame-Options` 限制。遇到网页安全策略阻止时保留官方页面入口，不自行绕过。

插件对 DSH 采用**实际能力检测**，不按固定 RC 版本字符串拒绝运行。如果宿主缺少 DSH Browser 或网页嵌入被拦截，页面应告知原因并提供在系统浏览器打开的退路。安装时的兼容性与权限错误由 DSH 宿主报告，插件不伪装登录成功。

## 开发、构建及验收

仅贡献者需要 Node.js 22+，运行：

```bash
npm run build
npm test
npm run pack:check
npm pack --ignore-scripts
```

`lib/host.js`、`lib/client.js` 已提交入库。`pack:check` **严格校验**运行包内容、图标、导出入口和中英文插件管理器元数据；源码、测试、截图和模拟后台仅保留在开发仓库，不进入用户安装包。发布者可从 GitHub Actions 手动启动「Publish prerelease」，或通过明确更新 `docs/releases/v*.md` 版本说明触发一次固定版本发行。流程将验证源码、安装包并创建 Tag 和 Release TGZ；**普通源码推送不会自动发布**。

测试明细见 [测试案例](docs/TEST-CASES.md)，版本变化见 [更新记录](CHANGELOG.md)。[模拟浅色](docs/screenshots/mock-dot-light.png) / [模拟深色](docs/screenshots/mock-dot-dark.png) 截图仅证明模拟对话的浏览器渲染，不代表真实 DSH 中的登录成功。

## 图标

默认使用项目确认的圆环图形 `assets/dots-ring.svg`。状态栏通过 `currentColor` 跟随 DSH 浅色／深色主题。用户另行提供图片之后再考虑改成自定义图标。
