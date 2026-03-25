import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '@/app/hooks/useNotifications';
import * as SecureStore from 'expo-secure-store';

const getNotifIcon = (type: number) => {
    switch (type) {
        case 1: return { name: 'checkmark-circle', color: '#22c55e', bg: '#dcfce7' };
        case 2: return { name: 'alarm', color: '#f59e0b', bg: '#fef3c7' };
        case 3: return { name: 'close-circle', color: '#ef4444', bg: '#fee2e2' };
        case 4: return { name: 'ticket', color: '#3b82f6', bg: '#dbeafe' };
        default: return { name: 'notifications', color: '#6b7280', bg: '#f3f4f6' };
    }
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function NotificationsScreen() {
    const router = useRouter();
    const { notifications, loading, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        fetchNotifications(1);
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications(1);
        setRefreshing(false);
    };

    const handleNotificationPress = useCallback(async (notif: any) => {
        if (notif.notif_statut !== 3) markAsRead(notif.notif_id);

        // Notifications liées à une réservation (type 1,2,3,4)
        if (notif.res_id) {
            try {
                const userJson = await SecureStore.getItemAsync('fandrioUser');
                const user = userJson ? JSON.parse(userJson) : null;

                if (user?.role === 2) {
                    // Admin compagnie → aller au dashboard tab réservations
                    router.replace({
                        pathname: '/screens/dashboard/compagnies/dashboardCompagnie',
                        params: { tab: 'reservations' },
                    });
                } else if (user?.role === 1) {
                    // Client → aller à l'onglet réservation
                    router.replace('/screens/dashboard/utilisateur/(tabs)/reservation');
                }
            } catch (e) {
                console.warn('Navigation error:', e);
            }
        }
    }, [markAsRead, router]);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="bg-white px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900">Notifications</Text>
                    {unreadCount > 0 && (
                        <View className="bg-red-500 rounded-full px-2 py-0.5 ml-2">
                            <Text className="text-white text-[10px] font-bold">{unreadCount}</Text>
                        </View>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead}>
                        <Text className="text-blue-600 font-bold text-sm">Tout marquer lu</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e3a8a']} />}
            >
                {loading && notifications.length === 0 ? (
                    <View className="items-center justify-center py-20">
                        <ActivityIndicator size="large" color="#1e3a8a" />
                    </View>
                ) : notifications.length === 0 ? (
                    <View className="items-center justify-center py-20">
                        <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                            <Ionicons name="notifications-off-outline" size={40} color="#9ca3af" />
                        </View>
                        <Text className="text-gray-400 font-bold text-base">Aucune notification</Text>
                        <Text className="text-gray-300 text-sm mt-1">Vous serez notifié des mises à jour importantes.</Text>
                    </View>
                ) : (
                    <View className="p-4" style={{ gap: 8 }}>
                        {notifications.map((notif: any) => {
                            const icon = getNotifIcon(notif.notif_type);
                            const isUnread = notif.notif_statut !== 3;
                            return (
                                <TouchableOpacity
                                    key={notif.notif_id}
                                    className={`bg-white rounded-2xl p-4 flex-row border ${isUnread ? 'border-blue-100 bg-blue-50/30' : 'border-gray-50'}`}
                                    onPress={() => handleNotificationPress(notif)}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                                        style={{ backgroundColor: icon.bg }}
                                    >
                                        <Ionicons name={icon.name as any} size={20} color={icon.color} />
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row items-center justify-between mb-1">
                                            <Text className={`font-bold text-sm flex-1 mr-2 ${isUnread ? 'text-gray-900' : 'text-gray-600'}`} numberOfLines={1}>
                                                {notif.notif_titre}
                                            </Text>
                                            {isUnread && (
                                                <View className="w-2 h-2 rounded-full bg-blue-500" />
                                            )}
                                        </View>
                                        <Text className="text-gray-500 text-xs leading-4" numberOfLines={2}>
                                            {notif.notif_message}
                                        </Text>
                                        <Text className="text-gray-300 text-[10px] mt-1.5">
                                            {formatDate(notif.created_at)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
