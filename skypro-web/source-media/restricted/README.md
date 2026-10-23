# Retained legacy sources, not public website assets

These five existing originals were moved out of `public/images/app` after the visual privacy review found a subscription/license value, personal-looking result rows and unverified dashboard metrics. Their pixels are unchanged. They are not used by the current UI, product media manifest, social cards or guides.

Do not copy this directory into a public media directory or a review ZIP. The current image optimizer allowlist excludes legacy `/images/app` paths, including any previously cached optimized variant. Actual original and optimizer rejection must be verified against the candidate runtime before release.

The move preserves the existing source files; it does not revoke any identifier or erase historical Git/browser/proxy copies. No secret value is extracted into reports. Validity of the legacy license value has not been tested or asserted.
