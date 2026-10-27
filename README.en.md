# DSH Dots

Open [ChatGPT Dots](https://chatgpt.com/dots/home) in a native DeepSeek Harness page, with a theme-aware toolbar, reload and external-browser controls.

[中文说明](README.md)

## Features

- **Startup preload:** opens Dots in the background when Desktop loads the plugin.
- **Page reuse:** keeps the same connected WebView and page state when switching to chat or other panels; returning displays the existing page.
- **Explicit refresh:** Reload refreshes the webpage. Disabling the plugin or exiting DSH releases the guest.
- **Session reuse:** uses host-managed browser storage, with a companion Desktop update for a fixed persistent Dots partition.
- **Native appearance:** full-width content, Chinese and English UI, theme-aware toolbar and ring icon. ChatGPT manages its own webpage theme.

Desktop uses the host's Electron WebView. The Web profile uses iframe embedding, with Open in browser available when the website restricts embedding.

## Install and upgrade

Desktop: **Plugins → Add plugin**, then install and enable:

```text
github:Tests4gptplay/dsh-dots#v1.0.5
```

Web profile:

```sh
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v1.0.5'
```

[Release](https://github.com/Tests4gptplay/dsh-dots/releases/tag/v1.0.5) · [Prebuilt package](https://github.com/Tests4gptplay/dsh-dots/releases/download/v1.0.5/dsh-dots-1.0.5.tgz)

Host/Client runtime files are included. Restart DSH after upgrading to load the preload feature. Existing settings and browser data are preserved.

## Persistent Desktop login storage

Background preloading is supplied directly by the plugin. Cross-restart storage is managed by the Desktop main process; this release includes a companion update script for **Windows DSH 0.2.1-rc.3**.

To enable the persistent partition, download and extract the package, exit Desktop completely (including its tray process), and run with Python:

```sh
python scripts/enable-desktop-persistence.py "<DSH installation>/resources/app.asar"
```

The script backs up the original archive and sets the Dots partition to `persist:dsh-dots-personal-browser`, preserving other browser partition policies and host authorization, isolation and navigation rules. Restart DSH and sign in once in the new partition. Later launches reuse its website storage; the website manages session validity.

If this companion update is already applied, install 1.0.5 and restart DSH directly. After Desktop upgrades, apply the companion update according to the new host's storage support. The backup sits alongside `app.asar` with the suffix `.before-dots-1.0.4`; to restore it, exit Desktop and replace `app.asar` with the backup.

## Development

```sh
npm run build
npm test
npm run pack:check
```

[Changelog](CHANGELOG.md) · [Issues](https://github.com/Tests4gptplay/dsh-dots/issues) · [MIT license](LICENSE)

DSH Dots is a third-party plugin. OpenAI provides ChatGPT Dots and manages website authentication and service access.
