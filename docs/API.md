# GitHub Engineering Analytics Platform API Reference

## Overview

The GitHub Engineering Analytics Platform API provides REST endpoints for querying GitHub engineering metrics, pull requests, repositories, and developer activity. All metrics reflect GitHub activity patterns — not engineering value or productivity.

**Base URL:** `http://localhost:3000/api/v1`

## API Versioning and Authentication

All endpoints use the `/api/v1` prefix and require JWT authentication (except public routes).

### Authentication

JWT Bearer token required in Authorization header:

```
Authorization: Bearer <accessToken>
```

- **Access tokens** expire in 15 minutes
- **Refresh tokens** are valid for 7 days
- Use `/auth/refresh` with refresh token to get a new access token
- **401 Unauthorized:** Missing, invalid, or expired token
- **403 Forbidden:** Sufficient token but insufficient role or org/repo access

### Response Codes

- **200 OK:** Successful GET request
- **201 Created:** Successful POST request creating resource
- **400 Bad Request:** Validation error in request
- **401 Unauthorized:** Authentication required or failed
- **403 Forbidden:** Authenticated but lacking required role/access
- **404 Not Found:** Resource does not exist or not accessible
- **409 Conflict:** Resource already exists (e.g., email already registered)

---

## Authentication Endpoints

### POST /api/v1/auth/signup

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Notes:**
- First signup creates an `admin` role user
- Subsequent signups create `viewer` role users
- Email must be unique
- Password must be at least 8 characters

**Error Responses:**
- **400:** Invalid email format or password too short
- **409:** Email already registered

---

### POST /api/v1/auth/login

Authenticate user and obtain tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Error Responses:**
- **400:** Validation error
- **401:** Invalid email or password

---

### POST /api/v1/auth/refresh

Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- **400:** Validation error
- **401:** Invalid, expired, or revoked refresh token

---

### POST /api/v1/auth/request-otp

