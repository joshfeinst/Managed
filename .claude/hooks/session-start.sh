#!/bin/bash
# Managed — SessionStart recovery.
#
# WHY THIS EXISTS. Twice in one session this container came back with a
# checkout 75 commits behind the remote, carrying uncommitted work from an
# older session, and nothing on screen said so. The reason it was invisible is
# worth writing down: `remote.origin.fetch` was missing from .git/config, so
# `git fetch origin` wrote FETCH_HEAD and nothing else. `origin/main` stayed
# frozen at whatever commit the snapshot was taken at, and every `git log
# origin/main` and `git status` agreed with each other about a past that was
# months old. The work was safe — it had all been pushed — but "am I current?"
# took several minutes to answer under a tool that was quietly lying.
#
# So this does not try to stop a container being restored. It makes a restore
# harmless and, above all, LOUD.
#
# Deliberately NOT set -e: a recovery script that aborts halfway through is
# worse than one that reports what it could not do.
set -uo pipefail

REPO="${CLAUDE_PROJECT_DIR:-/home/user/managed}"
cd "$REPO" 2>/dev/null || exit 0
[ -d .git ] || exit 0

say(){ printf '  %s\n' "$*"; }
echo "── Managed: session start ─────────────────────────────────────────"

# ---------------------------------------------------------------- git ------
# 1. Give the remote a way to be seen. Without this refspec origin/main is a
#    fossil and every comparison against it is wrong.
if ! git config --get-all remote.origin.fetch 2>/dev/null | grep -q 'refs/remotes/origin'; then
  git config --add remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
  say "repaired the missing origin fetch refspec (this is the bug that hid the drift)"
fi

git fetch --quiet origin 2>/dev/null
BRANCH=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo HEAD)
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

if [ -z "$REMOTE" ]; then
  say "!! could not read origin/main — check network before trusting any git state"
else
  BEHIND=$(git rev-list --count "HEAD..origin/main" 2>/dev/null || echo 0)
  AHEAD=$(git rev-list --count "origin/main..HEAD" 2>/dev/null || echo 0)

  # Position and cleanliness are two separate facts and both get said out loud.
  # Reporting them together hid the position line whenever the tree was dirty,
  # which is exactly the case where you most need to know where you are.
  if [ "$LOCAL" = "$REMOTE" ]; then
    say "up to date with origin/main at ${LOCAL:0:7}"
  fi

  # 2. Never lose uncommitted work, even work that turns out to be stale.
  #    Saved inside .git, which no checkout or reset touches.
  #    `git add -N` first so UNTRACKED files land in the patch too — without it
  #    the count says "3 files" and the patch saves nothing, which is the worst
  #    of both worlds: a warning and no rescue.
  if [ "$DIRTY" != "0" ]; then
    STAMP=$(date -u +%Y%m%dT%H%M%SZ)
    PATCHFILE=".git/session-start-worktree-$STAMP.patch"
    git add -N . >/dev/null 2>&1
    git diff HEAD --binary > "$PATCHFILE" 2>/dev/null
    git reset -q >/dev/null 2>&1
    if [ -s "$PATCHFILE" ]; then
      say "!! $DIRTY file(s) uncommitted — saved to $PATCHFILE"
    else
      rm -f "$PATCHFILE"
      say "!! $DIRTY path(s) reported dirty but nothing to save (ignored or empty)"
    fi
  fi

  if [ "$AHEAD" != "0" ]; then
    say "!! $AHEAD local commit(s) are NOT on origin/main. Push them before you trust this tree."
    git log --oneline "origin/main..HEAD" 2>/dev/null | head -5 | sed 's/^/     /'
  fi

  if [ "$BEHIND" != "0" ] && [ "$AHEAD" = "0" ] && [ "$DIRTY" = "0" ] && [ "$BRANCH" = "main" ]; then
    # 3. Strictly behind, nothing to lose: fast-forward. This is the restored
    #    container case, and it is safe precisely because it is strict.
    git reset --hard origin/main >/dev/null 2>&1 \
      && say "checkout was $BEHIND commit(s) behind — fast-forwarded to ${REMOTE:0:7}" \
      || say "!! could not fast-forward; reconcile by hand"
  elif [ "$BEHIND" != "0" ]; then
    say "!! checkout is $BEHIND commit(s) BEHIND origin/main and cannot be auto-synced"
    say "   (uncommitted work, unpushed commits, or not on main). Reconcile before editing."
  fi
fi

# ------------------------------------------------------------- tooling -----
# The harnesses need playwright. It is deliberately not a repo dependency —
# .gitignore excludes package.json on purpose, because the GAME is one
# self-contained file with no build — so it is installed here instead of
# committed, and it lands in the repo rather than a scratchpad that a restore
# can take with it.
if [ -d node_modules/playwright ]; then
  say "playwright present"
else
  say "installing playwright for tools/ ..."
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --no-audit --no-fund \
    --loglevel=error playwright@1.62.1 >/dev/null 2>&1 \
    && say "playwright installed" \
    || say "!! playwright install failed — tools/*.js will not run"
fi

BROWSERS="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
if ls "$BROWSERS" 2>/dev/null | grep -q chromium; then
  say "chromium found in $BROWSERS"
else
  say "!! no chromium in $BROWSERS — headless harnesses will fail"
fi

echo "───────────────────────────────────────────────────────────────────"
exit 0
