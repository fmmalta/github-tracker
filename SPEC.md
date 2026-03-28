# spec.md

You are a senior/staff-level software engineer with strong product judgment and production rigor.

Your job is to design and implement an MVP web application for GitHub engineering analytics. The product must provide operational visibility into developer and repository activity based on GitHub data, with a strong focus on pull request lifecycle metrics.

Do not treat this as a toy dashboard. Treat it as a production-oriented MVP with clean architecture, secure GitHub integration, proper rate-limit handling, historical data modeling, and scalable backend aggregation.

The deliverable must be technically sound, implementation-ready, and aligned with good software engineering practices.

---

## 1. Product goal

Build a web application that allows a company to monitor engineering activity at two levels:

1. Organization/company level
2. Repository level

The application must allow leadership or team members to answer questions such as:

- Which developers opened the most PRs in a given period?
- Which developers had the most merged PRs?
- What is the average time to first review?
- What is the average time to merge?
- How many lines were added and removed per developer?
- Who reviewed the most PRs?
- What is the average PR size by developer or repository?
- How is a specific repository performing compared to others?

This product is **not** a performance verdict engine.
It is an engineering visibility and workflow analytics platform.

The system must make this clear in naming and UX. Avoid language that implies the product can accurately determine developer quality from GitHub metrics alone.

---

## 2. Core MVP scope

Implement the following MVP features.

### 2.1 Authentication and access
- Support sign-in for internal users of this analytics app.
- Support connecting one or more GitHub organizations/repositories through a secure GitHub integration.
- Prefer a **GitHub App** integration over raw personal access tokens whenever possible.
- Design the system so that access can be scoped per organization and repository.

### 2.2 GitHub data ingestion
Ingest data from GitHub for:
- Organizations
- Repositories
- Pull requests
- Pull request reviews
- Pull request review requests
- Pull request commits
- Basic contributors / users involved in PR activity

Use GitHub APIs to collect:
- PR author
- PR state
- created_at
- updated_at
- merged_at
- closed_at
- additions
- deletions
- changed files count
- commit count
- reviewers
- review states
- timestamps of reviews
- base branch
- head branch
- repository association

### 2.3 Metrics and aggregations
The MVP must support the following metrics for a given date range:
- Number of PRs opened by developer
- Number of PRs merged by developer
- Number of PRs closed without merge
- Average time from PR creation to first review
- Average time from PR creation to merge
- Total additions by developer
- Total deletions by developer
- Total changed files by developer
- Average PR size by developer
- Number of reviews submitted by developer
- Repository-level totals for the same metrics
- Trend charts by day/week for opened and merged PRs

### 2.4 Filtering
Support filters by:
- Organization
- Repository
- Date range
- Developer
- Branch (optional for MVP if easy to support)
- PR state

### 2.5 Dashboard views
Implement:
- Company/organization overview dashboard
- Repository detail dashboard
- Developer leaderboard / ranking page based on selected metric
- Pull request explorer table with filters
- Developer detail page with metric summary and PR history

### 2.6 Historical persistence
Do not rely on live-only GitHub reads for every screen.
Store normalized GitHub data in the app database and compute metrics from local persisted data.

The system must preserve historical snapshots and timeline-friendly events so that metrics can be recalculated without re-querying GitHub every time.

---

## 3. Product constraints and interpretation rules

### 3.1 What this app is allowed to claim
The app may present:
- activity metrics
- throughput metrics
- review and merge timing metrics
- code churn metrics
- repository trends

The app must **not** present:
- simplistic “best developer” truth claims
- a single global score pretending to measure true engineering value
- misleading productivity claims based only on lines of code

### 3.2 UX language requirements
Use language such as:
- Engineering Analytics
- Team Activity
- Repository Throughput
- Review Efficiency
- PR Flow Metrics

Avoid language such as:
- Top employee
- Best engineer
- Worst performer
- Productivity truth score

---

## 4. Required GitHub integration architecture

### 4.1 Integration approach
Prefer **GitHub App** architecture.

Reasoning:
- better org/repo-level installation model
- better permission scoping
- more production-ready for company usage
- better long-term operational posture than using personal tokens everywhere

Still allow a fallback local/dev mode with PAT if necessary, but design the production path around GitHub App installation.

### 4.2 Required GitHub permissions
Request the minimum viable permissions needed to read:
- repository metadata
- pull requests
- pull request reviews
- commits associated with PRs
- organization/repository installation context

