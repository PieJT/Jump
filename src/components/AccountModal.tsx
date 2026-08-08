import { useAuth } from "../hooks/AuthContext";
import { DeviceHandoffPanel } from "./DeviceHandoffPanel";

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  const { user, signOutUser } = useAuth();

  const initial = (user?.displayName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  const handleSignOut = async () => {
    await signOutUser();
    onClose();
  };

  return (
    <div className={`modal-overlay${open ? " open" : ""}`}>
      <div className="modal account-modal">
        <div className="account-modal-header">
          <div className="account-avatar">{initial}</div>
          <div>
            <h2>{user?.displayName || "Your account"}</h2>
            <p className="account-email">{user?.email}</p>
          </div>
        </div>

        <div className="section-label">Active devices</div>
        <DeviceHandoffPanel />

        <div className="modal-actions" style={{ justifyContent: "space-between" }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-danger" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}