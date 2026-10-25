# DSH Dots

[English](README.en.md)

**在 DeepSeek Harness（DSH）原生页面中打开真正的 ChatGPT Dots。** 默认中文、英文辅助，无需 API Key，不复制或模拟 Dot 的记忆、任务和账号数据。

## 界面与使用

- 页面外壳、顶部工具栏、背景和状态栏圆环跟随 DSH 明暗主题及其 CSS 色板。**没有额外的大型浏览器外框**，内容区直接占满剩余空间。
- **DSH Desktop**：使用 DSH Electron 自身批准的 Browser WebView guest（独立租约、隔离分区和宿主导航限制），直接加载 `https://chatgpt.com/dots/home`，不再调用会话右侧栏 Browser，因此没有“当前 DSH 浏览器不可用”的错误。
- **DSH Web**：原生页面仍可尝试 iframe；ChatGPT 网站可能禁止跨域嵌入，此时用右上角「在浏览器打开」进入官方网页，不以空白嵌入冒充成功。
- Dot 网页**内部**的配色、导航与内容仍由 ChatGPT 官方网站管理。DSH 主题只能控制外壳，无法通过跨域 CSS 强制重绘 Dot 内页；用户可使用 ChatGPT 自带主题设置。
- 顶部只有「Dots」圆环标识、刷新和外部打开入口，没有重复的浏览器地址栏、功能介绍、外框或多余提示。
- v0.1.1 修复 Electron WebView 仅显示顶部一小条的样式问题，网页登录在浏览器容器中进行，不读取、记录或转移 ChatGPT Cookies／Token。DSH WebView 的认证分区由 DSH 宿主管理，Cookie 可能在重启后失效；与 Codex app-server 登录状态相互独立。

**非官方第三方插件，不隶属或代表 OpenAI。** 受官方网站登录、账号资格和安全策略约束；未使用非官方 Dots API。

## 安装与升级

与 [Kujira](https://github.com/Tests4gptplay/dsh-kujira-persona) 相同，提供**固定 Git Tag + GitHub Release 的预编译 `.tgz`**，用户不需要本地编译或 npm 账号。

**DSH Desktop**：「插件 → 添加插件」，使用当前正式发行版：

```text
github:Tests4gptplay/dsh-dots#v0.1.1
```

**DSH Web**（另一个独立 Profile）：

```bash
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v0.1.1'
```

[正式版本 / 下载](https://github.com/Tests4gptplay/dsh-dots/releases/latest) · [固定 TGZ 下载](https://github.com/Tests4gptplay/dsh-dots/releases/download/v0.1.1/dsh-dots-0.1.1.tgz)

升级时仅通过 DSH 插件管理器卸载旧 `dsh-dots`，安装本版本并重启 DSH；不删除 DSH Profile、其他插件、用户记忆或浏览器分区。安装失败显示原始宿主错误；不要盲目清空 `node_modules` 或更改 DSH 版本。

## 兼容性和测试边界

- 与 DSH 的兼容性按实际功能接口判断；**不按固定版本号拒绝安装/运行**。官方 `@deepseek-ai/*` 模块以 `peerDependencies: "*"` 使用宿主版本。
- 开发使用 DSH `0.2.1-rc.3` 源码检查 Slot、Desktop WebView guest lease 与主进程安全限制。Windows / Ubuntu CI 进行测试及实际安装包白名单验证。
- 模拟 Dot 可执行输入、回复、异常恢复仅供开发测试；**模拟后台、测试源码及截图不进入发行 TGZ**。
- **真实网页登录是否成功、第三方网站是否允许 Web 版嵌入、Cookie 是否跨重启保留需要实际 DSH Desktop／Web 实机检查。** 构建通过或模拟测试通过并不能证明真实 ChatGPT 登录成功。

开发者验证：

```bash
npm run build
npm test
npm run test:browser  # 具备 Chromium + Python Playwright 的环境
npm run pack:check
npm pack --ignore-scripts
```

详细案例见 [测试用例](docs/TEST-CASES.md)，历史版本见 [更新记录](CHANGELOG.md)。插件管理器中英文信息分别为 `locale/zh.json`、`locale/en.json`；状态栏 SVG 使用 `currentColor` 直接跟随 DSH 皮肤。
