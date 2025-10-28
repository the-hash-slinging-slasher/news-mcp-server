/**
 * Hacker News API integration
 */

import { FeedItem } from '../types.js';
import { FeedSource } from './base.js';
import { calculateRankScore } from '../ranking.js';

interface HNStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  time: number;
  score: number;
  descendants: number;
  type: string;
}

export class HackerNewsSource implements FeedSource {
  readonly name = 'hackernews';
  private baseUrl = 'https://hacker-news.firebaseio.com/v0';

  async fetchFeed(limit: number = 30): Promise<FeedItem[]> {
    try {
      // Fetch top story IDs
      const response = await fetch(`${this.baseUrl}/topstories.json`);
      const storyIds: number[] = await response.json();

      // Fetch details for the first N stories
      const storyPromises = storyIds.slice(0, limit).map(id =>
        this.fetchStory(id)
      );

      const stories = await Promise.all(storyPromises);
      const now = new Date();

      const items = stories
        .filter((story): story is HNStory => story !== null)
        .map(story => {
          const item: FeedItem = {
            id: `hn:${story.id}`,
            source: 'hackernews',
            title: story.title,
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            content: story.text,
            author: story.by,
            points: story.score,
            comments: story.descendants,
            published_at: new Date(story.time * 1000),
            cached_at: now
          };

          // Calculate and add rank score
          item.rank_score = calculateRankScore(item);

          return item;
        });

      return items;
    } catch (error) {
      console.error('Error fetching Hacker News feed:', error);
      throw error;
    }
  }

  private async fetchStory(id: number): Promise<HNStory | null> {
    try {
      const response = await fetch(`${this.baseUrl}/item/${id}.json`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching HN story ${id}:`, error);
      return null;
    }
  }

  async fetchBestStories(limit: number = 30): Promise<FeedItem[]> {
    const response = await fetch(`${this.baseUrl}/beststories.json`);
    const storyIds: number[] = await response.json();

    const storyPromises = storyIds.slice(0, limit).map(id => this.fetchStory(id));
    const stories = await Promise.all(storyPromises);
    const now = new Date();

    const items = stories
      .filter((story): story is HNStory => story !== null)
      .map(story => {
        const item: FeedItem = {
          id: `hn:${story.id}`,
          source: 'hackernews:best',
          title: story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          content: story.text,
          author: story.by,
          points: story.score,
          comments: story.descendants,
          published_at: new Date(story.time * 1000),
          cached_at: now
        };

        // Calculate and add rank score
        item.rank_score = calculateRankScore(item);

        return item;
      });

    return items;
  }

  async fetchNewStories(limit: number = 30): Promise<FeedItem[]> {
    const response = await fetch(`${this.baseUrl}/newstories.json`);
    const storyIds: number[] = await response.json();

    const storyPromises = storyIds.slice(0, limit).map(id => this.fetchStory(id));
    const stories = await Promise.all(storyPromises);
    const now = new Date();

    const items = stories
      .filter((story): story is HNStory => story !== null)
      .map(story => {
        const item: FeedItem = {
          id: `hn:${story.id}`,
          source: 'hackernews:new',
          title: story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          content: story.text,
          author: story.by,
          points: story.score,
          comments: story.descendants,
          published_at: new Date(story.time * 1000),
          cached_at: now
        };

        // Calculate and add rank score
        item.rank_score = calculateRankScore(item);

        return item;
      });

    return items;
  }
}
