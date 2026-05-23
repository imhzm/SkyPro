// =====================================================================
// Extraction Sanitizer — central junk filter for ALL platform extractors.
// =====================================================================
// Problem this solves:
//   Every platform extractor was using loose selectors (e.g. `a[href*="/"]`)
//   which captured UI labels, buttons, badges, headers, navigation links —
//   not just the actual records the user wanted (friends, followers,
//   comments, etc.).
//
//   The result was CSV exports full of garbage like:
//     - "إضافة إلى القصة" (Add to story button)
//     - "تعديل الملف الشخصي" (Edit profile button)
//     - "X صديقًا مشتركًا" (X mutual friends badge text)
//     - "بحث عن أصدقاء" (Search for friends button)
//
// This module exposes three things:
//   1. UI_LABEL_PATTERNS  — regex/string patterns of UI labels to REJECT.
//   2. NON_PROFILE_PATHS  — Facebook URL slugs that are NOT user profiles.
//   3. sanitizeRecords()  — strict filter for an array of {name, profile, ...}.
//
// Usage in any extractor:
//   const sanitized = sanitizeRecords(raw, { platform: 'facebook', kind: 'friends' })
//   saveLeads('facebook', 'friends', sanitized)
// =====================================================================

// Words that NEVER appear in a real person/page/group name but DO appear
// on Facebook/IG/etc UI buttons. Case-insensitive substring match.
//
// IMPORTANT: \b (word boundary) is ASCII-only — it DOES NOT mark a boundary
// between Arabic letters. So patterns like /^الأصدقاء\b/ would NOT match
// "الأصدقاء 460" because \b treats Arabic chars + " 460" as continuous.
// Instead we use (?:$|[\s\d]) — explicit end-or-non-letter check that works
// for Arabic AND Latin scripts.
//
// We deliberately keep this list conservative — overly broad patterns would
// drop legitimate Arabic names. Each entry is a discrete UI element label.
const NB = '(?:$|[\\s\\d.,!?:;()\\u060C\\u061B])'   // non-letter boundary
const UI_LABEL_PATTERNS = [
  // Arabic UI labels — verb-prefixed buttons (always start with a verb)
  /^إضافة\s/,                  // "إضافة إلى القصة" (Add to story)
  /^تعديل\s/,                  // "تعديل الملف الشخصي" (Edit profile)
  /^بحث\s/,                    // "بحث عن أصدقاء" (Search for friends)
  /^حذف\s/,                    // "حذف الحساب" (Delete account)
  /^إنشاء\s/,                  // "إنشاء قصة" (Create story)
  /^عرض\s/,                    // "عرض المزيد" (View more)
  /^مشاهدة\s/,                 // "مشاهدة الكل" (See all)
  /^انضم\s/,                   // "انضم إلى المجموعة" (Join group)
  /^أضف\s/,                    // "أضف صديق" (Add friend)
  /^اضف\s/,                    // same without hamza
  /^كتابة\s/,                  // "كتابة منشور" (Write post)
  /^اكتب\s/,
  /^طلبات\s/,                  // "طلبات الصداقة" (Friend requests)

  // Arabic UI labels — section headers (must end with non-letter or EOL)
  new RegExp(`^الاقتراحات${NB}`),
  new RegExp(`^المقترحات${NB}`),
  new RegExp(`^اقتراحات${NB}`),
  new RegExp(`^اقتراح${NB}`),
  new RegExp(`^الاصدقاء${NB}`),      // "الاصدقاء" or "الاصدقاء 460"
  new RegExp(`^الأصدقاء${NB}`),
  new RegExp(`^المتابعين${NB}`),
  new RegExp(`^المتابعون${NB}`),
  new RegExp(`^متابعين${NB}`),
  new RegExp(`^متابعون${NB}`),
  new RegExp(`^المنشورات${NB}`),
  new RegExp(`^منشورات${NB}`),
  new RegExp(`^القصة${NB}`),
  new RegExp(`^قصص${NB}`),
  new RegExp(`^القصص${NB}`),
  new RegExp(`^الإشعارات${NB}`),
  new RegExp(`^إشعارات${NB}`),
  new RegExp(`^الرسائل${NB}`),
  new RegExp(`^رسائل${NB}`),
  new RegExp(`^الرئيسية${NB}`),
  new RegExp(`^الإعدادات${NB}`),
  new RegExp(`^إعدادات${NB}`),
  new RegExp(`^القائمة${NB}`),
  new RegExp(`^تسجيل\\s`),           // "تسجيل الدخول"
  new RegExp(`^سجل\\s`),
  new RegExp(`^الخصوصية${NB}`),
  new RegExp(`^الشروط${NB}`),
  new RegExp(`^المساعدة${NB}`),
  new RegExp(`^المنصة${NB}`),
  new RegExp(`^معجبون${NB}`),
  new RegExp(`^المعجبون${NB}`),
  new RegExp(`^معجبين${NB}`),
  new RegExp(`^تعليقات${NB}`),
  new RegExp(`^التعليقات${NB}`),
  new RegExp(`^مشاركات${NB}`),
  new RegExp(`^المشاركات${NB}`),
  new RegExp(`^متابعة${NB}`),
  /^تمت\s+المتابعة/,
  /^غير\s+متابع/,
  /^إلغاء\s+المتابعة/,
  new RegExp(`^إلغاء${NB}`),
  new RegExp(`^موافق${NB}`),
  new RegExp(`^تأكيد${NB}`),
  new RegExp(`^حسناً${NB}`),
  new RegExp(`^تابع${NB}`),
  /^معًا\s+ضد/,                     // "Together against" (FB ads)
  /^الملف\s+الشخصي/,                // "Profile" header
  /^صفحة\s+شخصية/,

  // "X mutual friends" badge text — has digits + "صديقًا/أصدقاء مشتركين"
  // Also catches singular form "صديق واحد مشترك" and dual "صديقان مشتركان"
  /(صديق|صديقًا|صديقا|صديقان|أصدقاء|اصدقاء)\s+(مشترك|مشتركًا|مشتركا|مشتركان|مشتركين|مشتركة|واحد)/,
  /\bواحد\s+مشترك\b/,
  /\d+\s+(mutual|friend|follower)/i,

  // English UI labels
  /^add\s+(to|friend|story|comment|new)/i,
  /^create\s+(story|post|reel|new|page|group)/i,
  /^edit\s+(profile|cover|story|post)/i,
  /^view\s+(all|more|profile|details|less)/i,
  /^see\s+(all|more|less|translation)/i,
  /^search\s+(for|in|friends|people)/i,
  /^find\s+(friends|people|more)/i,
  /^delete\s+(comment|post|account)/i,
  /^manage\s+/i,
  /^learn\s+more/i,
  /^show\s+(more|less|all|translation)/i,
  /^join\s+(group|page)/i,
  /^like\s+page/i,
  /^send\s+(message|request|friend)/i,
  /^reply\s+to/i,
  /^report\s+(post|user|comment)/i,
  /^block\s+(user|account)/i,
  /^unfriend\b/i,
  /^unfollow\b/i,
  /^settings?\b/i,
  /^messages?\b/i,
  /^notifications?\b/i,
  /^home\b/i,
  /^profile\b/i,
  /^story\b/i,
  /^stories\b/i,
  /^reels?\b/i,
  /^marketplace\b/i,
  /^watch\b/i,
  /^groups?\b/i,
  /^pages?\b/i,
  /^friends?\s+\d/i,           // "Friends 460"
  /^followers?\s+\d/i,
  /^following\s+\d/i,
  /^posts?\s+\d/i,
  /^\d+\s+(friends?|followers?|posts?|likes?)$/i,
]

