# DSH Dots

[简体中文（主文档）](README.md)

**Open the real ChatGPT Dots website from DeepSeek Harness (DSH).** This unofficial plugin provides a DSH-native main panel, sidebar entry, and theme-adaptive ring icon. It relies on the user's own ChatGPT browser login; it does not implement or impersonate Dots.

## Install and upgrade — matching Kujira's standard

Use the DSH plugin manager on Desktop. **Once** version `v0.1.0-alpha.1` is actually tagged and published:

```text
github:Tests4gptplay/dsh-dots#v0.1.0-alpha.1
```

**The version Tag and Release are not published yet.** Until then, the development installation source is:

```text
github:Tests4gptplay/dsh-dots#main
```

For DSH Web (a separate plugin profile), the version-tagged command will be:

```bash
dsh plugin --profile web add 'github:Tests4gptplay/dsh-dots#v0.1.0-alpha.1'
```

Until publication, replace the tag with `#main` for testing. Once published, [GitHub Releases](https://github.com/Tests4gptplay/dsh-dots/releases) provides `dsh-dots-0.1.0-alpha.1.tgz` as a fallback. No npm build is needed for installation: the compiled Host/Client files are already committed. On upgrade, uninstall the old plugin through DSH, install the selected version, enable it and restart DSH. Do not delete other plugins, profiles, or browser sign-in data.

## Scope and limitations

- Opens the official [ChatGPT Dots web page](https://chatgpt.com/dots/home) through the DSH page, the DSH Browser (if available) or the system browser.
- ChatGPT website sign-in is independent of Codex app-server authentication.
- The website may reject iframe embedding; DSH Desktop WebView cookies may not survive app restart. The plugin neither collects login secrets nor bypasses browser/site security restrictions.
- Interface and installer compatibility follow DSH's actual runtime capabilities, not a hardcoded DSH RC version gate.
- Developer-only Mock Dot tests never appear in the production package. Mock screenshots do not prove real ChatGPT login.

**Not affiliated with or endorsed by OpenAI.**

## Developer verification

```bash
npm run build
npm test
npm run pack:check
npm pack --ignore-scripts
```

The `pack:check` script verifies the exact shipped files, entrypoints and bilingual plugin-manager metadata. The release workflow is manually triggered; ordinary pushes never publish a Tag or Release. See [Chinese test cases](docs/TEST-CASES.md), [Changelog](CHANGELOG.md) and the [GitHub repository](https://github.com/Tests4gptplay/dsh-dots).
