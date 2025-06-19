from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
from services.code_generator import CodeGenerator
from services.layout_detector import LayoutDetector

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Wireflow API",
    description="API for converting wireframes to code",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
layout_detector = LayoutDetector()
code_generator = CodeGenerator()

@app.get("/")
async def root():
    return {"message": "Wireflow API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/generate")
async def generate_code(image: UploadFile = File(...)):
    """
    Generate code from uploaded wireframe image
    """
    try:
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read image content
        image_content = await image.read()

        # Detect layout from image
        layout_data = await layout_detector.detect_layout(image_content)

        # Generate code from layout
        generated_code = await code_generator.generate_code(layout_data)

        return JSONResponse(content={
            "code": generated_code,
            "message": "Code generated successfully"
        })

    except Exception as e:
        print(f"Error generating code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating code: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)