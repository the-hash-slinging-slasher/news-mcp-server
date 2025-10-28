/**
 * RSS feed parser integration
 */

import Parser from 'rss-parser';
import { FeedItem } from '../types.js';
import { FeedSource } from './base.js';
import { calculateRankScore } from '../ranking.js';

export class RSSFeedSource implements FeedSource {
  readonly name: string;
  private url: string;
  private parser: Parser;

  constructor(name: string, url: string) {
    this.name = name;
    this.url = url;
    this.parser = new Parser({
      timeout: 10000,
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['description', 'description']
        ]
      }
    });
  }

  async fetchFeed(limit: number = 50): Promise<FeedItem[]> {
    try {
      const feed = await this.parser.parseURL(this.url);
      const now = new Date();

      const items = feed.items.slice(0, limit).map(item => {
        const content = (item as any).contentEncoded || item.content || item.description || '';
        const publishedDate = item.pubDate ? new Date(item.pubDate) : new Date();

        const feedItem: FeedItem = {
          id: `rss:${this.name}:${item.guid || item.link || item.title}`,
          source: `rss:${this.name}`,
          title: item.title || 'Untitled',
          url: item.link || '',
          content: this.stripHtml(content),
          author: item.creator || item.author,
          published_at: publishedDate,
          cached_at: now
        };

        // Calculate and add rank score
        feedItem.rank_score = calculateRankScore(feedItem);

        return feedItem;
      });

      return items;
    } catch (error) {
      console.error(`Error fetching RSS feed ${this.name}:`, error);
      throw error;
    }
  }

  private stripHtml(html: string): string {
    // Basic HTML stripping - removes tags but keeps text
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}
