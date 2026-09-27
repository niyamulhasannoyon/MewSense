'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import {
  Mic,
  Video,
  Square,
  Play,
  RotateCcw,
  UploadCloud,
  AlertCircle,
  Camera,
  Film,
  FileAudio,
  FileVideo,
  CheckCircle2,
  SwitchCamera
} from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (mediaBlob: Blob, filename: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioReady }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'upload'>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Ready media preview state
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideoMedia, setIsVideoMedia] = useState<boolean>(false);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);
  const [mediaFileSize, setMediaFileSize] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio Visualizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Live video preview ref
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      stopMediaStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

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

      ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  const startAudioRecording = async () => {
    setErrorMessage(null);
    clearMediaPreview();
    mediaChunksRef.current = [];

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
      mediaStreamRef.current = stream;

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
          mediaChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const filename = `audio_recording_${Date.now()}.${mimeType.includes('mp4') ? 'm4a' : 'webm'}`;
        setMediaUrl(url);
        setIsVideoMedia(false);
        setMediaFileName(filename);
        setMediaFileSize(`${(blob.size / (1024 * 1024)).toFixed(2)} MB`);

        onAudioReady(blob, filename);

        stopMediaStream();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setErrorMessage('Microphone access was denied or is not available. Please allow microphone permissions.');
    }
  };

  const startVideoRecording = async () => {
    setErrorMessage(null);
    clearMediaPreview();
    mediaChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }

      // Initialize audio analyzer for visualizer overlay
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();

      let mimeType = 'video/webm;codecs=vp8,opus';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const filename = `cat_video_${Date.now()}.${ext}`;
        setMediaUrl(url);
        setIsVideoMedia(true);
        setMediaFileName(filename);
        setMediaFileSize(`${(blob.size / (1024 * 1024)).toFixed(2)} MB`);

        onAudioReady(blob, filename);

        stopMediaStream();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Camera & microphone error:', err);
      setErrorMessage('Camera and microphone access was denied or not available. Please grant permissions.');
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
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 100MB limit for analysis.');
      return;
    }
    setErrorMessage(null);
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|3gp)$/i.test(file.name);

    setMediaUrl(url);
    setIsVideoMedia(isVideo);
    setMediaFileName(file.name);
    setMediaFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);

    onAudioReady(file, file.name);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const clearMediaPreview = () => {
    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }
    setMediaUrl(null);
    setIsVideoMedia(false);
    setMediaFileName(null);
    setMediaFileSize(null);
    setRecordingSeconds(0);
    setErrorMessage(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-2xl backdrop-blur-xl">
      {/* Mode Selector Tabs */}
      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5">
        <button
          onClick={() => {
            if (isRecording) return;
            setActiveTab('audio');
            clearMediaPreview();
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
            activeTab === 'audio'
              ? 'bg-gradient-to-r from-brand-600 to-orange-500 text-white shadow-md shadow-brand-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Mic className="h-4 w-4" />
          <span>{t.tabAudio || 'Record Audio'}</span>
        </button>

        <button
          onClick={() => {
            if (isRecording) return;
            setActiveTab('video');
            clearMediaPreview();
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
            activeTab === 'video'
              ? 'bg-gradient-to-r from-brand-600 to-orange-500 text-white shadow-md shadow-brand-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Video className="h-4 w-4" />
          <span>{t.tabVideo || 'Record Video'}</span>
        </button>

        <button
          onClick={() => {
            if (isRecording) return;
            setActiveTab('upload');
            clearMediaPreview();
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
            activeTab === 'upload'
              ? 'bg-gradient-to-r from-brand-600 to-orange-500 text-white shadow-md shadow-brand-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          <span>{t.tabUpload || 'Upload Media'}</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mode View Content */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Media Preview Active State (If recorded or uploaded media exists) */}
        {mediaUrl && !isRecording ? (
          <div className="w-full flex flex-col items-center space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 self-start text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{isVideoMedia ? t.videoRecorded || 'Video captured' : t.audioRecorded || 'Audio captured'}</span>
              <span className="text-[11px] text-zinc-500">• {mediaFileSize}</span>
            </div>

            {isVideoMedia ? (
              <div className="w-full max-h-80 overflow-hidden rounded-xl bg-black border border-zinc-800">
                <video src={mediaUrl} controls className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="w-full py-6 flex flex-col items-center justify-center bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                <FileAudio className="h-10 w-10 text-brand-400 mb-2" />
                <audio src={mediaUrl} controls className="h-10 w-72 rounded-lg" />
              </div>
            )}

            <div className="flex items-center justify-between w-full pt-2">
              <span className="text-xs text-zinc-400 font-mono truncate max-w-[220px] sm:max-w-md">
                {mediaFileName}
              </span>
              <button
                onClick={clearMediaPreview}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Re-record / Change</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Audio Recording Mode */}
            {activeTab === 'audio' && (
              <div className="relative mb-6 flex h-40 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                <canvas ref={canvasRef} width={600} height={160} className="absolute inset-0 h-full w-full object-cover" />

                {!isRecording && (
                  <div className="relative z-10 flex flex-col items-center text-center px-4">
                    <div className="rounded-full bg-brand-500/10 p-3 text-brand-400 mb-2 border border-brand-500/20">
                      <Mic className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Audio Bioacoustic Recording</h3>
                    <p className="mt-1 text-xs text-zinc-400 max-w-sm">
                      Capture high-fidelity meows, purrs, growls, or caterwauls up to 2 minutes.
                    </p>
                  </div>
                )}

                {isRecording && (
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 border border-red-500/30">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-bold text-red-400">{t.recording || 'Recording Audio...'}</span>
                    </div>
                    <span className="mt-2 font-mono text-2xl font-black tracking-wider text-white">
                      {formatTimer(recordingSeconds)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Video Recording Mode */}
            {activeTab === 'video' && (
              <div className="relative mb-6 flex h-64 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                <video
                  ref={liveVideoRef}
                  playsInline
                  muted
                  className={`absolute inset-0 h-full w-full object-cover ${!isRecording ? 'hidden' : 'block'}`}
                />
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={160}
                  className={`absolute bottom-0 left-0 right-0 h-20 w-full object-cover pointer-events-none ${
                    !isRecording ? 'hidden' : 'block'
                  }`}
                />

                {!isRecording && (
                  <div className="relative z-10 flex flex-col items-center text-center px-4">
                    <div className="rounded-full bg-brand-500/10 p-4 text-brand-400 mb-3 border border-brand-500/20">
                      <Video className="h-8 w-8" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Direct Video & Audio Recording</h3>
                    <p className="mt-1 text-xs text-zinc-400 max-w-sm">
                      Record live camera video with synchronized audio feed for complete acoustic + visual contextual capture.
                    </p>
                  </div>
                )}

                {isRecording && (
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full bg-red-600/90 backdrop-blur-md px-3 py-1 text-white border border-red-400/40">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      {t.recordingVideo || 'REC VIDEO'}
                    </span>
                    <span className="font-mono text-xs font-bold border-l border-white/20 pl-2">
                      {formatTimer(recordingSeconds)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* File Upload Mode */}
            {activeTab === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mb-6 flex min-h-[160px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  isDragging
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
              >
                <label className="flex w-full cursor-pointer flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <FileVideo className="h-7 w-7 text-brand-400" />
                    <FileAudio className="h-7 w-7 text-orange-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Upload Video or Audio File</h3>
                  <p className="mt-1 text-xs text-zinc-400 max-w-md">
                    {t.dragDropMediaText || 'Supports .mp4, .webm, .mov, .avi, .mkv video and .wav, .mp3, .m4a audio up to 100MB.'}
                  </p>
                  <input
                    type="file"
                    accept="video/*,audio/*,.mp4,.webm,.mov,.avi,.mkv,.wav,.mp3,.m4a,.ogg"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <span className="mt-3 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition">
                    Browse Local File
                  </span>
                </label>
              </div>
            )}
          </>
        )}
      </div>

      {/* Main Action Buttons */}
      {!mediaUrl && (
        <div className="flex items-center justify-center">
          {activeTab === 'audio' && (
            <>
              {!isRecording ? (
                <button
                  onClick={startAudioRecording}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-110 active:scale-95"
                >
                  <Mic className="h-5 w-5" />
                  <span>{t.recordButton || 'Record Audio'}</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-500 active:scale-95"
                >
                  <Square className="h-5 w-5" />
                  <span>{t.stopRecording || 'Stop Recording'}</span>
                </button>
              )}
            </>
          )}

          {activeTab === 'video' && (
            <>
              {!isRecording ? (
                <button
                  onClick={startVideoRecording}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-110 active:scale-95"
                >
                  <Video className="h-5 w-5" />
                  <span>{t.recordVideo || 'Record Direct Video'}</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-500 active:scale-95"
                >
                  <Square className="h-5 w-5" />
                  <span>{t.stopVideoRecording || 'Stop Video Recording'}</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
