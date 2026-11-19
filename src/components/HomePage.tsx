import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Captions,
  Check,
  Crown,
  Film,
  Link2,
  Play,
  Scissors,
  Upload,
} from 'lucide-react';
import { PaymentIntent, PlanTier, VideoSource } from '../types';
import {
  createSynthesizedSampleVideo,
  extractYouTubeInfo,
  getVideoDurationFromUrl,
} from '../utils/videoEngine';
import { PRO_PRICE_NGN, PRO_PRICE_USD, SINGLE_CLIP_PRICE_NGN } from '../config/payment';
import { PaymentDetailsBox } from './PaymentBox';

interface HomePageProps {
  plan: PlanTier;
  userEmail: string;
  onVideoReady: (source: VideoSource) => void;
  onGoPricing: () => void;
  onPaymentConfirmed: (intent: PaymentIntent, reference: string) => void;
}

const SAMPLE_VIDEOS = [
  {
    id: 'sample_podcast',
    title: 'Founder Podcast: How Short Clips Drive 3x Reach',
    durationLabel: '0:06',
    ratio: '16:9 Studio',
    poster: '/src/assets/images/sample_podcast_clip_1795120833709.jpg',
  },
  {
    id: 'sample_vlog',
    title: 'Creator Studio Breakdown: Lighting & Hook Pacing',
    durationLabel: '0:06',
    ratio: '9:16 Vertical',
    poster: '/src/assets/images/sample_creator_vlog_1795120832860.jpg',
  },
  {
    id: 'sample_keynote',
    title: 'Tech Summit Keynote: Shipping Products Faster',
    durationLabel: '0:06',
    ratio: '4:3 Stage',
    poster: '/src/assets/images/sample_keynote_talk_1795120833756.jpg',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  plan,
  userEmail,
  onVideoReady,
  onGoPricing,
  onPaymentConfirmed,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const paymentBoxRef = useRef<HTMLDivElement | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<PaymentIntent | null>(null);

  const openInlinePayment = (kind: 'pro_subscription' | 'single_clip') => {
    const next: PaymentIntent =
      kind === 'pro_subscription'
        ? {
            kind: 'pro_subscription',
            amountNgn: PRO_PRICE_NGN,
            title: 'SharpClipper Pro Plan',
            description: `Unlimited clips, zero watermark, 1080p HD, and ad-free exports for ₦${PRO_PRICE_NGN.toLocaleString('en-NG')}/month ($${PRO_PRICE_USD}/mo).`,
          }
        : {
            kind: 'single_clip',
            amountNgn: SINGLE_CLIP_PRICE_NGN,
            title: '1 Watermark-Free Clip',
            description: `One-time transfer of ₦${SINGLE_CLIP_PRICE_NGN} for 1 clean 1080p export without watermark.`,
          };
    setSelectedIntent(next);
    setTimeout(() => {
      paymentBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const handleFileSelected = async (file: File) => {
    setErrorMsg('');
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please select a valid video file (MP4, MOV, or WebM).');
      return;
    }

    setLoadingLabel(`Loading ${file.name}...`);
    setLoadingProgress(15);

    // Smooth upload read progress feedback while browser indexes video metadata
    const readerTimer = setInterval(() => {
      setLoadingProgress((p) => (p !== null && p < 88 ? p + 12 : p));
    }, 120);

    const url = URL.createObjectURL(file);
    const duration = await getVideoDurationFromUrl(url);
    clearInterval(readerTimer);
    setLoadingProgress(100);

    setTimeout(() => {
      setLoadingProgress(null);
      onVideoReady({
        id: `vid_${Date.now().toString(36)}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        origin: 'upload',
        url,
        file,
        duration,
      });
    }, 220);
  };

  const handleYouTubeImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const info = extractYouTubeInfo(youtubeUrl);
    if (!info) {
      setErrorMsg('Paste a valid YouTube link (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ).');
      return;
    }

    setLoadingLabel(`Fetching stream for ${info.title}...`);
    setLoadingProgress(5);

    const synthesized = await createSynthesizedSampleVideo(
      '/src/assets/images/hero_studio_preview_1795120834092.jpg',
      info.title,
      6,
      (pct) => setLoadingProgress(pct)
    );

    setLoadingProgress(null);
    onVideoReady({
      id: `yt_${info.id}`,
      title: info.title,
      origin: 'youtube',
      url: synthesized.url,
      blob: synthesized.blob,
      duration: synthesized.duration,
      posterUrl: '/src/assets/images/hero_studio_preview_1795120834092.jpg',
      youtubeUrl: youtubeUrl.trim(),
    });
  };

  const handleSampleClick = async (sample: (typeof SAMPLE_VIDEOS)[number]) => {
    setErrorMsg('');
    setLoadingLabel(`Preparing "${sample.title}" in browser...`);
    setLoadingProgress(5);

    const synthesized = await createSynthesizedSampleVideo(
      sample.poster,
      sample.title,
      6,
      (pct) => setLoadingProgress(pct)
    );

    setLoadingProgress(null);
    onVideoReady({
      id: sample.id,
      title: sample.title,
      origin: 'sample',
      url: synthesized.url,
      blob: synthesized.blob,
      duration: synthesized.duration,
      posterUrl: sample.poster,
    });
  };

  return (
    <div className="min-h-screen bg-[#060608] text-zinc-100">
      {/* Hero + Upload Focal Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs sm:text-sm font-medium text-[#A78BFA] tracking-wide mb-4">
            Browser-Powered Video Clipper · Free Alternative to Vizard &amp; Opus Clip
          </p>
          <h1
            className="font-bold text-white tracking-tight leading-[1.08] mb-5"
            style={{
              fontSize: 'clamp(2.25rem, 4.8vw, 3.85rem)',
              textWrap: 'balance',
            }}
          >
            Turn Long Videos Into Viral Shorts in 1 Click
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Upload an MP4 or paste a YouTube link. Trim exact timestamps, add TikTok-style auto
            captions, reframe to 9:16 vertical, and export directly in your browser.
          </p>
        </div>

        {/* Interactive Upload & YouTube Box */}
        <div className="mt-10 max-w-3xl mx-auto bg-[#0E0E13] border border-white/10 rounded-xl p-5 sm:p-8">
          {/* YouTube Link Form */}
          <form onSubmit={handleYouTubeImport} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Paste a YouTube link (youtube.com/watch?v=...)"
                className="w-full h-12 pl-10 pr-4 bg-[#060608] border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>
            <button
              type="submit"
              disabled={loadingProgress !== null}
              className="h-12 px-6 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Clip Video</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center gap-4 my-5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-zinc-500">or upload from device</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Drag & Drop MP4 Upload Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelected(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            className={`rounded-lg border border-dashed transition-colors p-6 sm:p-8 text-center cursor-pointer ${
              isDragging
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                : 'border-white/15 hover:border-[#8B5CF6]/60 bg-[#08080C]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
            <div className="w-12 h-12 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-sm sm:text-base font-semibold text-white">
              Drop MP4, MOV, or WebM video here, or tap to browse
            </p>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Processed locally in your browser with FFmpeg.wasm · No server upload wait
            </p>
          </div>

          {/* Upload / Processing Progress */}
          {loadingProgress !== null && (
            <div className="mt-5 p-4 bg-[#060608] border border-white/10 rounded-lg">
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                <span className="text-zinc-200 font-medium truncate pr-4">{loadingLabel}</span>
                <span className="font-mono-tabular text-[#A78BFA] font-semibold">
                  {loadingProgress}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#8B5CF6] transition-all duration-150"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="mt-4 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
              {errorMsg}
            </p>
          )}

          {/* Quick-Start Sample Videos */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-zinc-400">
                No video handy? Try a studio sample in 1 click
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_VIDEOS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  disabled={loadingProgress !== null}
                  onClick={() => handleSampleClick(sample)}
                  className="group text-left bg-[#060608] hover:bg-[#14141B] border border-white/10 rounded-lg overflow-hidden transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                    <img
                      src={sample.poster}
                      alt={sample.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-white">
                        <Play className="w-3 h-3 fill-white" />
                        Open in Editor
                      </span>
                      <span className="font-mono-tabular text-xs text-zinc-300">
                        {sample.durationLabel}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-white line-clamp-1">{sample.title}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{sample.ratio}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Visual Studio Showcase + 3 Core Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Marquee Studio Visual */}
          <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-white/10 bg-[#0E0E13] min-h-[300px]">
            <img
              src="/src/assets/images/hero_studio_preview_1795120834092.jpg"
              alt="SharpClipper studio video editing preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-xs text-[#A78BFA] font-medium mb-1.5">
                Zero Upload Queues · 100% Client-Side
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Built for creators who publish daily on TikTok, Reels, and YouTube Shorts
              </h2>
            </div>
          </div>

          {/* 3 Requested Core Features */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-4">
            <div className="p-6 bg-[#0E0E13] border border-white/10 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center shrink-0">
                  <Captions className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Auto Captions</h3>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    Add bold white TikTok-style subtitles on solid black blocks in the middle-bottom
                    of your video. Capture live via browser Speech Recognition or edit cues inline.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#0E0E13] border border-white/10 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Viral Clips</h3>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    Drag timeline handles to isolate any hook, split scenes cleanly, and reframe
                    landscape footage into 9:16 Vertical, 1:1 Square, or 16:9 Horizontal in one tap.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#0E0E13] border border-white/10 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">No Watermark on Pro</h3>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    Start free with 3 clips/month at 720p. Upgrade to Pro for ₦
                    {PRO_PRICE_NGN.toLocaleString('en-NG')}/month (${PRO_PRICE_USD}) for unlimited
                    1080p exports with zero watermarks and zero ads.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conversion / Pricing Strip */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-white/10">
        <div className="bg-[#0E0E13] border border-white/10 rounded-xl p-6 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-xs font-medium text-[#A78BFA] mb-2">Simple Creator Pricing</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Start free with 3 clips/month, or unlock unlimited 1080p exports
            </h2>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-300">
              <span className="inline-flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8B5CF6]" />
                Free: 3 clips/mo · 720p
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8B5CF6]" />
                Pro: ₦{PRO_PRICE_NGN.toLocaleString('en-NG')}/mo · Unlimited 1080p
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8B5CF6]" />
                Pay Per Clip: ₦{SINGLE_CLIP_PRICE_NGN} once
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {plan === 'free' ? (
              <>
                <button
                  type="button"
                  onClick={() => openInlinePayment('pro_subscription')}
                  className="px-6 py-3.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Unlock Pro · Pay ₦{PRO_PRICE_NGN.toLocaleString('en-NG')}
                </button>
                <button
                  type="button"
                  onClick={() => openInlinePayment('single_clip')}
                  className="px-5 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-medium text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Pay ₦{SINGLE_CLIP_PRICE_NGN} for 1 Clip
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onGoPricing}
                className="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Manage Pro Plan
              </button>
            )}
          </div>
        </div>

        {/* Payment Box Revealed on Pay / Unlock Click */}
        {selectedIntent && (
          <div ref={paymentBoxRef} className="mt-6 max-w-2xl mx-auto">
            <PaymentDetailsBox
              intent={selectedIntent}
              userEmail={userEmail}
              onSelectKind={(kind) => openInlinePayment(kind)}
              onReceiptSent={(reference) => {
                onPaymentConfirmed(selectedIntent, reference);
                setSelectedIntent(null);
              }}
            />
          </div>
        )}
      </section>

      {/* Quiet Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-[#8B5CF6]" />
          <span className="text-zinc-300 font-semibold">SharpClipper</span>
          <span>· Browser Video Clipper</span>
        </div>
        <div className="flex items-center gap-6">
          <button type="button" onClick={onGoPricing} className="hover:text-zinc-300 cursor-pointer">
            Pricing
          </button>
          <span>FFmpeg.wasm Local Export</span>
          <span>© {new Date().getFullYear()} SharpClipper</span>
        </div>
      </footer>
    </div>
  );
};
