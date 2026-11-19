import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { PRO_PRICE_NGN, PRO_PRICE_USD, SINGLE_CLIP_PRICE_NGN } from './config/payment';
import { AppPage, PaymentIntent, SavedClip, UserAccount, VideoSource } from './types';
import {
  addSavedClip,
  deleteSavedClip,
  getActiveAccount,
  getRemainingFreeClips,
  loadClipsForAccount,
  signOutAccount,
  updateAccount,
} from './utils/storage';
import { HomePage } from './components/HomePage';
import { VideoEditorPage } from './components/VideoEditorPage';
import { DashboardPage } from './components/DashboardPage';
import { PricingPage } from './components/PricingPage';
import { AuthPage } from './components/AuthPage';
import { PaymentModal } from './components/PaymentBox';
import { UpgradeLimitModal } from './components/UpgradeLimitModal';
import { AdBanner } from './components/AdBanner';

function buildIntent(kind: 'pro_subscription' | 'single_clip'): PaymentIntent {
  if (kind === 'pro_subscription') {
    return {
      kind: 'pro_subscription',
      amountNgn: PRO_PRICE_NGN,
      title: 'SharpClipper Pro Plan',
      description: `Unlimited clips, zero watermark, 1080p HD, and ad-free exports for ₦${PRO_PRICE_NGN.toLocaleString('en-NG')}/month ($${PRO_PRICE_USD}/mo).`,
    };
  }
  return {
    kind: 'single_clip',
    amountNgn: SINGLE_CLIP_PRICE_NGN,
    title: '1 Watermark-Free Clip',
    description: `One-time transfer of ₦${SINGLE_CLIP_PRICE_NGN} for 1 clean 1080p export without the SharpClipper watermark.`,
  };
}

