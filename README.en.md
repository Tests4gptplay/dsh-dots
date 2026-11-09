# DSH Dots

> **1.0.12-review.1 review candidate** · [Changelog](CHANGELOG.md) · [Acceptance and scope](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/ACCEPTANCE.md).


## Use Dots inside DSH

Desktop opens the official ChatGPT Dots website inside DSH and preloads it at startup. Switch to other DSH panels and return to the same webpage and page state; use Reload when a fresh load is needed.

The full-page shell, toolbar and ring icon follow DSH's light/dark theme; ChatGPT manages the website's own theme. Web can embed the Dots page and an Open in browser option when the site restricts embedding. Disabling the plugin or exiting DSH closes its embedded page.

Sign-in takes place on the official website, with browser partitions managed by DSH Desktop.

### Desktop sign-in retention

DSH's embedded browser reuses page state within each run. To retain website login across restarts, open **Settings → Dots Login Retention** to apply the Dots-specific persistent-partition adaptation. Sign-in continues on the official ChatGPT website.

Open [ChatGPT Dots](https://chatgpt.com/dots/home) in a native DeepSeek Harness page, with a theme-aware toolbar, reload and external-browser controls.

[中文说明](README.md)

## Features

- **Startup preload:** opens Dots in the background when Desktop loads the plugin.
- **Page reuse:** keeps the same webpage and page state when switching to chat or other panels; returning displays the existing page.
- **Explicit refresh:** Reload refreshes the webpage. Disabling the plugin or exiting DSH closes its embedded page.
- **Desktop login retention:** inspect, apply, or restore the Dots-only persistent browser partition from Settings.
- **Native appearance:** full-width content, Chinese and English UI, theme-aware toolbar and ring icon. ChatGPT manages its own webpage theme.

Open Dots from DSH on Desktop or Web; use Open in browser if the website restricts embedded display.

Review candidate: **1.0.12-review.1**. Current public release: **1.0.11**.

## Install or update

The installation instructions below refer to public release **1.0.11**. Install candidate **1.0.12-review.1** using the `.tgz` delivered for review.

**First installation (Desktop):** Open **Plugins → Add plugin** in the sidebar (or **Install a third-party plugin** in the arrow menu). Paste the complete line below into **Package name or address**, click **Install**, check the version and click **Enable now**.

```text
github:Tests4gptplay/dsh-dots#v1.0.11
```

**npm installation:** You can also enter `@tests4gptplay/dsh-dots@1.0.11` in **Package name or address**.

**Updating:** Use the same dialog with the new versioned source above, verify the installed version and enable it. Retain existing settings and user files. If DSH reports that it is already installed or requires removal first, follow that message to remove only the plugin entry and install the new version; do not clear DSH data or manually delete plugin directories. Restart only when DSH asks you to; fully quit and reopen it, including the Desktop tray process.

After enabling, open Dots from the sidebar. The candidate adds **Settings → Dots Login Retention** for user-controlled application and restoration.

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

Open **DSH Settings → Dots Login Retention** to inspect the current state and choose **Apply** or **Restore original**. The operation changes DSH Desktop's `resources/app.asar` to use `persist:dsh-dots-personal-browser` for the Dots browser workspace; other workspace partition allocation stays unchanged.

The current DSH archive is backed up before applying and verified after writing. Fully quit and restart DSH after applying, then sign in through the official Dots page once. If a DSH update replaces the change, check and apply again. Restore selects an original backup matching the currently patched archive.

Platform-specific packaging, signature considerations, and validation results are documented in the [candidate Release notes](https://github.com/Tests4gptplay/dsh-dots/releases). The earlier Windows script is retained in the source archive.

## Developer resources

[Source and technical documentation](https://github.com/Tests4gptplay/dsh-dots/tree/f3bc47068bfc52565b573a48549e90d49590880f) are for contributors; users do not need to build the plugin.

[Changelog](CHANGELOG.md) · [Issues](https://github.com/Tests4gptplay/dsh-dots/issues) · [MIT license](LICENSE)

DSH Dots is a third-party plugin. OpenAI provides ChatGPT Dots and manages website authentication and service access.

## Compatibility and acceptance

Windows, Linux and macOS share the same partition-adaptation core. Installation-directory permissions, macOS signatures and Linux AppImage packaging are handled according to their actual environment. Refer to the [candidate Release notes](https://github.com/Tests4gptplay/dsh-dots/releases) for test environment, archive apply/restore evidence, and platform coverage.

## 支持项目 / Support

[GitHub Sponsors](https://github.com/sponsors/Tests4gptplay) · [Ko-fi](https://ko-fi.com/kou392350) · [支付宝 / Alipay](https://github.com/Tests4gptplay/dsh-dots/blob/main/SPONSOR.md)


Earlier Windows checks for page retention, restart, and existing-login retention are documented in the [acceptance scope](https://github.com/Tests4gptplay/dsh-dots/blob/f3bc47068bfc52565b573a48549e90d49590880f/docs/testing/ACCEPTANCE.md)。
