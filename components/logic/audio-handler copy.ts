export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private onStatusChange: (status: string) => void;
  private onTranscriptionComplete: (text: string) => void;

  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  private silenceThreshold = 0.03; // مقدار آستانه سکوت (RMS)
  private silenceTimeout = 2000; // میلی‌ثانیه، مدت سکوت برای توقف ضبط
  private silenceStart: number | null = null;
  private speaking = false;

  constructor(
    onStatusChange: (status: string) => void,
    onTranscriptionComplete: (text: string) => void,
  ) {
    this.onStatusChange = onStatusChange;
    this.onTranscriptionComplete = onTranscriptionComplete;

    this.startRecording(); // شروع ضبط اتوماتیک
  }

  async startRecording() {
    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log("Microphone access granted");

      // Web Audio API برای تشخیص سکوت
      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
      this.processorNode.onaudioprocess = this.handleAudioProcess.bind(this);

      // MediaRecorder برای ضبط و ارسال
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log("Recording stopped, processing audio...");
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });

        await this.sendToWhisper(audioBlob);
        // بعد از اتمام، دوباره شروع ضبط
        this.startRecording();
      };

      this.mediaRecorder.start(1000);
      this.onStatusChange("Recording... Speak now");
    } catch (error) {
      console.error("Error starting recording:", error);
      this.onStatusChange("Error: " + (error as Error).message);
    }
  }

  handleAudioProcess(event: AudioProcessingEvent) {
    const input = event.inputBuffer.getChannelData(0);
    let sum = 0;

    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i];
    }
    const rms = Math.sqrt(sum / input.length);

    if (rms > this.silenceThreshold) {
      if (!this.speaking) {
        this.speaking = true;
        this.onStatusChange("Recording... Speak now");
      }
      this.silenceStart = null;
    } else {
      if (this.speaking) {
        if (this.silenceStart === null) {
          this.silenceStart = Date.now();
        } else if (Date.now() - this.silenceStart > this.silenceTimeout) {
          this.speaking = false;
          this.stopRecording();
          this.silenceStart = null;
        }
      }
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.onStatusChange("Processing audio...");

      if (this.processorNode) {
        this.processorNode.disconnect();
        this.processorNode = null;
      }
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }

      const stream = this.mediaRecorder.stream;

      stream.getTracks().forEach((track) => track.stop());
    }
  }

  private async sendToWhisper(audioBlob: Blob) {
    try {
      // جلوگیری از ارسال فایل خالی یا بسیار کوچک
      if (audioBlob.size < 1000) { // مثلاً کمتر از 1KB
        this.onStatusChange("صدایی دریافت نشد. لطفاً واضح صحبت کنید.");
        return;
      }

      const formData = new FormData();

      formData.append("file", audioBlob, "audio.webm");
      await fetch("/api/save-audio", {
        method: "POST",
        body: formData,
      });
      formData.append("model", "whisper-1");
      formData.append("language", "fa");
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `HTTP error! status: ${response.status}, details: ${errorText}`,
        );
      }

      const data = await response.json();

      this.onStatusChange("");
      this.onTranscriptionComplete(data.text);
    } catch (error: unknown) {
      this.onStatusChange("Error: Failed to transcribe audio");
    }
  }
}