export default function App() {
  const initialSession = getActiveAccount();
  const [account, setAccount] = useState<UserAccount>(initialSession.account);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialSession.isAuthenticated);
  const [clips, setClips] = useState<SavedClip[]>(() =>
    loadClipsForAccount(initialSession.account.id)
  );

  const [page, setPage] = useState<AppPage>('home');
  const [activeVideo, setActiveVideo] = useState<VideoSource | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? '' : prev));
    }, 5000);
  };

  const remainingFree = getRemainingFreeClips(account);

  const openProCheckout = () => {
    setLimitModalOpen(false);
    setPaymentIntent(buildIntent('pro_subscription'));
  };

  const openSingleClipCheckout = () => {
    setLimitModalOpen(false);
    setPaymentIntent(buildIntent('single_clip'));
  };

  const handlePaymentConfirmed = (intent: PaymentIntent, reference: string) => {
    if (intent.kind === 'pro_subscription') {
      const upgraded: UserAccount = {
        ...account,
        plan: 'pro',
        proActivatedAt: new Date().toISOString(),
      };
      const saved = updateAccount(upgraded, isAuthenticated);
      setAccount(saved);
      showToast(
        `Receipt sent via WhatsApp (${reference})! Pro Plan unlocked — watermarks & limits removed.`
      );
    } else {
      const credited: UserAccount = {
        ...account,
        singleClipCredits: (account.singleClipCredits || 0) + 1,
      };
      const saved = updateAccount(credited, isAuthenticated);
      setAccount(saved);
      showToast(
        `Receipt sent via WhatsApp (${reference})! Added 1 watermark-free 1080p clip credit.`
      );
    }

    setPaymentIntent(null);
  };

  const handleClipExported = (exported: {
    id: string;
    title: string;
    createdAt: string;
    duration: number;
    startTime: number;
    endTime: number;
    aspectRatio: '9:16' | '16:9' | '1:1';
    quality: '720p' | '1080p';
    hasWatermark: boolean;
    captionsEnabled: boolean;
    captionsCount: number;
    thumbnailDataUrl: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    usedSingleCredit: boolean;
  }) => {
    const { usedSingleCredit, ...clipRecord } = exported;
    const nextClips = addSavedClip(account.id, clipRecord);
    setClips(nextClips);

    if (account.plan === 'free') {
      const nextAccount: UserAccount = {
        ...account,
        freeClipsUsed: usedSingleCredit ? account.freeClipsUsed : account.freeClipsUsed + 1,
        singleClipCredits: usedSingleCredit
          ? Math.max(0, account.singleClipCredits - 1)
          : account.singleClipCredits,
      };
      const saved = updateAccount(nextAccount, isAuthenticated);
      setAccount(saved);
    }
  };

  const handleDeleteClip = (clipId: string) => {
    const next = deleteSavedClip(account.id, clipId);
    setClips(next);
  };

  const handleAuthSuccess = (signedInAccount: UserAccount) => {
    setAccount(signedInAccount);
    setIsAuthenticated(true);
    setClips(loadClipsForAccount(signedInAccount.id));
    setPage(activeVideo ? 'editor' : 'home');
    showToast(`Signed in as ${signedInAccount.email}`);
  };

  const handleSignOut = () => {
    const guest = signOutAccount();
    setAccount(guest);
    setIsAuthenticated(false);
    setClips(loadClipsForAccount(guest.id));
    setPage('home');
    showToast('Signed out.');
  };

  const navigate = (target: AppPage) => {
    setPage(target);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060608] text-zinc-100">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-14 bg-[#060608]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigate('home')}
            className="font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sharp<span className="text-[#8B5CF6]">Clipper</span>
          </button>

          {/* Zone 2: 4 Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-400">
            {(
              [
                { id: 'home', label: 'Studio' },
                { id: 'editor', label: 'Editor' },
                { id: 'dashboard', label: 'My Clips' },
                { id: 'pricing', label: 'Pricing' },
              ] as { id: AppPage; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  page === item.id
                    ? 'text-white border-[#8B5CF6]'
                    : 'border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('auth')}
                className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 text-zinc-300 hover:text-white rounded-lg hover:bg-white/5"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0E0E13] border-b border-white/10 px-4 py-3 space-y-1">
          {(
            [
              { id: 'home', label: 'Studio' },
              { id: 'editor', label: 'Editor' },
              { id: 'dashboard', label: 'My Clips' },
              { id: 'pricing', label: 'Pricing' },
            ] as { id: AppPage; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                page === item.id ? 'bg-[#8B5CF6]/20 text-white' : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Free Limit / Plan Status Strip at Top */}
      <div className="bg-[#0B0B10] border-b border-white/10 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          {account.plan === 'pro' ? (
            <p className="text-zinc-200 font-medium">
              Pro Plan active · Unlimited 1080p clips · No watermark · Ad-free
            </p>
          ) : (
            <p className="text-zinc-300 font-medium">
              You have{' '}
              <span className="font-mono-tabular font-bold text-[#A78BFA]">{remainingFree}</span>{' '}
              free {remainingFree === 1 ? 'clip' : 'clips'} left
              {account.singleClipCredits > 0 && (
                <span className="text-zinc-400">
                  {' '}
                  · {account.singleClipCredits} watermark-free{' '}
                  {account.singleClipCredits === 1 ? 'credit' : 'credits'}
                </span>
              )}
            </p>
          )}

          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <span className="text-zinc-400 hidden sm:inline truncate max-w-[200px]">
                {account.email}
              </span>
            )}
            {account.plan === 'free' && (
              <button
                type="button"
                onClick={openProCheckout}
                className="font-semibold text-[#A78BFA] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                Unlock Pro →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#14141C] border border-[#8B5CF6]/50 text-white text-xs sm:text-sm px-4 py-3 rounded-lg shadow-2xl">
          {toastMessage}
        </div>
      )}

      {/* Main View Switcher */}
      <main className="flex-1">
        {page === 'home' && (
          <HomePage
            plan={account.plan}
            userEmail={account.email}
            onVideoReady={(source) => {
              setActiveVideo(source);
              navigate('editor');
            }}
            onGoPricing={() => navigate('pricing')}
            onPaymentConfirmed={handlePaymentConfirmed}
          />
        )}

        {page === 'editor' && (
          <VideoEditorPage
            source={activeVideo}
            account={account}
            onSourceLoaded={(source) => setActiveVideo(source)}
            onClipExported={handleClipExported}
            onLimitReached={() => setLimitModalOpen(true)}
            onUpgradePro={openProCheckout}
            onPaySingleClip={openSingleClipCheckout}
          />
        )}

        {page === 'dashboard' && (
          <DashboardPage
            clips={clips}
            onDeleteClip={handleDeleteClip}
            onCreateNew={() => navigate('home')}
          />
        )}

        {page === 'pricing' && (
          <PricingPage
            account={account}
            onPaymentConfirmed={handlePaymentConfirmed}
            onGoEditor={() => navigate('editor')}
          />
        )}

        {page === 'auth' && (
          <AuthPage
            onSuccess={handleAuthSuccess}
            onCancel={() => navigate('home')}
          />
        )}
      </main>

      {/* Bottom Advertisement Banner — strictly visible ONLY to Free users */}
      <AdBanner visible={account.plan === 'free'} onUpgradeClick={openProCheckout} />

      {/* 3 Free Clips Limit Popup */}
      <UpgradeLimitModal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        onUpgradePro={openProCheckout}
        onPaySingleClip={openSingleClipCheckout}
      />

      {/* OPay Bank Transfer & WhatsApp Receipt Modal */}
      <PaymentModal
        intent={paymentIntent}
        userEmail={account.email}
        onClose={() => setPaymentIntent(null)}
        onSelectKind={(kind) => setPaymentIntent(buildIntent(kind))}
        onReceiptSent={(reference) => {
          if (paymentIntent) {
            handlePaymentConfirmed(paymentIntent, reference);
          }
        }}
      />
    </div>
  );
}
