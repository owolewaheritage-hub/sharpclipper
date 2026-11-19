import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Captions,
  Crown,
  Download,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  Scissors,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { SINGLE_CLIP_PRICE_NGN } from '../config/payment';
import {
  AspectRatio,
  CaptionCue,
  SplitSegment,
  UserAccount,
  VideoSource,
} from '../types';
import {
  createBrowserSpeechRecognizer,
  createSynthesizedSampleVideo,
  exportClipVideo,
  formatTimePrecise,
  generateSmartCaptions,
  getVideoDurationFromUrl,
  parseTimeInput,
  SpeechRecognitionHandle,
  triggerBlobDownload,
} from '../utils/videoEngine';
import { cacheClipBlob, getRemainingFreeClips } from '../utils/storage';
import { PreDownloadAdGate } from './AdBanner';

interface VideoEditorPageProps {
  source: VideoSource | null;
  account: UserAccount;
  onSourceLoaded: (source: VideoSource) => void;
  onClipExported: (clip: {
    id: string;
    title: string;
    createdAt: string;
    duration: number;
    startTime: number;
    endTime: number;
    aspectRatio: AspectRatio;
    quality: '720p' | '1080p';
    hasWatermark: boolean;
    captionsEnabled: boolean;
    captionsCount: number;
    thumbnailDataUrl: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    usedSingleCredit: boolean;
  }) => void;
  onLimitReached: () => void;
  onUpgradePro: () => void;
  onPaySingleClip: () => void;
}

