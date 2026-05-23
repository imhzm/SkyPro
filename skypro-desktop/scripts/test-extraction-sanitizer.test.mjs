// Unit tests for the extraction sanitizer.
// Verifies that the junk-filter rejects UI labels, buttons, and badges
// while keeping real names.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { sanitizeRecords, isJunkName, isSystemPath, parseFacebookProfile } = require('../electron/ipc/extraction-sanitizer.cjs')

// =========================================================================
// isJunkName — rejects UI labels, accepts real names
// =========================================================================
test('isJunkName rejects Arabic UI labels', () => {
  const junk = [
    'إضافة إلى القصة',
    'تعديل الملف الشخصي',
    'بحث عن أصدقاء',
    'طلبات الصداقة',
    'الأصدقاء',
    'الأصدقاء 460',
    'الاصدقاء',
    '14 صديقًا مشتركًا',
    '8 اصدقاء مشتركين',
    'صديقان مشتركان',
    'المتابعين',
    'متابعون',
    'إعدادات',
    'الإعدادات',
    'الرسائل',
    'تسجيل الدخول',
  ]
  for (const j of junk) {
    assert.equal(isJunkName(j), true, `Expected "${j}" to be junk`)
  }
})

test('isJunkName rejects English UI labels', () => {
  const junk = [
    'Add to story',
    'Edit Profile',
    'View all',
    'See more',
    'Find friends',
    'Friends 460',
    'Followers 1200',
    '14 mutual friends',
    'Settings',
    'Notifications',
    'Messages',
  ]
  for (const j of junk) {
    assert.equal(isJunkName(j), true, `Expected "${j}" to be junk`)
  }
})

test('isJunkName rejects junk like undefined/null', () => {
  assert.equal(isJunkName(''), true)
  assert.equal(isJunkName(null), true)
  assert.equal(isJunkName(undefined), true)
  assert.equal(isJunkName('undefined'), true)
  assert.equal(isJunkName('null'), true)
  assert.equal(isJunkName('NaN'), true)
  assert.equal(isJunkName('   '), true)
  assert.equal(isJunkName('-'), true)
  assert.equal(isJunkName('123'), true)
  assert.equal(isJunkName('...'), true)
})

test('isJunkName ACCEPTS real names', () => {
  const real = [
    'أحمد محمد',
    'عبدالرحمن رجب',
    'فاطمة الزهراء',
    'Mohamed E Elbaz',
    'Shady Esam',
    'Hany Amin',
    'Hazem Hussain',
    'Mostafa Btarya',
    'Re SkyWave',          // brand-style name
    'علي سعيد الشمري',
    'Seif M ELmrakpy',
    'كرام',
    'كريم',
    'ريان كتسولة',
    'José García',
    "O'Brien",
  ]
  for (const r of real) {
    assert.equal(isJunkName(r), false, `Expected "${r}" to be a real name`)
  }
})

// =========================================================================
// isSystemPath — rejects FB internal paths
// =========================================================================
test('isSystemPath identifies system URLs', () => {
  const systemUrls = [
    '/settings',
    '/help/123',
    '/groups/abc',
    '/marketplace',
    '/login.php',
    '/notifications',
    '/messages',
    '/friends',
    '/photo.php?id=123',
    '/watch',
    '/reel/123',
    '/stories/me',
    'https://facebook.com/marketplace/category',
    'https://www.facebook.com/login/',
    '/i/flow/login',           // Twitter
    '/explore/',               // Instagram
    '/accounts/login',         // Instagram
  ]
  for (const u of systemUrls) {
    assert.equal(isSystemPath(u), true, `Expected "${u}" to be system path`)
  }
})

test('isSystemPath accepts real profile URLs', () => {
  const real = [
    '/imhzmuk',
    '/profile.php?id=100089474594041',
    'https://www.facebook.com/zuck',
    '/abdurrahman.ragab',
    'https://facebook.com/some.user.name',
  ]
  for (const r of real) {
    assert.equal(isSystemPath(r), false, `Expected "${r}" to be a real profile`)
  }
})

// =========================================================================
// parseFacebookProfile — extracts ID/username from URL
// =========================================================================
test('parseFacebookProfile gets numeric userId', () => {
  const { userId, username } = parseFacebookProfile('https://www.facebook.com/profile.php?id=100089474594041')
  assert.equal(userId, '100089474594041')
  assert.equal(username, '')
})

test('parseFacebookProfile gets slug username', () => {
  const { userId, username } = parseFacebookProfile('https://www.facebook.com/imhzmuk')
  assert.equal(userId, '')
  assert.equal(username, 'imhzmuk')
})

test('parseFacebookProfile skips system paths', () => {
  const { userId, username } = parseFacebookProfile('https://www.facebook.com/groups/12345')
  assert.equal(userId, '')
  assert.equal(username, '')
})

