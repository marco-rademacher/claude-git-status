// The pure part of git-status: which checkouts to look at, what `git` says about them and the line
// that comes out of it. No `$` here, so `claude plugin test` checks it without an engine.

/**
 * A checkout with loose ends: `ahead` commits on the compared branch not yet on its upstream (as of the
 * last fetch), `changed` entries in `git status`.
 */
export type Checkout = { name: string; ahead: number; changed: number }

/** The options a person sets under /config (plugin.json `userConfig`), defaults filled in. */
export type Settings = { branch: string; nestedRepos: boolean; extraRepos: readonly string[] }

/** Reads the options as `register` receives them; a value of the wrong type counts as unset. */
export function settingsFrom(options: Readonly<Record<string, unknown>>): Settings {
  const extra = options.extraRepos
  return {
    branch: typeof options.branch === 'string' ? options.branch.trim() : '',
    nestedRepos: options.nestedRepos === true,
    extraRepos: Array.isArray(extra) ? extra.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
      : typeof extra === 'string' && extra.trim() !== '' ? [extra] : [],
  }
}

/** `~` and `~/…` against the home directory; anything else as given, without a trailing slash. */
export function expandHome(path: string, home: string | undefined): string {
  const p = path.trim().replace(/(.)\/+$/, '$1')
  if (!home) return p
  if (p === '~') return home
  return p.startsWith('~/') ? `${home}/${p.slice(2)}` : p
}

/** The paths to check, in order and each once: the session's repo, its nested repos, the extra ones. */
export function checkoutPaths(sessionRepo: string | null, nested: readonly string[], extra: readonly string[]): string[] {
  return [...new Set([...(sessionRepo ? [sessionRepo] : []), ...nested, ...extra])]
}

/**
 * The revision range of unpushed commits: the current branch against its upstream, or the configured
 * branch against its own upstream.
 */
export function aheadRange(branch: string): string {
  return branch === '' ? '@{u}..HEAD' : `${branch}@{u}..${branch}`
}

/**
 * One checkout from `git rev-list --count <range>` (empty or an error, such as no upstream: nothing
 * ahead) and `git status --porcelain` (one entry per line); `null` when both are zero.
 */
export function readCheckout(name: string, revList: string, status: string): Checkout | null {
  const t = revList.trim()
  const ahead = /^\d+$/.test(t) ? Number(t) : 0
  const changed = status.split('\n').filter(l => l.trim() !== '').length
  return ahead > 0 || changed > 0 ? { name, ahead, changed } : null
}

/**
 * The status line, always shown: changes first, then unpushed commits — `ios: 3 changed · shared ↑2`;
 * commits only `unpushed: shared ↑2`; nothing open `up to date`.
 *
 * It starts with a bar between no-break spaces: the app puts the plugin's name in front of the line and
 * collapses ordinary spaces; two after the bar match the gap before it. No colour — the API has none for
 * the status line, and the desktop app shows an ANSI code as raw characters.
 */
export function statusLine(checkouts: readonly Checkout[]): string {
  const changed = checkouts.filter(c => c.changed > 0).map(c => `${c.name}: ${c.changed} changed`)
  const ahead = checkouts.filter(c => c.ahead > 0).map(c => `${c.name} ↑${c.ahead}`)
  const text = changed.length > 0
    ? [...changed, ...ahead].join(' · ')
    : ahead.length > 0 ? `unpushed: ${ahead.join(' · ')}` : 'up to date'
  return ` │  ${text}`
}

/** The name a checkout goes by in the line: its folder's name. */
export function repoName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}
