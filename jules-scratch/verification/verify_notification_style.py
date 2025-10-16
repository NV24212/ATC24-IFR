import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('frontend/index.html')

        # Go to the local HTML file
        await page.goto(f'file://{file_path}')

        # Wait for the page to load by looking for a specific element
        await page.wait_for_selector('#generateBtn')

        # Execute script to show a notification
        await page.evaluate("""
            import('./src/notifications.js').then(module => {
                module.showNotification('success', 'Test Notification', 'This is a test of the new notification style.');
            })
        """)

        # Wait for the notification to appear
        await page.wait_for_selector('.notification.show')

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())