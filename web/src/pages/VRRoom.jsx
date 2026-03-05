import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';
import { ArrowLeft, Mic, Square, Loader, Upload, Play, Volume2 } from 'lucide-react';
import { AudioRecorder } from '../utils/AudioRecorder';

const ROOM_CONFIGS = {
  seminar: {
    id: 'd74b3baa5a74430fb3717cfa3d883476',
    title: 'Seminar Hall'
  },
  interview: {
    id: 'e52228ae312a477ab9021bea05ae12b9',
    title: 'Interview Room',
    requiresResume: true
  },
  group: {
    id: 'bdaa8e9990884bba9a0b0a9479e83612',
    title: 'Group Discussion'
  }
};

const VRRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Non-persistent state to ensure resume is requested every time
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [interviewStatus, setInterviewStatus] = useState('idle');
  const [currentQuestion, setCurrentQuestion] = useState('');

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let currentInterim = '';
        let currentFinal = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFinal += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        if (currentFinal) {
          setFinalTranscript(prev => prev + ' ' + currentFinal);
        }
        setInterimTranscript(currentInterim);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          setError("Microphone access denied for Speech Recognition.");
        }
      };
    }
  }, []);

  const searchParams = new URLSearchParams(location.search);
  const roomType = searchParams.get('type') || 'seminar';
  const currentRoom = ROOM_CONFIGS[roomType] || ROOM_CONFIGS.seminar;
  const isInterviewRoom = roomType === 'interview';

  const audioRecorderRef = useRef(new AudioRecorder());
  const audioRef = useRef(new Audio()); // Internal audio object

  // Check if resume is needed
  const showResumeUpload = currentRoom.requiresResume && !resumeUploaded;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("Starting resume upload for:", file.name);
    setAnalyzing(true);
    setError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log("Sending request to:", `${apiUrl}/interview/upload-resume`);
      const response = await axios.post(`${apiUrl}/interview/upload-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      } else {
        const { resume_text, questions } = response.data;
        
        if (!questions || questions.length === 0) {
          throw new Error("No interview questions were generated.");
        }

        console.log("Resume analyzed. Questions:", questions);
        setResumeText(resume_text);
        setQuestions(questions);
        setUploadSuccess(true);
        
        setTimeout(() => {
          setResumeUploaded(true);
          setUploadSuccess(false);
          console.log("Proceeding to interview room.");
        }, 1500);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(`Upload Failed: ${err.message || "Failed to process resume"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetSession = () => {
    setResumeUploaded(false);
    setResumeText('');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setConversationHistory([]);
    setInterviewStatus('idle');
    setCurrentQuestion('');
    setResult(null);
    setError(null);
  };

  const startInterview = async () => {
    if (questions.length > 0) {
      setInterviewStatus('ongoing');
      setCurrentQuestionIndex(0);
      const firstQ = questions[0];
      setCurrentQuestion(firstQ);
      console.log("Starting interview with question 1:", firstQ);
      await speakText(firstQ);
    }
  };

  const getFemaleVoice = () => {
    let voices = window.speechSynthesis.getVoices();
    
    // Robust filtering for female voices
    const isFemale = (v) => v.name.toLowerCase().includes('female') || 
                            v.name.includes('Google US English') || 
                            v.name.includes('Samantha') || 
                            v.name.includes('Victoria');

    const femaleVoices = voices.filter(v => v.lang.startsWith('en') && isFemale(v));
    
    return femaleVoices.find(v => v.name.includes('Google US English')) || 
           femaleVoices[0] || 
           voices.find(v => v.lang.startsWith('en')) || 
           voices[0];
  };

  // Pre-load voices to avoid "male voice on first question" issue
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speakText = (text) => {
    if (!text) return;
    console.log("AI starting browser voice for:", text);
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    setIsSpeaking(true);
    setError(null);

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Ensure we pick a female voice
    const femaleVoice = getFemaleVoice();
    if (femaleVoice) {
      console.log("Selected voice:", femaleVoice.name);
      utterance.voice = femaleVoice;
    }
    
    utterance.rate = 0.95; 
    utterance.pitch = 1.05; // Slightly higher pitch for a clearer female tone

    utterance.onend = () => {
      console.log("Browser voice playback complete");
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.error("Browser TTS Error:", e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const skipQuestion = () => {
    const nextIdx = currentQuestionIndex + 1;
    
    // Log history for the skipped question
    const updatedHistory = [
      ...conversationHistory,
      { role: 'assistant', content: currentQuestion },
      { role: 'user', content: "(Skipped)", metrics: null }
    ];
    setConversationHistory(updatedHistory);

    if (nextIdx < questions.length) {
      setCurrentQuestionIndex(nextIdx);
      const nextQ = questions[nextIdx];
      setCurrentQuestion(nextQ);
      setAnalyzing(false);
      speakText(nextQ);
    } else {
      finalizeInterview(updatedHistory);
    }
  };

  const startRecording = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      
      setInterimTranscript('');
      setFinalTranscript('');
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      await audioRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Mic error:", err);
      setError("Microphone access denied.");
    }
  };

  const stopRecording = async () => {
    if (isRecording) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }

        const wavBlob = await audioRecorderRef.current.stop();
        setIsRecording(false);
        const file = new File([wavBlob], "recording.wav", { type: 'audio/wav' });
        
        if (isInterviewRoom && interviewStatus === 'ongoing') {
          // Wait a bit longer for the final speech result
          setTimeout(() => {
            // We use finalTranscript + any remaining interim
            const fullTranscript = (finalTranscript + ' ' + interimTranscript).trim();
            processInterviewAnswer(file, fullTranscript);
          }, 800);
        } else {
          await analyzeAudio(file);
        }
      } catch (err) {
        console.error("Stop recording error:", err);
        setIsRecording(false);
      }
    }
  };

  const processInterviewAnswer = async (audioFile, localTranscript) => {
    if (!audioFile) return;

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      
      // Backend handles both STT and speech analysis metrics
      const res = await axios.post(`${apiUrl}/interview/analyze-answer`, formData);
      
      if (res.data.error) {
        console.warn("Backend analysis error:", res.data.error);
      }

      // Priority: 1. Local Browser Transcript, 2. Backend Transcript, 3. Fallback
      const userMessage = localTranscript || res.data.text || "(No speech detected)";
      
      // Ensure we always have metrics (from backend or empty fallback)
      const speechMetrics = res.data.speech_analysis || {
        pitch: 0, volume: 0, tempo: 0, silence_ratio: 0, articulation: 0, fluency_score: 0,
        feedback: ["Audio analysis unavailable for this answer."]
      };

      const updatedHistory = [
        ...conversationHistory,
        { role: 'assistant', content: currentQuestion },
        { role: 'user', content: userMessage, metrics: speechMetrics }
      ];
      setConversationHistory(updatedHistory);

      const nextIdx = currentQuestionIndex + 1;
      if (nextIdx < questions.length) {
        setCurrentQuestionIndex(nextIdx);
        const nextQ = questions[nextIdx];
        setCurrentQuestion(nextQ);
        setAnalyzing(false);
        speakText(nextQ);
      } else {
        await finalizeInterview(updatedHistory);
      }
    } catch (err) {
      console.error("Answer error:", err);
      // Even on total error, try to move to next or finalize to avoid loop
      const nextIdx = currentQuestionIndex + 1;
      if (nextIdx < questions.length) {
        skipQuestion();
      } else {
        finalizeInterview();
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const finalizeInterview = async (history = conversationHistory) => {
    setAnalyzing(true);
    setInterviewStatus('evaluating');
    try {
      const qaPairs = [];
      const allSpeechMetrics = [];

      for (let i = 0; i < history.length; i += 2) {
          const assistantMsg = history[i];
          const userMsg = history[i+1];
          if (!assistantMsg || !userMsg) continue;
          
          qaPairs.push({
              question: assistantMsg.content,
              answer: userMsg.content
          });
          if (userMsg.metrics) {
            allSpeechMetrics.push(userMsg.metrics);
          }
      }

      // If no metrics collected, provide dummy ones to avoid division by zero
      if (allSpeechMetrics.length === 0) {
        allSpeechMetrics.push({ pitch: 0, volume: 0, tempo: 0, silence_ratio: 0, articulation: 0, fluency_score: 0, feedback: [] });
      }

      // Get Final Evaluation
      const evalRes = await axios.post(`${apiUrl}/interview/evaluate`, {
          resume_text: resumeText,
          qa: qaPairs
      });

      // Calculate Average Speech Metrics
      const avgMetrics = {
        pitch: Math.round(allSpeechMetrics.reduce((acc, m) => acc + (m.pitch || 0), 0) / allSpeechMetrics.length),
        volume: Number((allSpeechMetrics.reduce((acc, m) => acc + (m.volume || 0), 0) / allSpeechMetrics.length).toFixed(3)),
        tempo: Math.round(allSpeechMetrics.reduce((acc, m) => acc + (m.tempo || 0), 0) / allSpeechMetrics.length),
        silence_ratio: Number((allSpeechMetrics.reduce((acc, m) => acc + (m.silence_ratio || 0), 0) / allSpeechMetrics.length).toFixed(2)),
        articulation: Math.round(allSpeechMetrics.reduce((acc, m) => acc + (m.articulation || 0), 0) / allSpeechMetrics.length),
        fluency_score: Math.round(allSpeechMetrics.reduce((acc, m) => acc + (m.fluency_score || 0), 0) / allSpeechMetrics.length)
      };

      const finalResult = {
        ...evalRes.data,
        ...avgMetrics,
        feedback: [
          ...(evalRes.data.feedback || []),
          ...(allSpeechMetrics[allSpeechMetrics.length - 1]?.feedback?.slice(0, 2) || [])
        ]
      };

      setResult(finalResult);
      saveReport(finalResult);
      setInterviewStatus('idle');
    } catch (err) {
      console.error("Finalization error:", err);
      setError("Failed to generate final report.");
    } finally {
      setAnalyzing(false);
    }
  };

  const saveReport = (newResult) => {
    const newReport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        name: `Interview - ${new Date().toLocaleString()}`,
        data: newResult
    };

    const existingReports = JSON.parse(localStorage.getItem('speech_reports') || '[]');
    const updatedReports = [newReport, ...existingReports].slice(0, 10);
    localStorage.setItem('speech_reports', JSON.stringify(updatedReports));
  };

  const analyzeAudio = async (file) => {
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${apiUrl}/analyze-speech`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.error) {
        setError(response.data.error);
      } else {
        const newResult = response.data;
        setResult(newResult);
        saveReport(newResult);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to analyze speech. Make sure the backend is running.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000' }}>
      
      {/* Back Button */}
      <div style={{ position: 'absolute', top: '0', left: '0', zIndex: 50 }}>
        <Button onClick={() => navigate('/dashboard')} variant="secondary" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            backgroundColor: '#000', 
            color: 'white', 
            border: 'none', 
            borderRadius: '0 0 16px 0',
            padding: '1rem 2rem',
            width: '280px',
            height: '60px',
            justifyContent: 'flex-start'
        }}>
          <ArrowLeft size={24} />
          <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>Back to Dashboard</span>
        </Button>
      </div>

      {/* Resume Upload Overlay */}
      {showResumeUpload && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#0f172a',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '3rem',
            borderRadius: '16px',
            textAlign: 'center',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {analyzing ? (
              <div style={{ padding: '2rem' }}>
                <Loader className="spin" size={48} style={{ margin: '0 auto 1.5rem auto', color: '#2563eb' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Analyzing Resume...</h2>
                <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Extracting skills and projects to customize your interview.</p>
              </div>
            ) : uploadSuccess ? (
              <div style={{ padding: '2rem' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  backgroundColor: '#059669', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto',
                  color: 'white'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>Upload Successful!</h2>
                <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Your interview is being prepared...</p>
              </div>
            ) : (
              <>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto'
                }}>
                  <Upload size={32} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>Upload Resume</h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.6' }}>
                  To access the Interview Room, please upload your resume first. This helps us customize the session.
                </p>
                
                <label style={{
                  display: 'inline-block',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}>
                  Choose File
                  <input 
                    type="file" 
                    accept=".pdf,.docx,.doc" 
                    onChange={handleResumeUpload}
                    style={{ display: 'none' }} 
                  />
                </label>
                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                  Supported formats: PDF, DOCX
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* VR Embed */}
      <iframe 
        title={currentRoom.title} 
        frameBorder="0" 
        allowFullScreen 
        mozallowfullscreen="true" 
        webkitallowfullscreen="true" 
        allow="autoplay; fullscreen; xr-spatial-tracking" 
        xr-spatial-tracking="true" 
        execution-while-out-of-viewport="true" 
        execution-while-not-rendered="true" 
        web-share="true" 
        src={`https://sketchfab.com/models/${currentRoom.id}/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_watermark=0`}
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none',
          visibility: showResumeUpload ? 'hidden' : 'visible',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      ></iframe>

      {/* Controls Overlay */}
      <div style={{ 
        position: 'absolute', 
        bottom: '30px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        width: '100%',
        maxWidth: '600px',
        padding: '0 20px'
      }}>
        
        {error && (
            <div style={{ 
                backgroundColor: 'rgba(220, 38, 38, 0.9)', 
                color: 'white', 
                padding: '0.75rem 1rem', 
                borderRadius: '8px',
                marginBottom: '1rem'
            }}>
                {error}
            </div>
        )}

        {/* Interview Status Indicators */}
        {isInterviewRoom && resumeUploaded && !result && (
          <div style={{
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            padding: '1rem 2rem',
            borderRadius: '12px',
            color: 'white',
            width: '100%',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {interviewStatus === 'idle' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p>Ready to start your AI interview?</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <Button onClick={startInterview} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Play size={18} /> Start Interview
                  </Button>
                  <Button onClick={resetSession} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={18} /> Re-upload Resume
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  {isSpeaking ? <Volume2 className="pulse" style={{ color: '#60a5fa' }} /> : <Mic size={18} />}
                  <span style={{ fontWeight: 'bold' }}>
                    {isSpeaking ? "AI is speaking (Browser Voice)..." : isRecording ? "Listening to you..." : "Ready for your answer"}
                  </span>
                  <Button 
                    onClick={() => speakText(currentQuestion)} 
                    variant="ghost" 
                    size="sm" 
                    style={{ 
                      padding: '0.4rem', 
                      color: isSpeaking ? '#60a5fa' : '#cbd5e1',
                      backgroundColor: isSpeaking ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                      borderRadius: '50%'
                    }}
                    title="Re-play Question"
                  >
                    <Volume2 size={18} />
                  </Button>
                </div>
                
                {isRecording && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#60a5fa', 
                    fontStyle: 'italic', 
                    marginBottom: '0.5rem',
                    maxHeight: '60px',
                    overflowY: 'auto',
                    backgroundColor: 'rgba(96, 165, 250, 0.05)',
                    padding: '0.5rem',
                    borderRadius: '4px'
                  }}>
                    {finalTranscript} <span style={{ opacity: 0.7 }}>{interimTranscript}</span>
                    {(!finalTranscript && !interimTranscript) && "Listening... Speak clearly into your mic."}
                  </div>
                )}

                <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{currentQuestion}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  <Button 
                    onClick={skipQuestion} 
                    variant="secondary" 
                    size="sm" 
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    Skip Question
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {analyzing ? (
            <div style={{ 
                backgroundColor: 'white', 
                padding: '1rem 2rem', 
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
            }}>
                <Loader className="spin" size={24} />
                <span>{interviewStatus === 'evaluating' ? 'Generating Report...' : 'Processing...'}</span>
            </div>
        ) : result ? (
             <div style={{ 
                backgroundColor: 'white', 
                padding: '1.5rem', 
                borderRadius: '16px',
                color: '#1f2937',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                      {isInterviewRoom ? 'Interview Evaluation' : 'Analysis Results'}
                    </h3>
                    <Button onClick={() => {
                      setResult(null);
                      if (isInterviewRoom) setInterviewStatus('idle');
                    }} variant="ghost" size="sm" style={{color: '#4b5563'}}>Close Results</Button>
                </div>
                
                {/* Result Display */}
                <div style={{ marginTop: '1rem' }}>
                    {isInterviewRoom && result.pitch !== undefined ? (
                        <>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)', 
                            gap: '1rem', 
                            marginBottom: '1.5rem' 
                          }}>
                              {[
                                  { label: 'Pitch', value: `${result.pitch || 0} Hz` },
                                  { label: 'Loudness', value: result.volume || 0 },
                                  { label: 'Tempo', value: `${result.tempo || 0} BPM` },
                                  { label: 'Pauses', value: `${(result.silence_ratio * 100 || 0).toFixed(1)}%` },
                                  { label: 'Articulation', value: result.articulation || 0 },
                                  { label: 'Fluency', value: result.fluency_score || 0 }
                              ].map((metric, index) => (
                                  <div key={index} style={{
                                      backgroundColor: '#f3f4f6',
                                      padding: '1rem',
                                      borderRadius: '8px',
                                      textAlign: 'center'
                                  }}>
                                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{metric.label}</div>
                                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2563eb' }}>{metric.value}</div>
                                  </div>
                              ))}
                          </div>
                          
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr 1fr', 
                            gap: '1rem', 
                            marginBottom: '1.5rem',
                            borderTop: '1px solid #e5e7eb',
                            paddingTop: '1.5rem'
                          }}>
                              <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.8rem', color: '#1e40af' }}>Content Clarity</div>
                                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>{result.clarity}/100</div>
                              </div>
                              <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.8rem', color: '#1e40af' }}>Confidence</div>
                                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>{result.confidence}/100</div>
                              </div>
                              <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.8rem', color: '#1e40af' }}>Overall Fluency</div>
                                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>{result.fluency}/100</div>
                              </div>
                          </div>
                        </>
                    ) : result.fluency_score !== undefined ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Fluency Score</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>{result.fluency_score}/100</div>
                            </div>
                            <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Speaking Rate</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>{result.tempo} SPM</div>
                            </div>
                        </div>
                    ) : null}
                    
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Feedback</h4>
                    <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {Array.isArray(result.feedback) && result.feedback.length > 0 ? (
                            result.feedback.map((item, index) => (
                                <li key={index} style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{item}</li>
                            ))
                        ) : (
                            <li style={{ fontSize: '0.9rem', color: '#6b7280', listStyle: 'none' }}>No feedback available.</li>
                        )}
                    </ul>
                </div>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                     <Button onClick={() => {
                        resetSession();
                     }}>
                       Start New Session
                     </Button>
                </div>
            </div>
        ) : (
            // Recording Controls
            interviewStatus === 'ongoing' || !isInterviewRoom ? (
                !isRecording ? (
                    <button 
                        onClick={startRecording}
                        style={{
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            padding: '1rem 2rem',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                            transition: 'transform 0.1s'
                        }}
                    >
                        <Mic size={24} />
                        {isInterviewRoom ? "Answer Question" : "Start Speech Training"}
                    </button>
                ) : (
                    <button 
                        onClick={stopRecording}
                        style={{
                            backgroundColor: '#4b5563',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            padding: '1rem 2rem',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                        }}
                    >
                        <Square size={24} fill="white" />
                        Stop & {isInterviewRoom ? "Send Answer" : "Analyze"}
                    </button>
                )
            ) : null
        )}
      </div>
    </div>
  );
};

export default VRRoom;
