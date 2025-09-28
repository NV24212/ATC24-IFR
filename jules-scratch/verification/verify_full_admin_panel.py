import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the admin.html file
        file_path = os.path.abspath('frontend/admin.html')

        # Go to the local admin.html file
        await page.goto(f'file://{file_path}')

        # Mock the API call to /api/admin/analytics to provide fake data
        # This allows us to test the frontend UI without needing a live backend or auth
        await page.route("**/api/admin/analytics", lambda route: route.fulfill(
            status=200,
            json={
                "totalVisits": 123,
                "clearancesGenerated": 45,
                "flightPlansReceived": 67,
                "dailyVisits": {},
                "last7Days": 89,
                "last30Days": 456
            }
        ))

        # Use JavaScript to bypass the login screen and show the admin panel
        await page.evaluate('''() => {
            const loginScreen = document.getElementById('loginScreen');
            const adminPanel = document.getElementById('adminPanel');
            if (loginScreen && adminPanel) {
                loginScreen.classList.add('fade-out');
                adminPanel.classList.add('authenticated');
                // Manually trigger the data loading since we skipped the auth flow
                if (window.loadAdminData) {
                    window.loadAdminData();
                }
            }
        }''')

        # Wait for the analytics value to be populated with our mocked data
        total_visits_locator = page.locator('#totalVisits')
        await expect(total_visits_locator).to_have_text('123')

        # Wait a moment for charts to potentially load
        await page.wait_for_timeout(1000)

        # Take a screenshot of the fully functional admin panel
        screenshot_path = 'jules-scratch/verification/full-admin-panel-view.png'
        await page.screenshot(path=screenshot_path)

        print(f"Screenshot of functional admin panel saved to {screenshot_path}")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())