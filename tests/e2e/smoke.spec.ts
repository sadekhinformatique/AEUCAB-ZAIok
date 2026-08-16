import { test, expect } from "@playwright/test"

test.describe("Parcours public & authentification", () => {
  test("la page de connexion du SAS se charge et affiche le formulaire", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByLabel(/Identifiant/i).first()).toBeVisible()
    await expect(page.getByLabel(/Mot de passe/i).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Se connecter/i }).first()).toBeVisible()
  })

  test("les routes protégées redirigent vers /login sans session", async ({ page }) => {
    await page.goto("/")
    await page.waitForURL("**/login")
    expect(page.url()).toContain("/login")
  })

  test("l'API health répond avec un statut documenté", async ({ request }) => {
    // Le contrat : 200 si la base répond, 503 (forme documentée) si elle est
    // injoignable — le test vérifie l'endpoint, pas la disponibilité de la base.
    const res = await request.get("/api/health")
    expect([200, 503]).toContain(res.status())
    const body = await res.json()
    const dbInfo = body.details?.database ?? body.database
    expect(typeof dbInfo?.ok).toBe("boolean")
    expect(typeof dbInfo?.latencyMs).toBe("number")
  })

  test("des identifiants invalides affichent un message d'erreur", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/Identifiant/i).fill("admin")
    await page.getByLabel(/Mot de passe/i).fill("mauvais-mot-de-passe")
    await page.getByRole("button", { name: /Se connecter/i }).click()
    await expect(page.getByRole("alert")).toBeVisible()
  })

  test("les API protégées renvoient 401 sans session", async ({ request }) => {
    const res = await request.get("/api/sport/competitions")
    expect(res.status()).toBe(401)
  })
})

test.describe("Application étudiante (espace membre)", () => {
  test("l'écran de connexion de l'app étudiante se charge (mobile)", async ({ page }) => {
    await page.goto("/espace-membre")
    await expect(page.getByText(/Espace membre/i).first()).toBeVisible()
    await expect(page.getByLabel(/Identifiant/i).first()).toBeVisible()
    await expect(page.getByLabel(/Mot de passe/i).first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Se connecter/i }).first()).toBeVisible()
  })

  test("l'app étudiante permet d'ouvrir le formulaire d'inscription", async ({ page }) => {
    await page.goto("/espace-membre")
    await page.getByRole("button", { name: /Pas encore membre \? S'inscrire/i }).click()
    await expect(page.getByText(/Nouvelle demande d'adhésion/i)).toBeVisible()
  })
})
