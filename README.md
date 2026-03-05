# VirtuSpeak

## Abstract
VirtuSpeak is an AI-powered speech analysis platform designed to help users improve their communication skills. By analyzing audio recordings, the system provides detailed metrics on pitch, loudness, tempo, pauses, articulation, and fluency. It serves as a tool for interview preparation, public speaking practice, and overcoming stage fear.

## Project Scope
1.  **Website (Frontend)**: A responsive, full-screen React application with authentication, dashboard, reporting history, and user settings.
2.  **Speech Analysis API (Backend)**: A FastAPI-based server using `librosa` and digital signal processing to extract speech metrics.

## Features
- **Authentication**: Login and Signup with secure local session management.
- **Dashboard**: Upload audio files (WAV, MP3) for instant analysis.
- **Detailed Metrics**:
  - **Pitch**: Average frequency (Hz).
  - **Loudness**: Volume intensity (dB).
  - **Tempo**: Speaking rate (BPM).
  - **Pauses**: Silence ratio and rhythm analysis.
  - **Articulation**: Spectral centroid analysis for clarity.
  - **Fluency**: Smoothness score based on pauses per minute.
- **Reports History**: Auto-saves past analyses for progress tracking.
- **Settings**: Dark/Light mode toggle, profile management.

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)

### Installation & Running

You need to run **two separate terminals**: one for the backend server and one for the frontend website.

#### 1. Start the Backend Server
This handles the speech analysis logic.

```bash
# Open a terminal and navigate to the server directory
cd server

# Create a virtual environment (run once)
python -m venv venv

# Activate the virtual environment
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install dependencies (run once)
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
```
*The server will start at `http://127.0.0.1:8000`*

#### 2. Start the Frontend Website
This runs the user interface.

```bash
# Open a NEW terminal and navigate to the web directory
cd web

# Install dependencies (run once)
npm install

# Start the development server
npm run dev
```
*The website will be available at `http://localhost:5173`*

### Usage
1. Open `http://localhost:5173` in your browser.
2. **Sign Up** for a new account (or log in).
3. Go to the **Dashboard** and upload an audio file.
4. View your results and actionable feedback.
5. Check **Reports** to see your history.

## Project Structure
```
VirtuSpeak/
├── server/                 # Python FastAPI Backend
│   ├── main.py            # API Routes & Configuration
│   ├── speech_analysis.py # Core Audio Analysis Logic
│   └── requirements.txt   # Python Dependencies
│
└── web/                    # React Frontend
    ├── src/
    │   ├── components/    # Reusable UI Components
    │   ├── context/       # Auth & Theme State Management
    │   ├── pages/         # Application Pages (Dashboard, Login, etc.)
    │   └── App.jsx        # Main Routing Logic
    └── package.json       # Node.js Dependencies
```
