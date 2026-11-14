# DSH Dot MCP 1.0.0

The independent **dsh-dot-mcp** plugin carries the MCP implementation previously verified in DSH Dots 2.0.2, with its own install identity.

## Features

- Native DSH Dots page with preload, retained navigation, Back and Dot Home
- Seventeen MCP tools for native DSH sessions, workspaces, files, models and API calls
- OpenAI Secure MCP Tunnel setup and remembered startup
- Session-scoped proactive notifications using the existing MCP Events path
- Bilingual settings, light/dark themes, five-step connection guide and Desktop login retention

## Two editions

| Edition | Package identity | DSH install spec |
| --- | --- | --- |
| Simple Dots | `dsh-dots` | `github:Tests4gptplay/dsh-dots#1.0.12` |
| Full MCP edition | `dsh-dot-mcp` | `github:Tests4gptplay/dsh-dots#dsh-dot-mcp-v1.0.0` |

Both editions have distinct Cordis IDs, Client registration and UI entries. They live in separate version lines within the same GitHub repository. Existing browser-login persistence and saved Tunnel settings remain in the current DSH profile.

## Acceptance

Based on the previously Windows-verified v2.0.2 implementation. Windows/Linux regression, package whitelist, npm packaging and native DSH installation are checked before publication.
