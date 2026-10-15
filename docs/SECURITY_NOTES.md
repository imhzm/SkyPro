# Dependency audit and release impact — 2026-10-15

## Observed baseline
`npm audit --omit=dev --json` reported four affected production packages: Next.js (critical), Nodemailer (high), sharp (high) and source-map-js (high). This is a package advisory result, not proof that the live server was exploited. The live server's installed dependency versions have not been verified.

## Reviewed changes
| Package | Final version | Reason |
| --- | --- | --- |
| next / eslint-config-next | 16.3.8 | Security patch within the existing Next 16 line; keep runtime and lint configuration aligned |
| nodemailer | 10.0.16 | Fix affected parser/DNS/TLS issues; pin the reviewed release without adopting 10.1's additional pool behavior changes |
| sharp | 0.35.5 | Resolve bundled image-library advisories |
| source-map-js | 1.2.2 | Resolve indexed source-map event-loop denial of service |

The final production dependency audit reports zero vulnerabilities. The existing NextAuth optional Nodemailer peer-range exception remains deliberate: this project uses Google/Credentials providers and calls Nodemailer directly, not the NextAuth email provider. Nodemailer requires Node >=20, compatible with the existing Next 16 runtime requirement.

The full audit including development tools still reports 11 entries (9 high, 2 moderate), mainly through Tailwind 3/ESLint glob and selector parsers. npm proposes major Tailwind migration or an incompatible ESLint configuration downgrade for several of them. Those build-tool changes were not forced into a homepage redesign; the exact report is saved as dependency-audit-all.json. Do not run the development server as a production service. A separate tooling migration should preserve the existing dashboard/auth styles and lint configuration.

## Regression coverage
The email adapter type import was updated for Nodemailer bundled declarations. Its runtime behavior and production TLS settings were not edited. `scripts/verify-mail-transport.cjs` compiles the real email module and exercises it against a server bound only to 127.0.0.1. It uses a short-lived test certificate trusted only by that test transport, with `rejectUnauthorized: true`. It verifies STARTTLS before authentication, pooled delivery of Arabic multipart mail and HTML/plain-text fallback, and proper failures for rejected recipients or missing SMTP configuration. The temporary certificate and key are removed after the run. No mail is sent outside the machine.

Build, TypeScript, lint, public routes, protected guest routes and visual home QA are repeated after dependency updates. These tests do not replace a production provider smoke test after deployment approval.

## Primary references
- https://github.com/advisories/GHSA-2xp9-vwfh-vxw4
- https://github.com/advisories/GHSA-6vj9-mwq6-2f5v
- https://github.com/nodemailer/nodemailer/releases
