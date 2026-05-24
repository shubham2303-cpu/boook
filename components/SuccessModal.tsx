"use client";

interface Props {
  imageUrl: string | null;
  checkpoint: number;
  onContinue: () => void;
}

export default function SuccessModal({ imageUrl, checkpoint, onContinue }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-lg text-center animate-pop">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">You earned a reward!</h2>
          <p className="text-gray-400 text-sm">
            Checkpoint {checkpoint + 1} complete
          </p>
        </div>

        {imageUrl ? (
          <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Reward"
              className="w-full h-auto max-h-[50vh] object-contain bg-black"
            />
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-dashed border-gray-700 bg-[#1a1d27] h-48 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No image set for this checkpoint yet</p>
          </div>
        )}

        <button
          onClick={onContinue}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all active:scale-95"
        >
          Continue Reading →
        </button>
      </div>
    </div>
  );
}
