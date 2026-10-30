# DSH Dots

> **1.0.11** · [Changelog](CHANGELOG.md) · [Acceptance and scope](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/ACCEPTANCE.md).


## Use Dots inside DSH

Desktop opens the official ChatGPT Dots website inside DSH and preloads it at startup. Switch to other DSH panels and return to the same webpage and page state; use Reload when a fresh load is needed.

The full-page shell, toolbar and ring icon follow DSH's light/dark theme; ChatGPT manages the website's own theme. Web can embed the Dots page and an Open in browser option when the site restricts embedding. Disabling the plugin or exiting DSH closes its embedded page.

Sign-in takes place on the official website, with browser partitions managed by DSH Desktop. For persistence across restarts, follow the separate compatible Windows persistent-partition update instructions below.

Open [ChatGPT Dots](https://chatgpt.com/dots/home) in a native DeepSeek Harness page, with a theme-aware toolbar, reload and external-browser controls.

[中文说明](README.md)

## Features

- **Startup preload:** opens Dots in the background when Desktop loads the plugin.
- **Page reuse:** keeps the same webpage and page state when switching to chat or other panels; returning displays the existing page.
- **Explicit refresh:** Reload refreshes the webpage. Disabling the plugin or exiting DSH closes its embedded page.
- **Session reuse:** uses host-managed browser storage, with a companion Desktop update for a fixed persistent Dots partition.
- **Native appearance:** full-width content, Chinese and English UI, theme-aware toolbar and ring icon. ChatGPT manages its own webpage theme.

Open Dots from DSH on Desktop or Web; use Open in browser if the website restricts embedded display.

Current version: **1.0.11**. Follow the steps below for a first installation; an upgrade does not require uninstalling the existing plugin.

## Install and upgrade

Desktop: **Plugins → Add plugin**, then install and enable:

```text
github:Tests4gptplay/dsh-dots#v1.0.11
```

Web profile:

```sh
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v1.0.11'
```

[Release](https://github.com/Tests4gptplay/dsh-dots/releases/tag/v1.0.11) · [Prebuilt package](https://github.com/Tests4gptplay/dsh-dots/releases/download/v1.0.11/dsh-dots-1.0.11.tgz)

Runtime files are included; no manual build is needed. Restart DSH after installation or upgrade, then open Dots from the sidebar. Upgrading does not actively clear settings or browser storage; continued login validity depends on the website and host storage partition.

## Persistent Desktop login storage

Background preloading is supplied directly by the plugin. Cross-restart storage is managed by the Desktop main process; this release includes an optional companion update script written for **Windows DSH 0.2.1-rc.3**. Do not apply the script unchanged to other host versions.

To enable the persistent partition, download and extract the package, exit Desktop completely (including its tray process), and run with Python:

```sh
python scripts/enable-desktop-persistence.py "<DSH installation>/resources/app.asar"
```

The script backs up the original archive and sets the Dots partition to `persist:dsh-dots-personal-browser`, preserving other browser partition policies and host authorization, isolation and navigation rules. Restart DSH and sign in once in the new partition. Later launches reuse its website storage; the website manages session validity.

If this companion update is already applied, install 1.0.11 and restart DSH directly. After Desktop upgrades, apply the companion update according to the new host's storage support. The backup sits alongside `app.asar` with the suffix `.before-dots-1.0.4`; to restore it, exit Desktop and replace `app.asar` with the backup.

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
