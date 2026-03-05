import librosa
import numpy as np
import scipy.signal

def analyze_audio(file_path):
    try:
        # Load audio file (resample to 16kHz for speech)
        y, sr = librosa.load(file_path, sr=16000, duration=60)
        
        # Basic duration check
        total_duration = librosa.get_duration(y=y, sr=sr)
        if total_duration < 1.0:
             return {
                "pitch": 0, "volume": 0, "tempo": 0, "silence_ratio": 0, 
                "articulation": 0, "fluency_score": 0,
                "feedback": ["Audio too short. Please speak for longer."]
            }

        # --- 1. Volume & Silence Detection ---
        # Calculate raw RMSE before normalization to judge actual volume
        rmse = librosa.feature.rms(y=y)
        avg_volume_raw = float(np.mean(rmse)) if rmse.size > 0 else 0
        
        # If volume is extremely low, return "No speech"
        # Threshold lowered to 0.001 to catch quiet speech
        if avg_volume_raw < 0.001: 
             return {
                "pitch": 0, "volume": 0, "tempo": 0, "silence_ratio": 1.0, 
                "articulation": 0, "fluency_score": 0,
                "feedback": ["No speech detected. Please check your microphone."]
            }

        # Normalize for structural analysis (pitch, pauses, etc.)
        y_norm = librosa.util.normalize(y)

        # --- 2. Pauses & Rhythm (Fluency) ---
        # Split on silence using normalized audio
        # top_db=20 allows for some background noise
        non_silent_intervals = librosa.effects.split(y_norm, top_db=20)
        
        non_silent_duration = 0
        for start, end in non_silent_intervals:
            non_silent_duration += (end - start) / sr
            
        silence_duration = total_duration - non_silent_duration
        silence_ratio = silence_duration / total_duration
        
        # If almost all silence (active speech < 10%)
        if silence_ratio > 0.9:
             return {
                "pitch": 0, "volume": 0, "tempo": 0, "silence_ratio": round(silence_ratio, 2), 
                "articulation": 0, "fluency_score": 10,
                "feedback": ["No clear speech detected. Try speaking louder."]
            }

        # --- 3. Pitch Analysis ---
        # Fmin/Fmax for human speech (50-500Hz)
        f0, _, _ = librosa.pyin(y_norm, fmin=50, fmax=500, sr=sr)
        valid_f0 = f0[~np.isnan(f0)]
        avg_pitch = float(np.mean(valid_f0)) if len(valid_f0) > 0 else 0
        pitch_std = float(np.std(valid_f0)) if len(valid_f0) > 0 else 0

        # --- 4. Speaking Rate (Syllables approx) ---
        # Envelope detection
        b, a = scipy.signal.butter(4, 5.0 / (sr / 2.0), 'low')
        envelope = scipy.signal.filtfilt(b, a, np.abs(y_norm))
        # Find peaks (syllables)
        peaks, _ = scipy.signal.find_peaks(envelope, height=0.1, distance=sr*0.15)
        num_syllables = len(peaks)
        speaking_rate_spm = (num_syllables / total_duration) * 60 if total_duration > 0 else 0

        # --- 5. Articulation (Spectral Centroid) ---
        spectral_centroid = librosa.feature.spectral_centroid(y=y_norm, sr=sr)
        avg_articulation = float(np.mean(spectral_centroid)) if spectral_centroid.size > 0 else 0

        # --- 6. Scoring Logic ---
        
        # Fluency Score Calculation (0-100)
        # Base 100
        # Penalties:
        # - Silence Ratio: ideal 0.1-0.3. Penalty if > 0.4 or < 0.05
        # - Rate: ideal 100-200 SPM. Penalty if too slow/fast
        
        score_deduction = 0
        
        # Silence penalty
        if silence_ratio > 0.4:
            score_deduction += (silence_ratio - 0.4) * 80 # Heavy penalty for silence
        elif silence_ratio < 0.05:
            score_deduction += 10 # Rushing
            
        # Rate penalty
        if speaking_rate_spm < 80:
            score_deduction += 20
        elif speaking_rate_spm > 250:
            score_deduction += 20
            
        fluency_score = max(10, 100 - score_deduction) # Min score 10 if speech exists

        # --- 7. Dynamic Feedback ---
        feedback = []
        
        # Pitch
        if avg_pitch < 100:
            feedback.append("Your voice pitch is low. Try to add more energy.")
        elif avg_pitch > 250:
            feedback.append("Your pitch is high. Try to relax your throat.")
        elif pitch_std < 20:
             feedback.append("Your tone is a bit monotone. Try varying your pitch for emphasis.")
        else:
            feedback.append("Good pitch modulation.")

        # Rate
        if speaking_rate_spm < 90:
            feedback.append("You are speaking slowly. Try to increase your pace slightly.")
        elif speaking_rate_spm > 220:
            feedback.append("You are speaking quite fast. Slow down to ensure clarity.")
        else:
            feedback.append("Great speaking pace.")

        # Pauses
        if silence_ratio > 0.5:
            feedback.append("Too many long pauses. Try to keep the flow going.")
        elif silence_ratio < 0.1:
            feedback.append("Don't forget to pause and breathe between sentences.")
        else:
            feedback.append("Your pauses are well-timed.")

        # Volume
        if avg_volume_raw < 0.02:
            feedback.append("Volume is low. Speak up!")
        elif avg_volume_raw > 0.3:
            feedback.append("Volume is very loud.")
        else:
            feedback.append("Good volume projection.")

        return {
            "pitch": round(avg_pitch, 1),
            "volume": round(avg_volume_raw, 3),
            "tempo": round(speaking_rate_spm, 0),
            "silence_ratio": round(silence_ratio, 2),
            "articulation": round(avg_articulation, 0),
            "fluency_score": round(fluency_score, 0),
            "feedback": feedback
        }
        
    except Exception as e:
        print(f"Analysis Error: {e}")
        return {"error": str(e)}
