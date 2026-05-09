// Serves /.well-known/security.txt per RFC 9116
// Tells researchers how to responsibly report security issues.

const SITE_URL = 'https://skypro.skywaveads.com'

const expiresOneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .replace(/\.\d{3}Z$/, 'Z')

const securityTxt = `Contact: mailto:security@skywaveads.com
Contact: ${SITE_URL}/contact?topic=security
Expires: ${expiresOneYearFromNow}
Acknowledgments: ${SITE_URL}/security/hall-of-fame
Preferred-Languages: ar, en
Canonical: ${SITE_URL}/.well-known/security.txt
Policy: ${SITE_URL}/security/policy

# We appreciate responsible disclosure of security vulnerabilities.
# Please give us reasonable time to fix issues before public disclosure.
# We do not currently offer monetary rewards but will publicly acknowledge contributors.
`

export async function GET() {
  return new Response(securityTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
