# git-status

A [Claude Code](https://claude.com/claude-code) mod that keeps one line below the prompt telling you
whether your repository has loose ends:

```
git-status │  up to date · main
git-status │  unpushed: app main ↑4 (2 merges)
git-status │  app feature/login: 3 changed · shared main ↑1
```

- **the branch** after each repository's name — cut with … past 24 characters
- **changed** — entries in `git status` (modified, staged, untracked)
- **↑n** — commits on the branch that its upstream does not have yet
- **(n merges)** — how many of those commits are merge commits: with a merge per finished task, the
  tasks still waiting to be pushed
- **up to date** — nothing changed, nothing to push; with the branch of the session's repository

It checks every five seconds and only locally: no `git fetch`, so the upstream is as fresh as your last
fetch or push. `git status` runs with `--no-optional-locks`, so it never leaves an `index.lock` in the
way of your own git commands.

## What it runs

Everything happens on your machine and only reads. The mod is one TypeScript hooks module
(`hooks/register.ts`); the parts it uses of Claude Code's mod API are listed here.

### Programs

It runs one program, **`git`**, because git is the only reliable source for whether a repository has
changes or commits its upstream lacks. It starts it through `$.process.run` with a fixed argument list,
never through a shell. These are all the calls (`<repo>` is a repository path, `<range>` is
`@{u}..HEAD`, or `<branch>@{u}..<branch>` when the `branch` setting is set):

| Command | When | Why |
|---|---|---|
| `git -C <cwd> rev-parse --show-toplevel` | once per working directory | find the session's repository |
| `git -C <repo> branch --show-current` | every five seconds, per repository | name the checked-out branch |
| `git -C <repo> rev-list --count <range>` | every five seconds, per repository | count commits not yet on the upstream |
| `git -C <repo> rev-list --count --merges <range>` | every five seconds, per repository | count the merge commits among them |
| `git --no-optional-locks -C <repo> status --porcelain` | every five seconds, per repository | count changed and untracked entries |

No `git fetch`, no network access, no writes: none of these commands changes a repository.

### Other calls

- `$.clock.every(5000, …)` — the five-second tick, started once when the session starts
- `$.session.cwd()` — the session's working directory
- `$.fs.exists(<repo>/.git)` — every five seconds, per repository: skip a path that is no repository
- `$.fs.list(<repo>)`, `$.fs.exists(…/.git)`, `$.fs.stat(…/.git)` — once per working directory, when
  `nestedRepos` is on: list the repository's top folder and tell nested repositories (a `.git` folder)
  from worktrees and submodules (a `.git` file)
- `$.env.get("HOME")` — expand `~` in `extraRepos`

### What it sends, and where

Nothing leaves your machine. The mod's only output is `$.ui.status(text)`: Claude Code draws that text as
this plugin's line below the prompt. The text holds the names of the repository folders, their branch
names and counts, for example `ios feature/login: 3 changed · shared main ↑4 (2 merges)`. It writes no files, changes no settings and sends nothing to
any server.

## Install

Mods need Claude Code 2.1.287 or later. At the prompt of a session:

```
/plugin install git-status --marketplace marco-rademacher/claude-git-status
```

Answer `y` to add the marketplace and pick a scope; the line appears in the next session.

## Settings

Under `/config` (or `pluginConfigs` in `~/.claude/settings.json`):

| Setting | Default | What it does |
|---|---|---|
| `branch` | empty | Empty compares the checked-out branch with its upstream. Name one (`develop`) to always compare that branch with its upstream, whatever is checked out. |
| `nestedRepos` | off | Also checks folders directly inside the session's repository that are repositories of their own (`ios/`, `android/`). Worktrees and submodules stay out. |
| `extraRepos` | none | Further repositories to check in every session, such as a shared config repo; `~` is your home folder. |

A repository without an upstream counts as nothing to push.

## Notes

- In the desktop app the line appears after your first message in a session: the app starts Claude
  Code, and with it every mod, only then.
- The app writes the plugin's name in front of the line; the `│` keeps the two apart.
- The line has no colour: the status line takes plain text only (an ANSI code shows as raw characters
  in the desktop app).

## Development

```
claude plugin test .
claude plugin validate .
```

## License

MIT — see [LICENSE](LICENSE).
