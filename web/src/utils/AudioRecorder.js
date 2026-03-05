export class AudioRecorder {
  constructor() {
    this.mediaStream = null;
    this.audioContext = null;
    this.scriptProcessor = null;
    this.source = null;
    this.chunks = [];
    this.sampleRate = 44100;
  }

  async start() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      this.sampleRate = 16000;
      
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      // Using ScriptProcessor for guaranteed WAV compatibility with librosa
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.chunks = [];
      this.scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.chunks.push(new Float32Array(inputData));
      };

      this.source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      console.log("WAV Recorder started at", this.sampleRate, "Hz");
    } catch (error) {
      console.error("Error starting recorder:", error);
      throw error;
    }
  }

  async stop() {
    return new Promise(async (resolve) => {
      if (this.scriptProcessor && this.source) {
        this.scriptProcessor.disconnect();
        this.source.disconnect();
      }
      
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
      }

      const blob = this.exportWAV(this.chunks);
      
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }

      this.scriptProcessor = null;
      this.mediaStream = null;
      this.audioContext = null;
      this.chunks = [];
      
      resolve(blob);
    });
  }

  exportWAV(chunks) {
    const bufferLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = new Float32Array(bufferLength);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBuffer = new ArrayBuffer(44 + buffer.length * 2);
    const view = new DataView(wavBuffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, buffer.length * 2, true);

    let pcmOffset = 44;
    for (let i = 0; i < buffer.length; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(pcmOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      pcmOffset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