### 4.3 Webhooks
Use GitHub webhooks for near-real-time synchronization wherever possible.

Relevant webhook events should include at minimum:
- `pull_request`
- `pull_request_review`
- `pull_request_review_comment` if needed for future extensibility
- installation-related events if GitHub App lifecycle is handled

Webhook deliveries must be verified securely and processed asynchronously.

### 4.4 API strategy
Use a hybrid strategy:
- Webhooks for incremental updates
- Scheduled backfill/sync jobs for repair, reconciliation, and missed events
- REST and/or GraphQL where each is most appropriate

Use GraphQL where it provides cleaner aggregation-oriented fetches.
Use REST where specific pull request or review endpoints are simpler or more stable.

Do not design the system as frontend → GitHub direct calls.
All GitHub access must go through backend services.

---

## 5. Security requirements

### 5.1 Secrets and credentials
- Store GitHub App private key and secrets securely
- Never expose tokens to the frontend
- Use server-side token exchange only
- Encrypt sensitive credentials at rest if stored
- Rotate secrets safely
- Use environment variables / secret manager patterns

### 5.2 Webhook security
- Verify webhook signatures
- Reject invalid signatures
- Protect webhook endpoints against replay where practical
- Persist delivery identifiers for idempotency/deduplication

### 5.3 App authorization
- Internal app users must only see organizations/repositories they are allowed to access
- Introduce app-level RBAC from the start:
  - admin
  - manager/viewer
- The authorization model must be enforced in backend services, not just the UI

### 5.4 Auditability
Record:
- who connected an org/repo
- when syncs ran
- webhook delivery processing status
- sync failures
- retry attempts
- last successful sync timestamps

---

## 6. Rate limits, secondary limits, and resilience requirements

The implementation must explicitly account for GitHub API limits.

### 6.1 Rate-limit awareness
The GitHub API has both primary rate limits and secondary rate limits.
The system must never assume unlimited access.

### 6.2 Required resilience mechanisms
Implement:
- request throttling
- bounded concurrency
- retry with exponential backoff + jitter
- queue-based async ingestion
- endpoint-level safeguards for expensive sync operations
- incremental syncs based on timestamps / cursors
- caching where useful
- idempotent webhook processing
- dead-letter or failed-job recovery path

### 6.3 Secondary limit protection
The system must actively avoid patterns that trigger secondary limits, including:
- too many concurrent requests
- aggressive burst traffic
- unnecessary polling
- repeated full re-syncs across many repositories
- many writes or expensive repeated queries in a short window

### 6.4 Sync strategy rules
Use these sync modes:
1. Initial backfill
2. Incremental sync
3. Repair/reconciliation sync
4. On-demand manual re-sync for admins with cooldown protection

### 6.5 Operational behaviors
- Respect response headers when available
- Log rate-limit incidents
- Surface sync degradation in admin observability views
- Fail gracefully without corrupting data

---

## 7. Backend architecture requirements

Design a production-oriented backend.

### 7.1 Recommended backend stack
Pick one modern backend stack and be consistent.
Recommended options:
- Node.js + TypeScript + NestJS
- Node.js + TypeScript + Fastify
- Node.js + TypeScript + Express only if structured properly

Preferred: **NestJS + TypeScript**

### 7.2 Required backend modules
At minimum, create modules/services for:
- auth
- users
- organizations
- repositories
- github integration
- github app auth/token handling
- webhook ingestion
- sync jobs / workers
- pull requests
- reviews
- metrics aggregation
- leaderboard/reporting
- audit/logging
- health/observability

### 7.3 Architecture style
Use clear layered architecture:
- controllers / API layer
- application services / use cases
- domain models
- repository/data access layer
- integrations layer for GitHub
- background job layer

Do not mix GitHub API logic directly inside controllers.
Do not compute heavy metrics inside the frontend.

### 7.4 Background processing
Use a proper job queue for:
- webhook processing
- initial sync
- incremental sync
- metric recomputation
- reconciliation jobs

Examples:
- BullMQ + Redis
- another production-grade queue

### 7.5 API design
Provide REST APIs for the frontend.
Design endpoints such as:
- `GET /organizations`
- `GET /repositories`
- `GET /metrics/overview`
- `GET /metrics/repositories/:id`
- `GET /metrics/developers/:id`
- `GET /leaderboards`
- `GET /pull-requests`
- `POST /github/installations/:id/sync`
- `POST /github/webhooks`

Support pagination, filtering, sorting, and date ranges cleanly.

