/**
 * Base interface for feed sources
 */

import { FeedItem } from '../types.js';

export interface FeedSource {
  name: string;
  fetchFeed(limit?: number): Promise<FeedItem[]>;
}
