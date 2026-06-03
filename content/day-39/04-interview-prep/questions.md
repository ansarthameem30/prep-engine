# Day 39 — Interview Prep: GitHub Advanced + Workflows

## Q1: Compare GitFlow, GitHub Flow, and Trunk-Based Development. What do DORA metrics tell us about them?

**Answer:**
**GitFlow** has two primary branches (`main` and `develop`) plus supporting branches. Features merge to `develop`, releases are stabilized in `release/*` branches, then merged to both `main` and `develop`. Hotfixes branch from `main`. Works well for: scheduled releases (iOS apps, versioned libraries), maintaining multiple production versions simultaneously.

Downsides: Long-lived feature branches diverge significantly. Merging in two directions (to main AND develop) for every release and hotfix is error-prone. "Gitflow Hell" is a real phenomenon — branches that have diverged for weeks require days to merge.

**GitHub Flow** has one rule: `main` is always deployable. Feature branches merge to `main` via PR, and main is deployed immediately. Simple, fast, and CD-friendly.

Downside: Requires solid automated testing (no buffer release branch). Managing multiple production versions requires separate long-lived branches or tags.

**Trunk-Based Development:** Everyone integrates to `main` (trunk) daily. Feature branches exist for hours, not weeks. Feature flags hide incomplete work. The DORA (DevOps Research and Assessment) four-key metrics research consistently shows that teams using trunk-based development have:
- Higher deployment frequency (deploy multiple times per day vs weekly/monthly)
- Lower lead time for changes (hours vs weeks)
- Lower change failure rate (smaller changes = easier to reason about and test)
- Faster mean time to recovery (small blast radius when something goes wrong)

**My recommendation for a growing team:** GitHub Flow as a starting point (simpler than GitFlow), then graduate to trunk-based when the team has solid feature flag infrastructure and high-confidence automated testing. GitFlow is worth considering only for products with explicit versioned releases.

---

## Q2: How does GitHub Actions OIDC authentication with AWS work? Why is it better than storing AWS credentials as secrets?

**Answer:**
**The old way (stored credentials):**
Store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitHub repository secrets. Every workflow run uses these long-lived credentials. If the credentials leak (GitHub breach, log exposure, misconfigured repo settings), an attacker has persistent AWS access until you manually rotate the keys.

**OIDC (OpenID Connect) federation — the modern way:**

1. GitHub is configured as an OIDC identity provider in AWS IAM
2. You configure an IAM role with a trust policy that allows GitHub to assume it, with conditions (only from your specific repository, only from the `main` branch, only from `environment: production`)
3. When the workflow runs, GitHub generates a short-lived OIDC token (JWT signed by GitHub) containing claims about the workflow: repo name, branch, environment, event type
4. The `configure-aws-credentials` action sends this token to AWS STS, which validates the token against the GitHub OIDC endpoint and returns temporary credentials (valid for 1 hour)
5. The workflow uses these temporary credentials; they expire automatically at the end of the run

**Security advantages:**
- **No stored credentials:** No long-lived secrets to leak, rotate, or manage
- **Short-lived credentials:** Each run gets fresh credentials; old credentials from previous runs are already expired
- **Fine-grained conditions:** Trust policy can restrict to specific repo + branch + environment + job name, not just "any GitHub Actions workflow"
- **Audit trail:** AWS CloudTrail logs every AssumeRoleWithWebIdentity call, showing exactly which GitHub workflow assumed the role and when

**Trust policy example:**
```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:environment:production"
    }
  }
}
```
Only the `production` environment of `myorg/myrepo` can assume this role — not any other workflow in the org.

---

## Q3: What are the key elements of a production-quality GitHub Actions CI pipeline for a Node.js project?

**Answer:**
A production CI pipeline should be fast, reliable, and provide actionable feedback.

**Structure (in execution order):**

1. **Concurrency control:** Cancel in-progress runs when a new commit is pushed to the same PR (`concurrency: cancel-in-progress: true`). Prevents wasted minutes on stale runs.

2. **Lint (fastest gate, ~30s):** ESLint + TypeScript type check. Runs first because it fails fast and cheap. If lint fails, no need to spin up databases for tests.

3. **Test matrix (Node 18 + Node 20 in parallel):**
   - Service containers (PostgreSQL, Redis) defined inline
   - `npm ci` with caching (from `~/.npm` keyed to `package-lock.json` hash)
   - Tests with coverage (`--coverage`)
   - Coverage report posted as PR comment
   - `fail-fast: false` so you see all failures across the matrix