---

## 8. Database design requirements

Use a relational database.
Preferred: **PostgreSQL**

### 8.1 Design principles
- Normalize GitHub source data
- Store raw identifiers from GitHub
- Store derived metrics separately when beneficial
- Keep event timestamps
- Support re-computation
- Preserve source-of-truth raw records enough to repair metrics later

### 8.2 Suggested core tables
Design and document a schema close to this:

#### users
- id
- email
- name
- role
- created_at
- updated_at

#### github_installations
- id
- github_installation_id
- account_login
- account_type
- installed_by_user_id
- created_at
- updated_at
- last_sync_at
- status

#### organizations
- id
- github_org_id
- login
- name
- installation_id
- created_at
- updated_at

#### repositories
- id
- github_repo_id
- organization_id
- name
- full_name
- default_branch
- is_private
- is_active
- created_at
- updated_at
- last_sync_at

#### developers
- id
- github_user_id
- login
- display_name
- avatar_url
- created_at
- updated_at

#### pull_requests
- id
- github_pr_id
- github_pr_number
- repository_id
- author_developer_id
- title
- state
- is_draft
- created_at_github
- updated_at_github
- closed_at_github
- merged_at_github
- additions
- deletions
- changed_files
- commit_count
- base_branch
- head_branch
- first_review_at_github (nullable, derived but stored)
- merged_by_developer_id (nullable)
- raw_payload_json (optional, or store in separate raw table)
- created_at
- updated_at

#### pull_request_reviews
- id
- github_review_id
- pull_request_id
- reviewer_developer_id
- state
- submitted_at_github
- created_at
- updated_at

#### pull_request_review_requests
- id
- pull_request_id
- requested_reviewer_developer_id
- requested_at_github
- removed_at_github (nullable)
- created_at
- updated_at

#### pull_request_commits
- id
- pull_request_id
- github_commit_sha
- author_developer_id (nullable)
- committed_at_github
- additions (optional if collected)
- deletions (optional if collected)
- created_at
- updated_at

#### sync_jobs
- id
- installation_id
- repository_id (nullable)
- job_type
- status
- started_at
- finished_at
- error_message
- retry_count
- metadata_json
- created_at
- updated_at

#### webhook_deliveries
- id
- delivery_id
- event_type
- action
- installation_id (nullable)
- repository_id (nullable)
- received_at
- processed_at (nullable)
- status
- error_message (nullable)
- payload_json
- created_at
- updated_at

#### daily_repository_metrics
- id
- repository_id
- metric_date
- prs_opened
- prs_merged
- prs_closed_unmerged
- additions
- deletions
- review_count
- avg_time_to_first_review_seconds
- avg_time_to_merge_seconds
- created_at
- updated_at

#### daily_developer_metrics
- id
- developer_id
- repository_id
- metric_date
- prs_opened
- prs_merged
- prs_closed_unmerged
- additions
- deletions
- changed_files
- reviews_submitted
- avg_pr_size
- avg_time_to_first_review_seconds
- avg_time_to_merge_seconds
- created_at
- updated_at

### 8.3 Indexing requirements
Add indexes for:
- repository_id + created_at_github
- author_developer_id + created_at_github
- merged_at_github
- state
- github_pr_number + repository_id
- metric_date
- delivery_id
- github_user_id
- github_repo_id

### 8.4 Recalculation strategy
Design the DB so metrics can be recomputed from raw PR/review data if aggregation logic changes later.

---

## 9. Metrics definitions

Define metric formulas clearly and consistently.

### 9.1 PRs opened
Count of PRs where `created_at_github` is within selected range.

### 9.2 PRs merged
Count of PRs where `merged_at_github` is within selected range.

### 9.3 PRs closed without merge
Count of PRs where `closed_at_github` is within selected range and `merged_at_github` is null.

### 9.4 Time to first review
For each PR, if at least one submitted review exists:
`first_review_at_github - created_at_github`

Average this over eligible PRs in the selected scope.

### 9.5 Time to merge
For merged PRs:
`merged_at_github - created_at_github`

Average this over merged PRs in the selected scope.

### 9.6 Additions / deletions
Use PR-level additions and deletions reported by GitHub and attribute them to the PR author.

### 9.7 Review count
Count submitted reviews by reviewer in selected period.

### 9.8 Average PR size
Define as:
`(additions + deletions) / count(PRs)`
or store both:
- average additions + deletions
- average changed files

Be explicit in UI about which definition is being used.

