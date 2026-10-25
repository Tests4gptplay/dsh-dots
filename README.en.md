# DSH Dots

[简体中文（主文档）](README.md)

**DSH Dots opens the actual [ChatGPT Dots website](https://chatgpt.com/dots/home) inside a DSH-native main panel.** The plugin does not emulate Dots or require an API key. Chinese is the primary locale, English is secondary.

## Experience

- A compact DSH-themed toolbar and a **full-bleed** content area—no boxed browser UI.
- On **DSH Desktop**, a guest WebView is acquired through DSH's own Electron browser bridge, using an approved partition and main-process navigation checks; it no longer depends on the Session right-sidebar Browser plugin.
- On **DSH Web**, the site is embedded by iframe on a best-effort basis. ChatGPT can refuse embedding. The native toolbar offers an **Open in browser** fallback.
- The surrounding DSH shell uses the host's CSS theme variables. The cross-origin ChatGPT site's **internal** styling is controlled by ChatGPT and cannot be rewritten by this plugin.
- Account login and any memory/tasks are owned by the official ChatGPT website. The plugin does not capture credentials or use unofficial Dots APIs. DSH Desktop guest cookies are not guaranteed to persist across application restarts.

Not affiliated with or endorsed by OpenAI.

## Install (published stable release)

Desktop: DSH → Plugins → Add Plugin:

```text
github:Tests4gptplay/dsh-dots#v0.1.0
```

Web profile:

```bash
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v0.1.0'
```

[Latest release](https://github.com/Tests4gptplay/dsh-dots/releases/latest) · [Prebuilt TGZ](https://github.com/Tests4gptplay/dsh-dots/releases/download/v0.1.0/dsh-dots-0.1.0.tgz). Compiled Host/Client entries are included; no local npm build is required. To upgrade, uninstall only the previous Dots package through DSH, install the new release, enable it and restart DSH. Preserve other plugins, profiles and user data.

## Verification and limits

```bash
npm run build
npm test
npm run test:browser
npm run pack:check
```

The repository tests the native DSH interface against DSH 0.2.1-rc.3 source code and a simulated Dot conversation. **Actual ChatGPT Dots authentication and Desktop guest operation require end-user testing in DSH**; tests and mock screenshots are not proof of successful account login. Compatibility is capability-based, not gated by DSH version strings. See [test cases](docs/TEST-CASES.md).
