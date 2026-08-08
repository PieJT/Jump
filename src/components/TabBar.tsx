import type { ViewName } from "../types";
import { HomeIcon, SearchIcon, DiscoverIcon, QueueIcon, WorkerIcon, AccountIcon } from "./Icons";

interface TabBarProps {
  activeView: ViewName;
  onNavigate: (view: ViewName) => void;
  onOpenWorkerModal: () => void;
  onOpenAccountModal: () => void;
}

export function TabBar({ activeView, onNavigate, onOpenWorkerModal, onOpenAccountModal }: TabBarProps) {
  return (
    <nav className="tab-bar">
      <div className={`tab-item${activeView === "home" ? " active" : ""}`} onClick={() => onNavigate("home")}>
        <HomeIcon />
        <span>Home</span>
      </div>
      <div className={`tab-item${activeView === "search" ? " active" : ""}`} onClick={() => onNavigate("search")}>
        <SearchIcon />
        <span>Search</span>
      </div>
      <div className={`tab-item${activeView === "audius" ? " active" : ""}`} onClick={() => onNavigate("audius")}>
        <DiscoverIcon />
        <span>Discover</span>
      </div>
      <div className={`tab-item${activeView === "queue" ? " active" : ""}`} onClick={() => onNavigate("queue")}>
        <QueueIcon />
        <span>Queue</span>
      </div>
      <div className="tab-item" onClick={onOpenWorkerModal}>
        <WorkerIcon />
        <span>Worker</span>
      </div>
      <div className="tab-item" onClick={onOpenAccountModal}>
        <AccountIcon />
        <span>Account</span>
      </div>
    </nav>
  );
}