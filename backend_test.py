#!/usr/bin/env python3
"""
Backend API Testing for Analytics Phase 1
Tests all endpoints: sites, collect, overview, tracker js, rate limiting
"""

import json
import time
import requests
from datetime import datetime, timezone
from typing import Dict, Any

# Use the production URL from frontend/.env
BASE_URL = "https://remaining-features-1.preview.emergentagent.com/api"

def log_test(test_name: str, success: bool, details: str = ""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   {details}")
    print()

def test_root_endpoint():
    """Test 1: GET /api/ should return message"""
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                log_test("Root endpoint", True, f"Message: {data['message']}")
                return True
            else:
                log_test("Root endpoint", False, "No 'message' field in response")
                return False
        else:
            log_test("Root endpoint", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Root endpoint", False, f"Exception: {str(e)}")
        return False

def test_create_site():
    """Test 2: POST /api/sites - create site"""
    try:
        payload = {
            "name": "Test Site",
            "domain": "example.com", 
            "sessionTimeoutMin": 30
        }
        response = requests.post(f"{BASE_URL}/sites", json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("id", "").startswith("site_"):
                log_test("Create site", True, f"Site ID: {data['id']}, Name: {data['name']}")
                return data["id"]  # Return site ID for further tests
            else:
                log_test("Create site", False, f"Site ID doesn't start with 'site_': {data.get('id')}")
                return None
        else:
            log_test("Create site", False, f"Status: {response.status_code}, Body: {response.text}")
            return None
    except Exception as e:
        log_test("Create site", False, f"Exception: {str(e)}")
        return None

def test_list_sites(expected_site_id: str = None):
    """Test 3: GET /api/sites - list sites"""
    try:
        response = requests.get(f"{BASE_URL}/sites", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                found_site = False
                if expected_site_id:
                    found_site = any(site.get("id") == expected_site_id for site in data)
                
                if expected_site_id and found_site:
                    log_test("List sites", True, f"Found {len(data)} sites, including expected site {expected_site_id}")
                elif expected_site_id and not found_site:
                    log_test("List sites", False, f"Expected site {expected_site_id} not found in {len(data)} sites")
                else:
                    log_test("List sites", True, f"Retrieved {len(data)} sites")
                return found_site or not expected_site_id
            else:
                log_test("List sites", False, "Response is not a list")
                return False
        else:
            log_test("List sites", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("List sites", False, f"Exception: {str(e)}")
        return False

def test_tracker_js():
    """Test 4: GET /api/i.js - return JavaScript tracker"""
    try:
        response = requests.get(f"{BASE_URL}/i.js", timeout=10)
        
        if response.status_code == 200:
            content_type = response.headers.get("content-type", "")
            js_content = response.text
            
            # Check content type
            if "application/javascript" in content_type:
                # Check if it contains '/api/collect' reference
                if "/api/collect" in js_content:
                    log_test("Tracker JS", True, f"Content-Type: {content_type}, Contains /api/collect reference")
                    return True
                else:
                    log_test("Tracker JS", False, "JavaScript doesn't contain '/api/collect' reference")
                    return False
            else:
                log_test("Tracker JS", False, f"Wrong content-type: {content_type}")
                return False
        else:
            log_test("Tracker JS", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Tracker JS", False, f"Exception: {str(e)}")
        return False

def test_collect_pageview(site_id: str):
    """Test 5: POST /api/collect - pageview without DNT"""
    try:
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        payload = {
            "siteId": site_id,
            "type": "pageview",
            "ts": now_ms,
            "url": "https://example.com/",
            "title": "Home",
            "referrer": "",
            "visitorId": "v1",
            "sessionId": "s1", 
            "deviceType": "desktop",
            "browser": "Chrome",
            "os": "macOS",
            "lang": "ar",
            "tz": "Africa/Cairo",
            "countryHint": "Africa",
            "channel": "Direct"
        }
        
        response = requests.post(f"{BASE_URL}/collect", json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") is True:
                log_test("Collect pageview (no DNT)", True, "Successfully collected pageview")
                return True
            else:
                log_test("Collect pageview (no DNT)", False, f"Response ok is not True: {data}")
                return False
        else:
            log_test("Collect pageview (no DNT)", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Collect pageview (no DNT)", False, f"Exception: {str(e)}")
        return False

def test_collect_with_dnt(site_id: str):
    """Test 6: POST /api/collect with DNT header"""
    try:
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        payload = {
            "siteId": site_id,
            "type": "pageview", 
            "ts": now_ms,
            "url": "https://example.com/",
            "title": "Home",
            "referrer": "",
            "visitorId": "v2",
            "sessionId": "s2",
            "deviceType": "desktop", 
            "browser": "Chrome",
            "os": "macOS",
            "lang": "ar",
            "tz": "Africa/Cairo",
            "countryHint": "Africa",
            "channel": "Direct"
        }
        
        headers = {"DNT": "1"}
        response = requests.post(f"{BASE_URL}/collect", json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") is True:
                log_test("Collect with DNT", True, "DNT respected - returned ok=true without storing")
                return True
            else:
                log_test("Collect with DNT", False, f"Response ok is not True: {data}")
                return False
        else:
            log_test("Collect with DNT", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Collect with DNT", False, f"Exception: {str(e)}")
        return False

def test_get_hits(site_id: str):
    """Test 7: GET /api/hits - retrieve hits"""
    try:
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        start_ts = now_ms - (60 * 60 * 1000)  # 1 hour ago
        end_ts = now_ms + (60 * 60 * 1000)    # 1 hour from now
        
        params = {
            "siteId": site_id,
            "startTs": start_ts,
            "endTs": end_ts
        }
        
        response = requests.get(f"{BASE_URL}/hits", params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "hits" in data and isinstance(data["hits"], list):
                hits = data["hits"]
                if len(hits) >= 1:
                    # Check if at least one hit has ipHash
                    has_ip_hash = any("ipHash" in hit for hit in hits)
                    if has_ip_hash:
                        log_test("Get hits", True, f"Retrieved {len(hits)} hits, contains ipHash")
                        return True
                    else:
                        log_test("Get hits", False, f"Retrieved {len(hits)} hits but no ipHash found")
                        return False
                else:
                    log_test("Get hits", False, f"Expected at least 1 hit, got {len(hits)}")
                    return False
            else:
                log_test("Get hits", False, "Response doesn't contain 'hits' array")
                return False
        else:
            log_test("Get hits", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Get hits", False, f"Exception: {str(e)}")
        return False

def test_overview(site_id: str):
    """Test 8: GET /api/overview - get analytics overview"""
    try:
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        start_ts = now_ms - (7 * 24 * 60 * 60 * 1000)  # 7 days ago
        end_ts = now_ms
        
        params = {
            "siteId": site_id,
            "startTs": start_ts,
            "endTs": end_ts
        }
        
        response = requests.get(f"{BASE_URL}/overview", params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["kpis", "series", "activeVisitors", "topPages"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                log_test("Overview", True, f"All required fields present: {required_fields}")
                return True
            else:
                log_test("Overview", False, f"Missing fields: {missing_fields}")
                return False
        else:
            log_test("Overview", False, f"Status: {response.status_code}, Body: {response.text}")
            return False
    except Exception as e:
        log_test("Overview", False, f"Exception: {str(e)}")
        return False

def test_rate_limiting(site_id: str):
    """Test 9: Rate limiting - send 130 requests quickly"""
    try:
        print("Testing rate limiting (sending 130 requests)...")
        
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        payload = {
            "siteId": site_id,
            "type": "pageview",
            "ts": now_ms,
            "url": "https://example.com/rate-test",
            "title": "Rate Test",
            "referrer": "",
            "visitorId": "rate_test_visitor",
            "sessionId": "rate_test_session",
            "deviceType": "desktop",
            "browser": "Chrome", 
            "os": "macOS",
            "lang": "en",
            "tz": "UTC",
            "countryHint": "US",
            "channel": "Direct"
        }
        
        success_count = 0
        rate_limited_count = 0
        error_count = 0
        
        for i in range(130):
            try:
                response = requests.post(f"{BASE_URL}/collect", json=payload, timeout=5)
                if response.status_code == 200:
                    success_count += 1
                elif response.status_code == 429:
                    rate_limited_count += 1
                else:
                    error_count += 1
            except Exception:
                error_count += 1
            
            # Small delay to avoid overwhelming
            if i % 10 == 0:
                time.sleep(0.1)
        
        if rate_limited_count > 0:
            log_test("Rate limiting", True, 
                    f"Success: {success_count}, Rate limited (429): {rate_limited_count}, Errors: {error_count}")
            return True
        else:
            log_test("Rate limiting", False, 
                    f"No rate limiting detected. Success: {success_count}, Errors: {error_count}")
            return False
            
    except Exception as e:
        log_test("Rate limiting", False, f"Exception: {str(e)}")
        return False

def verify_dnt_not_stored(site_id: str):
    """Verify that DNT requests were not stored by checking hit count"""
    try:
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        start_ts = now_ms - (60 * 60 * 1000)  # 1 hour ago
        end_ts = now_ms + (60 * 60 * 1000)    # 1 hour from now
        
        params = {
            "siteId": site_id,
            "startTs": start_ts,
            "endTs": end_ts
        }
        
        response = requests.get(f"{BASE_URL}/hits", params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            hits = data.get("hits", [])
            
            # Look for DNT visitor (v2) - should not be found
            dnt_hits = [hit for hit in hits if hit.get("visitorId") == "v2"]
            
            if len(dnt_hits) == 0:
                log_test("DNT verification", True, "DNT request was not stored (as expected)")
                return True
            else:
                log_test("DNT verification", False, f"Found {len(dnt_hits)} DNT hits (should be 0)")
                return False
        else:
            log_test("DNT verification", False, f"Failed to retrieve hits for verification")
            return False
    except Exception as e:
        log_test("DNT verification", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print("=" * 60)
    print("BACKEND API TESTING - Analytics Phase 1")
    print("=" * 60)
    print(f"Testing against: {BASE_URL}")
    print()
    
    results = []
    site_id = None
    
    # Test 1: Root endpoint
    results.append(test_root_endpoint())
    
    # Test 2: Create site
    site_id = test_create_site()
    results.append(site_id is not None)
    
    if site_id:
        # Test 3: List sites
        results.append(test_list_sites(site_id))
        
        # Test 4: Tracker JS
        results.append(test_tracker_js())
        
        # Test 5: Collect pageview (no DNT)
        results.append(test_collect_pageview(site_id))
        
        # Test 6: Collect with DNT
        results.append(test_collect_with_dnt(site_id))
        
        # Wait a moment for data to be stored
        time.sleep(2)
        
        # Test 7: Get hits
        results.append(test_get_hits(site_id))
        
        # Test 8: Overview
        results.append(test_overview(site_id))
        
        # Test 9: Rate limiting
        results.append(test_rate_limiting(site_id))
        
        # Verify DNT was not stored
        results.append(verify_dnt_not_stored(site_id))
    else:
        print("❌ Skipping remaining tests due to site creation failure")
        results.extend([False] * 7)  # Mark remaining tests as failed
    
    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED!")
        return True
    else:
        print(f"❌ {total - passed} tests failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)