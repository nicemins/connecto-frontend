import { useEffect, useRef } from "react";
import { updatePushToken } from "../api/notifications";

let Notifications: typeof import("expo-notifications") | null = null;
let Device: typeof import("expo-device") | null = null;

async function loadNotificationModules() {
  if (!Notifications) {
    try {
      Notifications = await import("expo-notifications");
      Device = await import("expo-device");
    } catch { return false; }
  }
  return true;
}

export function useNotifications() {
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      await new Promise((r) => setTimeout(r, 200));
      if (!isMounted) return;
      const loaded = await loadNotificationModules();
      if (!loaded || !Notifications || !Device) return;
      const token = await registerForPushNotificationsAsync();
      if (token && isMounted) {
        pushTokenRef.current = token;
        updatePushToken(token).catch(() => {});
      }
    };
    const t = setTimeout(init, 200);
    return () => { isMounted = false; clearTimeout(t); };
  }, []);

  return { pushToken: pushTokenRef.current };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  try {
    if (!Device.isDevice) return null;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== "granted") return null;
    const t = await Notifications.getExpoPushTokenAsync({ projectId: process.env.EXPO_PUBLIC_PROJECT_ID });
    return t.data;
  } catch { return null; }
}