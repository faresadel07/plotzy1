import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioRecorderProps {
  onRecordingComplete: (audioBase64: string) => void;
  isProcessing: boolean;
}

export function AudioRecorder({ onRecordingComplete, isProcessing }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(",")[1];
          onRecordingComplete(base64data);
        };

        // Stop all tracks to release mic
        stream!.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      // If MediaRecorder construction or start() threw AFTER getUserMedia
      // resolved, the OS-level mic capture is still live — release it so
      // the recording indicator drops. Same applies if setInterval threw.
      if (stream) stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = undefined; }
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-primary/5 rounded-2xl border border-primary/10">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <h3 className="font-semibold text-lg">Transcribing Audio...</h3>
        <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
          The AI is listening to your story and structuring it into a beautifully written chapter. This might take a moment.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-10 rounded-3xl transition-all duration-500 ${
      isRecording 
        ? "bg-red-50 border border-red-100 shadow-inner" 
        : "bg-white border border-border shadow-lg shadow-black/5 hover:border-primary/20"
    }`}>
      
      <div className="mb-8 relative">
        {isRecording && (
          <div className="absolute inset-0 rounded-full pulse-ring" />
        )}
        <Button
          size="icon"
          variant={isRecording ? "destructive" : "default"}
          className={`w-24 h-24 rounded-full shadow-xl transition-transform duration-300 ${
            isRecording ? "scale-110 hover:scale-105" : "hover:scale-105"
          }`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
            <Square className="w-8 h-8 fill-current" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </Button>
      </div>

      <div className="text-center space-y-2">
        <h3 className="font-bold text-2xl tracking-tight">
          {isRecording ? "Recording..." : "Record Story"}
        </h3>
        
        {isRecording ? (
          <p className="text-red-500 font-mono text-xl">{formatTime(recordingTime)}</p>
        ) : (
          <p className="text-muted-foreground max-w-sm">
            Tap the microphone and start speaking. We'll automatically convert your spoken words into a structured chapter.
          </p>
        )}
      </div>
    </div>
  );
}
