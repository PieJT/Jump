import type { ViewName } from "../types";
import { useAuth } from "../hooks/AuthContext";
import { HomeIcon, SearchIcon, DiscoverIcon, QueueIcon, LibraryIcon, WorkerIcon } from "./Icons";

interface SidebarProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
  workerConnected: boolean;
  onOpenWorkerModal: () => void;
  onOpenAccountModal: () => void;
}

export function Sidebar({
  activeView,
  onNavigate,
  workerConnected,
  onOpenWorkerModal,
  onOpenAccountModal,
}: SidebarProps) {
  const { user } = useAuth();
  const initial = (user?.displayName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark" />
        <span className="logo-text">Aura</span>
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
        <div className={`nav-item${activeView === "audius" ? " active" : ""}`} onClick={() => onNavigate("audius")}>
          <DiscoverIcon />
          Discover
        </div>
        <div className={`nav-item${activeView === "queue" ? " active" : ""}`} onClick={() => onNavigate("queue")}>
          <QueueIcon />
          Queue
        </div>
        <div
          className={`nav-item${activeView === "library" || activeView === "playlist" ? " active" : ""}`}
          onClick={() => onNavigate("library")}
        >
          <LibraryIcon />
          Library
        </div>
      </nav>
      <div className="sidebar-spacer" />
      <div className="key-btn" onClick={onOpenWorkerModal}>
        <div className={`key-dot${workerConnected ? " ok" : ""}`} />
        <WorkerIcon width={16} height={16} />
        <span>{workerConnected ? "Worker connected" : "Set Worker URL"}</span>
      </div>
      <div className="key-btn account-btn" onClick={onOpenAccountModal}>
        <div className="account-btn-avatar">{initial}</div>
        <span>{user?.displayName || user?.email || "Account"}</span>
      </div>
    </aside>
  );
}