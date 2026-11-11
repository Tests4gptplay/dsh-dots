# DSH Dots 2.0.1-test.6

**Use your Dot inside DSH—and let your Dot put DSH to work.**

[中文](README.md) · [2.0.0 release notes and screenshots](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.0/docs/releases/v2.0.0.en.md) · [Report an issue](https://github.com/Tests4gptplay/dsh-dots/issues)

DSH Dots brings [ChatGPT Dots](https://chatgpt.com/dots/home) into DeepSeek Harness. Chat with your own Dot inside DSH, or enable MCP so your Dot can use DSH's AI sessions, tools and workspaces to submit tasks and retrieve results.

## What's new in 2.0.0

This version adds **two-way collaboration between Dot and DSH**: use Dot in DSH, and let Dot call the DSH environment running on your computer.

| New capability | What you can do |
| --- | --- |
| MCP connection | Register DSH as a tool service available to your Dot and submit tasks from the conversation. |
| Sessions and tasks | Create or continue a session, add instructions, check progress and results, or cancel execution. |
| Workspaces and tools | Read and edit files, receive image results, and use the command and plugin capabilities enabled in DSH. |
| Unified settings | Manage the MCP switch, connection URLs, call status and login retention under Settings → Dots. |
| Guided setup | Copy connection details, check the local service, and follow official guides through registration and the first tool call. |

**MCP starts off and can be enabled when needed.** The switch and connection settings are saved for the current DSH profile and restored after a restart. Turning MCP off closes external access while DSH continues tasks already submitted; cancelling a task is a separate action.

Existing features remain available: startup preload, retained pages across panel switches, light/dark themes, Chinese and English UI, reload, opening in an external browser, and Desktop login retention with check, apply and restore controls.

## Install the 2.0.0 branch

In DSH, open **Plugins → Add plugin** and enter this in the package name or address field:

```text
github:Tests4gptplay/dsh-dots#2.0.1-test.6
```

This page describes the `2.0.1-test.6` test branch. Published versions and packages are available under [Releases](https://github.com/Tests4gptplay/dsh-dots/releases).

Open **DSH Dots** in the sidebar and sign in on the official ChatGPT page. Manage login retention and MCP under **DSH → Settings → Dots**.

## Request-scoped DSH event streams

`dsh_api_subscribe` forwards DSH native events as MCP `notifications/progress` during an active tool call. Compatible MCP clients use `progressToken` to receive events, and ending the request releases the subscription; `dsh_api_snapshot` remains available for a one-off snapshot.

ChatGPT Dot's proactive event-triggered monitoring uses the official MCP Events **webhook** protocol (`events/list`, `events/subscribe`, `events/unsubscribe`). The request-scoped progress stream is a separate capability and is described accordingly.

**This test update:** Disabling MCP still saves the off state if stopping the tunnel reports an error, while keeping that error visible. After downloading a newer official tunnel client, Settings shows the pending switch; selecting **Start tunnel** moves the running process to that client.

## Connect your Dot

1. **Enable MCP.** Open Settings → Dots and run **Check local connection**.
2. **Create a Tunnel.** Open [Tunnel settings](https://platform.openai.com/settings/organization/tunnels), use `DSH-Dots` as the name, and select your organization/workspace. This personal setup leaves **Restrict client network access** unchecked; follow administrator requirements for managed networks. Copy the full Tunnel ID and obtain a runtime key from [Runtime API Keys](https://platform.openai.com/settings/organization/api-keys).
3. **Set up locally in Dots.** In **OpenAI Secure MCP Tunnel**, keep the default installation directory or select another location, then **Download and install official client**. An existing executable can also be selected by its full path. Enter Tunnel ID and Runtime API Key, **Start tunnel**, then **Refresh tunnel status**. The plugin supplies its current local MCP endpoint to the official client. No terminal window is required. The location and Tunnel ID persist; the key remains in memory for this DSH run.

**Client updates:** Each download checks OpenAI's latest official GitHub Release and verifies its SHA-256 before installation. The Dots package contains no tunnel-client executable. Only the current installed client and one previous version are retained; an older executable still in use is cleaned up after its process stops.
4. **Register and install in ChatGPT.** On the web, open [Plugins](https://chatgpt.com/plugins) → **＋ / Add → Add custom MCP server**, choose **Tunnel** and enter its ID. Select **No authentication**, acknowledge the official notice and choose **Create as a plugin**. Install it under Personal plugins and enable it in Dot → **Customize → Plugins**.
5. **Make a real call.** Ask your Dot to call `dsh_status` and list sessions. Refresh Dots settings to see the received tool call.

An existing HTTPS forwarding endpoint can instead be entered above and registered using **Server URL**, without a tunnel. The full MCP URL contains an access key; hide it in screenshots and shared logs.

[Update and verification](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.1-test.6/docs/releases/v2.0.1-test.6.md) · [Official tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) · [Official MCP registration](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)

## Everyday use

After connecting, ask your Dot to read data from a chosen workspace, prepare a report and save it. Continue in the same session to add instructions, retrieve results or cancel a task. Available tools follow the configuration of that DSH environment.

Dot in the embedded DSH page and Dot in the ChatGPT mobile app can use the configured remote connection to reach the same DSH environment. Keep the computer's DSH and tunnel or HTTPS service running for remote access.

## Updates and feedback

The [2.0.0 release notes](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.0/docs/releases/v2.0.0.en.md) contain actual screenshots, native-environment checks and the two-turn file-task experiment. See the [changelog](CHANGELOG.md) for other versions.

When reporting an [issue](https://github.com/Tests4gptplay/dsh-dots/issues), include your DSH version, operating system and error message. Remove connection keys from screenshots and logs.

## Support the project

Thank you for supporting DSH Dots development and maintenance. [Donations and sponsorship](SPONSOR.md) · [Ko-fi](https://ko-fi.com/kou392350) · [Alipay](SPONSOR.md#alipay--支付宝)
