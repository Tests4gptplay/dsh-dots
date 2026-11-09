# DSH Dots

> **1.0.12-review.2 审查候选** · [更新记录](CHANGELOG.md) · [验收与范围](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/ACCEPTANCE.md)。


## 在 DSH 中使用 Dots

桌面版在 DSH 内打开 ChatGPT Dots 官方网页，并在启动时预加载。切到其他 DSH 面板再回来，仍显示原来的网页与页面状态；需要重新加载时使用刷新按钮。

全幅页面、工具栏和圆环图标随 DSH 明暗主题变化，网页内部主题由 ChatGPT 管理。Web 版可在页面内打开 Dots；网站限制嵌入时可直接使用“在浏览器中打开”。禁用插件或退出 DSH 会释放对应网页。

登录在官方网页中完成，浏览器分区由 DSH Desktop 管理。

### 登录状态与 DSH Desktop

DSH 的内嵌浏览器页面在同一次运行期间复用。需要跨重启保留登录时，可在 DSH「设置 → Dots 登录保持」中对 Dots 专属浏览器分区应用持久化修复；正常登录过程仍在 ChatGPT 官方网页完成。

在 DeepSeek Harness 原生页面中打开 [ChatGPT Dots](https://chatgpt.com/dots/home)，配备随 DSH 主题变化的工具栏、刷新和外部浏览器打开入口。

[English](README.en.md)

## 功能

- **启动预加载**：DSH Desktop 加载插件后，在后台打开 Dots。
- **切换即用**：切换到聊天或其他页面时保留同一个网页，返回 Dots 时直接显示已有页面与状态。
- **手动刷新**：点击刷新按钮时重新加载网页；禁用插件或退出 DSH 时释放网页。
- **登录态保持（Desktop）**：在设置页检查、应用或恢复 Dots 专属浏览器分区的持久化修复。
- **原生外观**：全幅内容区、中英文界面，工具栏和圆环图标随 DSH 明暗主题变化。网页内部使用 ChatGPT 自身的主题设置。

桌面版和 Web 版均可从 DSH 进入 Dots；若网站限制页面内显示，可点击「在浏览器打开」。

当前审查候选为 **1.0.12-review.2**；公开正式版本仍为 **1.0.11**。

## 安装与升级

下面是已公开正式版 **1.0.11** 的安装方法。审查候选 **1.0.12-review.2** 请使用本次交付的 `.tgz` 文件安装。

**首次安装（Desktop）：** 打开侧栏 **插件 → 添加插件**（箭头菜单的 **安装第三方插件** 也可进入），把下面一整行填入 **包名或地址**，点击 **安装**，核对版本后点击 **立即启用**。

```text
github:Tests4gptplay/dsh-dots#v1.0.11
```

**npm 安装：** 也可在 **包名或地址** 中填入 `@tests4gptplay/dsh-dots@1.0.11`。

**升级已有插件：** 同样填写上面的新版来源，成功后核对版本并启用；已有设置与用户文件保留。若宿主提示已安装或要求先卸载，再按提示仅卸载该插件条目并安装新版，不清除 DSH 数据或手工删除插件目录。是否需要重启以 DSH 提示为准；需要时完全退出并重新打开（Desktop 包括托盘）。

启用后从侧栏进入 Dots。候选版新增「设置 → Dots 登录保持」入口，由用户点击按钮应用或恢复修复。

**备用安装包：** 将下面的 `.tgz` 直链填入同一个 **包名或地址**；也可下载后填写文件的完整绝对路径，无需解压。该路径应属于运行 DSH 的电脑。

```text
https://github.com/Tests4gptplay/dsh-dots/releases/download/v1.0.11/dsh-dots-1.0.11.tgz
```

**Web：** 在运行服务的环境中执行。升级前停止对应 Web profile，成功后重新启动；Web 与 Desktop 分别安装。

```sh
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v1.0.11'
```

备用时将命令中的来源换成上面的 `.tgz` 直链或下载文件的完整绝对路径。

## Desktop 登录态保持

在 DSH「设置 → Dots 登录保持」中可直接查看当前状态，并选择「一键应用」或「恢复原版」。操作会修改 DSH Desktop `resources/app.asar` 中 Dots 专属浏览器的分区分配逻辑，将其改为 `persist:dsh-dots-personal-browser`，其他工作区仍使用原有分区策略。

应用前保存当前版本的原始归档备份，并在写入后核对文件。修复完成后完全退出并重新启动 DSH，随后在 Dots 官方网页登录一次即可使用浏览器原生持久化存储。DSH 更新覆盖安装文件后，可重新检查并应用；恢复按钮会选用与当前修改版本对应的原版备份。

平台适配及实机验收记录集中在 [本次 Release 说明](https://github.com/Tests4gptplay/dsh-dots/releases)；旧版 Windows 修复脚本继续保留在源码中。

## 开发者资料

[源码与技术说明](https://github.com/Tests4gptplay/dsh-dots/tree/f3bc47068bfc52565b573a48549e90d49590880f)面向开发者；普通用户无需编译。

[更新记录](CHANGELOG.md) · [问题反馈](https://github.com/Tests4gptplay/dsh-dots/issues) · [MIT 许可](LICENSE)

DSH Dots 是第三方插件；ChatGPT Dots 由 OpenAI 提供，账号登录及服务访问条件由官方网站管理。

## 兼容性与验收

Windows、Linux 与 macOS 共用同一浏览器分区修改逻辑；具体安装包写入权限、macOS 签名和 Linux AppImage 封装依照实际系统处理。当前候选的测试环境、代码断言、ASAR 写入与恢复证据，以及各平台实机覆盖范围，见 [候选 Release 说明](https://github.com/Tests4gptplay/dsh-dots/releases)。

## 支持项目 / Support

[GitHub Sponsors](https://github.com/sponsors/Tests4gptplay) · [Ko-fi](https://ko-fi.com/kou392350) · [支付宝 / Alipay](https://github.com/Tests4gptplay/dsh-dots/blob/main/SPONSOR.md)


此前 Windows 页面切换、正常重启及既有登录测试范围见[验收](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/ACCEPTANCE.md)。


[查验具体用例、实际结果与公开净化证据](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/EVIDENCE.md)。
