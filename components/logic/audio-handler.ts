export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private onStatusChange: (status: string) => void;
  private onTranscriptionComplete: (text: string) => void;

  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  private silenceThreshold = 0.015; // مقدار پیشنهادی، بعد از لاگ مقدار مناسب را انتخاب کن
  private silenceTimeout = 1500; // مقدار پیشنهادی
  private silenceStart = 0;
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
          console.log("Received audio chunk:", event.data.size, "bytes");
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log("Recording stopped, processing audio...");
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });

        console.log("Audio blob size:", audioBlob.size, "bytes");
        if (audioBlob.size < 1000) {
          this.onStatusChange("صدایی دریافت نشد. لطفاً واضح صحبت کنید.");
        } else {
          await this.sendToWhisper(audioBlob);
        }
        // منابع را اینجا آزاد کنید
        if (this.processorNode) {
          this.processorNode.disconnect();
          this.processorNode = null;
        }
        if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
        }
        if (this.audioContext) {
          await this.audioContext.close();
          this.audioContext = null;
        }
        const stream = this.mediaRecorder!.stream;
        stream.getTracks().forEach((track) => track.stop());

        // بعد از اتمام کامل، با تاخیر ضبط جدید را شروع کنید
        setTimeout(() => this.startRecording(), 500);
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

    // لاگ مقدار RMS
    // console.log("RMS:", rms);

    if (rms > this.silenceThreshold) {
      if (!this.speaking) {
        this.speaking = true;
        this.onStatusChange("Recording... Speak now");
      }
      this.silenceStart = 0;
    } else {
      if (this.speaking) {
        if (!this.silenceStart) {
          this.silenceStart = Date.now();
        } else if (Date.now() - this.silenceStart > this.silenceTimeout) {
          this.speaking = false;
          this.stopRecording();
          this.silenceStart = 0;
        }
      }
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.onStatusChange("Processing audio...");
    }
  }

  private async sendToWhisper(audioBlob: Blob) {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      this.onStatusChange("Error: Failed to transcribe audio");
    }
  }
}
