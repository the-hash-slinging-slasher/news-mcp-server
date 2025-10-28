/**
 * Configuration management for RSS feeds and other sources
 */

import { FeedConfig, RSSFeedConfig } from '../types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConfigManager {
  private configPath: string;
  private config: FeedConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(__dirname, '../../config/feeds.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): FeedConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }

    // Return default config
    return {
      rss_feeds: []
    };
  }

  private saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  getRSSFeeds(): RSSFeedConfig[] {
    return this.config.rss_feeds;
  }

  addRSSFeed(feed: RSSFeedConfig): void {
    // Check if feed already exists
    const exists = this.config.rss_feeds.some(f => f.url === feed.url);
    if (exists) {
      throw new Error(`RSS feed with URL ${feed.url} already exists`);
    }

    this.config.rss_feeds.push(feed);
    this.saveConfig();
  }

  removeRSSFeed(name: string): boolean {
    const initialLength = this.config.rss_feeds.length;
    this.config.rss_feeds = this.config.rss_feeds.filter(f => f.name !== name);

    if (this.config.rss_feeds.length < initialLength) {
      this.saveConfig();
      return true;
    }
    return false;
  }

  getAllSources(): string[] {
    const sources = ['hackernews'];
    this.config.rss_feeds.forEach(feed => {
      sources.push(`rss:${feed.name}`);
    });
    return sources;
  }
}
