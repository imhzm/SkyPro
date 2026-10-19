# Accessibility acceptance follow-up — 2026-10-19

Real axe-core 4.10.3 checks against the built e377818 runtime identified small password visibility targets, unnamed activation-key copy buttons, and horizontally scrolling static tables without keyboard entry. These are presentation/accessibility defects; no authentication or billing handler change is needed.

Corrections: preserve the eye icon location while providing a 44×44 button and adequate input padding in login/register/reset/account password forms; label the key copy action and enlarge its target; give scrollable subscription/invoice/recent-user/audit tables a named, focusable region. Preserve the existing table data, controls and permissions.

Pre-fix browser evidence is retained in axe-acceptance.json. Customer drawer entry, Shift+Tab wrap, Escape, focus return and body-lock cleanup passed. Twenty customer render/theme/viewport checks passed. All twelve administration pages were scanned: the listed defects are being corrected; other tested WCAG-tagged checks did not report violations. Automated color-contrast/link reviews can remain incomplete for gradients and require visual/CSS review; a zero automated violation count is not a blanket conformance certification.

TypeScript and targeted lint checks are run before publication. Final built-runtime and browser verification, publication identity and remaining limits will be recorded after the follow-up passes.
