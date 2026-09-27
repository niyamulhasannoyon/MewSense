'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../lib/i18n/LanguageContext';
import { AnalysisResultResponseData, AnalysisProgressEvent } from '@mewsense/shared-types';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Activity,
  Sliders,
  Volume2,
  Zap,
  Sparkles,
  AlertCircle,
  FileAudio,
  Radio,
  CheckCircle2,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { ResultsView } from './ResultsView';

export type WorkspaceAudioState = 'IDLE' | 'ARMING' | 'LISTENING' | 'ANALYZING' | 'RESULT';

interface AudioEngineWorkspaceProps {
  onAudioReady: (audioBlob: Blob, filename: string) => void;
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgressEvent | null;
  currentResult: AnalysisResultResponseData | null;
  onReset: () => void;
  onOpenAudit: () => void;
}

export const AudioEngineWorkspace: React.FC<AudioEngineWorkspaceProps> = ({
  onAudioReady,
  isAnalyzing,
  analysisProgress,
  currentResult,
  onReset,
  onOpenAudit
}) => {
  const { t } = useLanguage();

  // Internal workspace audio states
  const [workspaceState, setWorkspaceState] = useState<WorkspaceAudioState>('IDLE');
  const [visualizerMode, setVisualizerMode] = useState<'oscilloscope' | 'spectrogram'>('oscilloscope');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPlayingLoadedAudio, setIsPlayingLoadedAudio] = useState(false);
  const [dbLevel, setDbLevel] = useState(-60);

  // Web Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync prop state updates
  useEffect(() => {
    if (isAnalyzing) {
      setWorkspaceState('ANALYZING');
    } else if (currentResult) {
      setWorkspaceState('RESULT');
    }
  }, [isAnalyzing, currentResult]);

  // Clean up audio graph on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Visualizer Canvas Renderer
  const renderVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const timeDataArray = new Uint8Array(bufferLength);
    const freqDataArray = new Uint8Array(bufferLength);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid line rendering
      ctx.fillStyle = '#0B0C0E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#1F2328';
      ctx.lineWidth = 1;

      // Draw grid lines
      const gridCols = 8;
      const gridRows = 4;
      for (let i = 1; i < gridCols; i++) {
        const x = (canvas.width / gridCols) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let j = 1; j < gridRows; j++) {
        const y = (canvas.height / gridRows) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (visualizerMode === 'oscilloscope') {
        // Render Oscilloscope
        analyser.getByteTimeDomainData(timeDataArray);

        // Compute dB level
        let sumSq = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (timeDataArray[i] - 128) / 128;
          sumSq += val * val;
        }
        const rms = Math.sqrt(sumSq / bufferLength);
        const db = Math.max(-60, Math.round(20 * Math.log10(rms || 0.0001)));
        setDbLevel(db);

        // Draw waveform line
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#F59E0B'; // Neon amber
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
        ctx.beginPath();

        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeDataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      } else {
        // Render STFT Spectrogram Spectrum Bars
        analyser.getByteFrequencyData(freqDataArray);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (freqDataArray[i] / 255) * canvas.height;

          // Gradient color based on frequency magnitude
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#06B6D4');
          gradient.addColorStop(0.5, '#F59E0B');
          gradient.addColorStop(1, '#10B981');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
          if (x > canvas.width) break;
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  }, [visualizerMode]);

  // Start Mic Recording
  const startRecording = async () => {
    setErrorMessage(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setWorkspaceState('ARMING');
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

      // Initialize Web Audio API audio graph
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      renderVisualizer();

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
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const generatedFilename = `recording_${Date.now()}.${mimeType.includes('mp4') ? 'm4a' : 'webm'}`;
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setFilename(generatedFilename);

        stream.getTracks().forEach((track) => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(100);
      setWorkspaceState('LISTENING');
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
      console.error('Microphone initialization error:', err);
      setWorkspaceState('IDLE');
      setErrorMessage(
        'Microphone permission denied or device unavailable. Please verify browser media permissions.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && workspaceState === 'LISTENING') {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleFileProcess = (file: File) => {
    if (file.size > 2048 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 2GB maximum limit.');
      return;
    }
    setErrorMessage(null);
    const url = URL.createObjectURL(file);
    setAudioBlob(file);
    setAudioUrl(url);
    setFilename(file.name);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isMedia =
        file.type.startsWith('audio/') ||
        file.type.startsWith('video/') ||
        /\.(wav|m4a|mp3|ogg|webm|mp4|mov|avi|mkv|3gp|flac|aac)$/i.test(file.name);
      if (isMedia) {
        handleFileProcess(file);
      } else {
        setErrorMessage('Invalid file format. Please upload an audio or video file (.wav, .mp3, .m4a, .webm, .mp4, .mov, etc.).');
      }
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (workspaceState === 'LISTENING') {
          stopRecording();
        } else if (workspaceState === 'IDLE' && !audioUrl) {
          startRecording();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        fileInputRef.current?.click();
      } else if (e.key === 'Escape') {
        if (workspaceState === 'LISTENING') {
          stopRecording();
        } else {
          handleResetWorkspace();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspaceState, audioUrl]);

  const handleResetWorkspace = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setFilename('');
    setRecordingSeconds(0);
    setWorkspaceState('IDLE');
    setErrorMessage(null);
    onReset();
  };

  const handleExecuteAnalysis = () => {
    if (audioBlob) {
      onAudioReady(audioBlob, filename || `vocal_${Date.now()}.webm`);
    }
  };

  const formatTimecode = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.00`;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col rounded border transition-all duration-200 ${
        isDragOver
          ? 'border-dsp-amber bg-dsp-surface/90 shadow-2xl ring-2 ring-dsp-amber/30'
          : 'border-dsp-border bg-dsp-surface'
      }`}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*,.wav,.m4a,.mp3,.ogg,.webm,.mp4,.mov,.avi,.mkv,.3gp,.flac,.aac"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Drag Over Overlay Visual Halo */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded bg-dsp-bg/90 backdrop-blur-sm border-2 border-dashed border-dsp-amber">
          <Upload className="h-12 w-12 text-dsp-amber animate-bounce mb-2" />
          <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
            Ingest Audio / Video Sample
          </h3>
          <p className="font-mono text-xs text-dsp-muted mt-1">
            Drop any audio or video file (.mp4, .webm, .mov, .wav, .mp3, .m4a, etc.)
          </p>
        </div>
      )}

      {/* Workstation Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-dsp-border px-4 py-2 bg-dsp-surface/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                workspaceState === 'LISTENING'
                  ? 'bg-dsp-amber animate-ping'
                  : workspaceState === 'ANALYZING'
                  ? 'bg-dsp-cyan animate-pulse'
                  : workspaceState === 'RESULT'
                  ? 'bg-dsp-emerald'
                  : 'bg-dsp-muted'
              }`}
            />
            <span className="font-semibold uppercase tracking-wider text-zinc-200">
              State: {workspaceState}
            </span>
          </div>

          <div className="h-3 w-[1px] bg-dsp-border" />

          {/* Visualizer Mode Switcher */}
          <div className="flex items-center rounded border border-dsp-border bg-dsp-bg p-0.5 text-xs font-mono">
            <button
              onClick={() => setVisualizerMode('oscilloscope')}
              className={`rounded px-2 py-0.5 text-[11px] transition ${
                visualizerMode === 'oscilloscope'
                  ? 'bg-dsp-elevated text-dsp-amber font-bold border border-dsp-borderHighlight'
                  : 'text-dsp-muted hover:text-white'
              }`}
            >
              OSCILLOSCOPE
            </button>
            <button
              onClick={() => setVisualizerMode('spectrogram')}
              className={`rounded px-2 py-0.5 text-[11px] transition ${
                visualizerMode === 'spectrogram'
                  ? 'bg-dsp-elevated text-dsp-cyan font-bold border border-dsp-borderHighlight'
                  : 'text-dsp-muted hover:text-white'
              }`}
            >
              FFT SPECTRUM
            </button>
          </div>
        </div>

        {/* Live dBFS Peak Meter Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-[10px] text-dsp-muted uppercase">Peak Input</span>
          <div className="h-2 w-24 overflow-hidden rounded bg-dsp-bg border border-dsp-border relative">
            <div
              className={`h-full transition-all duration-75 ${
                dbLevel > -6 ? 'bg-red-500' : dbLevel > -18 ? 'bg-dsp-amber' : 'bg-dsp-emerald'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, ((dbLevel + 60) / 60) * 100))}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-zinc-300 min-w-[45px] text-right">
            {dbLevel} dB
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 p-2.5 font-mono text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Interactive Canvas / Workspace Body */}
      <div className="p-4">
        {currentResult ? (
          /* Inline Result Breakdown View */
          <ResultsView result={currentResult} onReset={handleResetWorkspace} />
        ) : (
          <div className="space-y-4">
            {/* Visualizer Canvas Frame */}
            <div className="relative flex h-52 w-full flex-col items-center justify-center overflow-hidden rounded border border-dsp-border bg-dsp-bg shadow-inner">
              <canvas
                ref={canvasRef}
                width={800}
                height={208}
                className="absolute inset-0 h-full w-full object-cover"
              />

              {/* IDLE State Overlay */}
              {workspaceState === 'IDLE' && !audioUrl && (
                <div className="relative z-10 flex flex-col items-center text-center p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded border border-dsp-borderHighlight bg-dsp-surface text-dsp-muted shadow-lg mb-3">
                    <Activity className="h-6 w-6 text-dsp-amber" />
                  </div>
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Acoustic Processing Engine Ready
                  </h4>
                  <p className="font-mono text-[11px] text-dsp-muted mt-1 max-w-md">
                    Press <kbd className="bg-dsp-elevated px-1 border border-dsp-borderHighlight text-dsp-amber">Space</kbd> to record live mic input or drag & drop audio/video file (.mp4, .webm, .wav, .m4a)
                  </p>
                </div>
              )}

              {/* ARMING State Overlay */}
              {workspaceState === 'ARMING' && (
                <div className="relative z-10 flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 text-dsp-amber animate-spin mb-2" />
                  <span className="font-mono text-xs font-bold text-dsp-amber uppercase tracking-wider">
                    Arming Audio Graph & Calibrating Noise Floor...
                  </span>
                </div>
              )}

              {/* LISTENING State Overlay */}
              {workspaceState === 'LISTENING' && (
                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex items-center gap-2 rounded bg-red-500/10 border border-red-500/30 px-3 py-1 font-mono">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-bold text-red-400">RECORDING LIVE MIC</span>
                  </div>
                  <span className="mt-3 font-mono text-3xl font-extrabold tracking-widest text-white">
                    {formatTimecode(recordingSeconds)}
                  </span>
                  <span className="text-[10px] font-mono text-dsp-muted mt-1">
                    Max buffer window: 60 seconds
                  </span>
                </div>
              )}

              {/* ANALYZING State Overlay */}
              {workspaceState === 'ANALYZING' && (
                <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-6">
                  <Cpu className="h-8 w-8 text-dsp-cyan animate-pulse mb-3" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-dsp-cyan mb-2">
                    {analysisProgress?.message || 'Processing Bioacoustic Classification Pipeline...'}
                  </span>
                  {/* Stepped Progress Bar */}
                  <div className="w-full h-2 rounded bg-dsp-surface border border-dsp-border overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-dsp-cyan via-dsp-amber to-dsp-emerald transition-all duration-300"
                      style={{ width: `${analysisProgress?.percent || 25}%` }}
                    />
                  </div>
                  <div className="w-full flex justify-between font-mono text-[10px] text-dsp-muted">
                    <span>Mel-STFT Features</span>
                    <span>Wav2Vec2 Inference</span>
                    <span>Bayesian Softmax</span>
                  </div>
                </div>
              )}

              {/* Loaded Audio Player Scrubber */}
              {audioUrl && workspaceState !== 'LISTENING' && workspaceState !== 'ANALYZING' && (
                <div className="relative z-10 flex flex-col items-center gap-2 bg-dsp-surface/90 border border-dsp-border p-3 rounded max-w-md w-full backdrop-blur-md">
                  <audio
                    ref={audioPlaybackRef}
                    src={audioUrl}
                    onPlay={() => setIsPlayingLoadedAudio(true)}
                    onPause={() => setIsPlayingLoadedAudio(false)}
                    controls
                    className="w-full h-9"
                  />
                  <div className="flex items-center justify-between w-full font-mono text-[10px] text-dsp-muted">
                    <span className="truncate max-w-[200px]">FILE: {filename}</span>
                    <span className="text-dsp-emerald font-semibold">PCM LOADED</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tactical Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dsp-border pt-3">
              <div className="flex items-center gap-3">
                {workspaceState !== 'LISTENING' ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 rounded bg-dsp-amber px-4 py-2 font-mono text-xs font-bold text-black shadow hover:brightness-110 active:scale-95 transition"
                  >
                    <Mic className="h-4 w-4" />
                    <span>ARM MICROPHONE</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 font-mono text-xs font-bold text-white shadow hover:bg-red-500 active:scale-95 transition"
                  >
                    <Square className="h-4 w-4" />
                    <span>STOP RECORDING</span>
                  </button>
                )}

                {/* Upload File Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded border border-dsp-border bg-dsp-surface px-3 py-2 font-mono text-xs font-semibold text-zinc-300 hover:border-dsp-borderHighlight hover:text-white transition"
                >
                  <Upload className="h-4 w-4 text-dsp-cyan" />
                  <span>UPLOAD AUDIO / VIDEO</span>
                </button>

                {audioUrl && (
                  <button
                    onClick={handleResetWorkspace}
                    className="flex items-center gap-1.5 rounded border border-dsp-border bg-dsp-surface px-3 py-2 font-mono text-xs text-dsp-muted hover:text-white transition"
                    title="Clear Buffer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>RESET</span>
                  </button>
                )}
              </div>

              {/* Action Button to Execute Analysis */}
              {audioBlob && workspaceState !== 'ANALYZING' && (
                <button
                  onClick={handleExecuteAnalysis}
                  className="flex items-center gap-2 rounded border border-dsp-emerald bg-dsp-emerald/10 px-5 py-2 font-mono text-xs font-bold text-dsp-emerald hover:bg-dsp-emerald hover:text-black transition shadow"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>RUN BIOACOUSTIC ANALYSIS</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
