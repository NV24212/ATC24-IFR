from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:8000")
    page.screenshot(path="jules-scratch/verification/01_initial_load.png")

    # Click login and simulate Discord auth
    page.click('button.discord-login-main')
    page.goto("http://localhost:8000/?auth=success")
    page.wait_for_selector('#authLoggedIn')
    page.screenshot(path="jules-scratch/verification/02_logged_in.png")

    # Verify profile and leaderboard modals
    page.click('#profileBtn')
    page.wait_for_selector('#profileModal.show')
    page.screenshot(path="jules-scratch/verification/03_profile_modal.png")
    page.click('#profileModal .modal-close')

    page.click('#leaderboardBtn')
    page.wait_for_selector('#leaderboardModal.show')
    page.screenshot(path="jules-scratch/verification/04_leaderboard_modal.png")
    page.click('#leaderboardModal .modal-close')

    # Verify logout
    page.click('.logout-btn')
    page.on('dialog', lambda dialog: dialog.accept())
    page.wait_for_selector('#authLoggedOut')
    page.screenshot(path="jules-scratch/verification/05_logged_out.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
