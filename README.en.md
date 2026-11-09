# DSH Dots

Use [ChatGPT Dots](https://chatgpt.com/dots/home) inside DeepSeek Harness, and let your real Dot operate DSH sessions, tools and workspaces through MCP.

The Desktop page preloads on startup and remains loaded when switching panels. Controls and the ring icon follow DSH's theme, with Chinese/English labels, refresh and external-browser opening. Sign in on the official ChatGPT page.

## Settings

**DSH → Settings → Dots** contains the existing Desktop login retention controls and the optional **MCP Server**, initially **off**. The switch is saved per DSH profile. The same page provides status, copyable connection URLs, a local check, the last tool call, tool descriptions and official setup links.

Turning MCP off closes external access; DSH continues to manage sessions already submitted.

## Connect your Dot

Enable MCP and run the local check. Follow the [official Secure MCP Tunnel guide](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels), pointing its HTTP target at the local MCP URL. Alternatively, forward an existing HTTPS endpoint to the local port, retain the complete MCP path, and save the HTTPS forwarding origin.

Follow the [official registration guide](https://developers.openai.com/plugins/deploy/connect-chatgpt). In ChatGPT on the web, open **Plugins → + → Add custom MCP server**, choose the tunnel or enter the HTTPS MCP URL, and select **No authentication**: this service authenticates through the access key in its complete URL. That URL grants control of this DSH environment; share it only with authorized clients. Rotate the connection key in Settings to revoke an old URL.

Create and install the connection, then enable it in your [Dot's plugin configuration](https://help.openai.com/en/articles/20001530-getting-started-with-your-dot). Ask your Dot to call `dsh_status` and list sessions, then create a session and submit a task. Use state, events and results to continue. The official configuration page shows account and workspace permissions.

## MCP tools

The 16 tools cover environment/session discovery, session creation, prompts and follow-ups, state/events/results, cancellation, model choices, and discovery, description, invocation and snapshots of DSH's native APIs. Native tool invocation exposes the tools enabled in a DSH session, including file operations, commands, workspace and plugin capabilities. Image results are returned as MCP image content.

DSH owns execution, sessions, records and permissions. Desktop and remote Dot connections use the same service; keep DSH and the connection service running for remote access.

[Project](https://github.com/Tests4gptplay/dsh-dots) · [Releases](https://github.com/Tests4gptplay/dsh-dots/releases) · [Issues](https://github.com/Tests4gptplay/dsh-dots/issues)
