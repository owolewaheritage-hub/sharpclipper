import React, { useRef, useState } from 'react';
import { Check, Crown, Sparkles, X } from 'lucide-react';
import {
  FREE_MONTHLY_CLIP_LIMIT,
  PRO_PRICE_NGN,
  PRO_PRICE_USD,
  SINGLE_CLIP_PRICE_NGN,
} from '../config/payment';
import { PaymentIntent, UserAccount } from '../types';
import { PaymentDetailsBox } from './PaymentBox';

interface PricingPageProps {
  account: UserAccount;
  onPaymentConfirmed: (intent: PaymentIntent, reference: string) => void;
  onGoEditor: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  account,
  onPaymentConfirmed,
  onGoEditor,
}) => {
  const isPro = account.plan === 'pro';
  const paymentSectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<PaymentIntent | null>(null);

  const openPaymentBox = (kind: 'pro_subscription' | 'single_clip') => {
    const nextIntent: PaymentIntent =
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
            description: `One-time transfer of ₦${SINGLE_CLIP_PRICE_NGN} to unlock 1 clean 1080p export without watermark.`,
          };

    setSelectedIntent(nextIntent);
    setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  return (
    <div className="min-h-screen bg-[#060608] text-zinc-100 py-12 sm:py-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs sm:text-sm font-medium text-[#A78BFA] mb-2">
            Transparent Pricing · Instant Bank Transfer
          </p>
          <h1
            className="font-bold text-white tracking-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', textWrap: 'balance' }}
          >
            Clip Free Every Month or Go Unlimited with Pro
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 mt-3">
            Pay via direct OPay bank transfer and send your receipt on WhatsApp to unlock Pro or a
            single watermark-free clip.
          </p>
        </div>

        {/* Two Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Free Plan */}
          <div className="bg-[#0E0E13] border border-white/10 rounded-xl p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Free Plan</h2>
                <span className="text-xs text-zinc-400">For casual testing</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-mono-tabular text-4xl font-bold text-white">₦0</span>
                <span className="text-sm text-zinc-400">/ month ($0)</span>
              </div>
              <p className="text-sm text-zinc-400 mt-2">
                Great for trying SharpClipper with {FREE_MONTHLY_CLIP_LIMIT} free exports every
                month.
              </p>

              <ul className="mt-6 space-y-3 text-sm border-t border-white/10 pt-6">
                <li className="flex items-center gap-3 text-zinc-200">
                  <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span>{FREE_MONTHLY_CLIP_LIMIT} clips per month</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-200">
                  <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span>720p HD MP4 Quality</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-200">
                  <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span>9:16, 16:9, and 1:1 Reframing</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-400">
                  <X className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>With &quot;Made with SharpClipper&quot; Watermark</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-400">
                  <X className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>Includes bottom &amp; pre-download ads</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={onGoEditor}
              className="mt-8 w-full py-3.5 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              {isPro ? 'Open Video Editor' : 'Continue on Free Plan'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-[#111118] border border-[#8B5CF6]/60 rounded-xl p-7 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[#8B5CF6]" />
                  <span>Pro Plan</span>
                </h2>
                <span className="text-xs font-medium text-[#A78BFA]">
                  {isPro ? 'Current Plan' : 'Most Popular'}
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-mono-tabular text-4xl font-bold text-white">
                  ₦{PRO_PRICE_NGN.toLocaleString('en-NG')}
                </span>
                <span className="text-sm text-zinc-400">/ month (${PRO_PRICE_USD}/month)</span>
              </div>
              <p className="text-sm text-zinc-300 mt-2">
                Built for daily creators, podcasters, and social media agencies.
              </p>

              <ul className="mt-6 space-y-3 text-sm border-t border-white/10 pt-6">
                <li className="flex items-center gap-3 text-white">
                  <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span>Unlimited Clips every month</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span>No Watermark on any export</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span>1080p Full HD Quality</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span>Auto Captions (TikTok-style subtitles)</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span>Priority Export &amp; Zero Advertisements</span>
                </li>
              </ul>
            </div>

            {isPro ? (
              <div className="mt-8 w-full py-3.5 px-5 bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#C4B5FD] font-semibold text-sm rounded-lg text-center">
                Pro Plan Active · Unlimited Exports Unlocked
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openPaymentBox('pro_subscription')}
                className="mt-8 w-full flex items-center justify-center gap-2 py-4 px-5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-sm sm:text-base rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Unlock Pro · Pay ₦{PRO_PRICE_NGN.toLocaleString('en-NG')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Pay Per Clip Option */}
        {!isPro && (
          <div className="mt-8 bg-[#0E0E13] border border-white/10 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-medium text-[#A78BFA] mb-1">No Monthly Commitment</p>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Need just one clean export right now?
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Get 1 watermark-free 1080p clip credit for ₦{SINGLE_CLIP_PRICE_NGN}. Credits stack
                and never expire.
                {account.singleClipCredits > 0 && (
                  <span className="text-[#A78BFA] font-semibold ml-1.5">
                    (You currently have {account.singleClipCredits} credit
                    {account.singleClipCredits === 1 ? '' : 's'})
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPaymentBox('single_clip')}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/50 text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Pay ₦{SINGLE_CLIP_PRICE_NGN} to Unlock 1 Clip
            </button>
          </div>
        )}

        {/* Payment Box Revealed When User Clicks Pay / Unlock */}
        {selectedIntent && (
          <div ref={paymentSectionRef} className="mt-8">
            <PaymentDetailsBox
              intent={selectedIntent}
              userEmail={account.email}
              onSelectKind={(kind) => openPaymentBox(kind)}
              onReceiptSent={(reference) => {
                onPaymentConfirmed(selectedIntent, reference);
                setSelectedIntent(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
