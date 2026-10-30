# dsh-dots v1.0.11

## 用户可见变化

修复安装包内的发行说明、验收记录和支持页面链接；现在解压安装包后也可正确打开。运行功能、设置和既有数据处理方式不变。

在 DSH 内打开 ChatGPT Dots，保留 Desktop 预加载、面板切换时的网页状态、刷新/外部浏览器入口、中英文主题适配，以及单独应用的 Windows 登录态持久化配套脚本。

## What changed

Repair release-note, acceptance and support links when reading the extracted installation package. Runtime behavior, settings and data handling are unchanged.

## DSH 0.2.1-rc.5 登录态说明 / Sign-in state

升级至DSH 0.2.1-rc.5后，Dots内嵌页面可能需要在重新启动DSH后再次登录。当前宿主浏览器不提供跨重启登录态保存，原有额外持久化处理也可能在宿主升级时被覆盖；这不是Dots此次更新移除了登录保存功能。

切换DSH面板时保留同一个网页，属于同一进程内的页面复用，不等于退出并重启DSH后保存登录态。参见 [DSH rc.5 浏览器说明](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.5/packages/client/ui-sidebar-browser/README.md#known-limitations-and-deferred-work)。

After upgrading to DSH 0.2.1-rc.5, you may need to sign in again in the embedded Dots page after restarting DSH. The current host browser does not preserve sign-in state across application restarts, and a host upgrade may overwrite an additional persistence modification previously applied. This Dots update did not remove a sign-in-saving feature.

Keeping the same page while switching DSH panels is page reuse within one process, not sign-in persistence after quitting and restarting DSH. See the [DSH rc.5 browser documentation](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.5/packages/client/ui-sidebar-browser/README.md#known-limitations-and-deferred-work).

原有 Windows 持久化配套会单独修改宿主 `app.asar`，不是安装插件自动附带；宿主升级后可能需要重新评估其适用性。 / The separate Windows persistence companion modifies the host `app.asar`; it is not automatically applied with the plugin and its compatibility needs reassessment after a host upgrade.

## 安装与升级

当前版本：**1.0.11**。安装包与固定标签均已包含运行文件，无需编译。

**首次安装（Desktop）：** 打开侧栏 **插件 → 添加插件**（箭头菜单的 **安装第三方插件** 也可进入），把下面一整行填入 **包名或地址**，点击 **安装**，核对版本后点击 **立即启用**。

```text
github:Tests4gptplay/dsh-dots#v1.0.11
```

**升级已有插件：** 同样填写上面的新版来源，成功后核对版本并启用；已有设置与用户文件保留。若宿主提示已安装或要求先卸载，再按提示仅卸载该插件条目并安装新版，不清除 DSH 数据或手工删除插件目录。是否需要重启以 DSH 提示为准；需要时完全退出并重新打开（Desktop 包括托盘）。

启用后从侧栏进入 Dots。跨重启登录态取决于网站和宿主分区；Windows 持久化配套是单独操作，不随插件安装自动应用，适用范围见 [持久化说明](https://github.com/Tests4gptplay/dsh-dots/blob/v1.0.11/README.md#desktop-登录态持久化)。

**备用安装包：** 将下面的 `.tgz` 直链填入同一个 **包名或地址**；也可下载后填写文件的完整绝对路径，无需解压。该路径应属于运行 DSH 的电脑。

```text
https://github.com/Tests4gptplay/dsh-dots/releases/download/v1.0.11/dsh-dots-1.0.11.tgz
```

**Web：** 在运行服务的环境中执行。升级前停止对应 Web profile，成功后重新启动；Web 与 Desktop 分别安装。

```sh
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v1.0.11'
```

备用时将命令中的来源换成上面的 `.tgz` 直链或下载文件的完整绝对路径。

## 验证范围

运行文件与上一正式版本逐字节相同；安装包中的所有 Markdown 本地链接已逐项核验。已有功能验证范围见仓库验收文档，不将文档修订扩写成新的平台实测。
