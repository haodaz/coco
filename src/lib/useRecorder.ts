"use client";

import { useRef, useState } from "react";
import { toWav } from "./wav";

// Tap to start, tap again to stop; the clip comes back as WAV for Muse Voice Transcribe.
export function useRecorder(onClip: (wav: Blob) => void) {
  const [recording, setRecording] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  async function toggle() {
    if (recording) return rec.current?.stop();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      onClip(await toWav(new Blob(chunks, { type: r.mimeType })));
    };
    rec.current = r;
    r.start();
    setRecording(true);
  }
  return { recording, toggle };
}
