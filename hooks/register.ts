// git-status: a status line below the prompt with the changes and unpushed commits of the session's
// repository, its nested repositories and any extra ones the person names.
//
// Every five seconds, local only: no fetch, so the upstream is as old as the last fetch or push.
// `git status` runs with --no-optional-locks so it never takes an index.lock another git command of
// the person's (or a parallel session's) would trip over.
//
// Learned in the desktop app (Claude Code 2.1.295): a label in the footer (`ui.render` on
// `SessionMode`) is not drawn there, the status line is — with the plugin's name in front.

import type { EngineInterface, Register } from 'claude-code'

import { aheadRange, checkoutPaths, expandHome, readCheckout, repoName, settingsFrom, statusLine } from './line'
import type { Checkout, Settings } from './line'

const INTERVAL_MS = 5000

async function output($: EngineInterface, argv: string[]): Promise<string> {
  try {
    const r = await $.process.run(argv, { timeoutMs: 15000 })
    return r.exitCode === 0 ? r.stdout : ''
  } catch {
    return ''
  }
}

/** The checkouts to look at for this working directory; worked out once per directory, not every tick. */
let paths: { cwd: string; list: string[] } | null = null

async function pathsFor($: EngineInterface, settings: Settings): Promise<string[]> {
  const cwd = await $.session.cwd()
  if (paths?.cwd === cwd) return paths.list

  const top = (await output($, ['git', '-C', cwd, 'rev-parse', '--show-toplevel'])).trim() || null
  const nested: string[] = []
  if (top && settings.nestedRepos) {
    // A nested repository has a .git folder of its own; a worktree or a submodule has a .git file and
    // belongs to another repository's history, so it stays out.
    for (const entry of await $.fs.list(top)) {
      if (entry.kind !== 'dir' || entry.name.startsWith('.')) continue
      const git = `${top}/${entry.name}/.git`
      if (await $.fs.exists(git) && (await $.fs.stat(git)).kind === 'dir') nested.push(`${top}/${entry.name}`)
    }
  }
  const home = await $.env.get('HOME')
  const list = checkoutPaths(top, nested, settings.extraRepos.map(p => expandHome(p, home)))
  paths = { cwd, list }
  return list
}

async function measure($: EngineInterface, settings: Settings): Promise<Checkout[]> {
  const found: Checkout[] = []
  for (const path of await pathsFor($, settings)) {
    if (!(await $.fs.exists(`${path}/.git`))) continue
    const c = readCheckout(repoName(path),
      await output($, ['git', '-C', path, 'rev-list', '--count', aheadRange(settings.branch)]),
      await output($, ['git', '--no-optional-locks', '-C', path, 'status', '--porcelain']))
    if (c) found.push(c)
  }
  return found
}

let busy = false

async function refresh($: EngineInterface, settings: Settings) {
  if (busy) return
  busy = true
  try {
    $.ui.status(statusLine(await measure($, settings)))
  } finally {
    busy = false
  }
}

export const register: Register = (on, options) => {
  const settings = settingsFrom(options)
  on('session.start', async ($, e, next) => {
    await refresh($, settings)
    $.clock.every(INTERVAL_MS, () => refresh($, settings))
    return next(e)
  })
}
