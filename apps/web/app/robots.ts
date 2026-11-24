import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site';

/** Paths that are private, machine-only or cost money to crawl. */
const DISALLOW = [
  '/dashboard',
  '/moderator',
  '/jga4rm8j',
  '/api/',
  '/login',
  '/register',
  '/payments/simulate',
];

/**
 * AI answer/retrieval crawlers we explicitly welcome.
 *
 * The site is a public local-business directory, so being cited by ChatGPT,
 * Perplexity, Claude, Gemini and Copilot is a distribution channel. Naming each
 * agent (instead of relying on `*`) makes the intent explicit and keeps the
 * same private-area exclusions for all of them.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'CCBot',
  'Bytespider',
  'meta-externalagent',
  'cohere-ai',
  'DuckAssistBot',
];

/**
 * robots.txt. Private areas (dashboard, admin, auth and the API/proxy) are
 * disallowed so crawlers spend their budget on the public directory, while the
 * sitemap and the LLM index (`/llms.txt`) are advertised for fast discovery.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOW,
      })),
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
