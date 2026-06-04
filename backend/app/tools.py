"""Web search and browser automation tools for the pipeline builder."""
from typing import Any, Optional
import httpx
import re

BROWSER_TIMEOUT = 30.0
SEARCH_TIMEOUT = 15.0


async def web_search(query: str, count: int = 5) -> dict[str, Any]:
    """Perform a web search using DuckDuckGo's HTML interface."""
    url = "https://html.duckduckgo.com/html/"
    params = {"q": query}
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/131.0.0.0 Safari/537.36"
    }
    
    async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT, follow_redirects=True) as client:
        resp = await client.post(url, data=params, headers=headers)
        resp.raise_for_status()
        
        results = _parse_ddg_results(resp.text, count)
        return {"query": query, "results": results, "total": len(results)}


def _parse_ddg_results(html: str, limit: int) -> list[dict[str, str]]:
    """Extract search results from DuckDuckGo HTML response."""
    results = []
    # Match result blocks: <a rel="nofollow" class="result__a" href="...">title</a>
    # with following <a class="result__snippet" ...>snippet</a>
    pattern = r'<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([^<]+)</a>'
    snippet_pattern = r'<a class="result__snippet"[^>]*>([^<]+)</a>'
    
    # Find all result URLs and titles
    title_matches = list(re.finditer(pattern, html))
    snippet_matches = list(re.finditer(snippet_pattern, html))
    
    for i in range(min(limit, len(title_matches))):
        url = title_matches[i].group(1)
        title = re.sub(r'<[^>]+>', '', title_matches[i].group(2)).strip()
        snippet = ""
        if i < len(snippet_matches):
            snippet = re.sub(r'<[^>]+>', '', snippet_matches[i].group(1)).strip()
        
        results.append({
            "title": title,
            "url": url,
            "snippet": snippet,
        })
    
    return results


async def fetch_page(url: str, render_js: bool = False) -> dict[str, Any]:
    """Fetch a web page and extract its text content.
    
    Args:
        url: The URL to fetch.
        render_js: Whether to use headless browser rendering (requires playwright).
    
    Returns:
        Dict with 'url', 'title', 'content', and optionally 'screenshot'.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) "
                      "Chrome/131.0.0.0 Safari/537.36"
    }
    
    if render_js:
        try:
            return await _fetch_with_playwright(url)
        except ImportError:
            # Playwright not installed, fall through to httpx
            pass
    
    async with httpx.AsyncClient(timeout=BROWSER_TIMEOUT, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        html = resp.text
        
        title = _extract_title(html)
        content = _extract_text(html)
        
        return {
            "url": url,
            "title": title,
            "content": content[:10000],  # cap at 10K chars
            "content_length": len(content),
            "rendered_js": False,
        }


async def _fetch_with_playwright(url: str) -> dict[str, Any]:
    """Fetch page using Playwright headless browser."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise ImportError("Playwright not installed. Run: pip install playwright && playwright install chromium")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(1000)  # let JS settle
        
        title = await page.title()
        content = await page.inner_text("body")
        
        await browser.close()
        
        return {
            "url": url,
            "title": title,
            "content": content[:10000],
            "content_length": len(content),
            "rendered_js": True,
        }


def _extract_title(html: str) -> str:
    """Extract <title> from HTML."""
    m = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _extract_text(html: str) -> str:
    """Strip HTML tags and extract readable text."""
    # Remove script and style tags
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Replace common block tags with newlines
    html = re.sub(r'</?(?:div|p|br|h[1-6]|li|tr|blockquote|section|article)[^>]*>', '\n', html, flags=re.IGNORECASE)
    # Strip remaining tags
    text = re.sub(r'<[^>]+>', '', html)
    # Decode common entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&nbsp;', ' ').replace('&quot;', '"').replace('&#39;', "'")
    # Collapse whitespace
    text = re.sub(r'\n\s*\n', '\n', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()
