import librosa
import numpy as np
import scipy.signal
import os
import traceback

def analyze_audio(file_path):
    print(f"--- Backend Analysis Start: {file_path} ---")
    try:
        if not os.path.exists(file_path):
            return {"error": "Audio file missing"}

        # Load audio
        # Using librosa.load with sr=None to get original sample rate
        y, sr = librosa.load(file_path, sr=16000)
        duration = librosa.get_duration(y=y, sr=sr)
        print(f"Loaded: {duration:.2f}s")

        if duration < 0.5:
            return {
                "pitch": 0, "volume": 0, "tempo": 0, "silence_ratio": 0,
                "articulation": 0, "fluency_score": 0,
                "feedback": ["Audio too short. Speak longer."]
            }

        # 1. Volume
        rms = librosa.feature.rms(y=y)
        avg_volume = float(np.mean(rms))
        
        # 2. Pitch
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        pitch_values = pitches[magnitudes > np.median(magnitudes)]
        avg_pitch = float(np.mean(pitch_values)) if len(pitch_values) > 0 else 0

        # 3. Tempo (BPM)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo = librosa.feature.tempo(onset_envelope=onset_env, sr=sr)
        avg_tempo = float(tempo[0]) if isinstance(tempo, (list, np.ndarray)) else float(tempo)
        avg_tempo = max(1, avg_tempo) # Ensure non-zero for scoring

        # 4. Silence/Pauses
        non_silent = librosa.effects.split(y, top_db=25)
        non_silent_duration = sum(end - start for start, end in non_silent) / sr
        silence_ratio = max(0, (duration - non_silent_duration) / duration)

        # 5. Articulation (Spectral Centroid as proxy)
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        articulation = float(np.mean(centroid)) / 50 # Normalize to 0-100 approx

        # 6. Fluency Score (Based on tempo and silence)
        # Ideal tempo ~130-160 BPM, low silence
        tempo_score = max(0, 100 - abs(avg_tempo - 145) * 0.5)
        silence_score = max(0, 100 - (silence_ratio * 200))
        fluency_score = (tempo_score + silence_score) / 2

        # 7. Filler Word Detection (Basic heuristic for demonstration)
        # In a real app, this would use a speech-to-text transcription 
        # to count 'um', 'ah', 'like', 'so', 'basically'
        filler_count = 0
        if silence_ratio > 0.2:
            filler_count = int(silence_ratio * 20) # Mock filler count proportional to pauses
        
        result = {
            "pitch": round(avg_pitch, 1),
            "volume": round(avg_volume, 4),
            "tempo": round(avg_tempo),
            "silence_ratio": round(silence_ratio, 2),
            "articulation": round(min(100, articulation)),
            "fluency_score": round(min(100, fluency_score)),
            "filler_count": filler_count,
            "feedback": [
                "Good vocal clarity." if articulation > 50 else "Try to articulate more clearly.",
                "Great pace!" if 120 < avg_tempo < 170 else "Try to adjust your speaking rate.",
                "Watch your pauses." if silence_ratio > 0.3 else "Excellent rhythm."
            ]
        }
        print(f"Analysis Complete: {result}")
        return result

    except Exception as e:
        print(f"Analysis Fatal Error: {e}")
        traceback.print_exc()
        return {"error": str(e)}
