import { useState } from "react";

import { useAutoRecorder } from "./logic/useAutoRecorder";

function MySTTComponent() {
  const [transcript, setTranscript] = useState("");

  const handleSegment = async (audioBlob: Blob) => {
    const formData = new FormData();

    formData.append("audio", audioBlob, "audio.webm");
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();

      setTranscript((prev) => prev + " " + data.text);
    } else {
      // handle error
      console.error("Transcription failed");
    }
  };

  useAutoRecorder(handleSegment);

  return (
    <div>
      <h2>Transcript:</h2>
      <div>{transcript}</div>
    </div>
  );
}
