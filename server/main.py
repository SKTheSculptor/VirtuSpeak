from fastapi import FastAPI, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import shutil
import os
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables at the very beginning
load_dotenv()

from speech_analysis import analyze_audio
import interview_agent

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NextQuestionRequest(BaseModel):
    resume_text: str
    history: List[Dict[str, str]]

class EvaluationRequest(BaseModel):
    resume_text: str
    qa: List[Dict[str, str]]

class TTSRequest(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"message": "Welcome to VirtuSpeak API"}

@app.post("/analyze-speech")
def analyze_speech(file: UploadFile = File(...)):
    # ... (existing code)
    temp_file_path = f"temp_{file.filename}"
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(temp_file_path)
        if file_size == 0:
             return {"error": "Received empty audio file"}

        result = analyze_audio(temp_file_path)
        
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        
        return result
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        return {"error": f"Server Error: {str(e)}"}

# --- Interview Agent Endpoints ---

@app.post("/interview/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    print(f"--- Resume Upload Started: {file.filename} ---")
    try:
        content = await file.read()
        filename = file.filename.lower()
        print(f"File size: {len(content)} bytes")
        
        if filename.endswith(".pdf"):
            print("Processing PDF...")
            text = interview_agent.extract_text_from_pdf(content)
        elif filename.endswith(".docx"):
            print("Processing DOCX...")
            text = interview_agent.extract_text_from_docx(content)
        else:
            print(f"Error: Unsupported format {filename}")
            return {"error": "Unsupported file format. Please upload PDF or DOCX."}
            
        print(f"Extracted text length: {len(text)}")
        if not text.strip():
            return {"error": "Could not extract any text from the resume."}

        questions = interview_agent.generate_interview_questions(text)
        print(f"Generated {len(questions)} questions.")
        
        return {"resume_text": text, "questions": questions}
    except Exception as e:
        import traceback
        error_msg = f"Resume Processing Error: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        return {"error": error_msg}

@app.post("/interview/stt")
async def speech_to_text(file: UploadFile = File(...)):
    temp_path = f"stt_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        text = interview_agent.speech_to_text(temp_path)
        os.remove(temp_path)
        return {"text": text}
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"error": str(e)}

@app.post("/interview/tts")
async def text_to_speech(request: TTSRequest):
    print(f"--- TTS Requested: '{request.text[:50]}...' ---")
    try:
        audio_content = interview_agent.text_to_speech(request.text)
        print(f"TTS Successful, audio size: {len(audio_content)} bytes")
        
        # Use Base64 for guaranteed browser compatibility
        import base64
        audio_b64 = base64.b64encode(audio_content).decode('utf-8')
        return {"audio": audio_b64}
    except Exception as e:
        import traceback
        error_msg = f"TTS Error: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        return {"error": error_msg}

@app.post("/interview/next-question")
async def next_question(request: NextQuestionRequest):
    try:
        question = interview_agent.get_follow_up_question(request.resume_text, request.history)
        return {"question": question}
    except Exception as e:
        return {"error": str(e)}

@app.post("/interview/evaluate")
async def evaluate(request: EvaluationRequest):
    print("--- Interview Evaluation Started ---")
    try:
        # 1. Get AI Evaluation (Clarity, Confidence, Fluency)
        evaluation = interview_agent.evaluate_interview(request.resume_text, request.qa)
        print("AI Evaluation complete.")
        return evaluation
    except Exception as e:
        print(f"Evaluation Error: {e}")
        return {"error": str(e)}

@app.post("/interview/analyze-answer")
async def analyze_answer(file: UploadFile = File(...)):
    print(f"--- Analyzing Interview Answer: {file.filename} ---")
    temp_path = f"int_{file.filename}"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(temp_path)
        print(f"Received audio file size: {file_size} bytes")
        
        # 1. Get Speech Metrics (Pitch, Tempo, etc.)
        speech_metrics = analyze_audio(temp_path)
        if "error" in speech_metrics:
            print(f"Speech Analysis Logic Error: {speech_metrics['error']}")
        else:
            print(f"Speech metrics successfully calculated.")

        # 2. Get STT (Transcript) - Fallback handled in frontend
        transcript = ""
        try:
            transcript = interview_agent.speech_to_text(temp_path)
        except Exception as stt_e:
            print(f"Backend STT Quota/Error: {stt_e}")

        os.remove(temp_path)
        return {
            "text": transcript,
            "speech_analysis": speech_metrics
        }
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"Fatal Answer Analysis Error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
