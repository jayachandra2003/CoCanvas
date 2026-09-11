'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Share2,
  Download,
  Trash2,
  ArrowLeft,
  Sparkles,
  Wifi,
  WifiOff,
  Radio,
  FileImage,
  Code,
  FileDown,
} from 'lucide-react';
import { UserPresence, ConnectionStatus } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { Modal } from '../ui/Modal';

interface RoomHeaderProps {
  roomId: string;
  roomName?: string;
  connectionStatus: ConnectionStatus;
  users: UserPresence[];
  currentUser: UserPresence | null;
  onOpenShare: () => void;
  onClearCanvas: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportJSON: () => void;
}

export function RoomHeader({
  roomId,
  roomName,
  connectionStatus,
  users,
  currentUser,
  onOpenShare,
  onClearCanvas,
  onExportPNG,
  onExportSVG,
  onExportJSON,
}: RoomHeaderProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Connected</span>
          </div>
        );
      case 'reconnecting':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
            <Radio className="w-3 h-3 text-amber-600 animate-spin" />
            <span className="hidden sm:inline">Reconnecting</span>
          </div>
        );
      case 'disconnected':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <WifiOff className="w-3 h-3 text-rose-600" />
            <span className="hidden sm:inline">Disconnected</span>
          </div>
        );
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 pointer-events-none">
      {/* Left section: Logo & Room info */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <Link
          href="/"
          className="flex items-center gap-2 p-2 rounded-xl bg-white/90 shadow-dock border border-slate-200/80 backdrop-blur-md hover:bg-white text-slate-800 transition-all group"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 hidden md:inline">
            CollabDraw
          </span>
        </Link>

        {/* Room Code Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 shadow-dock border border-slate-200/80 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Room
            </span>
            <span className="text-xs font-mono font-bold text-slate-800">
              {roomId}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200 ml-1 mr-0.5" />
          {getStatusBadge()}
        </div>
      </div>

      {/* Right section: Online Users & Actions */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {/* Collaborators list */}
        <div className="flex items-center bg-white/90 shadow-dock border border-slate-200/80 backdrop-blur-md rounded-xl p-1 px-2.5">
          <div className="flex items-center -space-x-2 overflow-hidden mr-2">
            {users.slice(0, 5).map((u) => {
              const isSelf = u.userId === currentUser?.userId;
              const initials = u.userName.slice(0, 2).toUpperCase();
              return (
                <Tooltip key={u.socketId || u.userId} content={`${u.userName} ${isSelf ? '(You)' : ''}`}>
                  <div
                    className="relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-white shadow-sm ring-1 ring-slate-100 uppercase"
                    style={{ backgroundColor: u.userColor }}
                  >
                    {initials}
                  </div>
                </Tooltip>
              );
            })}
            {users.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-slate-600">
                +{users.length - 5}
              </div>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">
            {users.length} {users.length === 1 ? 'collaborator' : 'collaborators'}
          </span>
        </div>

        {/* Share Button */}
        <button
          onClick={onOpenShare}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-dock transition-all active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            className="flex items-center justify-center p-2 rounded-xl bg-white/90 shadow-dock border border-slate-200/80 backdrop-blur-md text-slate-700 hover:bg-white hover:text-slate-900 transition-all active:scale-95"
            title="Export Canvas"
          >
            <Download className="w-4 h-4" />
          </button>

          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white p-1.5 shadow-2xl border border-slate-200 animate-scale-in z-50">
              <button
                onClick={() => {
                  onExportPNG();
                  setIsExportMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FileImage className="w-3.5 h-3.5 text-indigo-500" />
                Export as PNG
              </button>
              <button
                onClick={() => {
                  onExportSVG();
                  setIsExportMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Code className="w-3.5 h-3.5 text-indigo-500" />
                Export as SVG
              </button>
              <button
                onClick={() => {
                  onExportJSON();
                  setIsExportMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                Export as JSON
              </button>
            </div>
          )}
        </div>

        {/* Clear Canvas */}
        <Tooltip content="Clear Canvas">
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center justify-center p-2 rounded-xl bg-white/90 shadow-dock border border-slate-200/80 backdrop-blur-md text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear entire canvas?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will clear all drawing objects for all current and future collaborators in this room.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsClearModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClearCanvas();
                setIsClearModalOpen(false);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
            >
              Yes, clear canvas
            </button>
          </div>
        </div>
      </Modal>
    </header>
  );
}
