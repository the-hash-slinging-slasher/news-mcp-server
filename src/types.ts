/**
 * Core types for the news MCP server
 */

export interface FeedItem {
  id: string;
  source: string; // e.g., 'hackernews', 'rss:techcrunch'
  title: string;
  url: string;
  content?: string;
  author?: string;
  points?: number; // For HN stories
  comments?: number; // For HN stories
  published_at: Date;
  cached_at: Date;
  rank_score?: number; // Calculated ranking score for sorting
}

export interface FeedSource {
  id: string;
  type: 'hackernews' | 'rss' | 'twitter' | 'bluesky';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface RSSFeedConfig {
  url: string;
  name: string;
  refresh_interval_minutes?: number;
}

export interface FeedConfig {
  rss_feeds: RSSFeedConfig[];
}

export interface GetFeedOptions {
  source?: string;
  limit?: number;
  hours_ago?: number;
}