4. **Build (after lint + test pass):** TypeScript compilation, artifact upload (`actions/upload-artifact` with git SHA in name)

5. **Docker build + push (main branch only):**
   - Download build artifact from step 4
   - OIDC credentials (no stored secrets)
   - `docker/build-push-action` with layer caching from ECR registry
   - Tag with full git SHA (immutable, traceable) + `latest` (for reference)

6. **Deploy (main branch only, after Docker push):**
   - `environment: production` block with required reviewers
   - Update ECS task definition with new image SHA
   - `wait-for-service-stability: true` to confirm deployment health
   - Health check curl after deploy
   - Slack notification on success/failure

**Secrets management:**
- AWS credentials: OIDC (no stored keys)
- Database URL for tests: GitHub Actions secrets (environment-scoped)
- Slack webhook: GitHub Actions secrets

---

## Q4: How would you handle secret rotation in CI/CD without downtime?

**Answer:**
Secret rotation requires updating the secret in the credential store and all services consuming it, without causing any downtime during the transition.

**The naive approach (causes downtime):** Rotate secret → update GitHub secret → wait for next deployment to pick it up. During the window, old secret in deployment + new secret in CI = mismatch if any validation uses the CI secret.

**Zero-downtime rotation strategies:**

**Two-version support window:**
1. Before rotation: application supports old secret
2. Rotate to new secret in AWS Secrets Manager
3. Update application to accept BOTH old and new secrets (e.g., try new, fallback to old)
4. Deploy this dual-support version
5. Wait until all instances are running the dual-support version
6. Remove the old secret support from code and deploy

For JWT secrets: store secret as a list `["newSecret", "oldSecret"]`, try each in order for verification. Sign new tokens with `newSecret` only. Old tokens signed with `oldSecret` still verify.

**Using AWS Secrets Manager with Lambda rotation:**
Secrets Manager can rotate database passwords automatically. The application fetches the current secret from Secrets Manager at request time (with local cache of 5 minutes). When Secrets Manager rotates, the DB and application are updated automatically.

