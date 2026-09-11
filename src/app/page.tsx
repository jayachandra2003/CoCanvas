export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-canvas-bg text-surface-100">
      <div className="text-center space-y-4 max-w-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-muted bg-surface-900 text-xs font-mono text-accent-blue">
          <span>Phase 1 Scaffolding</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">CollabCanvas</h1>
        <p className="text-sm text-surface-200/60">
          Decentralized Real-Time Collaborative Canvas with Next.js 15, Direct HTML5 Canvas 2D, and Yjs CRDTs.
        </p>
      </div>
    </main>
  );
}
