'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { Mic, Square, Play, RotateCcw, UploadCloud, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (audioBlob: Blob, filename: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioReady }) => {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#f97316';
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true
        }
      });

      // Initialize Web Audio API visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();

      // Check supported recording MIME types
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onAudioReady(audioBlob, `recording_${Date.now()}.${mimeType.includes('mp4') ? 'm4a' : 'webm'}`);

        // Stop all media tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage('Microphone access was denied or is not available. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 15MB limit.');
        return;
      }
      setErrorMessage(null);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      onAudioReady(file, file.name);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl backdrop-blur-xl">
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Visualizer Canvas & Status */}
      <div className="relative mb-6 flex h-36 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <canvas ref={canvasRef} width={600} height={144} className="absolute inset-0 h-full w-full object-cover" />

        {!isRecording && !audioUrl && (
          <div className="relative z-10 flex flex-col items-center text-center">
            <Mic className="h-8 w-8 text-zinc-500" />
            <p className="mt-2 text-xs font-medium text-zinc-400">Ready to listen for feline vocalizations</p>
          </div>
        )}

        {isRecording && (
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 border border-red-500/30">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-semibold text-red-400">{t.recording}</span>
            </div>
            <span className="mt-2 font-mono text-xl font-bold tracking-wider text-white">
              {formatTimer(recordingSeconds)}
            </span>
          </div>
        )}

        {audioUrl && !isRecording && (
          <div className="relative z-10 flex flex-col items-center gap-2">
            <audio src={audioUrl} controls className="h-10 w-64 rounded-lg" />
            <span className="text-xs text-emerald-400 font-medium">{t.audioRecorded}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-110 active:scale-95"
            >
              <Mic className="h-5 w-5" />
              <span>{t.recordButton}</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-500 active:scale-95"
            >
              <Square className="h-5 w-5" />
              <span>{t.stopRecording}</span>
            </button>
          )}

          {audioUrl && (
            <button
              onClick={() => {
                setAudioUrl(null);
                setRecordingSeconds(0);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-xs font-medium text-zinc-300 hover:text-white transition"
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Re-record</span>
            </button>
          )}
        </div>

        {/* File Upload Option */}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-800/40 px-4 py-3 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition">
          <UploadCloud className="h-4 w-4 text-brand-400" />
          <span>{t.uploadAudio}</span>
          <input
            type="file"
            accept="audio/wav,audio/mp3,audio/mpeg,audio/m4a,audio/mp4,audio/ogg,audio/webm"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>
    </div>
  );
};
