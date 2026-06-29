"use client";

import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import type { BoardUpdate } from "@/lib/api";

const ANIMATION_DURATION = 300;

export default function Home() {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const closingTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleBoardUpdate = (update: BoardUpdate) => {
    setRefreshKey((k) => k + 1);
  };

  const openAi = () => {
    setIsClosing(false);
    setIsAiOpen(true);
  };

  const closeAi = () => {
    setIsAiOpen(false);
    setIsClosing(true);
    closingTimer.current = setTimeout(() => setIsClosing(false), ANIMATION_DURATION);
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />
      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col overflow-auto gap-10 px-6 pb-16 pt-12">
        <Header onAiToggle={openAi} isAiOpen={isAiOpen} />
        <KanbanBoard key={refreshKey} />
        {isClosing && (
          <div className="fixed inset-0 z-40 bg-black/20" />
        )}
        {(isAiOpen || isClosing) && (
          <>
            {!isClosing && (
              <div
                className="fixed inset-0 z-40 bg-black/20 transition-opacity"
                onClick={closeAi}
              />
            )}
            <AIChatSidebar
              isOpen={isAiOpen}
              onBoardUpdate={handleBoardUpdate}
              onClose={closeAi}
            />
          </>
        )}
      </main>
    </div>
  );
}
