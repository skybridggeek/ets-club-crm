import { supabase } from './supabaseClient';

// ─── VAPID PUBLIC KEY ────────────────────────────────────────────────────────
// Replace this with your own VAPID public key (see README for how to generate)
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// ─── Convert VAPID key to Uint8Array ────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ─── Register service worker ─────────────────────────────────────────────────
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

// ─── Check if push is supported ─────────────────────────────────────────────
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// ─── Get current permission state ───────────────────────────────────────────
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ─── Subscribe user to push ──────────────────────────────────────────────────
export async function subscribeUserToPush(userId: number): Promise<boolean> {
  try {
    if (!isPushSupported()) {
      alert('Push notifications are not supported on this browser.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await registerServiceWorker();
    if (!reg) return false;

    // Wait for SW to be active
    await navigator.serviceWorker.ready;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    });

    const subJSON = subscription.toJSON();

    // Save subscription to Supabase
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJSON.endpoint,
      p256dh: subJSON.keys?.p256dh,
      auth: subJSON.keys?.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save subscription:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Subscription error:', err);
    return false;
  }
}

// ─── Unsubscribe user ────────────────────────────────────────────────────────
export async function unsubscribeUserFromPush(userId: number): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return;

  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();

  await supabase.from('push_subscriptions').delete().eq('user_id', userId);
}

// ─── Check if user is subscribed ─────────────────────────────────────────────
export async function isUserSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}