// Names that are clearly NOT real people:
//   - "undefined" / "null" leaked from JS errors
//   - Numeric-only strings (timestamps, counts)
//   - Pure punctuation
//   - Single chars / overly long (>80 char names are page descriptions)
function isJunkName(name) {
  if (!name) return true
  const s = String(name).trim()
  if (s.length < 2) return true
  if (s.length > 80) return true
  if (/^(undefined|null|nan|none|n\/a)$/i.test(s)) return true
  if (/^[\d\s.,/:\-_+]+$/.test(s)) return true   // pure numeric/punctuation
  // Must contain at least one Unicode letter (rejects pure emoji/punctuation).
  if (!/\p{L}/u.test(s)) return true
  // Match any UI label pattern
  for (const pat of UI_LABEL_PATTERNS) {
    if (pat.test(s)) return true
  }
  return false
}

// Facebook URL slugs that are NEVER user profiles. Used to reject hrefs
// like /watch/, /groups/, /pages/, /marketplace/ from being treated as
// people. Compared against the FIRST segment of the path.
const NON_PROFILE_PATHS = new Set([
  'home.php', 'login.php', 'login', 'logout', 'logout.php',
  'help', 'settings', 'legal', 'policies', 'policy', 'privacy',
  'about', 'careers', 'directory', 'recover', 'recover.php',
  'reg.php', 'r.php', 'signup', 'checkpoint', 'security',
  'business', 'business.facebook.com',
  'posts', 'post', 'photo', 'photos', 'photo.php',
  'video', 'videos', 'watch', 'reel', 'reels',
  'stories', 'story.php', 'story',
  'groups', 'group.php', 'group',
  'pages', 'page',
  'events', 'event.php',
  'notes', 'note',
  'marketplace', 'marketplace.facebook.com',
  'gaming', 'gaming.facebook.com',
  'messages', 'messenger',
  'notifications',
  'friends', 'friend_requests',
  'bookmarks', 'saved',
  'ads', 'ads.facebook.com', 'adsmanager',
  'developers', 'developers.facebook.com',
  'live', 'live.facebook.com',
  'find-friends', 'people',
  'public', 'pages_creation',
  'i', 'flx', 'flow',                  // Twitter/X internal paths
  'explore', 'explore_locations',      // Instagram internal
  'accounts', 'direct',                // Instagram internal
  'hashtag', 'tags', 'tag',            // Generic hashtag pages
  'oauth', 'auth',                     // OAuth screens
])

