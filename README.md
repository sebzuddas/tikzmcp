# TikZ MCP Server

A Model Context Protocol (MCP) server that enables LLMs to generate and render TikZ diagrams (LaTeX).

## Installation

### Using uv (Recommended)

You can install `tikzmcp` directly using `uv`:

```bash
uv tool install tikzmcp
```

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tikzmcp.git
   cd tikzmcp
   ```

2. Install dependencies:
   ```bash
   uv sync
   ```

## Configuration

### Claude Desktop

To use this server with Claude Desktop, add the following configuration to your `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "tikzmcp": {
      "command": "uv",
      "args": [
        "tool",
        "run",
        "tikzmcp"
      ]
    }
  }
}
```

### Cursor

1. Open Cursor Settings.
2. Navigate to **Features** > **MCP**.
3. Click **+ Add New MCP Server**.
4. Enter the following details:
   - **Name**: `tikzmcp`
   - **Type**: `command`
   - **Command**: `uv tool run tikzmcp` (or the full path to your installation)

## Usage

Once connected, you can ask Claude or your MCP-enabled editor to "Generate a TikZ diagram for a binary tree" or "Draw a circuit diagram using TikZ".