export const VideoEditorPage: React.FC<VideoEditorPageProps> = ({
  source,
  account,
  onSourceLoaded,
  onClipExported,
  onLimitReached,
  onUpgradePro,
  onPaySingleClip,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRef = useRef<SpeechRecognitionHandle | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(source?.duration || 6);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(source?.duration || 6);

  const [startInput, setStartInput] = useState('0:00.0');
  const [endInput, setEndInput] = useState(formatTimePrecise(source?.duration || 6));

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [panX, setPanX] = useState(0.5);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captions, setCaptions] = useState<CaptionCue[]>([]);
  const [segments, setSegments] = useState<SplitSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const [dragMode, setDragMode] = useState<'start' | 'end' | 'playhead' | null>(null);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('');

  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStage, setExportStage] = useState('');
  const [exportBannerMsg, setExportBannerMsg] = useState('');
  const [showAdGate, setShowAdGate] = useState(false);
  const [useSingleCredit, setUseSingleCredit] = useState(account.singleClipCredits > 0);
  const [sampleLoading, setSampleLoading] = useState(false);

  // Sync defaults when video source changes
  useEffect(() => {
    if (!source) return;
    const dur = Math.max(1, source.duration || 6);
    const defaultStart = dur > 35 ? 30 : 0;
    const defaultEnd = dur > 65 ? 60 : dur;
    setDuration(dur);
    setStartTime(defaultStart);
    setEndTime(defaultEnd);
    setStartInput(formatTimePrecise(defaultStart));
    setEndInput(formatTimePrecise(defaultEnd));
    setCurrentTime(defaultStart);
    setIsPlaying(false);
    setSegments([
      {
        id: 'seg_initial',
        label: 'Clip 1',
        start: defaultStart,
        end: defaultEnd,
      },
    ]);
    setActiveSegmentId('seg_initial');
    setCaptions(generateSmartCaptions(defaultStart, defaultEnd, source.title));
    setExportBannerMsg('');
  }, [source]);

  useEffect(() => {
    if (account.singleClipCredits > 0) {
      setUseSingleCredit(true);
    } else {
      setUseSingleCredit(false);
    }
  }, [account.singleClipCredits]);

  useEffect(() => {
    return () => {
      speechRef.current?.stop();
    };
  }, []);

  const isPro = account.plan === 'pro';
  const remainingFree = getRemainingFreeClips(account);
  const willRemoveWatermark = isPro || (useSingleCredit && account.singleClipCredits > 0);
  const clipDuration = Math.max(0.5, endTime - startTime);

  const activeCue = captionsEnabled
    ? captions.find((c) => currentTime >= c.start && currentTime <= c.end)
    : undefined;

  const updateStart = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, endTime - 0.5));
      setStartTime(clamped);
      setStartInput(formatTimePrecise(clamped));
      if (videoRef.current && videoRef.current.currentTime < clamped) {
        videoRef.current.currentTime = clamped;
        setCurrentTime(clamped);
      }
    },
    [endTime]
  );

  const updateEnd = useCallback(
    (next: number) => {
      const clamped = Math.min(duration, Math.max(next, startTime + 0.5));
      setEndTime(clamped);
      setEndInput(formatTimePrecise(clamped));
      if (videoRef.current && videoRef.current.currentTime > clamped) {
        videoRef.current.currentTime = clamped;
        setCurrentTime(clamped);
      }
    },
    [duration, startTime]
  );

  // Handle timeline pointer dragging
  useEffect(() => {
    if (!dragMode) return;

    const handleMove = (e: PointerEvent) => {
      const track = timelineRef.current;
      if (!track || duration <= 0) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = ratio * duration;

      if (dragMode === 'start') {
        updateStart(targetTime);
      } else if (dragMode === 'end') {
        updateEnd(targetTime);
      } else if (dragMode === 'playhead') {
        const clamped = Math.max(0, Math.min(duration, targetTime));
        setCurrentTime(clamped);
        if (videoRef.current) videoRef.current.currentTime = clamped;
      }
    };

    const handleUp = () => setDragMode(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragMode, duration, updateStart, updateEnd]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      if (v.currentTime < startTime || v.currentTime >= endTime) {
        v.currentTime = startTime;
      }
      v.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (isPlaying && v.currentTime >= endTime) {
      v.currentTime = startTime;
      v.play().catch(() => {});
    }
  };

  const handleSplitAtPlayhead = () => {
    if (currentTime <= startTime + 0.4 || currentTime >= endTime - 0.4) {
      const midpoint = Number(((startTime + endTime) / 2).toFixed(2));
      const left: SplitSegment = {
        id: `seg_${Date.now()}_1`,
        label: 'Part 1',
        start: startTime,
        end: midpoint,
      };
      const right: SplitSegment = {
        id: `seg_${Date.now()}_2`,
        label: 'Part 2',
        start: midpoint,
        end: endTime,
      };
      setSegments([left, right]);
      setActiveSegmentId(left.id);
      setStartTime(left.start);
      setEndTime(left.end);
      setStartInput(formatTimePrecise(left.start));
      setEndInput(formatTimePrecise(left.end));
      return;
    }

    const splitAt = Number(currentTime.toFixed(2));
    const left: SplitSegment = {
      id: `seg_${Date.now()}_1`,
      label: 'Part 1',
      start: startTime,
      end: splitAt,
    };
    const right: SplitSegment = {
      id: `seg_${Date.now()}_2`,
      label: 'Part 2',
      start: splitAt,
      end: endTime,
    };
    setSegments([left, right]);
    setActiveSegmentId(left.id);
    setStartTime(left.start);
    setEndTime(left.end);
    setStartInput(formatTimePrecise(left.start));
    setEndInput(formatTimePrecise(left.end));
  };

  const selectSegment = (seg: SplitSegment) => {
    setActiveSegmentId(seg.id);
    setStartTime(seg.start);
    setEndTime(seg.end);
    setStartInput(formatTimePrecise(seg.start));
    setEndInput(formatTimePrecise(seg.end));
    if (videoRef.current) {
      videoRef.current.currentTime = seg.start;
      setCurrentTime(seg.start);
    }
  };

  const handleAddAutoCaptions = () => {
    setCaptionsEnabled(true);
    if (captions.length === 0 && source) {
      setCaptions(generateSmartCaptions(startTime, endTime, source.title));
    } else {
      // Regenerate synced to current trim bounds
      setCaptions(generateSmartCaptions(startTime, endTime, source?.title || 'Clip'));
    }
  };

  const toggleLiveSpeechCaptions = () => {
    if (isListeningSpeech) {
      speechRef.current?.stop();
      setIsListeningSpeech(false);
      setSpeechStatus('');
      return;
    }

    const rec = createBrowserSpeechRecognizer(
      (transcript, isFinal) => {
        setCaptionsEnabled(true);
        if (isFinal) {
          const t = videoRef.current?.currentTime ?? currentTime;
          const cueStart = Math.max(startTime, Number(t.toFixed(2)));
          const cueEnd = Math.min(endTime, Number((cueStart + 1.8).toFixed(2)));
          setCaptions((prev) => [
            ...prev,
            {
              id: `mic_${Date.now()}`,
              start: cueStart,
              end: Math.max(cueStart + 0.6, cueEnd),
              text: transcript,
            },
          ]);
          setSpeechStatus(`Captured: "${transcript}"`);
        } else {
          setSpeechStatus(`Listening: "${transcript}"`);
        }
      },
      (err) => {
        setSpeechStatus(err);
        setIsListeningSpeech(false);
      },
      () => {
        setIsListeningSpeech(false);
      }
    );

    speechRef.current = rec;
    if (rec.supported) {
      setIsListeningSpeech(true);
      setSpeechStatus('Listening via microphone... speak to add captions.');
      rec.start();
    } else {
      setSpeechStatus('Speech Recognition unavailable in this browser; auto captions generated.');
      handleAddAutoCaptions();
    }
  };

  const runActualExport = async () => {
    if (!source) return;
    setExportBannerMsg('');
    setExportProgress(5);
    setExportStage('Starting browser video export...');

    try {
      const usingCredit = !isPro && useSingleCredit && account.singleClipCredits > 0;
      const includeWatermark = !isPro && !usingCredit;
      const quality: '720p' | '1080p' = isPro || usingCredit ? '1080p' : '720p';

      const result = await exportClipVideo({
        sourceUrl: source.url,
        title: source.title,
        startTime,
        endTime,
        aspectRatio,
        panX,
        captionsEnabled,
        captions,
        includeWatermark,
        quality,
        onProgress: (pct, stage) => {
          setExportProgress(pct);
          setExportStage(stage);
        },
      });

      const clipId = `clip_${Date.now().toString(36)}`;
      cacheClipBlob(clipId, result.blob);
      triggerBlobDownload(result.blob, result.fileName);

      onClipExported({
        id: clipId,
        title: `${source.title} (${aspectRatio})`,
        createdAt: new Date().toISOString(),
        duration: Number(clipDuration.toFixed(1)),
        startTime,
        endTime,
        aspectRatio,
        quality,
        hasWatermark: includeWatermark,
        captionsEnabled,
        captionsCount: captionsEnabled ? captions.length : 0,
        thumbnailDataUrl: result.thumbnailDataUrl,
        fileName: result.fileName,
        fileSizeBytes: result.blob.size,
        mimeType: result.mimeType,
        usedSingleCredit: usingCredit,
      });

      setExportProgress(null);
      setExportBannerMsg(
        `Clip downloaded (${quality}, ${includeWatermark ? 'with watermark' : 'no watermark'}) and saved to My Clips.`
      );
    } catch (err) {
      setExportProgress(null);
      setExportBannerMsg(
        err instanceof Error ? err.message : 'Export interrupted. Please try again.'
      );
    }
  };

  const handleDownloadClick = () => {
    if (!source || exportProgress !== null) return;

    const usingCredit = !isPro && useSingleCredit && account.singleClipCredits > 0;

    // Enforce 3-clip monthly free limit unless Pro or using a ₦500 single-clip credit
    if (!isPro && !usingCredit && remainingFree <= 0) {
      onLimitReached();
      return;
    }

    // Free users see a brief Advertisement gate before download; Pro users download immediately
    if (!isPro) {
      setShowAdGate(true);
      return;
    }

    runActualExport();
  };

  const handleQuickSample = async () => {
    setSampleLoading(true);
    const synthesized = await createSynthesizedSampleVideo(
      '/src/assets/images/sample_podcast_clip_1795120833709.jpg',
      'Founder Podcast: Viral Clip Demo',
      6
    );
    setSampleLoading(false);
    onSourceLoaded({
      id: `sample_${Date.now()}`,
      title: 'Founder Podcast: Viral Clip Demo',
      origin: 'sample',
      url: synthesized.url,
      blob: synthesized.blob,
      duration: synthesized.duration,
    });
  };

  const handleQuickFileUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);
    const dur = await getVideoDurationFromUrl(url);
    onSourceLoaded({
      id: `vid_${Date.now()}`,
      title: file.name.replace(/\.[^.]+$/, ''),
      origin: 'upload',
      url,
      file,
      duration: dur,
    });
  };

  if (!source) {
    return (
      <div className="min-h-[calc(100vh-120px)] bg-[#060608] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full bg-[#0E0E13] border border-white/10 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">No video loaded in editor</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Upload an MP4 file from your device or load a studio sample clip to start trimming and
            adding captions.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleQuickFileUpload(f);
            }}
          />
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              Upload MP4 Video
            </button>
            <button
              type="button"
              disabled={sampleLoading}
              onClick={handleQuickSample}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-medium text-sm rounded-lg transition-colors cursor-pointer"
            >
              {sampleLoading ? 'Loading Sample...' : 'Load Studio Sample'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const startPct = (startTime / duration) * 100;
  const endPct = (endTime / duration) * 100;
  const playPct = (currentTime / duration) * 100;

  return (
    <div className="bg-[#060608] text-zinc-100 min-h-[calc(100vh-110px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Editor Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-xs text-zinc-400">
              {source.origin === 'youtube'
                ? 'YouTube Import'
                : source.origin === 'upload'
                  ? 'Local MP4 Upload'
                  : 'Studio Sample'}{' '}
              · Total {formatTimePrecise(duration)}
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-white truncate mt-0.5">
              {source.title}
            </h1>
          </div>

          {/* Primary Format Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0E0E13] border border-white/10 rounded-lg self-start sm:self-auto">
            {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  aspectRatio === ratio
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {ratio === '9:16'
                  ? '9:16 Vertical'
                  : ratio === '16:9'
                    ? '16:9 Horizontal'
                    : '1:1 Square'}
              </button>
            ))}
          </div>
        </div>

        {/* Main Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left/Center Column: Preview Stage + Timeline */}
          <div className="lg:col-span-8 space-y-5">
            {/* Aspect-Ratio Video Stage */}
            <div className="bg-[#0E0E13] border border-white/10 rounded-xl p-4 sm:p-6 flex flex-col items-center">
              <div
                className={`relative bg-black rounded-lg overflow-hidden border border-white/10 transition-all duration-200 ${
                  aspectRatio === '9:16'
                    ? 'w-[260px] sm:w-[300px] aspect-[9/16]'
                    : aspectRatio === '1:1'
                      ? 'w-[300px] sm:w-[380px] aspect-square'
                      : 'w-full max-w-2xl aspect-video'
                }`}
              >
                <video
                  ref={videoRef}
                  src={source.url}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (Number.isFinite(dur) && dur > 0) {
                      setDuration(dur);
                    }
                  }}
                  onEnded={() => setIsPlaying(false)}
                  onClick={togglePlay}
                  playsInline
                  className="w-full h-full object-cover cursor-pointer"
                  style={{ objectPosition: `${panX * 100}% center` }}
                />

                {/* Free Plan Watermark Preview */}
                {!willRemoveWatermark && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/75 border border-[#8B5CF6]/50 rounded text-[11px] font-semibold text-white pointer-events-none">
                    Made with SharpClipper
                  </div>
                )}

                {/* TikTok-Style Auto Captions Overlay (Middle-Bottom) */}
                {activeCue && (
                  <div className="absolute left-4 right-4 bottom-[16%] flex justify-center pointer-events-none">
                    <span className="inline-block bg-black/90 text-white font-extrabold text-sm sm:text-base px-3.5 py-1.5 rounded-md text-center leading-snug shadow-lg">
                      {activeCue.text}
                    </span>
                  </div>
                )}

                {/* Center Play/Pause Affordance */}
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors cursor-pointer"
                    aria-label="Play clip preview"
                  >
                    <span className="w-14 h-14 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </span>
                  </button>
                )}
              </div>

              {/* Framing Pan Control for Vertical/Square */}
              {aspectRatio !== '16:9' && (
                <div className="mt-4 w-full max-w-sm flex items-center gap-3">
                  <span className="text-xs text-zinc-400 whitespace-nowrap">Crop Focus</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={panX}
                    onChange={(e) => setPanX(parseFloat(e.target.value))}
                    className="w-full accent-[#8B5CF6] cursor-pointer"
                  />
                  <span className="font-mono-tabular text-xs text-zinc-400 w-10 text-right">
                    {Math.round(panX * 100)}%
                  </span>
                </div>
              )}

              {/* Transport & Big Editor Action Buttons */}
              <div className="mt-5 w-full flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="min-h-[44px] px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSplitAtPlayhead}
                  className="min-h-[44px] px-4 py-2.5 bg-[#181822] hover:bg-[#232332] border border-white/10 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <Scissors className="w-4 h-4 text-[#A78BFA]" />
                  <span>Split</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddAutoCaptions}
                  className={`min-h-[44px] px-4 py-2.5 border font-semibold text-sm rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer ${
                    captionsEnabled
                      ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                      : 'bg-[#181822] hover:bg-[#232332] border-white/10 text-white'
                  }`}
                >
                  <Captions className="w-4 h-4 text-[#A78BFA]" />
                  <span>Add Caption</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`min-h-[44px] px-4 py-2.5 border font-semibold text-sm rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer ${
                    aspectRatio === '9:16'
                      ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white'
                      : 'bg-[#181822] hover:bg-[#232332] border-white/10 text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Make 9:16</span>
                </button>
              </div>
            </div>

            {/* Interactive Timeline & Start/End Controls */}
            <div className="bg-[#0E0E13] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-zinc-400">Playhead: </span>
                    <span className="font-mono-tabular text-white font-semibold">
                      {formatTimePrecise(currentTime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Clip Duration: </span>
                    <span className="font-mono-tabular text-[#A78BFA] font-bold">
                      {formatTimePrecise(clipDuration)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-zinc-400">
                  Drag purple handles to set Start &amp; End
                </span>
              </div>

              {/* Draggable Range Timeline */}
              <div
                ref={timelineRef}
                onPointerDown={(e) => {
                  const track = timelineRef.current;
                  if (!track) return;
                  const rect = track.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const t = ratio * duration;
                  setCurrentTime(t);
                  if (videoRef.current) videoRef.current.currentTime = t;
                  setDragMode('playhead');
                }}
                className="relative h-14 bg-[#060608] border border-white/10 rounded-lg select-none touch-none cursor-pointer overflow-hidden"
              >
                {/* Background Waveform Ticks */}
                <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-45">
                  {Array.from({ length: 44 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-zinc-700"
                      style={{ height: `${22 + ((i * 19) % 52)}%` }}
                    />
                  ))}
                </div>

                {/* Selected Clip Region */}
                <div
                  className="absolute top-0 bottom-0 bg-[#8B5CF6]/25 border-y-2 border-[#8B5CF6]"
                  style={{
                    left: `${startPct}%`,
                    width: `${Math.max(1, endPct - startPct)}%`,
                  }}
                />

                {/* Playhead Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
                  style={{ left: `${playPct}%` }}
                />

                {/* Start Handle */}
                <button
                  type="button"
                  aria-label="Drag start time"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDragMode('start');
                  }}
                  className="absolute top-0 bottom-0 w-5 -ml-2.5 bg-[#8B5CF6] hover:bg-[#A78BFA] z-30 flex items-center justify-center cursor-ew-resize rounded-l"
                  style={{ left: `${startPct}%` }}
                >
                  <span className="w-0.5 h-5 bg-white rounded-full" />
                </button>

                {/* End Handle */}
                <button
                  type="button"
                  aria-label="Drag end time"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDragMode('end');
                  }}
                  className="absolute top-0 bottom-0 w-5 -ml-2.5 bg-[#8B5CF6] hover:bg-[#A78BFA] z-30 flex items-center justify-center cursor-ew-resize rounded-r"
                  style={{ left: `${endPct}%` }}
                >
                  <span className="w-0.5 h-5 bg-white rounded-full" />
                </button>
              </div>

              {/* Exact Numeric Start & End Time Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between gap-2 p-3 bg-[#060608] border border-white/10 rounded-lg">
                  <span className="text-xs font-medium text-zinc-400">Start Time</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateStart(startTime - 0.5)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-zinc-200 cursor-pointer"
                    >
                      -0.5s
                    </button>
                    <input
                      type="text"
                      value={startInput}
                      onChange={(e) => setStartInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseTimeInput(startInput);
                        if (parsed !== null) updateStart(parsed);
                        else setStartInput(formatTimePrecise(startTime));
                      }}
                      className="w-20 text-center py-1 bg-[#111116] border border-white/10 rounded font-mono-tabular text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => updateStart(startTime + 0.5)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-zinc-200 cursor-pointer"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 p-3 bg-[#060608] border border-white/10 rounded-lg">
                  <span className="text-xs font-medium text-zinc-400">End Time</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateEnd(endTime - 0.5)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-zinc-200 cursor-pointer"
                    >
                      -0.5s
                    </button>
                    <input
                      type="text"
                      value={endInput}
                      onChange={(e) => setEndInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseTimeInput(endInput);
                        if (parsed !== null) updateEnd(parsed);
                        else setEndInput(formatTimePrecise(endTime));
                      }}
                      className="w-20 text-center py-1 bg-[#111116] border border-white/10 rounded font-mono-tabular text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => updateEnd(endTime + 0.5)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-zinc-200 cursor-pointer"
                    >
                      +0.5s
                    </button>
                  </div>
                </div>
              </div>

              {/* Split Segments Bar */}
              {segments.length > 1 && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs font-medium text-zinc-400 mb-2">Split Segments</p>
                  <div className="flex flex-wrap gap-2">
                    {segments.map((seg) => (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => selectSegment(seg)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          activeSegmentId === seg.id
                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-white'
                            : 'bg-[#060608] border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {seg.label} · {formatTimePrecise(seg.start)}–{formatTimePrecise(seg.end)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Auto Captions & Export Monetization */}
          <div className="lg:col-span-4 space-y-5">
            {/* Auto Captions Track Panel */}
            <div className="bg-[#0E0E13] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">TikTok Auto Captions</h2>
                  <p className="text-xs text-zinc-400">
                    Bold white subtitles on solid black block
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCaptionsEnabled((v) => !v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    captionsEnabled
                      ? 'bg-[#8B5CF6] text-white'
                      : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {captionsEnabled ? 'On' : 'Off'}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleLiveSpeechCaptions}
                  className={`flex-1 min-h-[42px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                    isListeningSpeech
                      ? 'bg-red-500/20 border-red-500/50 text-red-300'
                      : 'bg-[#060608] border-white/10 text-zinc-200 hover:border-[#8B5CF6]'
                  }`}
                >
                  {isListeningSpeech ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-[#A78BFA]" />
                  )}
                  <span>{isListeningSpeech ? 'Stop Mic' : 'Speech Recognition'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCaptionsEnabled(true);
                    setCaptions((prev) => [
                      ...prev,
                      {
                        id: `cue_${Date.now()}`,
                        start: Number(currentTime.toFixed(2)),
                        end: Number(Math.min(endTime, currentTime + 1.5).toFixed(2)),
                        text: 'New viral caption line',
                      },
                    ]);
                  }}
                  className="min-h-[42px] px-3 py-2 bg-[#060608] border border-white/10 hover:border-[#8B5CF6] rounded-lg text-xs font-semibold text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cue</span>
                </button>
              </div>

              {speechStatus && (
                <p className="text-xs text-[#A78BFA] bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-lg px-3 py-2">
                  {speechStatus}
                </p>
              )}

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {captions.map((cue) => (
                  <div
                    key={cue.id}
                    className="p-2.5 bg-[#060608] border border-white/10 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono-tabular text-zinc-400">
                      <span>
                        {formatTimePrecise(cue.start)} → {formatTimePrecise(cue.end)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCaptions((prev) => prev.filter((item) => item.id !== cue.id))
                        }
                        className="text-zinc-500 hover:text-red-400 cursor-pointer"
                        aria-label="Delete caption cue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cue.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCaptions((prev) =>
                          prev.map((item) =>
                            item.id === cue.id ? { ...item, text: val } : item
                          )
                        );
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#111116] border border-white/10 rounded text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Export & Monetization Panel */}
            <div className="bg-[#0E0E13] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Export MP4 Clip</h2>
                <span className="font-mono-tabular text-xs text-[#A78BFA] font-semibold">
                  {willRemoveWatermark ? '1080p · No Watermark' : '720p · Watermark'}
                </span>
              </div>

              <div className="text-xs text-zinc-400 space-y-1.5 border-y border-white/10 py-3">
                <div className="flex justify-between">
                  <span>Format</span>
                  <span className="text-zinc-200 font-medium">{aspectRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration</span>
                  <span className="font-mono-tabular text-zinc-200 font-medium">
                    {formatTimePrecise(clipDuration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Watermark</span>
                  <span className="text-zinc-200 font-medium">
                    {willRemoveWatermark ? 'Removed' : 'Made with SharpClipper'}
                  </span>
                </div>
              </div>

              {/* Single Clip Credit Toggle if user purchased ₦500 credit */}
              {!isPro && account.singleClipCredits > 0 && (
                <label className="flex items-center justify-between p-3 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-lg text-xs cursor-pointer">
                  <span className="text-white font-medium">
                    Use 1 Watermark-Free Credit ({account.singleClipCredits} left)
                  </span>
                  <input
                    type="checkbox"
                    checked={useSingleCredit}
                    onChange={(e) => setUseSingleCredit(e.target.checked)}
                    className="accent-[#8B5CF6] w-4 h-4"
                  />
                </label>
              )}

              {exportProgress !== null && (
                <div className="p-3.5 bg-[#060608] border border-white/10 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-200 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />
                      {exportStage}
                    </span>
                    <span className="font-mono-tabular text-[#A78BFA] font-semibold">
                      {exportProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#8B5CF6] transition-all duration-150"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {exportBannerMsg && (
                <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
                  {exportBannerMsg}
                </p>
              )}

              <button
                type="button"
                disabled={exportProgress !== null}
                onClick={handleDownloadClick}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3.5 px-5 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Clip</span>
              </button>

              {!isPro && (
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={onPaySingleClip}
                    className="w-full min-h-[44px] py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Pay ₦{SINGLE_CLIP_PRICE_NGN} for 1 Clip Without Watermark
                  </button>
                  <button
                    type="button"
                    onClick={onUpgradePro}
                    className="w-full py-2 text-xs font-semibold text-[#A78BFA] hover:text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Or Upgrade to Pro for Unlimited 1080p</span>
                    <Sparkles className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Free-user pre-download Advertisement modal */}
      <PreDownloadAdGate
        open={showAdGate}
        onCancel={() => setShowAdGate(false)}
        onComplete={() => {
          setShowAdGate(false);
          runActualExport();
        }}
        onUpgradeClick={onUpgradePro}
      />
    </div>
  );
};
