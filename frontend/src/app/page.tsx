"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import type { BoardUpdate } from "@/lib/api";

export default function Home() {
  const [isAiOpen, setIsAiOpen] = useState(false);

  const handleBoardUpdate = (update: BoardUpdate) => {
    // The KanbanBoard will auto-refresh when AI updates are applied
    // This is handled by the backend route, but we can trigger a manual refresh if needed
    console.log("Board update received:", update);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />
      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <Header onAiToggle={() => setIsAiOpen(!isAiOpen)} isAiOpen={isAiOpen} />
        <div className="flex gap-6">
          <KanbanBoard />
          {isAiOpen && (
            <AIChatSidebar onBoardUpdate={handleBoardUpdate} onClose={() => setIsAiOpen(false)} />
          )}
        </div>
      </main>
    </div>
  );
}
