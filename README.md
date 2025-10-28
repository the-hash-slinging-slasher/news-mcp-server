# News MCP Server

A Model Context Protocol (MCP) server that aggregates news from multiple sources:
- **Hacker News** (top, best, new stories)
- **RSS Feeds** (configurable)
- **Twitter** (planned)
- **Bluesky** (planned)

## Features

- 📰 Multiple news sources in one place
- 💾 SQLite caching for fast access and offline reading
- 🔍 Search across all cached items
- ⚙️ Easy configuration via JSON
- 🔄 Automatic feed refresh

## Installation

```bash
cd ~/src/news-mcp-server
npm install
npm run build
```

## Configuration

### Project-Specific Setup (Recommended)

This project includes a `.claude/mcp_settings.json` file that automatically enables the news MCP server when you open Claude Code in this directory.

**To use:**
1. Open a new terminal
2. Navigate to this directory: `cd ~/src/news-mcp-server`
3. Start Claude Code in this directory
4. The news MCP server will be automatically available!

### Global Configuration (Optional)

If you want the news server available in all Claude Code sessions, add this to your global Claude Code MCP settings:

```json
{
  "mcpServers": {
    "news": {
      "command": "node",
      "args": ["/Users/norm.provost/src/news-mcp-server/build/index.js"]
    }
  }
}
```

### RSS Feed Configuration

Create `config/feeds.json` (see `config/feeds.json.example` for template):

```json
{
  "rss_feeds": [
    {
      "name": "techcrunch",
      "url": "https://techcrunch.com/feed/",
      "refresh_interval_minutes": 30
    }
  ]
}
```

## Usage

### Available Resources

Access feeds directly as resources:
- `feed://hackernews` - Hacker News top stories
- `feed://rss:techcrunch` - Specific RSS feed
- `feed://all` - All sources combined

### Available Tools

#### `list_sources`
List all configured feed sources.

#### `get_feed`
Fetch latest items from sources.

```
Parameters:
- source (optional): "hackernews", "rss:techcrunch", or "all"
- limit (optional): Max items to return (default: 30)
- hours_ago (optional): Only return items from last N hours
```

#### `refresh_cache`
Refresh cached data by fetching from sources.

```
Parameters:
- source (optional): Specific source to refresh, or all if not specified
```

#### `search_all`
Search across all cached items.

```
Parameters:
- query (required): Search query
- limit (optional): Max results (default: 50)
```

#### `add_rss_feed`
Add a new RSS feed source.

```
Parameters:
- name (required): Feed name (e.g., "techcrunch")
- url (required): RSS feed URL
```

#### `remove_rss_feed`
Remove an RSS feed source.

```
Parameters:
- name (required): Feed name to remove
```

## Examples

### In Claude Code

```
# Refresh Hacker News cache and read it
refresh_cache with source=hackernews
get_feed with source=hackernews limit=10

# Add a new RSS feed
add_rss_feed with name=arstechnica url=https://feeds.arstechnica.com/arstechnica/index

# Search for AI-related articles
search_all with query=AI limit=20

# Get recent items from all sources
get_feed with source=all hours_ago=24
```

## Database

Feed items are cached in `cache.db` (SQLite). Old items are automatically cleaned after 7 days.

## Development

```bash
# Build
npm run build

# Watch mode for development
npm run watch
```

## Future Enhancements

- [ ] Twitter integration (requires API key)
- [ ] Bluesky AT Protocol integration
- [ ] Automatic periodic refresh
- [ ] Custom filters and rules
- [ ] Export functionality
- [ ] Web interface for configuration

## Architecture

```
src/
├── index.ts              # Main MCP server
├── types.ts              # TypeScript types
├── sources/
│   ├── base.ts           # Source interface
│   ├── hackernews.ts     # Hacker News API
│   └── rss.ts            # RSS parser
└── storage/
    ├── database.ts       # SQLite operations
    └── config.ts         # Feed configuration
```

## License

MIT
