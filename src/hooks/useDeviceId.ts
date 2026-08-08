const DEVICE_ID_KEY = "aura:deviceId";
const DEVICE_LABEL_KEY = "aura:deviceLabel";

function detectDefaultLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Android phone" : "Android tablet";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux PC";
  return "This device";
}

/** Stable, persisted per-browser id. Used to target remote-control commands and to identify this device in presence lists. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceLabel(): string {
  return localStorage.getItem(DEVICE_LABEL_KEY) ?? detectDefaultLabel();
}

export function setDeviceLabel(label: string) {
  localStorage.setItem(DEVICE_LABEL_KEY, label.trim() || detectDefaultLabel());
}