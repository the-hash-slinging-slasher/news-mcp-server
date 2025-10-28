#!/usr/bin/env node

/**
 * News MCP Server
 * Aggregates news from Hacker News, RSS feeds, Twitter, and Bluesky
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { FeedDatabase } from './storage/database.js';
import { ConfigManager } from './storage/config.js';
import { HackerNewsSource } from './sources/hackernews.js';
import { RSSFeedSource } from './sources/rss.js';
import { FeedItem } from './types.js';

class NewsMCPServer {
  private server: Server;
  private db: FeedDatabase;
  private config: ConfigManager;
  private hnSource: HackerNewsSource;

  constructor() {
    this.server = new Server(
      {
        name: 'news-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.db = new FeedDatabase();
    this.config = new ConfigManager();
    this.hnSource = new HackerNewsSource();

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      this.db.close();
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    // List available resources (feeds)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const sources = this.config.getAllSources();
      const resources = sources.map(source => ({
        uri: `feed://${source}`,
        mimeType: 'application/json',
        name: `${source} feed`,
        description: `Latest items from ${source}`
      }));

      // Add aggregated feed
      resources.push({
        uri: 'feed://all',
        mimeType: 'application/json',
        name: 'All feeds',
        description: 'Aggregated feed from all sources'
      });

      return { resources };
    });

    // Read a specific resource (feed)
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const match = uri.match(/^feed:\/\/(.+)$/);

      if (!match) {
        throw new Error(`Invalid feed URI: ${uri}`);
      }

      const source = match[1];
      let items: FeedItem[];

      if (source === 'all') {
        items = this.db.getFeedItems({ limit: 50 });
      } else {
        items = this.db.getFeedItems({ source, limit: 50 });
      }

      const content = this.formatFeedItems(items);

      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: content
          }
        ]
      };
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_sources',
            description: 'List all configured feed sources',
            inputSchema: {
              type: 'object',
              properties: {},
            }
          },
          {
            name: 'get_feed',
            description: 'Fetch latest items from a specific source or all sources',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Feed source (e.g., "hackernews", "rss:techcrunch", "all")',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of items to return (default: 30)',
                  default: 30
                },
                hours_ago: {
                  type: 'number',
                  description: 'Only return items from the last N hours',
                }
              }
            }
          },
          {
            name: 'refresh_cache',
            description: 'Refresh the cache by fetching latest items from all sources',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  description: 'Specific source to refresh (optional, refreshes all if not specified)',
                }
              }
            }
          },
          {
            name: 'search_all',
            description: 'Search across all cached feed items',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 50)',
                  default: 50
                }
              },
              required: ['query']
            }
          },
          {
            name: 'add_rss_feed',
            description: 'Add a new RSS feed source',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name for this RSS feed (e.g., "techcrunch")',
                },
                url: {
                  type: 'string',
                  description: 'RSS feed URL',
                }
              },
              required: ['name', 'url']
            }
          },
          {
            name: 'remove_rss_feed',
            description: 'Remove an RSS feed source',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the RSS feed to remove',
                }
              },
              required: ['name']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'list_sources':
          return this.handleListSources();

        case 'get_feed':
          return this.handleGetFeed(args as any);

        case 'refresh_cache':
          return this.handleRefreshCache(args as any);

        case 'search_all':
          return this.handleSearchAll(args as any);

        case 'add_rss_feed':
          return this.handleAddRSSFeed(args as any);

        case 'remove_rss_feed':
          return this.handleRemoveRSSFeed(args as any);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleListSources() {
    const sources = this.config.getAllSources();
    const dbSources = this.db.getAllSources();

    return {
      content: [
        {
          type: 'text',
          text: `Configured sources:\n${sources.join('\n')}\n\nSources with cached data:\n${dbSources.join('\n')}`
        }
      ]
    };
  }

  private async handleGetFeed(args: { source?: string; limit?: number; hours_ago?: number }) {
    const { source, limit = 30, hours_ago } = args;

    let since: Date | undefined;
    if (hours_ago) {
      since = new Date(Date.now() - hours_ago * 60 * 60 * 1000);
    }

    const items = this.db.getFeedItems({
      source: source && source !== 'all' ? source : undefined,
      limit,
      since
    });

    return {
      content: [
        {
          type: 'text',
          text: this.formatFeedItems(items)
        }
      ]
    };
  }

  private async handleRefreshCache(args: { source?: string }) {
    const { source } = args;
    const results: string[] = [];

    try {
      if (!source || source === 'hackernews') {
        const hnItems = await this.hnSource.fetchFeed(30);
        this.db.saveFeedItems(hnItems);
        results.push(`Refreshed Hacker News: ${hnItems.length} items`);
      }

      if (!source || source.startsWith('rss:')) {
        const rssFeeds = this.config.getRSSFeeds();
        const feedsToRefresh = source
          ? rssFeeds.filter(f => `rss:${f.name}` === source)
          : rssFeeds;

        for (const feed of feedsToRefresh) {
          try {
            const rssSource = new RSSFeedSource(feed.name, feed.url);
            const items = await rssSource.fetchFeed(50);
            this.db.saveFeedItems(items);
            results.push(`Refreshed ${feed.name}: ${items.length} items`);
          } catch (error) {
            results.push(`Failed to refresh ${feed.name}: ${error}`);
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: results.join('\n')
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to refresh cache: ${error}`);
    }
  }

  private async handleSearchAll(args: { query: string; limit?: number }) {
    const { query, limit = 50 } = args;
    const items = this.db.searchFeedItems(query, limit);

    return {
      content: [
        {
          type: 'text',
          text: this.formatFeedItems(items)
        }
      ]
    };
  }

  private async handleAddRSSFeed(args: { name: string; url: string }) {
    const { name, url } = args;

    try {
      this.config.addRSSFeed({ name, url });
      return {
        content: [
          {
            type: 'text',
            text: `Successfully added RSS feed: ${name} (${url})`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to add RSS feed: ${error}`);
    }
  }

  private async handleRemoveRSSFeed(args: { name: string }) {
    const { name } = args;
    const removed = this.config.removeRSSFeed(name);

    if (removed) {
      return {
        content: [
          {
            type: 'text',
            text: `Successfully removed RSS feed: ${name}`
          }
        ]
      };
    } else {
      throw new Error(`RSS feed not found: ${name}`);
    }
  }

  private formatFeedItems(items: FeedItem[]): string {
    if (items.length === 0) {
      return 'No items found. Try refreshing the cache with the refresh_cache tool.';
    }

    return items.map(item => {
      const parts = [
        `## ${item.title}`,
        `**Source:** ${item.source}`,
        `**URL:** ${item.url}`,
      ];

      if (item.rank_score !== undefined) {
        parts.push(`**Rank Score:** ${item.rank_score.toFixed(1)}`);
      }

      if (item.author) {
        parts.push(`**Author:** ${item.author}`);
      }

      if (item.points !== undefined) {
        parts.push(`**Points:** ${item.points}`);
      }

      if (item.comments !== undefined) {
        parts.push(`**Comments:** ${item.comments}`);
      }

      parts.push(`**Published:** ${item.published_at.toLocaleString()}`);

      if (item.content) {
        const preview = item.content.substring(0, 200);
        parts.push(`\n${preview}${item.content.length > 200 ? '...' : ''}`);
      }

      parts.push('---\n');

      return parts.join('\n');
    }).join('\n');
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('News MCP Server running on stdio');
  }
}

const server = new NewsMCPServer();
server.run().catch(console.error);
