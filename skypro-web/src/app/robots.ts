import type { MetadataRoute } from 'next'

const SITE_URL = 'https://skypro.skywaveads.com'

// AEO (Answer Engine Optimization) — explicitly opt-in to every major
// AI search/answer crawler so SkyPro shows up in ChatGPT search,
// Perplexity, Claude, Gemini, You.com, Bing Copilot, Brave Search, etc.
const AI_CRAWLERS = [
  'GPTBot',               // OpenAI
  'OAI-SearchBot',        // OpenAI search index
  'ChatGPT-User',         // ChatGPT browse-as-user
  'CCBot',                // Common Crawl (powers many LLMs)
  'ClaudeBot',            // Anthropic
  'Claude-Web',           // Anthropic web access
  'anthropic-ai',         // legacy Anthropic
  'Google-Extended',      // Gemini training opt-in
  'GoogleOther',          // Google additional crawler
  'PerplexityBot',        // Perplexity
  'Perplexity-User',      // Perplexity user-agent fetch
  'YouBot',               // You.com
  'Applebot',             // Apple Intelligence + Siri
  'Applebot-Extended',    // Apple AI training
  'Bytespider',           // Doubao / TikTok AI
  'DuckAssistBot',        // DuckDuckGo Assist
  'cohere-ai',            // Cohere training
  'cohere-training-data-crawler',
  'meta-externalagent',   // Meta AI
  'FacebookBot',          // Meta general
  'Amazonbot',            // Alexa
  'Bingbot',              // Microsoft (Bing + Copilot)
  'msnbot',               // Microsoft (legacy)
  'PetalBot',             // Huawei
  'YandexBot',            // Yandex (also AI-trained)
  'Twitterbot',           // X share cards
  'LinkedInBot',          // LinkedIn share cards
  'WhatsApp',             // WhatsApp link previews
  'TelegramBot',          // Telegram link previews
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default — every other bot/user-agent
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/dashboard',
          '/dashboard/',
          '/auth/callback',
          '/auth/verify-email',
          '/auth/reset-password',
          '/auth/email-change/',
        ],
      },
      // Explicit allowlist for AI/answer engines — same restrictions but
      // listing them gives them clear permission to index our public content
      {
        userAgent: AI_CRAWLERS,
        allow: '/',
        disallow: ['/admin', '/api', '/dashboard', '/auth/callback', '/auth/verify-email', '/auth/reset-password', '/auth/email-change/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
