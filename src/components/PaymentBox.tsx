import React, { useMemo, useState } from 'react';
import { Check, Copy, Landmark, MessageCircle, X } from 'lucide-react';
import {
  BANK_PAYMENT_DETAILS,
  buildWhatsAppReceiptUrl,
  PRO_PRICE_NGN,
  SINGLE_CLIP_PRICE_NGN,
} from '../config/payment';
import { PaymentIntent } from '../types';

interface PaymentDetailsBoxProps {
  intent: PaymentIntent;
  userEmail: string;
  onSelectKind?: (kind: 'pro_subscription' | 'single_clip') => void;
  onReceiptSent: (reference: string) => void;
}

export const PaymentDetailsBox: React.FC<PaymentDetailsBoxProps> = ({
  intent,
  userEmail,
  onSelectKind,
  onReceiptSent,
}) => {
  const [copied, setCopied] = useState(false);

  const reference = useMemo(
    () => `SC-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [intent.kind]
  );

  const formattedAmount = `₦${intent.amountNgn.toLocaleString('en-NG')}`;
  const whatsappUrl = buildWhatsAppReceiptUrl({
    planTitle: intent.title,
    amountNgn: intent.amountNgn,
    userEmail,
    reference,
  });

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(BANK_PAYMENT_DETAILS.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <div className="bg-[#111116] border border-[#8B5CF6]/40 rounded-xl p-6 sm:p-7 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">{intent.title}</h3>
            <p className="text-xs text-zinc-400">Transfer via any Nigerian bank app or OPay</p>
          </div>
        </div>

        {onSelectKind && (
          <div className="flex items-center gap-1 p-1 bg-[#060608] border border-white/10 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onSelectKind('pro_subscription')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                intent.kind === 'pro_subscription'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pro (₦{PRO_PRICE_NGN.toLocaleString('en-NG')})
            </button>
            <button
              type="button"
              onClick={() => onSelectKind('single_clip')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                intent.kind === 'single_clip'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              1 Clip (₦{SINGLE_CLIP_PRICE_NGN})
            </button>
          </div>
        )}
      </div>

      {/* Bank Transfer Details Box */}
      <div className="bg-[#060608] border border-white/10 rounded-lg divide-y divide-white/10">
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-xs sm:text-sm text-zinc-400">Bank Name</span>
          <span className="text-sm sm:text-base font-semibold text-white">
            {BANK_PAYMENT_DETAILS.bankName}
          </span>
        </div>

        <div className="flex items-center justify-between px-4 py-3.5 gap-3">
          <span className="text-xs sm:text-sm text-zinc-400">Account Number</span>
          <div className="flex items-center gap-2.5">
            <span className="font-mono-tabular text-base sm:text-lg font-bold text-[#A78BFA]">
              {BANK_PAYMENT_DETAILS.accountNumber}
            </span>
            <button
              type="button"
              onClick={handleCopyAccount}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs font-medium text-zinc-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-xs sm:text-sm text-zinc-400">Account Name</span>
          <span className="text-sm sm:text-base font-semibold text-white">
            {BANK_PAYMENT_DETAILS.accountName}
          </span>
        </div>

        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-xs sm:text-sm text-zinc-400">Amount</span>
          <span className="font-mono-tabular text-lg font-bold text-white">
            {formattedAmount}
          </span>
        </div>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        After transferring <span className="text-white font-semibold">{formattedAmount}</span> to{' '}
        <span className="text-white font-semibold">
          {BANK_PAYMENT_DETAILS.bankName} · {BANK_PAYMENT_DETAILS.accountNumber}
        </span>
        , click the button below to send your payment receipt on WhatsApp.
      </p>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onReceiptSent(reference)}
        className="w-full min-h-[48px] flex items-center justify-center gap-2.5 py-3.5 px-5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span>I Have Paid - Send Receipt on WhatsApp</span>
      </a>
    </div>
  );
};

interface PaymentModalProps {
  intent: PaymentIntent | null;
  userEmail: string;
  onClose: () => void;
  onSelectKind: (kind: 'pro_subscription' | 'single_clip') => void;
  onReceiptSent: (reference: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  intent,
  userEmail,
  onClose,
  onSelectKind,
  onReceiptSent,
}) => {
  if (!intent) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="w-full max-w-lg relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close payment box"
        >
          <X className="w-5 h-5" />
        </button>

        <div id="payment-modal-title" className="sr-only">
          Bank Transfer Payment
        </div>

        <PaymentDetailsBox
          intent={intent}
          userEmail={userEmail}
          onSelectKind={onSelectKind}
          onReceiptSent={onReceiptSent}
        />
      </div>
    </div>
  );
};
