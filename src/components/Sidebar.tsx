import type { ViewName } from "../types";
import { HomeIcon, SearchIcon, QueueIcon, WorkerIcon } from "./Icons";

interface SidebarProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
  workerConnected: boolean;
  onOpenWorkerModal: () => void;
}

export function Sidebar({ activeView, onNavigate, workerConnected, onOpenWorkerModal }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark" />
        Aura
      </div>
      <nav className="nav">
        <div className={`nav-item${activeView === "home" ? " active" : ""}`} onClick={() => onNavigate("home")}>
          <HomeIcon />
          Home
        </div>
        <div className={`nav-item${activeView === "search" ? " active" : ""}`} onClick={() => onNavigate("search")}>
          <SearchIcon />
          Search
        </div>
        <div className={`nav-item${activeView === "queue" ? " active" : ""}`} onClick={() => onNavigate("queue")}>
          <QueueIcon />
          Queue
        </div>
      </nav>
      <div className="sidebar-spacer" />
      <div className="key-btn" onClick={onOpenWorkerModal}>
        <div className={`key-dot${workerConnected ? " ok" : ""}`} />
        <WorkerIcon width={16} height={16} />
        <span>{workerConnected ? "Worker connected" : "Set Worker URL"}</span>
      </div>
    </aside>
  );
}
