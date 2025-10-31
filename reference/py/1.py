import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

from playwright.async_api import Browser, Page, async_playwright


LOGIN_URL = "http://103.159.68.35:3535/auth/student/login"
TARGET_PAGES: Tuple[Tuple[str, str], ...] = (
    ("login", LOGIN_URL),
    ("dashboard", "http://103.159.68.35:3535/student"),
    ("attendance", "http://103.159.68.35:3535/student/attendance"),
    ("profile", "http://103.159.68.35:3535/student/profile"),
)


async def ask(prompt: str) -> str:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: input(prompt))


async def collect_page_assets(page: Page, url: str, destination: Path) -> List[Dict[str, str]]:
    destination.mkdir(parents=True, exist_ok=True)

    responses: List[Dict[str, str]] = []

    def handle_response(response):  # type: ignore[no-untyped-def]
        try:
            record = {
                "url": response.url,
                "status": response.status,
                "resource_type": response.request.resource_type,
                "method": response.request.method,
            }
        except Exception:
            return
        responses.append(record)

    page.context.on("response", handle_response)
    try:
        await page.goto(url, wait_until="networkidle")
    finally:
            page.context.remove_listener("response", handle_response)

    html = await page.content()
    (destination / "index.html").write_text(html, encoding="utf-8")
    await page.screenshot(path=destination / "screenshot.png", full_page=True)
    (destination / "network.json").write_text(
        json.dumps(list(responses), indent=2), encoding="utf-8"
    )

    storage_state = await page.context.storage_state()
    (destination / "storage_state.json").write_text(
        json.dumps(storage_state, indent=2), encoding="utf-8"
    )

    local_storage = await page.evaluate("() => Object.fromEntries(Object.entries(localStorage))")
    session_storage = await page.evaluate(
        "() => Object.fromEntries(Object.entries(sessionStorage))"
    )
    (destination / "local_storage.json").write_text(
        json.dumps(local_storage, indent=2), encoding="utf-8"
    )
    (destination / "session_storage.json").write_text(
        json.dumps(session_storage, indent=2), encoding="utf-8"
    )

    return responses


def summarize(label: str, name: str, responses: List[Dict[str, str]]) -> None:
    print(f"    ✔ {label} {name}: captured {len(responses)} requests")


async def write_summary(
    report_path: Path, data: Dict[str, Dict[str, List[Dict[str, str]]]]
) -> None:
    lines = ["Captured API traffic\n", "====================\n"]
    for phase, pages in data.items():
        lines.append(f"\n[{phase}]\n")
        for name, responses in pages.items():
            lines.append(f"  {name} – {len(responses)} requests\n")
            for resp in responses:
                lines.append(
                    f"    {resp['method']} {resp['status']} {resp['resource_type']} :: {resp['url']}\n"
                )
    report_path.write_text("".join(lines), encoding="utf-8")


async def guided_session(browser: Browser) -> None:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_dir = Path("snapshots") / timestamp
    before_dir = base_dir / "before_login"
    after_dir = base_dir / "after_login"
    report_path = base_dir / "api_summary.txt"

    context = await browser.new_context()
    page = await context.new_page()

    summary: Dict[str, Dict[str, List[Dict[str, str]]]] = {
        "before": {},
        "manual": {},
        "after": {},
    }

    print("Step 1: Pre-login capture")
    print("  The browser window is open. Do not sign in yet.")
    await ask("Press Enter here to capture each page before login…")
    for name, url in TARGET_PAGES:
        print(f"  Visiting {url} → storing under before_login/{name}")
        responses = await collect_page_assets(page, url, before_dir / name)
        summary["before"][name] = responses
        summarize("before", name, responses)

    print("\nStep 2: Manual login")
    print("  Use the live browser to log in and click around dashboard, attendance, and profile.")
    manual_events: List[Dict[str, str]] = []

    def manual_handler(response):  # type: ignore[no-untyped-def]
        try:
            manual_events.append(
                {
                    "url": response.url,
                    "status": response.status,
                    "method": response.request.method,
                    "resource_type": response.request.resource_type,
                }
            )
        except Exception:
            pass

    page.context.on("response", manual_handler)
    await ask("Type 'done' and press Enter here once you finish your manual exploration: ")
    page.context.remove_listener("response", manual_handler)
    summary["manual"]["manual_interaction"] = manual_events

    login_calls = [
        event
        for event in manual_events
        if event["method"] != "GET" and "login" in event["url"].lower()
    ]
    if login_calls:
        first = login_calls[0]
        print(
            f"  Observed login request: {first['method']} {first['status']} → {first['url']}"
        )
    else:
        print("  No explicit login API detected; check manual_interaction logs for details.")

    print("\nStep 3: Post-login capture")
    for name, url in TARGET_PAGES:
        await ask(
            f"Navigate to {url} in the browser, wait for it to finish loading, then press Enter here to capture {name}: "
        )
        print(f"  Capturing {url} → storing under after_login/{name}")
        responses = await collect_page_assets(page, url, after_dir / name)
        summary["after"][name] = responses
        summarize("after", name, responses)

    print("\nStep 4: Summary & manual browser close")
    await write_summary(report_path, summary)
    print(f"  API summary saved to {report_path}")
    print("  Browser stays open—close it yourself when you are done reviewing.")
    await ask("Press Enter here after you close the browser window to finish: ")

    await context.close()


async def main() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        await guided_session(browser)
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())