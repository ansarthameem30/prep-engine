# Day 39 — GitHub Advanced + Workflows

## Branch Strategies

### GitFlow
The original structured branching model (Vincent Driessen, 2010):

**Branches:** `main` (production), `develop` (integration), `feature/*` (new features), `release/*` (stabilization), `hotfix/*` (emergency fixes)

**Workflow:** Features branch from `develop`, merge back to `develop`. When ready to release, create `release/1.2.0` from `develop`, do QA there, merge to both `main` (tag 1.2.0) AND `develop`. Hotfixes branch from `main`, merge to both `main` and `develop`.

**Pros:** Clear structure, supports multiple production versions, well-suited for software with scheduled releases (mobile apps, desktop software, versioned APIs).

**Cons:** Complex, slow — merging in two directions constantly. Long-lived feature branches accumulate merge conflicts. Not CD-friendly — deploying is a ceremony, not a habit. Works against the continuous integration principle.

### GitHub Flow
Simplified model designed for continuous deployment:

**Branches:** `main` (always deployable) + short-lived feature branches.

**Workflow:** Branch from `main` → commit → open PR → code review → merge to `main` → immediately deploy to production.

**Pros:** Simple (two branch types), encourages small PRs and frequent deploys, CD-friendly — `main` is always production.

**Cons:** Requires a solid automated test suite (no release branch buffer). Managing multiple production versions simultaneously is difficult. Feature flags needed for incomplete features.

### Trunk-Based Development (TBD)
The model used by Google, Facebook, and most high-performing engineering teams (per DORA research):

**Branches:** `trunk` / `main` only. Feature branches exist for hours to days, not weeks.

**Workflow:** Developers commit small changes directly to trunk (or via short-lived branches merged within a day). Feature flags hide incomplete features from users.

**Pros:** No merge conflicts (branches are so short they rarely diverge), continuous integration is literal (everyone integrates daily), DORA metrics show highest deployment frequency + lowest change failure rate.

**Cons:** Requires discipline — you must commit small, safe increments. Requires feature flags infrastructure. Requires comprehensive automated tests that run fast (< 10 minutes).

**The key enabler — feature flags:** Merge incomplete code behind a flag (`if featureFlags.newCheckout`) that defaults to off. Deploy freely. Enable the flag for 5% of users (canary), then 100% when ready. Rollback = flip the flag, not a git revert + emergency deploy.

### Branch Protection Rules (Mandatory for Teams)

Configure in GitHub: Settings → Branches → Add rule:
- `Require pull request reviews before merging` — minimum 1-2 approvals
- `Require status checks to pass` — CI must pass before merge (tests, lint)
- `Require branches to be up to date` — no stale PRs merging
- `Do not allow bypassing the above settings` — applies to admins too
- `Require signed commits` — cryptographically verify committer identity
- `Restrict who can push to matching branches` — only merge via PR

---

## Pull Request Best Practices

**PR size:** The single most impactful practice. PRs > 400 lines receive 25% less thorough review (cognitive overload). Small PRs: faster review, fewer bugs, easier to revert, faster CI. Target < 200 lines for routine changes.

**One PR, one concern:** Don't mix "refactor authentication module" with "add OAuth provider" in one PR. Separate concerns enable focused review and simpler rollback.

**PR templates** (`.github/pull_request_template.md`):
```markdown
## What changed and why
[Describe the change and motivation]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manually tested on staging

## Screenshots (UI changes)
[Before / After screenshots]

## Checklist
- [ ] No hardcoded secrets
- [ ] Database migrations are backwards-compatible
- [ ] Feature flag added (if applicable)
```

**Code review checklist (what senior engineers look for):**
1. Correctness: does this code do what it claims? Edge cases handled?
2. Security: input validation, SQL injection, IDOR, secrets exposure?
3. Performance: N+1 queries? Missing indexes? O(n²) in hot path?
4. Readability: names meaningful? Complex logic commented?
5. Tests: are they testing behavior or implementation?
6. API contracts: breaking changes to public interfaces?

