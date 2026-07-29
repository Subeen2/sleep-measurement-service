export async function requestNotificationPermissionAndSync(): Promise<void> {
  if (typeof Notification === 'undefined') return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;

  if (!('periodicSync' in registration)) return; // best-effort — most browsers don't support this
  try {
    await (registration as any).periodicSync.register('sleep-diary-reminder', {
      minInterval: 24 * 60 * 60 * 1000,
    });
  } catch {
    // unsupported/denied — best-effort, so fail silently
  }
}
