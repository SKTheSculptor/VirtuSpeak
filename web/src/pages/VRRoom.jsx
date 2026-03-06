import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';
import { ArrowLeft, Mic, Square, Loader, Upload, Play, Volume2 } from 'lucide-react';
import { AudioRecorder } from '../utils/AudioRecorder';

const ROOM_CONFIGS = {
  seminar: {
    id: '57e962e00d0a4d96ac2a6bcc04ec24d3',
    title: 'Seminar Hall'
  },
  interview: {
    id: 'a9aa811e72b047ed970939b16e05b057',
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const recognitionRef = useRef(null);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
            width: isMobile ? 'auto' : '280px',
            height: isMobile ? '50px' : '60px',
            justifyContent: 'flex-start'
        }}>
          <ArrowLeft size={isMobile ? 20 : 24} />
          <span style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: '500' }}>
            {isMobile ? "Back" : "Back to Dashboard"}
          </span>
        </Button>
      </div>

      {/* Navigation Hint */}
      {!showResumeUpload && !result && (
        <div style={{
          position: 'absolute',
          top: isMobile ? '60px' : '20px',
          right: isMobile ? '10px' : '20px',
          zIndex: 40,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          fontSize: isMobile ? '0.7rem' : '0.8rem',
          pointerEvents: 'none',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          maxWidth: isMobile ? '150px' : 'none'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#60a5fa' }}></div>
          {isMobile ? "Tap to move" : "Tip: Double-click on the floor to move inside"}
        </div>
      )}

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
          color: 'white',
          padding: isMobile ? '1rem' : '0'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: isMobile ? '1.5rem' : '3rem',
            borderRadius: '16px',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {analyzing ? (
              <div style={{ padding: '1rem' }}>
                <Loader className="spin" size={isMobile ? 32 : 48} style={{ margin: '0 auto 1.5rem auto', color: '#2563eb' }} />
                <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 'bold' }}>Analyzing Resume...</h2>
                <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: isMobile ? '0.8rem' : '1rem' }}>Extracting skills and projects to customize your interview.</p>
              </div>
            ) : uploadSuccess ? (
              <div style={{ padding: '1rem' }}>
                <div style={{ 
                  width: isMobile ? '48px' : '64px', 
                  height: isMobile ? '48px' : '64px', 
                  backgroundColor: '#059669', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto',
                  color: 'white'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? 24 : 32} height={isMobile ? 24 : 32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 'bold', color: '#059669' }}>Upload Successful!</h2>
                <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: isMobile ? '0.8rem' : '1rem' }}>Your interview is being prepared...</p>
              </div>
            ) : (
              <>
                <div style={{ 
                  width: isMobile ? '48px' : '64px', 
                  height: isMobile ? '48px' : '64px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto'
                }}>
                  <Upload size={isMobile ? 24 : 32} />
                </div>
                <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>Upload Resume</h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.6', fontSize: isMobile ? '0.85rem' : '1rem' }}>
                  To access the Interview Room, please upload your resume first. This helps us customize the session.
                </p>
                
                <label style={{
                  display: 'inline-block',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: isMobile ? '0.6rem 1.5rem' : '0.75rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}>
                  Choose File
                  <input 
                    type="file" 
                    accept=".pdf,.docx,.doc" 
                    onChange={handleResumeUpload}
                    style={{ display: 'none' }} 
                  />
                </label>
                <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
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
        src={`https://sketchfab.com/models/${currentRoom.id}/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_animations=0&double_click=1&camera=1&navigation=walk&scrollwheel=0`}
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
        bottom: isMobile ? '15px' : '30px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        width: isMobile ? '95%' : '100%',
        maxWidth: '800px',
        padding: '0 10px'
      }}>
        
        {error && (
            <div style={{ 
                backgroundColor: 'rgba(220, 38, 38, 0.9)', 
                color: 'white', 
                padding: '0.75rem 1rem', 
                borderRadius: '8px',
                marginBottom: '0.5rem',
                fontSize: isMobile ? '0.8rem' : '1rem'
            }}>
                {error}
            </div>
        )}

        {/* Interview Status Indicators */}
        {isInterviewRoom && resumeUploaded && !result && (
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '16px',
            backdropFilter: 'blur(8px)',
            color: 'white',
            width: '100%',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {interviewStatus === 'idle' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>Ready to start?</h3>
                <p style={{ fontSize: isMobile ? '0.75rem' : '0.9rem', color: '#94a3b8', marginBottom: '1rem' }}>
                  The AI interviewer will ask you 5 questions based on your resume.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button onClick={startInterview} variant="primary" size={isMobile ? "sm" : "lg"}>
                    Start Interview
                  </Button>
                  <Button onClick={resetSession} variant="secondary" size={isMobile ? "sm" : "md"}>
                    Change Resume
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  {isSpeaking ? <Volume2 className="pulse" style={{ color: '#60a5fa' }} size={isMobile ? 18 : 24} /> : <Mic size={isMobile ? 16 : 18} />}
                  <span style={{ fontWeight: 'bold', fontSize: isMobile ? '0.85rem' : '1rem' }}>
                    {isSpeaking ? "AI is speaking..." : isRecording ? "Listening..." : "Your turn"}
                  </span>
                  <Button 
                    onClick={() => speakText(currentQuestion)} 
                    variant="ghost" 
                    size="sm" 
                    style={{ 
                      padding: '0.3rem', 
                      color: isSpeaking ? '#60a5fa' : '#cbd5e1',
                      backgroundColor: isSpeaking ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                      borderRadius: '50%'
                    }}
                    title="Re-play Question"
                  >
                    <Volume2 size={isMobile ? 16 : 18} />
                  </Button>
                </div>
                
                {isRecording && (
                  <div style={{ 
                    fontSize: isMobile ? '0.65rem' : '0.8rem', 
                    color: '#60a5fa', 
                    fontStyle: 'italic', 
                    marginBottom: '0.5rem',
                    maxHeight: isMobile ? '35px' : '60px',
                    overflowY: 'auto',
                    backgroundColor: 'rgba(96, 165, 250, 0.05)',
                    padding: '0.4rem',
                    borderRadius: '4px'
                  }}>
                    {finalTranscript} <span style={{ opacity: 0.7 }}>{interimTranscript}</span>
                    {(!finalTranscript && !interimTranscript) && "Listening... Speak now."}
                  </div>
                )}

                <p style={{ fontSize: isMobile ? '0.8rem' : '0.9rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>{currentQuestion}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: isMobile ? '0.65rem' : '0.8rem', color: '#94a3b8' }}>
                    Q {currentQuestionIndex + 1}/{questions.length}
                  </div>
                  <Button 
                    onClick={skipQuestion} 
                    variant="secondary" 
                    size="sm" 
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {analyzing ? (
            <div style={{ 
                backgroundColor: 'white', 
                padding: '0.75rem 1.5rem', 
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: isMobile ? '0.85rem' : '1rem'
            }}>
                <Loader className="spin" size={isMobile ? 18 : 24} />
                <span>{interviewStatus === 'evaluating' ? 'Generating Report...' : 'Processing...'}</span>
            </div>
        ) : (
            // Recording Controls
            (interviewStatus === 'ongoing' || !isInterviewRoom) && !result && (
                !isRecording ? (
                    <button 
                        onClick={startRecording}
                        disabled={isSpeaking}
                        style={{
                            backgroundColor: isSpeaking ? '#94a3b8' : '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
                            fontSize: isMobile ? '0.9rem' : '1.1rem',
                            fontWeight: '600',
                            cursor: isSpeaking ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                            transition: 'transform 0.1s'
                        }}
                    >
                        <Mic size={isMobile ? 20 : 24} />
                        {isInterviewRoom ? "Answer" : "Start Training"}
                    </button>
                ) : (
                    <button 
                        onClick={stopRecording}
                        style={{
                            backgroundColor: '#4b5563',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
                            fontSize: isMobile ? '0.9rem' : '1.1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                        }}
                    >
                        <Square size={isMobile ? 20 : 24} fill="white" />
                        Stop & {isInterviewRoom ? "Send" : "Analyze"}
                    </button>
                )
            )
        )}
      </div>

      {/* Result Screen Overlay */}
      {result && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#0f172a',
          zIndex: 100,
          overflowY: 'auto',
          padding: isMobile ? '1rem' : '2rem'
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : '0' }}>
              <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold', color: 'white' }}>Interview Performance</h1>
              <Button onClick={resetSession} variant="primary">Start New Session</Button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Clarity</p>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{result.clarity}%</h2>
              </div>
              <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Confidence</p>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>{result.confidence}%</h2>
              </div>
              <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Fluency</p>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>{result.fluency}%</h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '2rem' }}>
               <div>
                 <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.2rem', fontWeight: '600', marginBottom: '1rem', color: 'white' }}>Detailed Feedback</h3>
                 <div style={{ backgroundColor: '#1e293b', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px' }}>
                   <ul style={{ paddingLeft: '1.2rem' }}>
                     {result.feedback && result.feedback.map((item, idx) => (
                       <li key={idx} style={{ color: '#cbd5e1', marginBottom: '0.75rem', lineHeight: '1.5', fontSize: isMobile ? '0.85rem' : '1rem' }}>{item}</li>
                     ))}
                   </ul>
                 </div>
               </div>

               <div>
                 <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.2rem', fontWeight: '600', marginBottom: '1rem', color: 'white' }}>Speech Metrics</h3>
                 <div style={{ backgroundColor: '#1e293b', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                     <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                       <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>Pitch</p>
                       <p style={{ fontWeight: '600', color: 'white', fontSize: isMobile ? '0.9rem' : '1rem' }}>{result.pitch} Hz</p>
                     </div>
                     <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                       <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>Volume</p>
                       <p style={{ fontWeight: '600', color: 'white', fontSize: isMobile ? '0.9rem' : '1rem' }}>{typeof result.volume === 'number' ? result.volume.toFixed(3) : result.volume}</p>
                     </div>
                     <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                       <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>Tempo</p>
                       <p style={{ fontWeight: '600', color: 'white', fontSize: isMobile ? '0.9rem' : '1rem' }}>{result.tempo} BPM</p>
                     </div>
                     <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                       <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>Articulation</p>
                       <p style={{ fontWeight: '600', color: 'white', fontSize: isMobile ? '0.9rem' : '1rem' }}>{result.articulation}%</p>
                     </div>
                     <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                       <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>Fluency Score</p>
                       <p style={{ fontWeight: '600', color: 'white', fontSize: isMobile ? '0.9rem' : '1rem' }}>{result.fluency_score}%</p>
                     </div>
                     <div style={{ borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                       <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>Silence Ratio</p>
                       <p style={{ fontWeight: '600', color: 'white', fontSize: isMobile ? '0.9rem' : '1rem' }}>{result.silence_ratio}%</p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VRRoom;