// =========================================================================
// sanitizeRecords — end-to-end filter
// =========================================================================
test('sanitizeRecords drops all the junk from a Facebook friend extraction', () => {
  // This is the exact garbage shown in the user's bug screenshot.
  const raw = [
    { name: 'الأصدقاء 460', profile: '/imhzmuk/friends' },
    { name: 'إضافة إلى القصة', profile: '/stories/create' },
    { name: 'تعديل الملف الشخصي', profile: '/profile.php?fb' },
    { name: 'Re SkyWave', profile: 'https://www.facebook.com/imhzmuk' },
    { name: 'الأصدقاء', profile: '/imhzmuk/friends' },
    { name: 'طلبات الصداقة', profile: '/friends/requests' },
    { name: 'بحث عن أصدقاء', profile: '/find-friends' },
    { name: 'عبدالرحمن رجب', profile: '/abdurrahman.ragab' },
    { name: '14 صديقًا مشتركًا', profile: '/some' },
    { name: 'الجيمي اعم', profile: '/al.gamy' },
    { name: 'ดิวพล ฉะไฮย๒ลซเง์', profile: '/dewpolux' },
    { name: 'كنفيات الصعيدي', profile: '/kanafiat.sa3idi' },
    { name: '29 صديقًا مشتركًا', profile: '/some2' },
    { name: 'Seif M ELmrakpy', profile: '/seif.m' },
    { name: '22 صديقًا مشتركًا', profile: '/some3' },
    { name: 'ريان كتسولة', profile: '/rayan.k' },
    { name: '10 اصدقاء مشتركين', profile: '/some4' },
    { name: 'محمد الذرقاوي', profile: '/m.thazargawi' },
    { name: '8 اصدقاء مشتركين', profile: '/some5' },
    { name: 'جلال آل دجشي', profile: '/jalal.dejshi' },
    { name: 'Mohamed E Elbaz', profile: '/m.elbaz' },
    { name: '3 اصدقاء مشتركين', profile: '/some6' },
    { name: 'Shady Esam', profile: '/shady.esam' },
    { name: 'صديق واحد مشترك', profile: '/some7' },
    { name: 'كريم', profile: '/kareem' },
  ]
  const out = sanitizeRecords(raw, { platform: 'facebook', kind: 'friends' })
  // We expect ONLY the real names to survive.
  const expectedNames = [
    'عبدالرحمن رجب', 'الجيمي اعم', 'ดิวพล ฉะไฮย๒ลซเง์', 'كنفيات الصعيدي', 'Seif M ELmrakpy',
    'ريان كتسولة', 'محمد الذرقاوي', 'جلال آل دجشي', 'Mohamed E Elbaz', 'Shady Esam', 'كريم',
  ]
  // "Re SkyWave" is the user's own name — it survives the junk filter as it
  // doesn't match any UI pattern. That's correct behavior; the caller should
  // exclude self separately.
  const names = out.map((r) => r.name).filter((n) => n !== 'Re SkyWave')
  for (const exp of expectedNames) {
    assert.ok(names.includes(exp), `Expected "${exp}" to survive sanitizer`)
  }
  // None of these UI labels should survive:
  const blacklist = ['الأصدقاء 460', 'إضافة إلى القصة', 'تعديل الملف الشخصي',
    'طلبات الصداقة', 'بحث عن أصدقاء', '14 صديقًا مشتركًا', '29 صديقًا مشتركًا',
    '8 اصدقاء مشتركين', '3 اصدقاء مشتركين', 'صديق واحد مشترك', '22 صديقًا مشتركًا',
    '10 اصدقاء مشتركين']
  for (const b of blacklist) {
    assert.ok(!names.includes(b), `"${b}" should NOT survive sanitizer`)
  }
})

test('sanitizeRecords dedupes by URL+name', () => {
  const raw = [
    { name: 'أحمد', profile: '/ahmed' },
    { name: 'أحمد', profile: '/ahmed' },  // exact dup
    { name: 'أحمد', profile: '/ahmed2' },  // same name, different URL → keep
    { name: 'محمد', profile: '/ahmed' },   // same URL, different name → keep
  ]
  const out = sanitizeRecords(raw, { platform: 'facebook', kind: 'friends' })
  assert.equal(out.length, 3)
})

test('sanitizeRecords enriches userId from URL', () => {
  const raw = [
    { name: 'أحمد', profile: 'https://www.facebook.com/profile.php?id=100012345' },
    { name: 'محمد', profile: '/m.ramy' },
  ]
  const out = sanitizeRecords(raw, { platform: 'facebook', kind: 'friends' })
  assert.equal(out[0].userId, '100012345')
  assert.equal(out[1].username, 'm.ramy')
})

test('sanitizeRecords preserves phone-only records when allowEmptyName=true', () => {
  const raw = [
    { name: '', phone: '+201001234567' },
    { name: 'أحمد', phone: '+201007654321' },
  ]
  const out = sanitizeRecords(raw, { platform: 'facebook', kind: 'phones', allowEmptyName: true })
  assert.equal(out.length, 2)
  assert.equal(out[0].phone, '+201001234567')
  assert.equal(out[1].phone, '+201007654321')
})
