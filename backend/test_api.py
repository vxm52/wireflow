#!/usr/bin/env python3
"""
Simple test script to verify the Wireflow API is working.
"""

import requests
import json
from PIL import Image
import io

def test_health_endpoint():
    """Test the health endpoint."""
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Health check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_generate_endpoint():
    """Test the generate endpoint with a mock image."""
    try:
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='white')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Send request
        files = {'image': ('test.png', img_bytes, 'image/png')}
        response = requests.post("http://localhost:8000/generate", files=files)
        
        print(f"Generate endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Generated code length: {len(data.get('code', ''))} characters")
            print("First 200 characters of generated code:")
            print(data.get('code', '')[:200] + "...")
        else:
            print(f"Error: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Generate endpoint test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("Testing Wireflow API...")
    print("=" * 40)
    
    # Test health endpoint
    health_ok = test_health_endpoint()
    print()
    
    # Test generate endpoint
    generate_ok = test_generate_endpoint()
    print()
    
    # Summary
    if health_ok and generate_ok:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed!")
        if not health_ok:
            print("  - Health endpoint failed")
        if not generate_ok:
            print("  - Generate endpoint failed")

if __name__ == "__main__":
    main() 