---

## GitHub Actions Deep Dive

### Workflow Anatomy

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
```

**Triggers (`on`):**
- `push`: on commits to branches matching pattern
- `pull_request`: on PR events (opened, synchronize, reopened)
- `schedule`: `cron: "0 2 * * 1"` — every Monday at 2 AM UTC
- `workflow_dispatch`: manual trigger (with optional inputs) — "deploy to staging" button
- `workflow_call`: called by another workflow (reusable workflow)
- `repository_dispatch`: triggered by external event via GitHub API

### Matrix Builds

Test across multiple configurations in parallel:
```yaml
strategy:
  matrix:
    node: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]
  fail-fast: false  # Don't cancel other matrix jobs if one fails
runs-on: ${{ matrix.os }}
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node }}
```

This creates 6 parallel jobs (3 Node × 2 OS) and runs them simultaneously.

### Caching for Speed

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

`key`: exact cache hit — uses the cache without reinstalling
`restore-keys`: partial match — restores closest cache, then `npm install` updates it
`hashFiles('**/package-lock.json')`: cache busted when lock file changes

Result: `npm ci` goes from 60s → 5s on cache hit (dependencies already installed).

### Concurrency: Cancel Stale PR Workflows

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

When a new push to a PR cancels the still-running workflow from the previous push. Saves CI minutes, keeps feedback fast.

### OIDC Authentication with AWS

The modern standard — no stored AWS credentials:

```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy
      aws-region: us-east-1
      # No access-key-id or secret-access-key needed!
```

GitHub provides a short-lived OIDC token per workflow run. AWS IAM trusts GitHub's OIDC provider and vends temporary credentials valid only for that run.

### Reusable Workflows

Extract common CI patterns into a shared workflow:

```yaml
# .github/workflows/reusable-test.yml
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: "20"
    secrets:
      DATABASE_URL:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Consumer workflow:
```yaml
jobs:
  call-test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: "20"
    secrets:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Environments: Staging vs Production Gates

```yaml
jobs:
  deploy-production:
    environment:
      name: production
      url: https://app.example.com
    steps:
      - run: ./deploy.sh production
```

Environment settings in GitHub: required reviewers (2 engineers must approve before deploy), wait timer (10 minutes of observation after staging deploy before production unlock), deployment protection rules.

---

## Security in GitHub

### Dependabot
Automatically creates PRs for outdated or vulnerable dependencies:
- `dependabot.alerts`: detects known CVEs in your dependencies
- `dependabot.version-updates`: creates update PRs for new package versions
- Configure in `.github/dependabot.yml`

### Code Scanning with CodeQL
GitHub's static analysis engine. Finds: SQL injection, XSS, path traversal, hardcoded credentials, insecure deserialization. Runs on every push/PR.

### Why Pin Actions to Commit Hashes

```yaml
# BAD — mutable tag, could be changed by maintainer
uses: actions/checkout@v4

# GOOD — pinned to exact commit, immutable
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

A malicious actor could compromise the `actions/checkout` repository and push a new version to the `v4` tag. Code using the tag would automatically run the malicious version. Pinning to a commit hash prevents this supply chain attack.

Use Dependabot to keep pinned hashes up-to-date automatically.

---

## Composite Actions

Unlike reusable workflows (full workflow files), composite actions are reusable step sequences:

```yaml
# .github/actions/setup-and-cache/action.yml
name: "Setup Node and Cache"
inputs:
  node-version:
    default: "20"
runs:
  using: "composite"
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
    - uses: actions/cache@v4
      with:
        path: ~/.npm
        key: node-${{ hashFiles('**/package-lock.json') }}
```

Used as: `uses: ./.github/actions/setup-and-cache`

Composite actions = reusable steps within a workflow. Reusable workflows = reusable full jobs/workflows.
