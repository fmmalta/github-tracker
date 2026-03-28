import { test, expect, Page } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'admin@example.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'testpassword123'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

test.describe('Login flow', () => {
  test('can log in with valid credentials and reach dashboard', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Organization Overview')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('invalid@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Dashboard views', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('org overview shows metric cards', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('PRs Opened')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('PRs Merged')).toBeVisible()
  })

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Leaderboard' }).click()
    await expect(page).toHaveURL(/\/leaderboard/)
    await expect(page.getByText('Not a productivity ranking')).toBeVisible()
  })

  test('leaderboard shows disclaimer banner immediately', async ({ page }) => {
    await page.goto('/leaderboard')
    await expect(
      page.getByText('Not a productivity ranking. Metrics show GitHub activity patterns.')
    ).toBeVisible()
  })

  test('PR explorer filter state persists in URL', async ({ page }) => {
    await page.goto('/pull-requests')

    await page.getByRole('button', { name: 'Show Filters' }).click()
    await page.getByRole('button', { name: 'Last 7 days' }).click()

    await expect(page).toHaveURL(/startDate=/)

    await page.reload()
    await expect(page).toHaveURL(/startDate=/)
  })

  test('leaderboard metric selector updates URL', async ({ page }) => {
    await page.goto('/leaderboard')
    await page.getByLabel('Rank developers by').click()
    await page.getByRole('option', { name: 'Reviews Submitted' }).click()
    await expect(page).toHaveURL(/metric=REVIEWS_SUBMITTED_TOTAL/)
  })

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
