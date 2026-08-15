# Before you commit and push

Five steps, in order. They are mandatory because **CI checks more than the pre-commit
hook does**, and the two things the hook cannot catch — a failing test and a broken build
— are the two that turn a pull request red after you have stopped looking at it.

```bash
git add -A                    # 1. everything new, or the build breaks for everyone
npm run lint                  # 2. hook runs this
npm run format:check          # 3. hook runs this
npm test                      # 4. hook does NOT run this
npm run build                 # 5. hook does NOT run this
```

If all five pass, the four CI jobs will pass.

## What is enforced where

| Check                                  | Command                   | Pre-commit hook | CI  |
| -------------------------------------- | ------------------------- | --------------- | --- |
| ESLint, Stylelint, spec pin, dev proxy | `npm run lint`            | yes             | yes |
| Prettier                               | `npm run format:check`    | yes             | yes |
| Custom lint-rule tests                 | `npm run test:lint-rules` | no              | yes |
| Unit tests                             | `npm test`                | **no**          | yes |
| Every project builds                   | `npm run build`           | **no**          | yes |
| Generated client is current            | see below                 | no              | yes |

`.husky/pre-commit` runs the first two and nothing else. It also lints the **whole
working tree**, not just what you staged — so unrelated work left broken will block a
commit that has nothing to do with it.

## The five steps

### 1. Add new files

`git commit -a` stages modifications to **tracked** files only. A new component that is
never `git add`-ed compiles on your machine, because the file is on your disk, and fails
for everybody else and in CI.

```bash
git add -A
git status          # read it. Confirm the count, and that nothing unexpected is there
```

Generated output cannot be committed by accident — `dist/` and
`projects/*/src/environments/environment.generated.ts` are git-ignored — but read the
status anyway.

### 2. `npm run lint`

Four checks behind one command: ESLint, Stylelint, the API specification pin, and the
development proxy. Every message names what to use instead of what you wrote; the design
token and logical-property rules are described in `docs/design-tokens.md`.

### 3. `npm run format:check`

Prettier, in check mode. It fails like this, and the fix is in the message:

```
Checking formatting...
[warn] projects/platform/src/app/features/organizations/pages/practice/practice-page.spec.ts
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
```

**Fix the files it named, not the tree**, then check again:

```bash
npx prettier --write projects/platform/.../practice-page.spec.ts   # the files it listed
npm run format:check                                               # confirm, then carry on to step 4
```

`npm run format` also works and is what to reach for when the list is long — but it
writes to **every file in the repository**, so anything else left unformatted gets
reformatted into your commit. Run `git status` after it and read the count.

Nothing about the fix is risky: Prettier only moves whitespace and line breaks. Carry on
to `npm test` and `npm run build` anyway — you were going to run them, and a reformat is
not a reason to skip them.

**Where it comes from.** Every file in the repository is formatted, so a failure is
almost always a file that was written or edited by something that does not format on
save — a script, a patch, a paste from elsewhere — while the files around it were. The
message names the file, which is the whole diagnosis: open it, format it, move on.

### 4. `npm test`

**The hook does not run this.** Angular templates are type-checked at build time and the
specs drive the DOM, so a renamed class or a changed control shape shows up here and
nowhere earlier.

If you changed anything in `tools/`, run `npm run test:lint-rules` too — CI does.

### 5. `npm run build`

**The hook does not run this either**, and it catches three things nothing above does:

- **AOT template errors.** A binding to a member that no longer exists compiles in
  development and fails the production build.
- **Component style budgets.** Over 4kB is a warning; **over 8kB fails the build.**
- **The library build order.** Applications resolve `ui` and `core` through `dist/`, so
  `npm run build` builds the libraries first. If you changed a library and only ran an
  application build, you tested against a stale `dist/`.

## If you changed the API specification pin

The generated client is committed, and CI regenerates it and insists the result is
byte-for-byte identical. If you bumped `@mmadel/openapi-spec`:

```bash
npm run generate:api
git status          # any diff under projects/api-client/src/generated must be committed
```

`docs/api-client.md` has the longer version.

## Branch, message, pull request

- **Branch off `main`**, named for the ticket: `feature/T-64-onboarding-form`. The ticket
  file names its own branch in its header — see `docs/tickets/`.
- **Commit messages are imperative, with the ticket id first where there is one:**

  ```
  T-64: create a practice from the onboarding form
  T-92: reach the API in development, through a proxy
  ```

  No trailing full stop. The subject says what the commit makes the product do, not what
  you touched: `T-64: create a practice from the onboarding form`, not `update
components`.

- **Push and open a pull request.** `main` takes merge commits from pull requests; CI runs
  on the pull request and on `main`.

## Two rules that are not about tooling

**Do not commit a stale `dist/`.** It is ignored, so this is only a problem when someone
adds an ignore exception. Do not.

**Do not skip the hook.** `--no-verify` exists and there is no reason to use it here: the
hook takes seconds, and the checks it runs are the ones whose failures are cheapest to
fix before they are shared.
