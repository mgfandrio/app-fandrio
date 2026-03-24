import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { notificationService } from '../services/notifications/notificationService';

// Detect if running in Expo Go (push not supported since SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy-load expo-notifications only outside Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

if (!isExpoGo) {
    try {
        Notifications = require('expo-notifications');
        Device = require('expo-device');

        Notifications?.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch {
        // expo-notifications not available
    }
}

export function useNotifications() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);
    const intervalRef = useRef<any>(null);

    /**
     * Demander la permission et enregistrer le push token
     */
    const registerForPushNotifications = useCallback(async () => {
        if (!Notifications || !Device || !Device.isDevice || isExpoGo) {
            return;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return;
            }

            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: projectId || undefined,
            });

            const token = tokenData.data;

            // Enregistrer le token côté serveur
            await notificationService.registerPushToken(token);

            // Android channel
            if (Platform.OS === 'android' && Notifications) {
                Notifications.setNotificationChannelAsync('default', {
                    name: 'FANDRIO',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#1e3a8a',
                });
            }
        } catch (error) {
            console.warn('Push notification registration failed:', error);
        }
    }, []);

    /**
     * Récupérer le nombre de non lues
     */
    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await notificationService.getUnreadCount();
            if (response.statut) {
                setUnreadCount(response.count);
            }
        } catch {
            // Silently fail
        }
    }, []);

    /**
     * Récupérer les notifications
     */
    const fetchNotifications = useCallback(async (page: number = 1) => {
        setLoading(true);
        try {
            const response = await notificationService.getNotifications(page);
            if (response.statut) {
                if (page === 1) {
                    setNotifications(response.notifications);
                } else {
                    setNotifications(prev => [...prev, ...response.notifications]);
                }
            }
            return response;
        } catch {
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Marquer comme lue
     */
    const markAsRead = useCallback(async (notifId: number) => {
        try {
            await notificationService.markAsRead(notifId);
            setNotifications(prev =>
                prev.map(n => n.notif_id === notifId ? { ...n, notif_statut: 3 } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {
            // Silently fail
        }
    }, []);

    /**
     * Marquer toutes comme lues
     */
    const markAllAsRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, notif_statut: 3 })));
            setUnreadCount(0);
        } catch {
            // Silently fail
        }
    }, []);

    useEffect(() => {
        // Enregistrer pour les push notifications
        registerForPushNotifications();

        // Fetch initial count
        fetchUnreadCount();

        // Polling toutes les 30 secondes
        intervalRef.current = setInterval(fetchUnreadCount, 30000);

        // Listeners push (seulement hors Expo Go)
        if (Notifications && !isExpoGo) {
            notificationListener.current = Notifications.addNotificationReceivedListener(() => {
                fetchUnreadCount();
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
                fetchUnreadCount();
            });
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (notificationListener.current) notificationListener.current.remove();
            if (responseListener.current) responseListener.current.remove();
        };
    }, [registerForPushNotifications, fetchUnreadCount]);

    return {
        unreadCount,
        notifications,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
    };
}
