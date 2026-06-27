import { expect, test } from "@playwright/test";

const createBoard = (extraCard?: Record<string, unknown>) => ({
  id: 1,
  columns: [
    {
      id: 1, board_id: 1, title: "Backlog", sort_order: 0,
      cards: extraCard ? [{ id: 1, column_id: 1, title: "Card 1", details: "D1", sort_order: 0 }, extraCard] : [{ id: 1, column_id: 1, title: "Card 1", details: "D1", sort_order: 0 }],
    },
    { id: 2, board_id: 1, title: "In Progress", sort_order: 1, cards: [] },
    { id: 3, board_id: 1, title: "Review", sort_order: 2, cards: [] },
    { id: 4, board_id: 1, title: "Done", sort_order: 3, cards: [] },
  ],
});

let boardWithE2ECard: ReturnType<typeof createBoard>;

test.use({
  storageState: {
    cookies: [{ name: "session", value: "authenticated", domain: "127.0.0.1", path: "/", sameSite: "Strict" }],
  },
});

test.beforeAll(() => {
  boardWithE2ECard = createBoard({ id: 99, column_id: 1, title: "E2E card", details: "Added via e2e.", sort_order: 1 });
});

test.beforeEach(async ({ page }) => {
  // Track if POST has been made
  let postDone = false;

  await page.route("**/api/boards", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: postDone ? boardWithE2ECard : createBoard() });
    }
    return route.continue();
  });

  await page.route("**/api/boards/1/cards", (route) => {
    if (route.request().method() === "POST") {
      postDone = true;
      return route.fulfill({
        json: { id: 99, column_id: 1, title: "E2E card", details: "Added via e2e.", sort_order: 1 },
      });
    }
    return route.continue();
  });
});

test("loads the kanban board", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kanban Studio" }).first()).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(4);
});

test("adds a card to a column", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
  const firstColumn = page.locator('[data-testid="column-1"]');
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("E2E card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(page.getByText("E2E card")).toBeVisible();
});

test("shows error state on API failure", async ({ page }) => {
  await page.route("**/api/boards", (route) => {
    return route.fulfill({ status: 500, json: { detail: "Server error" } });
  });

  await page.goto("/");
  await expect(page.getByText("Server error")).toBeVisible();
  await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
});

test("login page is accessible without session", async ({ page }) => {
  await page.context().clearCookies();
  await page.route("**/api/*", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kanban Studio" }).first()).toBeVisible();
  await expect(page.getByPlaceholder("user")).toBeVisible();
  await expect(page.getByPlaceholder("password")).toBeVisible();
});

test("login redirects to board on success", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("user").fill("user");
  await page.getByPlaceholder("password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.locator('[data-testid^="column-"]').first()).toBeVisible();
});

test("login shows error on failure", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("user").fill("wrong");
  await page.getByPlaceholder("password").fill("wrong");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("Invalid credentials")).toBeVisible();
});

test("theme toggle persists preference", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /toggle theme/i });
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const stored = await page.evaluate(() => localStorage.getItem("theme"));
  expect(stored).toBe("dark");
});
