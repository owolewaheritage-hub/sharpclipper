import React from 'react';
import { Crown, Sparkles, X, Check } from 'lucide-react';
import { PRO_PRICE_NGN, PRO_PRICE_USD, SINGLE_CLIP_PRICE_NGN } from '../config/payment';

interface UpgradeLimitModalProps {
  open: boolean;
  onClose: () => void;
  onUpgradePro: () => void;
  onPaySingleClip: () => void;
}

export const UpgradeLimitModal: React.FC<UpgradeLimitModalProps> = ({
  open,
  onClose,
  onUpgradePro,
  onPaySingleClip,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="limit-modal-title"
    >
      <div className="w-full max-w-lg bg-[#111116] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"
          aria-label="Close upgrade prompt"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-11 h-11 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] mb-5">
          <Crown className="w-5 h-5" />
        </div>

        <h2 id="limit-modal-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          You have used your 3 free clips. Upgrade to Pro to continue
        </h2>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Your monthly free allowance is finished. Unlock unlimited 1080p exports without watermarks or
          pay once for a single clean clip.
        </p>

        <ul className="mt-5 space-y-2.5 text-sm text-zinc-300 border-y border-white/10 py-4">
          <li className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
            <span>Unlimited monthly clips and priority browser export</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
            <span>Zero watermark and crisp 1080p Full HD quality</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
            <span>Ad-free workspace with TikTok-style Auto Captions</span>
          </li>
        </ul>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onUpgradePro}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              Unlock Pro · Pay ₦{PRO_PRICE_NGN.toLocaleString('en-NG')}/mo (${PRO_PRICE_USD})
            </span>
          </button>

          <button
            type="button"
            onClick={onPaySingleClip}
            className="w-full py-3 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-medium text-sm rounded-lg transition-colors cursor-pointer"
          >
            Pay ₦{SINGLE_CLIP_PRICE_NGN} to Unlock 1 Clip Without Watermark
          </button>
        </div>
      </div>
    </div>
  );
};
