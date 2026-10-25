# DSH Dots

[简体中文](README.md)

**DSH Dots** is an unofficial DeepSeek Harness plugin offering a native-style entry for the real [ChatGPT Dots web page](https://chatgpt.com/dots/home).

- Chinese-first native DSH main panel and sidebar entry, with English localization.
- Responsive monochrome ring icon using `currentColor` for light/dark/custom themes.
- Official ChatGPT website login in the user's browser context. No credential scraping or unofficial Dots API.
- One-click open in DSH Browser (where available) and in the system browser.
- In-page iframe is best effort only: website embed restrictions and browser login/session persistence cannot be bypassed.
- Developer-only isolated **Mock Dot** cases cover message input, simulated replies, errors, theme switching and the registered DSH native slots. No mock backend is injected in production.

**Not affiliated with or endorsed by OpenAI.** The Codex app-server's ChatGPT authentication does not imply browser cookie login.

## Build and validate

```bash
npm run build
npm test
npm pack --ignore-scripts
```

The built native host/client files are included in the repository for Git-based installation. For testing, use a disposable DSH profile and see [test cases](docs/TEST-CASES.md).

```text
github:Tests4gptplay/dsh-dots#main
```
