# DSH Dots 2.0.0

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
github:Tests4gptplay/dsh-dots#2.0.0
```

This page describes the `2.0.0` development branch. Published versions and packages are available under [Releases](https://github.com/Tests4gptplay/dsh-dots/releases).

Open **DSH Dots** in the sidebar and sign in on the official ChatGPT page. Manage login retention and MCP under **DSH → Settings → Dots**.

## Connect your Dot

1. **Enable the service.** Turn on MCP, select **Check local connection**, and copy the local MCP URL from Settings.
2. **Connect the endpoint.** Follow the [official Secure MCP Tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) and use that URL as the tunnel target. Alternatively, forward an existing HTTPS endpoint to the local service, preserve the complete MCP path, save the forwarding origin in Settings, and copy the generated registration URL.
3. **Register in ChatGPT.** Follow the [official MCP registration guide](https://developers.openai.com/plugins/deploy/connect-chatgpt). On the web, open **Plugins → + → Add custom MCP server** and select the tunnel or enter the HTTPS URL. This plugin authenticates using the access key in its full URL; select **No authentication** in the form.
4. **Enable it for your Dot.** Create and install the connection, then enable it in your [Dot's plugin settings](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot). Start by asking your Dot to check DSH status and list sessions, then submit a task. Settings shows the actual tool calls received.

The connection URL grants access to the current DSH environment. Share it only with authorized clients; use the connection-key rotation control when replacing access credentials. The official registration page shows the options available for your account and workspace.

## Everyday use

After connecting, ask your Dot to read data from a chosen workspace, prepare a report and save it. Continue in the same session to add instructions, retrieve results or cancel a task. Available tools follow the configuration of that DSH environment.

Dot in the embedded DSH page and Dot in the ChatGPT mobile app can use the configured remote connection to reach the same DSH environment. Keep the computer's DSH and tunnel or HTTPS service running for remote access.

## Updates and feedback

The [2.0.0 release notes](https://github.com/Tests4gptplay/dsh-dots/blob/2.0.0/docs/releases/v2.0.0.en.md) contain actual screenshots, native-environment checks and the two-turn file-task experiment. See the [changelog](CHANGELOG.md) for other versions.

When reporting an [issue](https://github.com/Tests4gptplay/dsh-dots/issues), include your DSH version, operating system and error message. Remove connection keys from screenshots and logs.

## Support the project

Thank you for supporting DSH Dots development and maintenance. [Donations and sponsorship](SPONSOR.md) · [Ko-fi](https://ko-fi.com/kou392350) · [Alipay](SPONSOR.md#alipay--支付宝)
