# Wireflow Backend

FastAPI backend for converting wireframes to code.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file with your OpenAI API key:
```bash
OPENAI_API_KEY=your_openai_api_key_here
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

3. Run the server:
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

- `GET /` - Health check
- `GET /health` - Health check
- `POST /generate` - Generate code from uploaded image

## Development

The backend uses:
- FastAPI for the web framework
- OpenAI API for code generation
- PIL for image processing
- Mock layout detection (can be replaced with YOLOv8 or similar)

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required for code generation)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `DEBUG`: Debug mode (default: True) 