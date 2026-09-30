import { expect, test } from "@playwright/test";

const password = "Nynety-Local-2026!";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("registers a user account", async ({ page }) => {
  const email = `artist-${Date.now()}@example.local`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("New Artist");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("New-Artist-2026-Strong!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /Good morning, New/ })).toBeVisible();
});

test("creates, reviews, returns, resubmits and approves a release", async ({ page, browser }) => {
  await signIn(page, "user@example.local");
  await page.getByRole("link", { name: "New release" }).click();
  await page.getByLabel("Release title").fill(`E2E Release ${Date.now()}`);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Primary artist").fill("E2E Artist");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByPlaceholder("Track title").fill("First Light");
  const wave = Buffer.alloc(44);
  wave.write("RIFF", 0, "ascii");
  wave.write("WAVE", 8, "ascii");
  await page.locator('input[type="file"]').setInputFiles({ name: "first-light.wav", mimeType: "audio/wav", buffer: wave });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  const png = Buffer.from([137,80,78,71,13,10,26,10]);
  await page.locator('input[type="file"]').setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Genre").fill("Alternative pop");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.locator("span.status").filter({ hasText: "Submitted" })).toBeVisible();
  const releaseUrl = page.url();

  const manager = await browser.newPage();
  await signIn(manager, "manager@example.local");
  await manager.goto(releaseUrl);
  await manager.getByRole("button", { name: "Start review" }).click();
  await manager.getByPlaceholder("What should be updated?").fill("Please update the master file and confirm the artwork.");
  await manager.getByRole("button", { name: "Request changes" }).click();
  await expect(manager.locator("span.status").filter({ hasText: "Changes requested" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Resubmit" }).click();
  await expect(page.locator("span.status").filter({ hasText: "Resubmitted" })).toBeVisible();
  await manager.reload();
  await manager.getByRole("button", { name: "Approve" }).click();
  await expect(manager.locator("span.status").filter({ hasText: "Approved" })).toBeVisible();
  await manager.close();
});