Request one-time password for password reset.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If that email is registered, an OTP has been sent"
}
```

**Notes:**
- Same message returned whether email exists or not (for security)
- OTP sent via email if account exists
- OTP valid for 15 minutes

---

### POST /api/v1/auth/verify-otp

Verify OTP and reset password.

**Request:**
```json
{
  "email": "user@example.com",
  "otp_code": "123456",
  "new_password": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "message": "Password updated successfully"
}
```

**Error Responses:**
- **400:** Validation error (invalid OTP format or password too short)
- **401:** Invalid or expired OTP

---

## Metrics Endpoints

### GET /api/v1/metrics/org/:orgId

Organization-level metrics aggregated across date range.

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format
- `metric_key` (optional): Filter to single metric (e.g., `prs_opened`)
- `limit` (optional): Page size, 1-200, default 50
- `offset` (optional): Page offset, default 0
- `sort_by` (optional): Sort field (metric_value, metric_date, developer_id, repo_id)
- `sort_dir` (optional): Sort direction (ASC, DESC)

**Example Request:**
```
GET /api/v1/metrics/org/org-123?start_date=2024-01-01&end_date=2024-03-31&metric_key=prs_opened
```

**Response (200):**
```json
{
  "data": [
    {
      "metric_key": "prs_opened",
      "metric_value": 42,
      "metric_date": "2024-01-15",
      "org_id": "org-123"
    },
    ...
  ],
  "total": 85,
  "limit": 50,
  "offset": 0
}
```

---

### GET /api/v1/metrics/repo/:repoId

Repository-level metrics aggregated across date range.

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format
- `org_id` (optional): Organization ID (for scoping)
- `metric_key` (optional): Filter to single metric
- `limit` (optional): Page size, 1-200, default 50
- `offset` (optional): Page offset, default 0
- `sort_by` (optional): Sort field
- `sort_dir` (optional): Sort direction (ASC, DESC)

**Example Request:**
```
GET /api/v1/metrics/repo/repo-456?start_date=2024-01-01&end_date=2024-03-31&org_id=org-123
```

**Response (200):**
```json
{
  "data": [
    {
      "metric_key": "prs_merged",
      "metric_value": 28,
      "metric_date": "2024-02-15",
      "repo_id": "repo-456"
    },
    ...
  ],
  "total": 75,
  "limit": 50,
  "offset": 0
}
```

---

### GET /api/v1/metrics/developer/:developerId

Developer-level metrics aggregated across date range.

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format
- `org_id` (optional): Organization ID (for scoping)
- `metric_key` (optional): Filter to single metric
- `limit` (optional): Page size, 1-200, default 50
- `offset` (optional): Page offset, default 0
- `sort_by` (optional): Sort field
- `sort_dir` (optional): Sort direction (ASC, DESC)

**Example Request:**
```
GET /api/v1/metrics/developer/dev-789?start_date=2024-01-01&end_date=2024-03-31&org_id=org-123
```

**Response (200):**
```json
{
  "data": [
    {
      "metric_key": "additions",
      "metric_value": 1250,
      "metric_date": "2024-03-01",
      "developer_id": "dev-789"
    },
    ...
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

### GET /api/v1/metrics/leaderboard

Developer leaderboard ranked by selected metric.

**Note:** This is NOT a productivity ranking. It reflects GitHub activity patterns only.

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format
- `org_id` (optional): Organization ID (for scoping)
- `metric_key` (optional): Metric to rank by (default: `prs_opened`)
- `limit` (optional): Page size, 1-200, default 50
- `offset` (optional): Page offset, default 0

**Example Request:**
```
GET /api/v1/metrics/leaderboard?start_date=2024-01-01&end_date=2024-03-31&org_id=org-123&metric_key=prs_merged
```

**Response (200):**
```json
{
  "data": [
    {
      "rank": 1,
      "developer_id": "dev-789",
      "metric_key": "prs_merged",
      "metric_value": 45
    },
    {
      "rank": 2,
      "developer_id": "dev-456",
      "metric_key": "prs_merged",
      "metric_value": 38
    },
    ...
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

---

### GET /api/v1/metrics/trends

Metrics trends over time (daily aggregates).

**Query Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format
- `end_date` (required): End date in YYYY-MM-DD format
- `org_id` (optional): Organization ID (for scoping)
- `repo_id` (optional): Filter by repository ID
- `developer_id` (optional): Filter by developer ID
- `metric_key` (optional): Filter to single metric
- `limit` (optional): Page size, 1-200, default 50
- `offset` (optional): Page offset, default 0

**Example Request:**
```
GET /api/v1/metrics/trends?start_date=2024-01-01&end_date=2024-03-31&org_id=org-123&metric_key=prs_opened
```

**Response (200):**
```json
{
  "data": [
    {
      "metric_date": "2024-01-01",
      "metric_key": "prs_opened",
      "metric_value": 5,
      "org_id": "org-123"
    },
    {
      "metric_date": "2024-01-02",
      "metric_key": "prs_opened",
      "metric_value": 3,
      "org_id": "org-123"
    },
    ...
  ],
  "total": 90,
  "limit": 50,
  "offset": 0
}
```

---

## Data Endpoints

### GET /api/v1/orgs/:orgId/repos

List repositories for organization.

**Query Parameters:**
- `search` (optional): Search by name or full_name
- `limit` (optional): Page size, 1-200, default 50
- `offset` (optional): Page offset, default 0
- `sort_by` (optional): Sort field (name, full_name, created_at, updated_at)
- `sort_dir` (optional): Sort direction (ASC, DESC)

**Example Request:**
```
GET /api/v1/orgs/org-123/repos?search=api&limit=25&sort_by=name
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "repo-123",
      "name": "api-gateway",
      "full_name": "myorg/api-gateway",
      "org_id": "org-123",
      "created_at": "2023-01-15T10:30:00Z",
      "updated_at": "2024-03-28T14:22:00Z"
    },
    {
      "id": "repo-124",
      "name": "api-client",
      "full_name": "myorg/api-client",
      "org_id": "org-123",
      "created_at": "2023-06-01T08:15:00Z",
      "updated_at": "2024-03-27T09:45:00Z"
    }
  ],
  "total": 2,
  "limit": 25,
  "offset": 0
}
```

---

### GET /api/v1/orgs/:orgId/repos/:repoId

Get single repository by ID.

**Path Parameters:**
- `orgId`: Organization ID
- `repoId`: Repository ID

**Example Request:**
```
GET /api/v1/orgs/org-123/repos/repo-123
```

**Response (200):**
```json
{
  "id": "repo-123",
  "name": "api-gateway",
  "full_name": "myorg/api-gateway",
  "org_id": "org-123",
  "created_at": "2023-01-15T10:30:00Z",
  "updated_at": "2024-03-28T14:22:00Z",
  "description": "API gateway service",
  "url": "https://github.com/myorg/api-gateway"
}
```

**Error Responses:**
- **404:** Repository not found in organization

---

### GET /api/v1/orgs/:orgId/developers

List developers active in organization.

**Query Parameters:**
- `search` (optional): Search by login or name
- `limit` (optional): Page size, 1-200, default 50
- `offset` (optional): Page offset, default 0
- `sort_by` (optional): Sort field (login, name, created_at)
- `sort_dir` (optional): Sort direction (ASC, DESC)

**Example Request:**
```
GET /api/v1/orgs/org-123/developers?search=john&limit=10
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "dev-123",
      "login": "johndoe",
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2022-01-10T12:00:00Z"
    },
    {
      "id": "dev-124",
      "login": "johnsmith",
      "name": "John Smith",
      "email": "john.smith@example.com",
      "created_at": "2022-06-15T08:30:00Z"
    }
  ],
  "total": 2,
  "limit": 10,
  "offset": 0
}
```

---

### GET /api/v1/orgs/:orgId/developers/:developerId

Get single developer by ID.

**Path Parameters:**
- `orgId`: Organization ID
- `developerId`: Developer ID

**Example Request:**
```
GET /api/v1/orgs/org-123/developers/dev-123
```

**Response (200):**
```json
{
  "id": "dev-123",
  "login": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "https://avatars.githubusercontent.com/u/1234567",
  "created_at": "2022-01-10T12:00:00Z",
  "github_url": "https://github.com/johndoe"
}
```

**Error Responses:**
- **404:** Developer not found or has no activity in organization

---

### GET /api/v1/pull-requests

List pull requests with filtering and sorting.

**Query Parameters:**
- `org_id` (optional): Organization ID (required for scoping)
- `repo_id` (optional): Filter by repository ID
- `developer_id` (optional): Filter by developer (author) ID
- `state` (optional): Filter by PR state (open, closed, merged)
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format
- `branch` (optional): Filter by base branch
- `limit` (optional): Page size, 1-200, default 50
- `offset` (optional): Page offset, default 0
- `sort_by` (optional): Sort field (github_created_at, github_merged_at, additions, deletions, number)
- `sort_dir` (optional): Sort direction (ASC, DESC)

**Example Request:**
```
GET /api/v1/pull-requests?org_id=org-123&state=merged&start_date=2024-01-01&end_date=2024-03-31&limit=25
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "pr-123",
      "number": 456,
      "title": "Add user authentication",
      "state": "merged",
      "repository_id": "repo-123",
      "author_id": "dev-123",
      "github_created_at": "2024-01-15T10:30:00Z",
      "github_merged_at": "2024-01-16T14:22:00Z",
      "additions": 250,
      "deletions": 45,
      "changed_files": 12,
      "base_branch": "main"
    },
    {
      "id": "pr-124",
      "number": 457,
      "title": "Fix bug in session management",
      "state": "merged",
      "repository_id": "repo-124",
      "author_id": "dev-124",
      "github_created_at": "2024-02-01T08:15:00Z",
      "github_merged_at": "2024-02-02T16:45:00Z",
      "additions": 120,
      "deletions": 30,
      "changed_files": 6,
      "base_branch": "develop"
    }
  ],
  "total": 45,
  "limit": 25,
  "offset": 0
}
```

---

## Health Endpoint

### GET /api/v1/health

System health check (no authentication required).

**Example Request:**
```
GET /api/v1/health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-03-28T15:30:00Z",
  "checks": {
    "database": "up",
    "redis": "up"
  }
}
```

---

## Metric Definitions

All 13 metrics are calculated daily and aggregated across configurable date ranges. Each metric has a specific formula, unit, and important disclaimers.

### PRs Opened (`prs_opened`)

**What it measures:** Count of pull requests where `created_at` falls within the selected date range.

**Formula:** COUNT of pull_requests WHERE github_created_at >= start_date AND github_created_at <= end_date

**Unit:** count

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** Reflects GitHub activity patterns. High counts may reflect small PR culture, not necessarily higher output.

**Edge cases:**
- PRs created but not yet reviewed or merged are included
- Draft PRs are included in the opened count; they are only excluded from merge time calculations
- A PR created on the last day of the range is included; a PR created the day after is not

**Example:** Developer A opens 3 PRs on 2024-01-15 and 2 PRs on 2024-01-16. For the range 2024-01-15 to 2024-01-15, prs_opened = 3.

---

### PRs Merged (`prs_merged`)

**What it measures:** Count of pull requests where `merged_at` falls within the selected date range and `state=merged`.

**Formula:** COUNT of pull_requests WHERE github_merged_at >= start_date AND github_merged_at <= end_date AND state=merged

**Unit:** count

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** Reflects delivery activity. Does not account for PR size or complexity.

**Edge cases:**
- Draft PRs that are merged are included
- PRs merged on the last day of the range are included
- Only PRs with state='merged' are counted; rejected PRs are excluded

**Example:** Developer A merges 2 PRs on 2024-01-15. For the range 2024-01-15 to 2024-01-15, prs_merged = 2.

---

### PRs Closed Without Merge (`prs_closed_unmerged`)

**What it measures:** Count of pull requests where `closed_at` falls within the selected date range, `state=closed`, and `merged_at IS NULL`.

**Formula:** COUNT of pull_requests WHERE github_closed_at >= start_date AND github_closed_at <= end_date AND state=closed AND merged_at IS NULL

**Unit:** count

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** May indicate abandoned work or superseded approaches. Context is required to interpret.

**Edge cases:**
- PRs closed on the same day as merged (merged_at IS NOT NULL) are excluded
- Only explicitly closed PRs are included
- PRs closed by force-pushing are only counted if GitHub records the close event

**Example:** Developer A closes 1 PR without merging on 2024-01-15. For the range 2024-01-15 to 2024-01-15, prs_closed_unmerged = 1.

---

### Code Reviews Submitted (`reviews_submitted`)

**What it measures:** Count of code reviews where `submitted_at` falls within the selected date range.

**Formula:** COUNT of reviews WHERE submitted_at >= start_date AND submitted_at <= end_date

**Unit:** count

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** Reflects review participation. Does not measure review quality or thoroughness.

**Edge cases:**
- Multiple reviews on the same PR by the same reviewer are each counted
- Only completed reviews (APPROVED, CHANGES_REQUESTED, COMMENTED) are counted
- Pending reviews are excluded

**Example:** Developer A submits 5 code reviews on 2024-01-15. For the range 2024-01-15 to 2024-01-15, reviews_submitted = 5.

---

### Lines Added (`additions`)

**What it measures:** Sum of additions across all PRs opened in the date range.

**Formula:** SUM of additions across all PRs opened in the date range

**Unit:** lines

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** Line counts vary widely by language, refactoring, and generated code. Do not interpret as productivity.

**Edge cases:**
- Binary files are excluded
- Generated code (e.g., from codegen tools) is included in the count
- Large refactorings can produce high addition counts with low impact
- Only PRs opened (not merged) in the date range are counted

**Example:** Developer A opens 2 PRs on 2024-01-15 with 500 and 300 additions respectively. For the range 2024-01-15 to 2024-01-15, additions = 800.

---

### Lines Deleted (`deletions`)

**What it measures:** Sum of deletions across all PRs opened in the date range.

**Formula:** SUM of deletions across all PRs opened in the date range

**Unit:** lines

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** Deleting code (reducing complexity, removing duplication) is often a positive contribution.

**Edge cases:**
- Binary files are excluded
- Large-scale deletions (e.g., removing unused modules) produce high counts
- Only PRs opened (not merged) in the date range are counted

**Example:** Developer A opens 1 PR on 2024-01-15 with 150 deletions. For the range 2024-01-15 to 2024-01-15, deletions = 150.

---

### Files Changed (`changed_files`)

**What it measures:** Sum of changed_files across all PRs opened in the date range.

**Formula:** SUM of changed_files across all PRs opened in the date range

**Unit:** files

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** File count does not reflect change complexity or impact.

**Edge cases:**
- Binary file changes are counted
- Rename-only changes may count as 1 or 2 file changes depending on GitHub API
- Only PRs opened (not merged) in the date range are counted

**Example:** Developer A opens 2 PRs on 2024-01-15 affecting 5 and 3 files respectively. For the range 2024-01-15 to 2024-01-15, changed_files = 8.

---

### Average Time to First Review (hours) (`avg_time_to_first_review_hours`)

**What it measures:** Average hours between PR creation and first review for merged PRs where first review exists.

**Formula:** AVG((first_review_at - created_at) in hours) for merged PRs where first_review_at IS NOT NULL

**Unit:** hours

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** Excludes PRs with no review. Lower values indicate faster review cycles, but context (PR size, reviewer availability) matters.

**Edge cases:**
- PRs opened but never reviewed are excluded from calculation
- Draft PRs are excluded
- Only merged PRs are included
- Review cycles spanning weekends/holidays are included at full value

**Example:** Developer A has 2 merged PRs: one reviewed in 2 hours, one in 4 hours. For the range, avg_time_to_first_review_hours = 3.

---

### Average Time to Merge (hours) (`avg_time_to_merge_hours`)

**What it measures:** Average hours between PR creation and merge for merged PRs.

**Formula:** AVG((merged_at - created_at) in hours) for PRs where state=merged

**Unit:** hours

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** Draft PRs and abandoned PRs are excluded. Longer times may reflect thorough review, not slow delivery.

**Edge cases:**
- Only merged PRs are included (state='merged')
- Draft PRs are excluded
- Abandoned PRs are excluded
- Time spans can include weekends and holidays

**Example:** Developer A has 2 merged PRs: one merged in 4 hours, one in 8 hours. For the range, avg_time_to_merge_hours = 6.

---

### Average PR Size (`avg_pr_size`)

**What it measures:** Average lines changed (additions + deletions) for PRs merged in the date range.

**Formula:** AVG(additions + deletions) for PRs merged in the date range

**Unit:** lines changed

**Granularity:** Available at developer, repository, and organization level.

**Disclaimer:** Smaller PRs generally merge faster. This metric reflects PR scope habits, not productivity.

**Edge cases:**
- Only merged PRs are included
- Draft PRs are excluded
- Large refactorings inflate this metric
- Generated code changes are included

**Example:** Developer A merges 2 PRs on 2024-01-15: one with 300 changes (250 additions + 50 deletions), one with 200 changes (100 additions + 100 deletions). For the range, avg_pr_size = 250.

---

### Total PRs Opened (Repository) (`prs_opened_total`)

**What it measures:** Count of all pull requests opened in the date range for this repository (across all developers).

**Formula:** COUNT of all pull requests opened in the date range for this repository

**Unit:** count

**Granularity:** Repository level only.

**Disclaimer:** Repository-level aggregate. See per-developer breakdown for individual contributions.

**Edge cases:**
- All developers' PRs are aggregated
- Draft PRs are included
- Only PRs opened in the date range are counted

**Example:** Repository has 45 PRs opened across all developers in the range 2024-01-01 to 2024-03-31. prs_opened_total = 45.

---

### Total PRs Merged (Repository) (`prs_merged_total`)

**What it measures:** Count of all pull requests merged in the date range for this repository.

**Formula:** COUNT of all pull requests merged in the date range for this repository

**Unit:** count

**Granularity:** Repository level only.

**Disclaimer:** Repository-level aggregate.

**Edge cases:**
- All developers' merged PRs are aggregated
- Draft PRs that are merged are included
- Only PRs merged in the date range are counted

**Example:** Repository has 32 PRs merged across all developers in the range 2024-01-01 to 2024-03-31. prs_merged_total = 32.

---

### Total Reviews Submitted (Repository) (`reviews_submitted_total`)

**What it measures:** Count of all code reviews submitted in the date range for this repository.

**Formula:** COUNT of all code reviews submitted in the date range for this repository

**Unit:** count

**Granularity:** Repository level only.

**Disclaimer:** Repository-level aggregate.

**Edge cases:**
- All developers' reviews are aggregated
- Multiple reviews per PR by different reviewers are each counted
- Only completed reviews are counted
- Pending reviews are excluded

**Example:** Repository received 87 code reviews across all developers in the range 2024-01-01 to 2024-03-31. reviews_submitted_total = 87.

---

## Role-Based Access

Different user roles have different levels of access:

| Role | Orgs Visible | Repos Visible | Can Recalculate Metrics |
|------|-------------|---------------|------------------------|
| admin | All orgs | All repos in all orgs | Yes |
| manager | Assigned orgs only | All repos in assigned orgs | No |
| viewer | Assigned orgs only | Assigned repos only | No |

- **Org access** determined by user-org-assignment in database
- **Repo access** determined by user-org-assignment and user-repo-assignment
- **Insufficient role** returns 403 Forbidden
- **Admins** can access any org/repo and trigger metric recalculation
- **Managers** have full repo access within assigned orgs
- **Viewers** can only see assigned repos in assigned orgs

---

## Pagination and Filtering

### Pagination

All list endpoints support pagination with `limit` and `offset`:

```
GET /api/v1/orgs/org-123/repos?limit=25&offset=50
```

- **limit:** Page size (1-200, default 50)
- **offset:** Skip N results (default 0)

Response includes:
```json
{
  "data": [...],
  "total": 123,
  "limit": 25,
  "offset": 50
}
```

Example: To get page 3 with 25 items per page, use `offset=50`.

### Sorting

All list endpoints support sorting with `sort_by` and `sort_dir`:

```
GET /api/v1/orgs/org-123/repos?sort_by=created_at&sort_dir=DESC
```

- **sort_by:** Field to sort on (varies by endpoint)
- **sort_dir:** Direction (ASC, DESC)

### Filtering

Most endpoints support endpoint-specific filters:

**Repository filters:**
- `search`: Search by name or full_name

**Developer filters:**
- `search`: Search by login or name

**Pull Request filters:**
- `repo_id`: Filter to repository
- `developer_id`: Filter by author
- `state`: Filter by PR state (open, closed, merged)
- `start_date`, `end_date`: Date range (YYYY-MM-DD)
- `branch`: Filter by base branch

### Date Format

All dates use ISO 8601 format: **YYYY-MM-DD**

```
start_date=2024-01-01&end_date=2024-03-31
```

- Dates are inclusive on both ends
- Start date must be before or equal to end date

---

## Error Handling

### Standard Error Response

All error responses follow this format:

```json
{
  "message": "Error description",
  "error": "Error type",
  "statusCode": 400
}
```

### Common Error Scenarios

**Missing Required Parameter:**
```json
{
  "message": "start_date is required",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Invalid Date Format:**
```json
{
  "message": "start_date must be a valid ISO8601 date string",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Insufficient Permissions:**
```json
{
  "message": "You do not have access to this organization",
  "error": "Forbidden",
  "statusCode": 403
}
```

**Resource Not Found:**
```json
{
  "message": "Repository repo-123 not found in org org-456",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Examples

### Example 1: Login and Query Organization Metrics

```bash
# 1. Signup
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "mypassword123"
  }'

# Response includes accessToken and refreshToken

# 2. Query organization metrics
curl -X GET 'http://localhost:3000/api/v1/metrics/org/org-123?start_date=2024-01-01&end_date=2024-03-31' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Example 2: Search Repositories and Get Repository Details

```bash
# 1. Search repositories
curl -X GET 'http://localhost:3000/api/v1/orgs/org-123/repos?search=api&limit=10' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# 2. Get single repository
curl -X GET 'http://localhost:3000/api/v1/orgs/org-123/repos/repo-123' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Example 3: Developer Leaderboard

```bash
# Get top 10 developers by PRs merged
curl -X GET 'http://localhost:3000/api/v1/metrics/leaderboard?start_date=2024-01-01&end_date=2024-03-31&org_id=org-123&metric_key=prs_merged&limit=10' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Example 4: Pull Request Filtering

```bash
# Get all merged PRs in a repository in a date range
curl -X GET 'http://localhost:3000/api/v1/pull-requests?org_id=org-123&repo_id=repo-123&state=merged&start_date=2024-01-01&end_date=2024-03-31' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."

# Get merged PRs by a specific developer
curl -X GET 'http://localhost:3000/api/v1/pull-requests?org_id=org-123&developer_id=dev-123&state=merged' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## API Documentation Browsing

Swagger/OpenAPI documentation is available at:

- **Swagger UI:** http://localhost:3000/api/docs
- **OpenAPI JSON:** http://localhost:3000/api/docs-json

These auto-generated docs include:
- All endpoints with descriptions
- Request/response schemas
- Parameter documentation
- Try-it-out functionality in Swagger UI

---

## Support and Questions

For issues, bugs, or questions about the API:
1. Check this documentation for endpoint details
2. Review the metric definitions for formula clarification
3. Check the error response for specific guidance
4. Contact the engineering team for access issues

---

**Last Updated:** 2026-03-28
**API Version:** 1.0
