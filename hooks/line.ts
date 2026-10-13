// The pure part of git-status: which checkouts to look at, what `git` says about them and the line
// that comes out of it. No `$` here, so `claude plugin test` checks it without an engine.

/**
 * One checked repository: `branch` the checked-out branch (null when detached), `ahead` commits on the
 * compared branch not yet on its upstream (as of the last fetch), `merges` how many of those are merge
 * commits, `changed` entries in `git status`.
 */
export type Checkout = { name: string; branch: string | null; ahead: number; merges: number; changed: number }

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

/** A count from `git rev-list --count`; empty or an error (such as no upstream) counts as zero. */
function count(text: string): number {
  const t = text.trim()
  return /^\d+$/.test(t) ? Number(t) : 0
}

/**
 * One checkout from git's answers: `git branch --show-current` (empty when detached),
 * `git rev-list --count <range>`, the same with `--merges`, and `git status --porcelain` (one entry per
 * line).
 */
export function readCheckout(name: string, git: { branch: string; ahead: string; merges: string; status: string }): Checkout {
  const branch = git.branch.trim()
  return {
    name,
    branch: branch === '' ? null : branch,
    ahead: count(git.ahead),
    merges: count(git.merges),
    changed: git.status.split('\n').filter(l => l.trim() !== '').length,
  }
}

const BRANCH_MAX = 24

/** A branch name as the line shows it: cut with an ellipsis past 24 characters. */
export function shortBranch(branch: string): string {
  return branch.length > BRANCH_MAX ? `${branch.slice(0, BRANCH_MAX - 1)}…` : branch
}

/**
 * The status line, always shown, each repository with its branch: changes first, then unpushed commits
 * and how many of them are merges — `ios feature/login: 3 changed · shared develop ↑4 (2 merges)`;
 * commits only `unpushed: shared develop ↑4 (2 merges)`; nothing open `up to date · develop`, the
 * session repository's branch. `compared` is the `branch` setting: when set, the commits counted are that
 * branch's, so the line names it rather than the checked-out one.
 *
 * It starts with a bar between no-break spaces: the app puts the plugin's name in front of the line and
 * collapses ordinary spaces; two after the bar match the gap before it. No colour — the API has none for
 * the status line, and the desktop app shows an ANSI code as raw characters.
 */
export function statusLine(checkouts: readonly Checkout[], compared = ''): string {
  const label = (c: Checkout, branch: string | null) => (branch ? `${c.name} ${shortBranch(branch)}` : c.name)
  const merges = (n: number) => (n === 0 ? '' : ` (${n} merge${n === 1 ? '' : 's'})`)
  const changed = checkouts.filter(c => c.changed > 0).map(c => `${label(c, c.branch)}: ${c.changed} changed`)
  const ahead = checkouts.filter(c => c.ahead > 0)
    .map(c => `${label(c, compared || c.branch)} ↑${c.ahead}${merges(c.merges)}`)
  const current = checkouts[0]?.branch
  const text = changed.length > 0
    ? [...changed, ...ahead].join(' · ')
    : ahead.length > 0 ? `unpushed: ${ahead.join(' · ')}` : `up to date${current ? ` · ${shortBranch(current)}` : ''}`
  return `\u00a0│\u00a0\u00a0${text}`
}

/** The name a checkout goes by in the line: its folder's name. */
export function repoName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}
