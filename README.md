# DSH Dots

> **1.0.11** · [更新记录](CHANGELOG.md) · [验收与范围](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/ACCEPTANCE.md)。


## 在 DSH 中使用 Dots

桌面版在 DSH 内打开 ChatGPT Dots 官方网页，并在启动时预加载。切到其他 DSH 面板再回来，仍显示原来的网页与页面状态；需要重新加载时使用刷新按钮。

全幅页面、工具栏和圆环图标随 DSH 明暗主题变化，网页内部主题由 ChatGPT 管理。Web 版可在页面内打开 Dots；网站限制嵌入时可直接使用“在浏览器中打开”。禁用插件或退出 DSH 会释放对应网页。

登录在官方网页中完成，浏览器分区由 DSH Desktop 管理。

### DSH 0.2.1-rc.5 登录态说明

升级至DSH 0.2.1-rc.5后，Dots内嵌页面可能需要在重新启动DSH后再次登录。当前宿主浏览器不提供跨重启登录态保存，原有额外持久化处理也可能在宿主升级时被覆盖；这不是Dots此次更新移除了登录保存功能。

切换DSH面板时保留同一个网页，属于同一进程内的页面复用，不等于退出并重启DSH后保存登录态。参见 [DSH rc.5 浏览器说明](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.5/packages/client/ui-sidebar-browser/README.md#known-limitations-and-deferred-work)。

在 DeepSeek Harness 原生页面中打开 [ChatGPT Dots](https://chatgpt.com/dots/home)，配备随 DSH 主题变化的工具栏、刷新和外部浏览器打开入口。

[English](README.en.md)

## 功能

- **启动预加载**：DSH Desktop 加载插件后，在后台打开 Dots。
- **切换即用**：切换到聊天或其他页面时保留同一个网页，返回 Dots 时直接显示已有页面与状态。
- **手动刷新**：点击刷新按钮时重新加载网页；禁用插件或退出 DSH 时释放网页。
- **登录态与宿主分区**：同一次 DSH 运行中复用网页；跨重启保存需宿主支持或单独的适用持久化处理，见下方说明。
- **原生外观**：全幅内容区、中英文界面，工具栏和圆环图标随 DSH 明暗主题变化。网页内部使用 ChatGPT 自身的主题设置。

桌面版和 Web 版均可从 DSH 进入 Dots；若网站限制页面内显示，可点击「在浏览器打开」。

当前版本为 **1.0.11**。首次安装请按下方步骤操作；升级请按下方步骤操作。

## 安装与升级

当前版本：**1.0.11**。安装包与固定标签均已包含运行文件，无需编译。

**首次安装（Desktop）：** 打开侧栏 **插件 → 添加插件**（箭头菜单的 **安装第三方插件** 也可进入），把下面一整行填入 **包名或地址**，点击 **安装**，核对版本后点击 **立即启用**。

```text
github:Tests4gptplay/dsh-dots#v1.0.11
```

**升级已有插件：** 同样填写上面的新版来源，成功后核对版本并启用；已有设置与用户文件保留。若宿主提示已安装或要求先卸载，再按提示仅卸载该插件条目并安装新版，不清除 DSH 数据或手工删除插件目录。是否需要重启以 DSH 提示为准；需要时完全退出并重新打开（Desktop 包括托盘）。

启用后从侧栏进入 Dots。跨重启登录态取决于网站和宿主分区；Windows 持久化配套是单独操作，不随插件安装自动应用，适用范围见下方说明。

**备用安装包：** 将下面的 `.tgz` 直链填入同一个 **包名或地址**；也可下载后填写文件的完整绝对路径，无需解压。该路径应属于运行 DSH 的电脑。

```text
https://github.com/Tests4gptplay/dsh-dots/releases/download/v1.0.11/dsh-dots-1.0.11.tgz
```

**Web：** 在运行服务的环境中执行。升级前停止对应 Web profile，成功后重新启动；Web 与 Desktop 分别安装。

```sh
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v1.0.11'
```

备用时将命令中的来源换成上面的 `.tgz` 直链或下载文件的完整绝对路径。

## Desktop 登录态持久化

以下配套工具会修改 Desktop 的 `app.asar`，不随插件安装自动应用；宿主升级可能覆盖这项修改。其旧版适用声明不代表未经修改的 rc.5 已提供跨重启登录保存。

后台预加载由插件直接提供。跨重启的登录态存储由 Desktop 主进程管理，本版同时提供为 **Windows DSH 0.2.1-rc.3** 编写的可选配套更新脚本。其他宿主版本不要直接套用此脚本。

需要启用持久分区时，下载并解压安装包，完全退出 Desktop（包括托盘），使用 Python 运行：

```sh
python scripts/enable-desktop-persistence.py "<DSH 安装目录>/resources/app.asar"
```

脚本先保存原始宿主备份，再将 Dots 的分区调整为 `persist:dsh-dots-personal-browser`；其他网页的分区策略及宿主授权、隔离和导航规则保持原样。重新启动 DSH 后，在新分区登录一次，后续启动复用其网站存储，登录有效期由网站管理。

已经应用此配套更新的用户，升级到 1.0.11 时按上面的插件升级步骤操作；配套脚本不必因插件升级重复应用。Desktop 应用升级后，依据新版宿主的存储支持情况使用配套更新。备份文件保存在原 `app.asar` 旁，后缀为 `.before-dots-1.0.4`；需要还原时，退出 Desktop 后用备份替换 `app.asar`。

## 开发者资料

[源码与技术说明](https://github.com/Tests4gptplay/dsh-dots/tree/f3bc47068bfc52565b573a48549e90d49590880f)面向开发者；普通用户无需编译。

[更新记录](CHANGELOG.md) · [问题反馈](https://github.com/Tests4gptplay/dsh-dots/issues) · [MIT 许可](LICENSE)

DSH Dots 是第三方插件；ChatGPT Dots 由 OpenAI 提供，账号登录及服务访问条件由官方网站管理。

## 兼容性与验收范围

本次更新修正安装包中的文档链接，插件功能与上一版本一致。Linux、Windows、macOS 必须分别在对应系统实际验证，Linux 结果不能代表另外两种系统通过。

可选归档修改脚本仅有 Windows DSH 0.2.1-rc.3 的使用声明，不是跨平台持久化方案；它不处理 macOS 代码签名，也不为修改后的宿主重新签名，不能对未核实的宿主执行。本插件不自动运行该脚本、不更改宿主授权/隔离/导航策略、不读取已有账户存储。Windows 已验证既有登录在正常重启后保留；新登录、macOS 和非100%缩放未据此宣称通过。

## 支持项目 / Support

[GitHub Sponsors](https://github.com/sponsors/Tests4gptplay) · [Ko-fi](https://ko-fi.com/kou392350) · [Patreon](https://www.patreon.com/cw/Kou848) · [爱发电 / Afdian](https://afdian.com/a/kkt_ifd1) · [支付宝 / Alipay](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/SPONSOR.md)


Windows 已验证网页切换保留、正常重启、既有登录保留及中英明暗主题（100%缩放）；范围见[验收](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/ACCEPTANCE.md)。


[查验具体用例、实际结果与公开净化证据](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/EVIDENCE.md)。
