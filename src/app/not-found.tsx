'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas-bg text-surface-100 p-4">
      <h2 className="text-2xl font-bold mb-2">Board Not Found</h2>
      <p className="text-xs text-surface-200/60 mb-4">The canvas you are looking for does not exist.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
