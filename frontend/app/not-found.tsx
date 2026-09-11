import Link from 'next/link';
import { Home, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-sm border border-indigo-100">
        <Sparkles className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Room Not Found</h2>
      <p className="text-sm text-slate-600 max-w-md mb-6">
        The drawing canvas room you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
      >
        <Home className="w-4 h-4" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
