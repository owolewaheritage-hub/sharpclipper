import React, { useState } from 'react';
import {
  Download,
  Film,
  Plus,
  Trash2,
  Play,
  X,
} from 'lucide-react';
import { SavedClip } from '../types';
import { formatTimePrecise, triggerBlobDownload } from '../utils/videoEngine';
import { getCachedClipBlob } from '../utils/storage';

interface DashboardPageProps {
  clips: SavedClip[];
  onDeleteClip: (clipId: string) => void;
  onCreateNew: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  clips,
  onDeleteClip,
  onCreateNew,
}) => {
  const [previewClip, setPreviewClip] = useState<{ clip: SavedClip; url: string } | null>(null);
  const [notice, setNotice] = useState('');

  const handleDownloadSaved = (clip: SavedClip) => {
    const blob = getCachedClipBlob(clip.id);
    if (blob) {
      triggerBlobDownload(blob, clip.fileName);
      setNotice(`Downloading ${clip.fileName}...`);
      setTimeout(() => setNotice(''), 3000);
    } else {
      setNotice(
        'This clip metadata was saved from a previous browser session. Load a video in the Editor to generate a fresh MP4 file.'
      );
      setTimeout(() => setNotice(''), 5000);
    }
  };

  const handlePreviewSaved = (clip: SavedClip) => {
    const blob = getCachedClipBlob(clip.id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewClip({ clip, url });
    } else {
      setNotice(
        'Video binary is cached for the active session only; thumbnail and clip specs remain saved.'
      );
      setTimeout(() => setNotice(''), 4000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-110px)] bg-[#060608] text-zinc-100 py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">My Clips</h1>
            <p className="text-sm text-zinc-400 mt-1">
              All clips you created and exported in SharpClipper ({clips.length} total)
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="min-h-[44px] px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Clip</span>
          </button>
        </div>

        {notice && (
          <div className="mt-5 p-3.5 bg-[#111118] border border-[#8B5CF6]/40 rounded-lg text-xs sm:text-sm text-zinc-200">
            {notice}
          </div>
        )}

        {clips.length === 0 ? (
          <div className="mt-12 bg-[#0E0E13] border border-white/10 rounded-xl p-10 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center mx-auto mb-4">
              <Film className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">No clips exported yet</h2>
            <p className="text-sm text-zinc-400 mt-2">
              Upload an MP4 or paste a YouTube link to trim your first short, add auto captions, and
              save it here.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-6 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              Create Your First Clip
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="bg-[#0E0E13] border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-black overflow-hidden">
                    {clip.thumbnailDataUrl ? (
                      <img
                        src={clip.thumbnailDataUrl}
                        alt={clip.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain bg-[#09090D]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#09090D] text-zinc-600">
                        <Film className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs">
                      <span className="font-mono-tabular font-semibold text-white">
                        {formatTimePrecise(clip.duration)}
                      </span>
                      <span className="text-zinc-300">
                        {clip.aspectRatio} · {clip.quality}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-bold text-white line-clamp-1">{clip.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      {new Date(clip.createdAt).toLocaleDateString()} ·{' '}
                      {clip.hasWatermark ? 'Watermark' : 'No Watermark'}
                      {clip.captionsEnabled ? ' · Captions' : ''}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadSaved(clip)}
                    className="flex-1 min-h-[42px] px-3 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreviewSaved(clip)}
                    className="min-h-[42px] px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                    aria-label="Preview clip"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClip(clip.id)}
                    className="min-h-[42px] px-3 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 text-zinc-400 hover:text-red-400 text-xs rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                    aria-label="Delete clip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewClip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#111116] border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <h3 className="text-sm font-bold text-white truncate pr-4">
                {previewClip.clip.title}
              </h3>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewClip.url);
                  setPreviewClip(null);
                }}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-black flex justify-center">
              <video
                src={previewClip.url}
                controls
                autoPlay
                className="max-h-[65vh] rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
