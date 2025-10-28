/**
 * SQLite database for caching feed items
 */

import Database from 'better-sqlite3';
import { FeedItem } from '../types.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FeedDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(__dirname, '../../cache.db');
    this.db = new Database(dbPath || defaultPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feed_items (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        content TEXT,
        author TEXT,
        points INTEGER,
        comments INTEGER,
        published_at INTEGER NOT NULL,
        cached_at INTEGER NOT NULL,
        rank_score REAL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_source ON feed_items(source);
      CREATE INDEX IF NOT EXISTS idx_published_at ON feed_items(published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_cached_at ON feed_items(cached_at DESC);
    `);

    // Add rank_score column if it doesn't exist (for existing databases)
    try {
      this.db.exec('ALTER TABLE feed_items ADD COLUMN rank_score REAL DEFAULT 0');
    } catch (e) {
      // Column already exists, ignore error
    }

    // Create index for rank_score after ensuring column exists
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_rank_score ON feed_items(rank_score DESC)');
  }

  saveFeedItem(item: FeedItem): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO feed_items
      (id, source, title, url, content, author, points, comments, published_at, cached_at, rank_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.source,
      item.title,
      item.url,
      item.content || null,
      item.author || null,
      item.points || null,
      item.comments || null,
      Math.floor(item.published_at.getTime() / 1000),
      Math.floor(item.cached_at.getTime() / 1000),
      item.rank_score || 0
    );
  }

  saveFeedItems(items: FeedItem[]): void {
    const transaction = this.db.transaction((items: FeedItem[]) => {
      for (const item of items) {
        this.saveFeedItem(item);
      }
    });
    transaction(items);
  }

  getFeedItems(options: {
    source?: string;
    limit?: number;
    since?: Date;
  }): FeedItem[] {
    let query = 'SELECT * FROM feed_items WHERE 1=1';
    const params: any[] = [];

    if (options.source) {
      query += ' AND source = ?';
      params.push(options.source);
    }

    if (options.since) {
      query += ' AND published_at >= ?';
      params.push(Math.floor(options.since.getTime() / 1000));
    }

    query += ' ORDER BY rank_score DESC, published_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      source: row.source,
      title: row.title,
      url: row.url,
      content: row.content,
      author: row.author,
      points: row.points,
      comments: row.comments,
      published_at: new Date(row.published_at * 1000),
      cached_at: new Date(row.cached_at * 1000),
      rank_score: row.rank_score
    }));
  }

  searchFeedItems(query: string, limit: number = 50): FeedItem[] {
    const searchQuery = `%${query}%`;
    const rows = this.db.prepare(`
      SELECT * FROM feed_items
      WHERE title LIKE ? OR content LIKE ?
      ORDER BY rank_score DESC, published_at DESC
      LIMIT ?
    `).all(searchQuery, searchQuery, limit) as any[];

    return rows.map(row => ({
      id: row.id,
      source: row.source,
      title: row.title,
      url: row.url,
      content: row.content,
      author: row.author,
      points: row.points,
      comments: row.comments,
      published_at: new Date(row.published_at * 1000),
      cached_at: new Date(row.cached_at * 1000),
      rank_score: row.rank_score
    }));
  }

  getAllSources(): string[] {
    const rows = this.db.prepare('SELECT DISTINCT source FROM feed_items').all() as any[];
    return rows.map(row => row.source);
  }

  clearOldItems(daysToKeep: number = 7): number {
    const cutoffDate = Math.floor(Date.now() / 1000) - (daysToKeep * 24 * 60 * 60);
    const result = this.db.prepare('DELETE FROM feed_items WHERE cached_at < ?').run(cutoffDate);
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}
