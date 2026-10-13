# git-status

A [Claude Code](https://claude.com/claude-code) mod that keeps one line below the prompt telling you
whether your repository has loose ends:

```
git-status │  up to date
git-status │  unpushed: app ↑2
git-status │  app: 3 changed · shared ↑1
```

- **changed** — entries in `git status` (modified, staged, untracked)
- **↑n** — commits on the branch that its upstream does not have yet
- **up to date** — nothing changed, nothing to push

It checks every five seconds and only locally: no `git fetch`, so the upstream is as fresh as your last
fetch or push. `git status` runs with `--no-optional-locks`, so it never leaves an `index.lock` in the
way of your own git commands.

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
