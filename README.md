# Wireflow - Turn Wireframes Into Code

A modern web application that converts wireframes and UI screenshots into clean, responsive React/JSX code using AI.

## Features

- 🎨 **Drag & Drop Upload**: Easy image upload with drag-and-drop support
- 🤖 **AI-Powered Code Generation**: Uses OpenAI to generate clean React/JSX code
- 🎯 **Layout Detection**: Analyzes wireframes to detect UI elements and structure
- 💻 **Syntax Highlighting**: Beautiful code display with syntax highlighting
- 🌙 **Dark Mode**: Toggle between light and dark themes
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **React Router** for navigation
- **React Query** for data fetching

### Backend
- **FastAPI** for the API server
- **OpenAI API** for code generation
- **PIL** for image processing
- **Python-multipart** for file uploads

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ and pip
- OpenAI API key

### Frontend Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start the development server:**
```bash
npm run dev
```

3. **Open your browser:**
Navigate to `http://localhost:5173`

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Create environment file:**
Create a `.env` file in the backend directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

4. **Start the backend server:**
```bash
python run.py
```

The API will be available at `http://localhost:8000`

## Usage

1. **Upload a wireframe**: Drag and drop or click to upload an image
2. **Generate code**: Click the "Generate Code" button
3. **View results**: The generated React/JSX code will appear in the code block
4. **Copy code**: Use the syntax highlighter to copy the generated code

## API Endpoints

- `GET /` - Health check
- `GET /health` - Health check
- `POST /generate` - Generate code from uploaded image

## Development

### Project Structure
```
wireflow/
├── src/
│   ├── components/     # React components
│   ├── lib/           # Utilities and API functions
│   ├── pages/         # Page components
│   └── hooks/         # Custom React hooks
├── backend/
│   ├── services/      # Backend services
│   ├── main.py        # FastAPI application
│   └── requirements.txt
└── public/            # Static assets
```

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

**Backend:**
- `python run.py` - Start FastAPI server
- `python -m uvicorn main:app --reload` - Start with auto-reload


## 🧪 Project Note

**Wireflow** was built as a learning project to explore:
- Fast prototyping using modern AI tools
- Building full-stack MVPs with React and FastAPI
- Working with OpenAI APIs and image processing