---

## 10. Frontend requirements

### 10.1 Recommended frontend stack
Preferred:
- React + TypeScript
- Next.js for app structure
- a robust UI library such as Material UI
- charting library suitable for time series and rankings

### 10.2 UX and information architecture
Build a clean, professional, analytics-focused UI.

Pages:
1. Login / access
2. Organization overview
3. Repository dashboard
4. Developers leaderboard
5. Developer detail
6. Pull request explorer
7. Admin / integrations / sync health

### 10.3 Dashboard components
Include components such as:
- KPI cards
- ranking tables
- time-series charts
- filter bar
- PR table with sorting/pagination
- sync status banner
- empty state / partial data warnings

### 10.4 Required frontend behaviors
- Server-driven filtering when data volume is large
- URL-synced filters where reasonable
- Loading states
- Error states
- Partial sync warning states
- Clear date range controls
- Export-ready table structure if possible

### 10.5 Design tone
The interface should feel:
- professional
- clean
- trustworthy
- operational
- not gimmicky

Avoid gamification-heavy design.
Avoid overly playful colors for serious analytics surfaces.

---

## 11. Observability and operational quality

### 11.1 Logging
Implement structured logs for:
- webhook received
- webhook validated
- sync started
- sync finished
- rate limit encountered
- retry scheduled
- job failed
- metrics recomputed

### 11.2 Monitoring
Expose:
- health endpoint
- queue backlog metrics
- failed jobs count
- sync freshness indicators
- webhook processing latency
- API latency for dashboard endpoints

### 11.3 Admin visibility
Provide an admin screen for:
- connected installations
- last sync per organization/repository
- failed syncs
- retry controls
- webhook delivery statuses
- degraded/rate-limited states

---

## 12. Non-functional requirements

- Code must be typed end-to-end
- Architecture must be modular
- Use DTOs / validation schemas
- Add unit tests for core metric logic
- Add integration tests for GitHub webhook processing
- Use migrations for database schema
- Make the system locally runnable with a documented setup
- Prefer Docker-based local development
- Keep clear separation between domain logic and infrastructure logic

---

## 13. Implementation guidance for GitHub data collection

### 13.1 Data acquisition strategy
For each connected repository:
1. Initial backfill of PRs in a configurable historical window
2. Fetch reviews for those PRs
3. Derive first review timestamps
4. Persist normalized entities
5. Build daily aggregates
6. Keep updated through webhooks + scheduled incremental sync

### 13.2 Reconciliation rules
Because webhooks can fail or be missed, implement scheduled repair jobs that:
- revisit recently updated PRs
- reconcile review states
- repair missing merges
- rebuild daily aggregates if needed

### 13.3 Idempotency
All sync paths must be idempotent.
Repeated webhook deliveries or retried sync jobs must not duplicate records or corrupt aggregates.

---

## 14. Deliverables expected from the AI

Produce the following:

1. A concise architecture overview
2. A proposed folder/module structure
3. Database schema/migrations
4. GitHub integration design
5. Webhook handling design
6. Sync/reconciliation strategy
7. Metrics computation strategy
8. Backend API contract
9. Frontend page/component plan
10. Security considerations
11. Rate-limit/secondary-limit handling design
12. Testing strategy
13. Local development setup
14. A phased implementation plan for the MVP

---

## 15. Explicit engineering standards

Follow these rules:
- Use strong naming
- Avoid premature abstraction, but do not write spaghetti code
- Keep domain logic centralized
- Prefer deterministic calculations
- Make edge cases explicit
- Do not hide assumptions
- Document tradeoffs
- Call out GitHub API uncertainty and pagination requirements where relevant
- Keep the MVP practical, but production-minded

---

## 16. Important caveats and product truthfulness

The product must explicitly acknowledge that:
- GitHub activity data is useful for workflow visibility
- It is not a complete measure of engineering impact
- Lines added/removed are weak standalone indicators
- Rankings should be treated as activity rankings, not absolute value rankings

Reflect this truth in product copy and architecture choices.

---

## 17. Output format expected from the AI

Return the response in this order:

1. Executive summary
2. Architecture
3. GitHub integration design
4. Data model
5. Metrics definitions
6. Backend design
7. Frontend design
8. Security and rate-limit handling
9. Observability
10. Phased implementation plan
11. Risks and tradeoffs
12. Open questions

Be concrete.
Be implementation-oriented.
Do not give generic advice.
Do not skip the hard parts.
