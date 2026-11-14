# DSH Dot MCP 1.0.1-test.1-test.1

**Use your Dot inside DSH—and let your Dot put DSH to work.**

[中文](README.md) · [Setup guide](#connect-your-dot) · [2.0.0 release notes and screenshots](https://github.com/Tests4gptplay/dsh-dots/blob/v2.0.0/docs/releases/v2.0.0.en.md) · [Report an issue](https://github.com/Tests4gptplay/dsh-dots/issues)

**Independent MCP edition 1.0.1-test.1:** Connect ChatGPT Dot to native DSH sessions, tools and workspaces, with Secure MCP Tunnel, proactive notifications and an independent plugin installation identity.

[Dot MCP 1.0.0 release history](https://github.com/Tests4gptplay/dsh-dots/blob/dsh-dot-mcp-v1.0.0/docs/releases/dsh-dot-mcp-v1.0.0.en.md) · [Original 2.0.0 native checks](https://github.com/Tests4gptplay/dsh-dots/blob/v2.0.0/docs/releases/v2.0.0.en.md)

DSH Dot MCP brings [ChatGPT Dots](https://chatgpt.com/dots/home) into DeepSeek Harness. Chat with your own Dot inside DSH, or enable MCP so your Dot can use DSH's AI sessions, tools and workspaces to submit tasks and retrieve results.

## Dot MCP capabilities

This version adds **two-way collaboration between Dot and DSH**: use Dot in DSH, and let Dot call the DSH environment running on your computer.

| New capability | What you can do |
| --- | --- |
| MCP connection | Register DSH as a tool service available to your Dot and submit tasks from the conversation. |
| Sessions and tasks | Create or continue sessions, inspect results and cancel work; MCP internal sessions stay out of the Ungrouped sidebar. |
| Workspaces and tools | Dot directly uses available native DSH APIs, installed plugins and tools for files, commands and image results. |
| Unified settings | Manage the MCP switch, connection URLs, call status and login retention under Settings → Dots. |
| Guided setup | Copy connection details, check the local service, and follow official guides through registration and the first tool call. |

**MCP starts off and can be enabled when needed.** The switch and connection settings are saved for the current DSH profile and restored after a restart. Turning MCP off closes external access while DSH continues tasks already submitted; cancelling a task is a separate action.

Existing features remain available: startup preload, retained pages across panel switches, light/dark themes, Chinese and English UI, reload, opening in an external browser, and Desktop login retention with check, apply and restore controls. The toolbar adds Back navigation, and clicking the Dots icon or title returns to Dot home.

## Install DSH Dot MCP 1.0.1-test.1-test.1

In DSH, open **Plugins → Add plugin** and install the current main branch:

```text
github:Tests4gptplay/dsh-dots#main
```

The previous release remains at [dsh-dot-mcp-v1.0.0](https://github.com/Tests4gptplay/dsh-dots/releases/tag/dsh-dot-mcp-v1.0.0). The simpler Dots edition remains on the [1.0.12 branch](https://github.com/Tests4gptplay/dsh-dots/tree/1.0.12) and can be installed with `github:Tests4gptplay/dsh-dots#1.0.12`.

For the complete connection walkthrough, see the [setup guide](#connect-your-dot); the same five-step guide is expandable at the bottom of Dots Settings.

Open **DSH Dot MCP** in the sidebar and sign in on the official ChatGPT page. Manage login retention and MCP under **DSH → Settings → Dots**.

This release provides a unified Dots settings design, Back and clickable Dot-home navigation, the complete guide below all three settings cards, and remembered tunnel start/stop across restarts. See the [update record](https://github.com/Tests4gptplay/dsh-dots/blob/v2.0.0/docs/releases/v2.0.0.md) for screenshots and verification.

## Selective proactive notifications to Dot

Under **DSH → Settings → Dots → Proactive notifications**, enable the independent notification switch, choose exact **Session IDs** (one per line), select turn-ended and/or execution-error events, and save. Notifications start only after Dot creates an [official MCP Events](https://developers.openai.com/plugins/build/mcp-events) subscription for one of those exact sessions. Turning the switch off revokes existing subscriptions. Unselected sessions never generate Dot notifications.

Event payloads contain only the session ID and status metadata. Dot can retrieve actual results using the existing MCP tools. The notification toggle is independent of the MCP connection and preserves all 17 existing tools.

## Request-scoped DSH event streams

`dsh_api_subscribe` forwards DSH native events as MCP `notifications/progress` during an active tool call. Compatible MCP clients use `progressToken` to receive events, and ending the request releases the subscription; `dsh_api_snapshot` remains available for a one-off snapshot.

ChatGPT Dot's proactive event-triggered monitoring uses the official MCP Events **webhook** protocol (`events/list`, `events/subscribe`, `events/unsubscribe`). The request-scoped progress stream is a separate capability and is described accordingly.

**This release update:** Disabling MCP still saves the off state if stopping the tunnel reports an error, while keeping that error visible. After downloading a newer official tunnel client, Settings shows the pending switch; selecting **Start tunnel** moves the running process to that client.

## Connect your Dot

1. **Enable MCP.** Open Settings → Dots and run **Check local connection**.
2. **Create a Tunnel.** Open [Tunnel settings](https://platform.openai.com/settings/organization/tunnels), use `DSH-Dots` as the name, and select your organization/workspace. This personal setup leaves **Restrict client network access** unchecked; follow administrator requirements for managed networks. Copy the full Tunnel ID and obtain a runtime key from [Runtime API Keys](https://platform.openai.com/settings/organization/api-keys).
3. **Set up locally in Dots.** In **OpenAI Secure MCP Tunnel**, keep the default installation directory or select another location, then **Download and install official client**. An existing executable can also be selected by its full path. Enter Tunnel ID and Runtime API Key, **Start tunnel**, then **Refresh tunnel status**. The plugin supplies its current local MCP endpoint to the official client. No terminal window is required. The location and Tunnel ID persist; the runtime key is saved in a separate access-restricted file in this DSH user profile for automatic tunnel restoration.

**Client updates:** Each download checks OpenAI's latest official GitHub Release and verifies its SHA-256 before installation. The Dots package contains no tunnel-client executable. Only the current installed client and one previous version are retained; an older executable still in use is cleaned up after its process stops.
4. **Register and install in ChatGPT.** On the web, open [Plugins](https://chatgpt.com/plugins) → **＋ / Add → Add custom MCP server**, choose **Tunnel** and enter its ID. Select **No authentication**, acknowledge the official notice and choose **Create as a plugin**. Install it under Personal plugins and enable it in Dot → **Customize → Plugins**.
5. **Make a real call.** Ask your Dot to call `dsh_status` and list sessions. Refresh Dots settings to see the received tool call.

An existing HTTPS forwarding endpoint can instead be entered above and registered using **Server URL**, without a tunnel. The full MCP URL contains an access key; hide it in screenshots and shared logs.

[Update and verification](https://github.com/Tests4gptplay/dsh-dots/blob/v2.0.0/docs/releases/v2.0.0.md) · [Official tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) · [Official MCP registration](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)

## Everyday use

After connecting, ask your Dot to read data from a chosen workspace, prepare a report and save it. Continue in the same session to add instructions, retrieve results or cancel a task. Available tools follow the configuration of that DSH environment.

Dot in the embedded DSH page and Dot in the ChatGPT mobile app can use the configured remote connection to reach the same DSH environment. Keep the computer's DSH and tunnel or HTTPS service running for remote access.

## Updates and feedback

The [2.0.0 release notes](https://github.com/Tests4gptplay/dsh-dots/blob/v2.0.0/docs/releases/v2.0.0.en.md) contain actual screenshots, native-environment checks and the two-turn file-task experiment. See the [changelog](CHANGELOG.md) for other versions.

When reporting an [issue](https://github.com/Tests4gptplay/dsh-dots/issues), include your DSH version, operating system and error message. Remove connection keys from screenshots and logs.

## Support the project

Thank you for supporting DSH Dots development and maintenance. [Donations and sponsorship](SPONSOR.md) · [GitHub Sponsors](https://github.com/sponsors/Tests4gptplay) · [Ko-fi](https://ko-fi.com/kou392350) · [Alipay](SPONSOR.md#alipay--支付宝)
