# Accessibility acceptance follow-up — completed 2026-10-20

Real axe-core 4.10.3 checks against the built e377818 runtime identified undersized password visibility targets, unnamed activation-key copy controls and horizontally scrolling tables without keyboard entry. PR #11 corrected them with 44×44 targets, accessible copy names and named focusable scrolling regions. Affected built-runtime pages were rerun with zero reported violations; all twelve admin pages were scanned. Account password show/hide was exercised. Customer drawer focus entry, Shift+Tab wrapping, Escape, focus return and body-lock cleanup passed.

Browser render checks passed for all five customer routes in four viewport/theme combinations (20 checks), and all twelve admin routes in four combinations (48 checks). These checks cover RTL, headings, horizontal overflow and failed images; they do not replace visual inspection. Public/auth results are packaged separately against the final live build.

Manual image inspection caught a light-theme legal hero contrast defect that automated contrast checks had left incomplete. PR #12 replaced the hardcoded dark background with shared tokens; both themes at 1440×900 and 390×844 were recaptured from the final live release. Loading states use matching tokens and a status label. Legal text invariance passes.

Full production build/TypeScript passed; ESLint reports 0 errors and 20 warnings. axe reports include before-fix history and explicitly incomplete checks; no blanket WCAG certification is claimed. External OAuth and field performance remain outside verified acceptance.

Final release 425ee34 also contains auth decorative glows inside a positioned screen and clips only that layer. Strict live checks pass 128 public/auth combinations and 72 representative checks across six widths, comparing scrollWidth to clientWidth; the reset form now has an h1. Client-side Suspense heading observations were rerun after hydration and retained in the report history.
