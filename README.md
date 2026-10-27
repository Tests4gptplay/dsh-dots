# DSH Dots

在 DeepSeek Harness 原生页面中打开 [ChatGPT Dots](https://chatgpt.com/dots/home)，配备随 DSH 主题变化的工具栏、刷新和外部浏览器打开入口。

[English](README.en.md)

## 功能

- **启动预加载**：DSH Desktop 加载插件后，在后台打开 Dots。
- **切换即用**：切换到聊天或其他页面时保留同一个网页，返回 Dots 时直接显示已有页面与状态。
- **手动刷新**：点击刷新按钮时重新加载网页；禁用插件或退出 DSH 时释放网页。
- **登录态复用**：使用宿主管理的浏览器分区；配套 Desktop 持久化更新将 Dots 存储保存在固定分区中。
- **原生外观**：全幅内容区、中英文界面，工具栏和圆环图标随 DSH 明暗主题变化。网页内部使用 ChatGPT 自身的主题设置。

Desktop 通过宿主的 Electron WebView 加载网页。Web 版使用 iframe 嵌入；站点限制嵌入时，可点击「在浏览器打开」。

## 安装与升级

**DSH Desktop**：打开「插件 → 添加插件」，粘贴固定版本来源并安装、启用：

```text
github:Tests4gptplay/dsh-dots#v1.0.5
```

**DSH Web**：

```sh
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v1.0.5'
```

[正式版本](https://github.com/Tests4gptplay/dsh-dots/releases/tag/v1.0.5) · [预打包安装包](https://github.com/Tests4gptplay/dsh-dots/releases/download/v1.0.5/dsh-dots-1.0.5.tgz)

安装包已包含 Host/Client 运行文件。升级后重启 DSH，加载新的后台预加载功能；已有设置和浏览器数据继续保留。

## Desktop 登录态持久化

后台预加载由插件直接提供。跨重启的登录态存储由 Desktop 主进程管理，本版同时提供 **Windows DSH 0.2.1-rc.3** 的配套更新脚本。

需要启用持久分区时，下载并解压安装包，完全退出 Desktop（包括托盘），使用 Python 运行：

```sh
python scripts/enable-desktop-persistence.py "<DSH 安装目录>/resources/app.asar"
```

脚本先保存原始宿主备份，再将 Dots 的分区调整为 `persist:dsh-dots-personal-browser`；其他网页的分区策略及宿主授权、隔离和导航规则保持原样。重新启动 DSH 后，在新分区登录一次，后续启动复用其网站存储，登录有效期由网站管理。

已经应用此配套更新的用户，升级到 1.0.5 时直接安装插件并重启即可。Desktop 应用升级后，依据新版宿主的存储支持情况使用配套更新。备份文件保存在原 `app.asar` 旁，后缀为 `.before-dots-1.0.4`；需要还原时，退出 Desktop 后用备份替换 `app.asar`。

## 开发

```sh
npm run build
npm test
npm run pack:check
```

[更新记录](CHANGELOG.md) · [问题反馈](https://github.com/Tests4gptplay/dsh-dots/issues) · [MIT 许可](LICENSE)

DSH Dots 是第三方插件；ChatGPT Dots 由 OpenAI 提供，账号登录及服务访问条件由官方网站管理。