// Check whether a URL path's FIRST segment is a non-profile system path.
function isSystemPath(href) {
  if (!href) return false
  try {
    let path = String(href)
    // Strip protocol/host
    path = path.replace(/^https?:\/\/[^/]+/, '')
    // Strip leading slash + query + hash
    path = path.replace(/^\/+/, '').split('?')[0].split('#')[0]
    if (!path) return true
    const first = path.split('/')[0].toLowerCase()
    return NON_PROFILE_PATHS.has(first)
  } catch { return true }
}

// Extract user ID / username from a Facebook profile link. Returns
// `{ userId, username }` where userId is the numeric ID (from profile.php?id=)
// and username is the slug (from /handle paths).
function parseFacebookProfile(href) {
  if (!href) return { userId: '', username: '' }
  const out = { userId: '', username: '' }
  const idMatch = href.match(/[?&]id=(\d{6,})/)
  if (idMatch) out.userId = idMatch[1]
  // Get the path portion (strip protocol + host) and extract first segment.
  let path = href.replace(/^https?:\/\/[^/]+/, '')   // strip scheme + host
  if (!path.startsWith('/')) path = '/' + path
  const slugMatch = path.match(/^\/([a-zA-Z0-9.][\w.-]{2,49})(?:[/?#]|$)/)
  if (slugMatch) {
    const slug = slugMatch[1]
    if (!NON_PROFILE_PATHS.has(slug.toLowerCase()) && !/^\d+$/.test(slug) && slug !== 'profile.php') {
      out.username = slug
    }
  }
  return out
}

// =====================================================================
// MAIN ENTRY: sanitizeRecords(raw, opts) — filter junk + dedupe + enrich
// =====================================================================
// Input:
//   raw    — array of objects with at minimum `{ name, profile?, url? }`
//   opts   — { platform, kind, allowEmptyName? }
//             platform: 'facebook' | 'instagram' | 'twitter' | etc.
//             kind: 'friends' | 'followers' | 'members' | etc. (for logging)
//             allowEmptyName: skip the name check (e.g. for phone-only)
// Output:
//   sanitized array — same shape, with junk rows dropped + enriched IDs.
function sanitizeRecords(raw, opts = {}) {
  if (!Array.isArray(raw)) return []
  const { platform = '', kind = '', allowEmptyName = false } = opts
  const seen = new Set()
  const out = []
  let droppedJunk = 0
  let droppedDupe = 0
  let droppedSystem = 0

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue

    const name = String(item.name || item.username || item.title || '').trim()
    const href = String(item.profile || item.url || item.link || '').trim()
    const phone = String(item.phone || '').trim()
    const email = String(item.email || '').trim()

    // Drop UI-label / junk names.
    if (!allowEmptyName && isJunkName(name)) {
      droppedJunk++
      continue
    }

    // Drop system paths (groups, settings, etc.) — only when we have a URL.
    if (href && isSystemPath(href)) {
      droppedSystem++
      continue
    }

    // Dedup: prefer URL+name pair, fall back to phone, then name alone.
    const dedupKey = href ? `${href}::${name}` : phone ? `phone:${phone}` : email ? `mail:${email}` : `name:${name}`
    if (seen.has(dedupKey)) {
      droppedDupe++
      continue
    }
    seen.add(dedupKey)

    // Enrich: parse user IDs from Facebook URLs (works for IG too).
    let userId = item.userId || item.user_id || item.id || ''
    let username = item.username || ''
    if (!userId && href && (platform === 'facebook' || platform === 'instagram')) {
      const parsed = parseFacebookProfile(href)
      if (parsed.userId) userId = parsed.userId
      if (!username && parsed.username) username = parsed.username
    }

    out.push({
      ...item,
      name,
      profile: href.startsWith('/') && platform === 'facebook' ? 'https://www.facebook.com' + href : href,
      userId: userId || '',
      username: username || userId || '',
      phone: phone || '',
      email: email || '',
    })
  }

  if (droppedJunk + droppedDupe + droppedSystem > 0) {
    console.log(`[sanitizer] ${platform}/${kind}: kept ${out.length}, dropped junk=${droppedJunk} dupe=${droppedDupe} system=${droppedSystem}`)
  }
  return out
}

module.exports = {
  sanitizeRecords,
  isJunkName,
  isSystemPath,
  parseFacebookProfile,
  UI_LABEL_PATTERNS,
  NON_PROFILE_PATHS,
}
