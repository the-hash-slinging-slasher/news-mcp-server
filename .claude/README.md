# Project-Specific MCP Configuration

This directory contains project-specific MCP server configuration for Claude Code.

When you open Claude Code in the `news-mcp-server` directory, the `news` MCP server will be automatically available.

## Usage

1. Open a new terminal/Claude Code session in this directory:
   ```bash
   cd ~/src/news-mcp-server
   claude-code  # or however you launch Claude Code
   ```

2. The news MCP server will be automatically loaded and available

3. Try these commands:
   ```
   list_sources
   refresh_cache
   get_feed with source=hackernews limit=10
   ```

## Configuration File

The `mcp_settings.json` file in this directory defines the MCP server configuration. It's automatically detected by Claude Code when working in this project.
