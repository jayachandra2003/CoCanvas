'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-bg text-surface-100 p-4">
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-xl bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90 transition-colors mt-2"
      >
        Try again
      </button>
    </div>
  );
}