**For GitHub Actions specifically:**
- Store the actual secret in AWS Secrets Manager or Parameter Store
- In the workflow: `aws ssm get-parameter --name /myapp/prod/stripe-key --with-decryption`
- Rotate in Parameter Store → no GitHub secret to update
- GitHub secret stores only the IAM role ARN (which doesn't change)

---

## Q5: What is a branch protection rule and what configuration would you recommend for a production repository?

**Answer:**
Branch protection rules prevent direct pushes and enforce quality gates on protected branches (typically `main` and `develop`).

**Recommended configuration for `main`:**

1. **Require a pull request before merging:** Yes
   - Required approvals: 2 (1 for solo/small teams)
   - Dismiss stale reviews when new commits are pushed (prevents approving an old version then sneaking in a new commit)
   - Require review from Code Owners (`.github/CODEOWNERS` defines who owns what)

2. **Require status checks to pass:**
   - Select: `lint`, `test (Node 18)`, `test (Node 20)`, `build`
   - Require branches to be up to date: yes (prevents approval on outdated code)

3. **Require conversation resolution before merging:** Yes (all review comments addressed)

4. **Require signed commits:** Yes (cryptographic proof of committer identity, prevents impersonation)

5. **Do not allow bypassing the above settings:** Yes (applies to admins too — no "just this once" exceptions)

6. **Restrict deletions:** Yes (prevent `git push origin --delete main`)

7. **Block force pushes:** Yes (prevent rewriting history on main)

**For `develop` (if using GitFlow):** Similar settings but with 1 required reviewer instead of 2, relaxed signed commit requirement for larger teams.

**CODEOWNERS file:**
```
# .github/CODEOWNERS
/src/payments/     @finance-team
/src/auth/         @security-team
/infra/            @devops-team
```
PRs touching payment code require a review from `@finance-team` regardless of general approvals.

---

## Q6: How do you handle matrix builds efficiently? What is fail-fast and when should you disable it?

**Answer:**
Matrix builds create a job for each combination of matrix variables, running all combinations in parallel.

```yaml
strategy:
  matrix:
    node-version: ["18", "20", "22"]
    os: ["ubuntu-latest", "windows-latest"]
```
This creates 6 jobs (3 × 2) running simultaneously. Each matrix job is independent and can be re-run individually if it fails.

**`fail-fast: true` (default):**
If any matrix job fails, GitHub Actions cancels all other in-progress matrix jobs. Use this to save CI minutes when one job's failure makes the others irrelevant (e.g., if Node 18 tests fail, Node 20 and 22 would likely fail too).

**`fail-fast: false`:**
All matrix jobs run to completion regardless of other failures. Use this when:
- You want to see ALL failing combinations, not just the first one (useful when debugging cross-platform compatibility)
- Matrix jobs are testing different platforms/environments that might fail independently (Windows Node 18 might fail while Linux Node 20 passes)
- You need the complete picture to triage the root cause

**Efficiency tip: `include` and `exclude` to limit combinations:**
```yaml
matrix:
  node: [18, 20]
  os: [ubuntu, windows]
  exclude:
    - node: 18
      os: windows  # Don't test Node 18 on Windows (unsupported config)
  include:
    - node: 22
      os: ubuntu   # Only test Node 22 on Linux (not in the main matrix)
```

**Caching in matrix jobs:**
Use OS in the cache key when testing on multiple OSes:
```yaml
key: ${{ runner.os }}-node${{ matrix.node-version }}-${{ hashFiles('**/package-lock.json') }}
```

---

## Q7: What is a composite action vs a reusable workflow? When would you use each?

**Answer:**

**Composite Action:**
- A set of steps packaged as a reusable action
- Defined in `action.yml` with `runs.using: "composite"`
- Referenced as a step within a job: `uses: ./.github/actions/my-action`
- Inputs and outputs are supported
- Runs within the calling job (same runner)
- Can contain shell steps, other actions, but NOT workflow-level features (services, matrices)

**Reusable Workflow:**
- A complete workflow file with `on: workflow_call`
- Referenced as an entire job: `uses: ./.github/workflows/reusable-test.yml`
- Can define its own jobs, service containers, strategy matrices
- Runs as separate jobs (potentially on different runners)
- Secrets must be explicitly passed via `secrets:` parameter (or `inherit` in newer Actions)

**When to use each:**

Composite action: "I want to reuse these 3 steps (setup Node, cache npm, run lint) across multiple jobs or repos"
```yaml
# Works as a step inside a job
- uses: ./.github/actions/setup-and-lint
  with:
    node-version: "20"
```

Reusable workflow: "I want to reuse this entire 'test' job (with its service containers and matrix strategy) from multiple pipelines or repos"
```yaml
# Works as a complete job
jobs:
  test:
    uses: ./.github/workflows/test-workflow.yml
    with:
      node-version: "20"
    secrets: inherit
```

**Rule of thumb:**
- Steps you want to reuse within a single repo → composite action
- Full jobs you want to standardize across multiple repos → reusable workflow (define in a shared `workflows` repository)

---

## Q8: How would you optimize GitHub Actions pipeline performance to reduce CI time?

**Answer:**
A slow CI pipeline discourages frequent commits — the opposite of what trunk-based development needs.

**Optimization techniques from highest to lowest impact:**

1. **Cancel redundant runs (concurrency):** `cancel-in-progress: true` means new commits cancel stale runs. If you push to a PR 10 times in 5 minutes, only the last push runs to completion. Easy 90% reduction for fast-commit workflows.

2. **Aggressive caching:** `actions/cache` for `node_modules`, Maven repo, Gradle cache, Docker layers. `npm ci` from empty = 60s; with cache = 5s. Cache key must include the lock file hash to invalidate on dependency changes.

3. **Parallelize independent jobs:** Don't run lint → test → build sequentially if test and lint are independent. Lint and test in parallel, build only after both pass. Reduces total wall-clock time by parallelism.

4. **Fast fail gates first:** Run lint (30s) before tests (5min). If lint fails, no need to start databases and run a 5-minute test suite. Saves minutes per commit that has lint errors.

5. **Use larger runners for compute-heavy jobs:** GitHub provides `ubuntu-latest-8core` runners (paid). A job that takes 10 minutes on a 2-core runner may take 4 minutes on an 8-core runner if it's parallelizable (Jest `--maxWorkers`).

6. **Docker layer caching:** Use `cache-from: type=registry` to pull cached layers. Only changed layers are rebuilt. Image build goes from 3 minutes to 30 seconds when only your application code changes.

7. **Split test suites:** If unit tests take 8 minutes, split into `test-unit` and `test-integration` running in parallel. Each takes 4 minutes.

8. **Self-hosted runners with local caches:** A self-hosted runner has `node_modules` persisted from previous runs (no download needed), Docker cache on local disk (no pull from ECR), and dedicated compute. 10-20× faster for larger builds.

9. **Measure and monitor:** Track `github.event.workflow.duration` per job. Know which jobs are slow before optimizing. A cache hit rate metric (did `npm ci` restore from cache or miss?) is valuable.
