
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()
load_dotenv('.env.local')

SERPER_API_KEY = os.getenv("SERPER_API_KEY")
print(f"Key loaded: {bool(SERPER_API_KEY)}")

url = "https://google.serper.dev/news"
headers = {
    "X-API-KEY": SERPER_API_KEY,
    "Content-Type": "application/json"
}

# Test 1: Simple query
payload1 = {
    "q": "Apple",
    "gl": "us",
    "hl": "en",
    "num": 10
}
print("\nTest 1 (Simple 'Apple'): sending...")
try:
    resp = requests.post(url, json=payload1, headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code != 200:
        print(resp.text)
    else:
        print("Success! Items:", len(resp.json().get('news', [])))
except Exception as e:
    print(f"Ex: {e}")

# Test 2: Mappedin query
payload2 = {
    "q": "\"Mappedin\" contract OR deal OR partnership OR launch OR expansion",
    "gl": "us",
    "hl": "en",
    "num": 10
}
print("\nTest 2 (Complex 'Mappedin'): sending...")
try:
    resp = requests.post(url, json=payload2, headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code != 200:
        print(resp.text)
    else:
        print("Success! Items:", len(resp.json().get('news', [])))
except Exception as e:
    print(f"Ex: {e}")
