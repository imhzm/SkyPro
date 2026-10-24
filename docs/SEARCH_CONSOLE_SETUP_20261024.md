# Search Console ownership verification — 2026-10-24

The owner explicitly authorized use of `skywaveads@gmail.com` for measurement setup and then confirmed the specific Search Console ownership grant for `https://skypro.skywaveads.com/` at action time. The correct signed-in account and exact URL-prefix property were checked in Google's official interface.

Google's downloaded HTML verification file is preserved byte-for-byte in `skypro-web/public/`. It contains only the public ownership proof provided by Google. Do not publish credentials, cookies, or OAuth tokens. This does not delegate access to Windsor.ai, Ahrefs or another third party.

Publish only this static proof from the exact merged Git commit into the active SkyPro public directory, verify its bytes over HTTPS, then click Google's Verify control and check the visible outcome. This is an additive static-file deployment: the application's `a8a3560` source/build remains the runtime baseline. Record the proof commit separately; do not relabel the entire application runtime as rebuilt from it. No Next build is required. Inspection of the installed Next 16.3.8 router confirms that production public-file names are indexed at process start; a named `skypro` reload is therefore required if Nginx does not serve this file directly. Check health and preserve every other PM2 process identity. No environment, DNS, DB, billing or unrelated service change is authorized by this operation.

Rollback consists of removing only the introduced file if verification publication fails, after verifying the exact absolute path and file hash. Ownership revocation is a separate account change and must be documented if requested. Leave the file available after successful verification, as Google requires continued proof.

After ownership is visibly verified, submit the existing valid `https://skypro.skywaveads.com/sitemap.xml` and record Google's actual status. New ownership and a valid sitemap do not prove indexing, historical traffic, rankings or immediate data availability.

State before publication: proof prepared locally; ownership, sitemap submission and report availability remain pending. Live evidence and the updated outcome are recorded separately in `D:/SkyPro-seo-growth-20261024/account-connection/`.
