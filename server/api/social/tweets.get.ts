import type { Tweet } from '~~/types/tweet';

const TWITTER_USERNAME = 'ViePubliqueSN';

/**
 * Decode les entités HTML basiques
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Nettoie le HTML d'une description RSS pour ne garder que le texte
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

/**
 * Parse le flux RSS XML et extrait les tweets originaux (sans RT)
 */
function parseTweetsFromRss(xml: string): Tweet[] {
  const tweets: Tweet[] = [];

  // Extraire tous les <item> du flux
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const item = itemMatch[1];

    // Extraire le titre
    const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/);
    const title = decodeHtmlEntities(titleMatch?.[1] || titleMatch?.[2] || '');

    // Filtrer les retweets : ignorer si le titre commence par "RT by" ou "RT @"
    if (title.match(/^RT\s+(by\s+)?@/i)) continue;

    // Extraire le lien
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
    const link = linkMatch?.[1]?.trim() || '';

    // Extraire l'ID du tweet depuis le lien
    const idMatch = link.match(/status\/(\d+)/);
    const id = idMatch?.[1] || '';
    if (!id) continue;

    // Extraire la date
    const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const pubDate = dateMatch?.[1]?.trim() || '';

    // Extraire la description (contenu du tweet)
    const descMatch = item.match(
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/,
    );
    const description = descMatch?.[1] || descMatch?.[2] || '';
    const text = decodeHtmlEntities(stripHtml(description)) || title;

    // Extraire le média : media:content (rss.app), enclosure, ou img dans la description
    const mediaContentMatch = item.match(/<media:content[^>]*url="([^"]+)"/);
    const enclosureMatch = item.match(/<enclosure[^>]*url="([^"]+)"/);
    const imgInDescMatch = description.match(/<img[^>]*src="([^"]+)"/);
    const mediaUrl = mediaContentMatch?.[1] || enclosureMatch?.[1] || imgInDescMatch?.[1] || undefined;

    tweets.push({
      id,
      text,
      created_at: pubDate,
      url: link || `https://x.com/${TWITTER_USERNAME}/status/${id}`,
      ...(mediaUrl
        ? { media: [{ type: 'photo' as const, url: mediaUrl, preview_image_url: mediaUrl }] }
        : {}),
    });
  }

  return tweets.slice(0, 3);
}

export default defineCachedEventHandler(
  async () => {
    const config = useRuntimeConfig();
    const rssUrl = config.twitterRssFeedUrl;

    if (!rssUrl) {
      throw createError({
        statusCode: 500,
        statusMessage: 'URL du flux RSS Twitter non configurée',
      });
    }

    try {
      const response = await fetch(rssUrl, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      });

      if (!response.ok) {
        throw new Error(`RSS feed error: ${response.status}`);
      }

      const xml = await response.text();
      const tweets = parseTweetsFromRss(xml);

      if (tweets.length === 0) {
        throw new Error('No tweets found in RSS feed');
      }

      return { data: tweets };
    } catch (error: any) {
      console.error('Error fetching tweets from RSS:', error.message);
      throw createError({
        statusCode: 502,
        statusMessage: 'Erreur lors de la récupération des tweets',
      });
    }
  },
  {
    maxAge: 60 * 15, // 15 minutes
    name: 'social-tweets',
  },
);
