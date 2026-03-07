import subprocess
import time
from playwright.sync_api import sync_playwright

def start_dev_server():
    print("Starting dev server...")
    process = subprocess.Popen(["npm", "run", "dev"], cwd=".", stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(3) # Wait for server to start
    return process

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:5173")
            page.goto("http://localhost:5173")

            # Take a screenshot to verify the title
            print("Taking screenshot...")
            page.screenshot(path="verification.png")
            print("Screenshot saved to verification.png")

            title = page.title()
            print(f"Page title is: {title}")
            assert title == "sblite", f"Expected title 'sblite', but got '{title}'"
            print("Title verification successful!")

        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    process = start_dev_server()
    try:
        run_verification()
    finally:
        print("Stopping dev server...")
        process.terminate()
        process.wait()
