#!/usr/bin/env python3
"""Test all pipeline builder endpoints."""
import json, urllib.request, sys

BASE = "http://127.0.0.1:8083"
passed = 0
failed = 0

def test(name, method, path, body=None, expect=200):
    global passed, failed
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    try:
        req = urllib.request.Request(url, data=data, method=method,
            headers={"Content-Type": "application/json"})
        resp = urllib.request.urlopen(req, timeout=15)
        result = json.loads(resp.read())
        if resp.status == expect:
            print(f"  OK {name} ({resp.status})")
            passed += 1
        else:
            print(f"  FAIL {name}: expected {expect}, got {resp.status}")
            failed += 1
        return result
    except Exception as e:
        print(f"  FAIL {name}: {e}")
        failed += 1
        return None

print("=== HEALTH ===")
test("health", "GET", "/api/health")

print("\n=== SEARCH ===")
r = test("search", "POST", "/api/search", {"query": "test", "count": 2})
if r: print(f"  results: {len(r.get('results', []))}")

print("\n=== BROWSER ===")
r = test("browser fetch", "POST", "/api/browser/fetch", {"url": "https://example.com"})
if r: print(f"  title: {r.get('title','')[:60]}")

print("\n=== CURL ===")
test("curl gen", "POST", "/api/curl/generate", {"config": {"method": "GET", "url": "https://example.com"}})

print("\n=== PIPELINE ===")
p = {"pipeline": {"nodes": [
    {"id":"p1","type":"provider","position":{"x":0,"y":0},"data":{"label":"opencode-go","type":"provider","config":{"endpoint":"https://opencode.ai/zen/go/v1","model":"deepseek-v4-flash","apiKey":"sk-test"}}},
    {"id":"c1","type":"chat","position":{"x":200,"y":0},"data":{"label":"Chat","type":"chat","config":{"systemPrompt":"You are helpful.","messages":[{"role":"user","content":"Say hi in one word"}],"temperature":0.7}}},
    {"id":"o1","type":"observer","position":{"x":400,"y":0},"data":{"label":"Observer","type":"observer","config":{"captured":[]}}},
    {"id":"s1","type":"search","position":{"x":0,"y":200},"data":{"label":"Search","type":"search","config":{"query":"MCP tools","count":3}}},
    {"id":"b1","type":"browser","position":{"x":200,"y":200},"data":{"label":"Browser","type":"browser","config":{"url":"https://example.com","renderJs":False}}}
], "edges": [
    {"id":"e1","source":"p1","target":"c1"},
    {"id":"e2","source":"c1","target":"o1"}
]}, "providerId":"p1","stepIds":["c1","s1","b1","o1"]}

r = test("pipeline exec", "POST", "/api/execute", p)
if r:
    for step in r.get("results", []):
        err = step.get("error")
        status = "OK" if not err else f"ERR: {err[:80]}"
        print(f"  {step['nodeType']}: {status}")

print(f"\nPassed: {passed}/{passed+failed}  Failed: {failed}")
sys.exit(0 if failed == 0 else 1)
