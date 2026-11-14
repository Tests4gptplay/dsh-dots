# DSH Dot MCP 1.0.1 · Official Release

November 15, 2026 · DSH Dot MCP

## Features and improvements

- Dot directly invokes native DSH APIs, installed plugins and tools; a DSH Agent conversation is used when continued agent execution is needed.
- MCP-created conversations appear in the intended workspace with commands, replies and retained history.
- Sidebar entry: Dot. Settings entry: Dot MCP, in both languages.
- Fix request-scoped HTTP probe errors persisting as unrelated global MCP connection failures.
- Retains Dots WebView, preload, page state, Secure MCP Tunnel, proactive session events and Desktop login persistence.

## Install

In DSH Plugins → Add plugin, enter:

```text
github:Tests4gptplay/dsh-dots#dsh-dot-mcp-v1.0.1
```

npm package: `dsh-dot-mcp@1.0.1`; release archive: `dsh-dot-mcp-1.0.1.tgz`.
The simple edition remains at `github:Tests4gptplay/dsh-dots#v1.0.12` / `@tests4gptplay/dsh-dots@1.0.12`.

## Acceptance

- Windows/Linux source regression: 156 passed, 1 skipped; formal candidate receives its own CI checks.
- Native DSH 0.2.2-rc.1: 32 checks passed.
- Real Windows DSH Desktop: two distinct MCP archive calls (direct and new Agent conversation), with actual client screenshots confirming session rows disappear in sequence; source records retained.

[中文](dsh-dot-mcp-v1.0.1.md) · [Repository](https://github.com/Tests4gptplay/dsh-dots) · [Issues](https://github.com/Tests4gptplay/dsh-dots/issues)
