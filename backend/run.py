#!/usr/bin/env python3
"""
Simple script to run the Wireflow FastAPI backend server.
"""

import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "True").lower() == "true"

    print(f"Starting Wireflow backend server on {host}:{port}")
    print(f"Debug mode: {debug}")

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )