import { useState } from "react";
import type { ViewName } from "./types";
import { PlayerProvider, usePlayer } from "./hooks/PlayerContext";
import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { HomeView } from "./components/HomeView";
import { SearchView } from "./components/SearchView";
import { QueueView } from "./components/QueueView";
import { MiniPlayer } from "./components/MiniPlayer";
import { NowPlayingFull } from "./components/NowPlayingFull";
import { WorkerUrlModal } from "./components/WorkerUrlModal";
import "./App.css";

function AppShell() {
  const { workerUrl } = usePlayer();
  const [view, setView] = useState<ViewName>("home");
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [workerModalOpen, setWorkerModalOpen] = useState(false);

  return (
    <>
      <div id="ambient">
        <div id="ambient-tint" />
      </div>

      <div className="app">
        <Sidebar
          activeView={view}
          onNavigate={setView}
          workerConnected={!!workerUrl}
          onOpenWorkerModal={() => setWorkerModalOpen(true)}
        />

        <main className="content">
          {view === "home" && <HomeView onNeedWorker={() => setWorkerModalOpen(true)} />}
          {view === "search" && <SearchView onNeedWorker={() => setWorkerModalOpen(true)} />}
          {view === "queue" && <QueueView />}
        </main>

        <MiniPlayer onOpenFullPlayer={() => setFullPlayerOpen(true)} />

        <TabBar activeView={view} onNavigate={setView} onOpenWorkerModal={() => setWorkerModalOpen(true)} />
      </div>

      <NowPlayingFull open={fullPlayerOpen} onClose={() => setFullPlayerOpen(false)} />
      <WorkerUrlModal open={workerModalOpen} onClose={() => setWorkerModalOpen(false)} />

      {/* Hidden target the YouTube IFrame API mounts into */}
      <div id="yt-target" />
    </>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <AppShell />
    </PlayerProvider>
  );
}