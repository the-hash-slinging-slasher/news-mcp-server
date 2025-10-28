/**
 * Ranking system for news feed items
 * Scores items based on relevance, engagement, and user preferences
 */

import { FeedItem } from './types.js';

/**
 * High-priority topics that should be boosted
 */
const BOOST_KEYWORDS = {
  // Tools the user cares about
  tools: {
    keywords: [
      'claude-code', 'claude code', 'vscode', 'vs code', 'visual studio code',
      'github', 'aws', 'cloudflare', 'cursor', 'ruby on rails', 'rails',
      'copilot', 'typescript', 'react', 'node.js', 'nodejs'
    ],
    weight: 50
  },

  // AI development techniques
  aiTechniques: {
    keywords: [
      'ai development', 'prompt engineering', 'llm', 'agent', 'agents',
      'langchain', 'openai', 'anthropic', 'claude', 'gpt',
      'embeddings', 'rag', 'fine-tuning', 'ai coding', 'code generation',
      'mcp', 'model context protocol'
    ],
    weight: 30
  },

  // Security techniques
  securityTechniques: {
    keywords: [
      'app security', 'application security', 'appsec', 'vulnerability',
      'pentest', 'penetration testing', 'exploit', 'security testing',
      'owasp', 'xss', 'sql injection', 'csrf', 'authentication',
      'authorization', 'secure coding', 'security audit'
    ],
    weight: 30
  },

  // Practical, actionable content
  practicalContent: {
    keywords: [
      'how to', 'tutorial', 'guide', 'technique', 'best practices',
      'deep dive', 'case study', 'implementation', 'walkthrough',
      'explained', 'introducing', 'new feature', 'update', 'release'
    ],
    weight: 20
  }
};

/**
 * Low-priority topics that should be penalized
 */
const PENALTY_KEYWORDS = {
  // Funding and valuation news
  funding: {
    keywords: [
      'raises', 'funding', 'series a', 'series b', 'series c',
      'valuation', 'ipo', 'acquisition', 'acquires', 'invested',
      'investment', 'venture capital', 'vc', 'seed round'
    ],
    weight: -40
  },

  // Generic industry fluff
  genericHype: {
    keywords: [
      'announces partnership', 'strategic partnership', 'collaboration',
      'expands into', 'appoints', 'names', 'ceo', 'rebrands'
    ],
    weight: -20
  }
};

/**
 * Calculate keyword score by checking title and content
 */
function calculateKeywordScore(item: FeedItem): number {
  const text = `${item.title} ${item.content || ''}`.toLowerCase();
  let score = 0;

  // Apply boosts
  for (const category of Object.values(BOOST_KEYWORDS)) {
    for (const keyword of category.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += category.weight;
        break; // Only count once per category
      }
    }
  }

  // Apply penalties
  for (const category of Object.values(PENALTY_KEYWORDS)) {
    for (const keyword of category.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += category.weight; // Already negative
        break; // Only count once per category
      }
    }
  }

  return score;
}

/**
 * Calculate engagement score from HN metrics
 */
function calculateEngagementScore(item: FeedItem): number {
  let score = 0;

  if (item.points) {
    score += item.points * 0.1; // Each upvote worth 0.1 points
  }

  if (item.comments) {
    score += item.comments * 0.05; // Each comment worth 0.05 points
  }

  return score;
}

/**
 * Calculate recency score with time decay
 * Recent items get higher scores, but not overwhelmingly so
 */
function calculateRecencyScore(item: FeedItem): number {
  const ageInHours = (Date.now() - item.published_at.getTime()) / (1000 * 60 * 60);

  // Linear decay from 100 to 0 over 100 hours (~4 days)
  // This ensures recent content is preferred but not dominant
  return Math.max(0, 100 - ageInHours);
}

/**
 * Calculate source quality score
 * Technical blogs and practitioner content get higher scores
 */
function calculateSourceScore(item: FeedItem): number {
  const source = item.source.toLowerCase();

  // High-quality technical sources
  const premiumSources = [
    'hackernews',
    'rss:awsblog',
    'rss:cloudflare',
    'rss:github',
    'rss:tldr-ai',
    'rss:tldr-infosec',
    'rss:krebs'
  ];

  // General tech news (less technical)
  const generalSources = [
    'rss:techcrunch',
    'rss:verge'
  ];

  if (premiumSources.some(s => source.includes(s))) {
    return 20;
  } else if (generalSources.some(s => source.includes(s))) {
    return -10; // Slight penalty for general tech news
  }

  return 0; // Neutral for other sources
}

/**
 * Calculate overall rank score for a feed item
 */
export function calculateRankScore(item: FeedItem): number {
  const keywordScore = calculateKeywordScore(item);
  const engagementScore = calculateEngagementScore(item);
  const recencyScore = calculateRecencyScore(item);
  const sourceScore = calculateSourceScore(item);

  // Combine all scores
  const totalScore = keywordScore + engagementScore + recencyScore + sourceScore;

  // Ensure score is non-negative
  return Math.max(0, totalScore);
}

/**
 * Calculate rank scores for multiple items
 */
export function calculateRankScores(items: FeedItem[]): Map<string, number> {
  const scores = new Map<string, number>();

  for (const item of items) {
    scores.set(item.id, calculateRankScore(item));
  }

  return scores;
}

/**
 * Sort feed items by rank score (descending)
 */
export function sortByRankScore(items: FeedItem[]): FeedItem[] {
  return items.sort((a, b) => {
    const scoreA = calculateRankScore(a);
    const scoreB = calculateRankScore(b);
    return scoreB - scoreA; // Descending order
  });
}
