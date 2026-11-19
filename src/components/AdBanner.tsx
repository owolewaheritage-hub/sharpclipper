import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, X } from 'lucide-react';

interface AdBannerProps {
  visible: boolean;
  onUpgradeClick: () => void;
}

export const AdBanner: React.FC<AdBannerProps> = ({ visible, onUpgradeClick }) => {
  if (!visible) return null;

  return (
    <div className="w-full bg-[#0D0D12] border-t border-white/10 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
          <span className="px-2 py-0.5 text-[11px] font-medium text-zinc-400 border border-white/15 rounded">
            Advertisement
          </span>
          <span>
            Creator Studio Gear &amp; Lighting — Reach 10x more viewers with SharpClipper Pro (No Ads).
          </span>
        </div>
        <button
          type="button"
          onClick={onUpgradeClick}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Remove Ads with Pro</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

interface PreDownloadAdGateProps {
  open: boolean;
  onCancel: () => void;
  onComplete: () => void;
  onUpgradeClick: () => void;
}

export const PreDownloadAdGate: React.FC<PreDownloadAdGateProps> = ({
  open,
  onCancel,
  onComplete,
  onUpgradeClick,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    if (!open) {
      setSecondsLeft(3);
      return;
    }
    setSecondsLeft(3);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[#111116] border border-white/10 rounded-xl p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"
          aria-label="Cancel download"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="text-xs font-medium text-zinc-400 mb-3">Advertisement</p>
        <div className="p-5 bg-[#09090D] border border-white/10 rounded-lg space-y-2">
          <h3 className="text-base font-bold text-white">
            Sponsored: Remove Watermarks &amp; Ads Forever
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Free downloads include a brief sponsor message and SharpClipper watermark. Upgrade to Pro
            for instant ad-free 1080p MP4 exports.
          </p>
          <button
            type="button"
            onClick={() => {
              onCancel();
              onUpgradeClick();
            }}
            className="text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] pt-1 cursor-pointer"
          >
            Unlock Pro via Bank Transfer →
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            disabled={secondsLeft > 0}
            onClick={onComplete}
            className="flex-1 py-3 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:bg-zinc-800 disabled:text-zinc-400 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            {secondsLeft > 0
              ? `Preparing Free Download (${secondsLeft}s)...`
              : 'Continue & Download Clip'}
          </button>
        </div>
      </div>
    </div>
  );
};
