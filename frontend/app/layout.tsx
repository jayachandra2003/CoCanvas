import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CollabDraw — Real-Time Collaborative Canvas',
  description:
    'Draw together in real time. A high-performance collaborative canvas for teams to sketch, brainstorm, and build ideas seamlessly.',
  keywords: [
    'collaborative drawing',
    'real-time whiteboard',
    'canvas',
    'socket.io',
    'next.js',
    'vector graphics',
    'multiplayer sketch',
  ],
  authors: [{ name: 'CollabDraw Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full w-full">
      <body className="h-full w-full antialiased bg-slate-50 text-slate-900 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
