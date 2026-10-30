# DSH Dots

> **1.0.11** · [Changelog](CHANGELOG.md) · [Acceptance and scope](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/ACCEPTANCE.md).


## Use Dots inside DSH

Desktop opens the official ChatGPT Dots website inside DSH and preloads it at startup. Switch to other DSH panels and return to the same webpage and page state; use Reload when a fresh load is needed.

The full-page shell, toolbar and ring icon follow DSH's light/dark theme; ChatGPT manages the website's own theme. Web can embed the Dots page and an Open in browser option when the site restricts embedding. Disabling the plugin or exiting DSH closes its embedded page.

Sign-in takes place on the official website, with browser partitions managed by DSH Desktop.

### Sign-in state with DSH 0.2.1-rc.5

After upgrading to DSH 0.2.1-rc.5, you may need to sign in again in the embedded Dots page after restarting DSH. The current host browser does not preserve sign-in state across application restarts, and a host upgrade may overwrite an additional persistence modification previously applied. This Dots update did not remove a sign-in-saving feature.

Keeping the same page while switching DSH panels is page reuse within one process, not sign-in persistence after quitting and restarting DSH. See the [DSH rc.5 browser documentation](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.5/packages/client/ui-sidebar-browser/README.md#known-limitations-and-deferred-work).

Open [ChatGPT Dots](https://chatgpt.com/dots/home) in a native DeepSeek Harness page, with a theme-aware toolbar, reload and external-browser controls.

[中文说明](README.md)

## Features

- **Startup preload:** opens Dots in the background when Desktop loads the plugin.
- **Page reuse:** keeps the same webpage and page state when switching to chat or other panels; returning displays the existing page.
- **Explicit refresh:** Reload refreshes the webpage. Disabling the plugin or exiting DSH closes its embedded page.
- **Sign-in and host storage:** reuses the webpage during the same DSH run. Persistence across restarts requires host support or a separate compatible persistence modification, as described below.
- **Native appearance:** full-width content, Chinese and English UI, theme-aware toolbar and ring icon. ChatGPT manages its own webpage theme.

Open Dots from DSH on Desktop or Web; use Open in browser if the website restricts embedded display.

Current version: **1.0.11**. Follow the steps below for a first installation; follow the upgrade steps below for an existing installation.

## Install or update

Current version: **1.0.11**. The fixed tag and installation package include runtime files; no build is needed.

**First installation (Desktop):** Open **Plugins → Add plugin** in the sidebar (or **Install a third-party plugin** in the arrow menu). Paste the complete line below into **Package name or address**, click **Install**, check the version and click **Enable now**.

```text
github:Tests4gptplay/dsh-dots#v1.0.11
```

**Updating:** Use the same dialog with the new versioned source above, verify the installed version and enable it. Retain existing settings and user files. If DSH reports that it is already installed or requires removal first, follow that message to remove only the plugin entry and install the new version; do not clear DSH data or manually delete plugin directories. Restart only when DSH asks you to; fully quit and reopen it, including the Desktop tray process.

After enabling, open Dots from the sidebar. Login persistence depends on the website and host storage partition; the separate Windows persistence companion is not automatically applied by installing this plugin.

**Alternative package:** Paste this `.tgz` URL into the same **Package name or address** field, or download it and enter its full absolute path. No extraction is needed. The path must be on the computer running DSH.

```text
https://github.com/Tests4gptplay/dsh-dots/releases/download/v1.0.11/dsh-dots-1.0.11.tgz
```

**Web:** Run this on the computer hosting the service. Stop the corresponding Web profile before updating and restart it after success. Web and Desktop installations are separate.

```sh
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v1.0.11'
```

Alternatively, replace the source in the command with the `.tgz` URL above or the downloaded file's absolute path.

## Persistent Desktop login storage

The companion below modifies Desktop’s `app.asar` and is not applied automatically by installing the plugin. A host upgrade may overwrite that modification. Its support statement for an older host does not mean that unmodified rc.5 preserves sign-in state across restarts.

Background preloading is supplied directly by the plugin. Cross-restart storage is managed by the Desktop main process; this release includes an optional companion update script written for **Windows DSH 0.2.1-rc.3**. Do not apply the script unchanged to other host versions.

To enable the persistent partition, download and extract the package, exit Desktop completely (including its tray process), and run with Python:

```sh
python scripts/enable-desktop-persistence.py "<DSH installation>/resources/app.asar"
```

The script backs up the original archive and sets the Dots partition to `persist:dsh-dots-personal-browser`, preserving other browser partition policies and host authorization, isolation and navigation rules. Restart DSH and sign in once in the new partition. Later launches reuse its website storage; the website manages session validity.

If this companion update is already applied, follow the plugin upgrade steps above; a plugin-only update does not require applying the companion again. After Desktop upgrades, apply the companion update according to the new host's storage support. The backup sits alongside `app.asar` with the suffix `.before-dots-1.0.4`; to restore it, exit Desktop and replace `app.asar` with the backup.

## Developer resources

[Source and technical documentation](https://github.com/Tests4gptplay/dsh-dots/tree/f3bc47068bfc52565b573a48549e90d49590880f) are for contributors; users do not need to build the plugin.

[Changelog](CHANGELOG.md) · [Issues](https://github.com/Tests4gptplay/dsh-dots/issues) · [MIT license](LICENSE)

DSH Dots is a third-party plugin. OpenAI provides ChatGPT Dots and manages website authentication and service access.

## Compatibility and acceptance scope

This update repairs documentation links in the installation package; plugin behavior is unchanged from the previous release.

Linux, Windows and macOS native behavior must each be validated on that OS; a Linux result does not certify Windows or macOS.

The optional archive-modification script is only documented for Windows DSH 0.2.1-rc.3. It is not a cross-platform persistence solution: it does not handle macOS code signing or re-sign a modified host, and must not be run against an unverified host. The plugin does not automatically run it, modify host authorization/isolation/navigation policy, or access existing account storage. Windows testing verified retention of an existing login across normal restart; this does not certify a new login flow, macOS, or non-100% scaling.

## 支持项目 / Support

[GitHub Sponsors](https://github.com/sponsors/Tests4gptplay) · [Ko-fi](https://ko-fi.com/kou392350) · [Patreon](https://www.patreon.com/cw/Kou848) · [爱发电 / Afdian](https://afdian.com/a/kkt_ifd1) · [支付宝 / Alipay](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/SPONSOR.md)


Windows checks cover page retention, normal restart, existing-login retention and Chinese/English light/dark themes at 100% scaling; see [acceptance scope](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/ACCEPTANCE.md)。
