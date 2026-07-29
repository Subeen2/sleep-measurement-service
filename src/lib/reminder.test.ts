import { requestNotificationPermissionAndSync } from './reminder';

describe('requestNotificationPermissionAndSync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing when the Notification API is unavailable', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(requestNotificationPermissionAndSync()).resolves.toBeUndefined();
  });

  it('does nothing when permission is denied', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('denied') });
    await expect(requestNotificationPermissionAndSync()).resolves.toBeUndefined();
  });

  it('registers periodic sync when permission is granted and the environment supports it', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({ periodicSync: { register } }),
      },
    });

    await requestNotificationPermissionAndSync();

    expect(register).toHaveBeenCalledWith('sleep-diary-reminder', { minInterval: 24 * 60 * 60 * 1000 });
  });

  it('silently ignores environments without periodicSync support', async () => {
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({}),
      },
    });

    await expect(requestNotificationPermissionAndSync()).resolves.toBeUndefined();
  });
});
