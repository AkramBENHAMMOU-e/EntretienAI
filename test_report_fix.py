#!/usr/bin/env python3
"""
Test script to verify the interview report generation fix
"""
import os
import requests
import time
import json
from pathlib import Path

def test_report_generation():
    """Test the report generation workflow"""
    
    # Set working directory to workspace root
    workspace_root = Path(__file__).parent
    os.chdir(workspace_root)
    print(f"Working directory: {os.getcwd()}")
    
    # Check if backend is running
    backend_url = "http://127.0.0.1:8000"
    
    try:
        response = requests.get(f"{backend_url}/")
        print("✓ Backend is running")
    except requests.exceptions.ConnectionError:
        print("✗ Backend is not running. Please start the backend first:")
        print("  cd src/testai && python -m testai.web.backend")
        return False
    
    # Start a test interview
    print("\n1. Starting test interview...")
    payload = {
        "role_title": "FastAPI Developer Test",
        "candidate_name": "Test Candidate",
        "offer_experience_level": "Senior",
        "offer_tech_skills": ["Python", "FastAPI", "REST API"],
        "offer_education": "Computer Science",
        "offer_soft_skills": ["Communication", "Teamwork"]
    }
    
    try:
        response = requests.post(f"{backend_url}/api/interview/start", json=payload)
        if response.status_code == 200:
            session_data = response.json()
            session_id = session_data["session_id"]
            print(f"✓ Interview started with session ID: {session_id}")
        else:
            print(f"✗ Failed to start interview: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error starting interview: {e}")
        return False
    
    # Wait for completion and check for report
    print("\n2. Waiting for interview completion...")
    max_wait = 300  # 5 minutes
    wait_time = 0
    
    while wait_time < max_wait:
        try:
            response = requests.get(f"{backend_url}/api/interview/{session_id}/question")
            if response.status_code == 200:
                status = response.json()
                if status.get("status") == "done":
                    print("✓ Interview completed")
                    break
                elif status.get("status") == "error":
                    print(f"✗ Interview failed: {status.get('message')}")
                    return False
                else:
                    print(f"  Status: {status.get('status')}")
            
            time.sleep(10)
            wait_time += 10
            
        except Exception as e:
            print(f"✗ Error checking status: {e}")
            return False
    
    if wait_time >= max_wait:
        print("✗ Interview timed out")
        return False
    
    # Check if report file exists
    print("\n3. Checking for report file...")
    report_path = workspace_root / "interview_report.md"
    
    if report_path.exists():
        print(f"✓ Report file found at: {report_path}")
        print(f"  File size: {report_path.stat().st_size} bytes")
        print(f"  Modified: {time.ctime(report_path.stat().st_mtime)}")
    else:
        print(f"✗ Report file not found at: {report_path}")
        return False
    
    # Test API endpoints
    print("\n4. Testing API endpoints...")
    
    try:
        # Test markdown endpoint
        response = requests.get(f"{backend_url}/api/admin/report/md")
        if response.status_code == 200:
            print("✓ /api/admin/report/md endpoint working")
            data = response.json()
            print(f"  Report name: {data['name']}")
            print(f"  Content length: {len(data['content'])} characters")
        else:
            print(f"✗ /api/admin/report/md failed: {response.status_code}")
            return False
        
        # Test raw endpoint
        response = requests.get(f"{backend_url}/api/admin/report/raw")
        if response.status_code == 200:
            print("✓ /api/admin/report/raw endpoint working")
        else:
            print(f"✗ /api/admin/report/raw failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error testing API endpoints: {e}")
        return False
    
    print("\n✅ All tests passed! Report generation is working correctly.")
    return True

if __name__ == "__main__":
    success = test_report_generation()
    exit(0 if success else 1)