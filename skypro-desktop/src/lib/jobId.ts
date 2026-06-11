// Monotonic per-session job id used to route live-stream `extraction-progress`
// events back to the tool that started them. A counter (never Date.now /
// Math.random) keeps it pure for React's render-purity analysis while staying
// unique within a session — uniqueness across sessions is irrelevant since
// job ids are ephemeral and only meaningful while the app is running.
let __seq = 0
export const makeJobId = (prefix: string): string => `${prefix}-${++__seq}`
