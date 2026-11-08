import React, { useEffect, useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useNotifications } from '@/app/hooks/useNotifications';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Bouton, EnTete, Texte } from '@/app/components/ui';
import { couleurs, tonalites, Tonalite } from '@/app/theme/ocean';

type NomIcone = keyof typeof Ionicons.glyphMap;

/** Icône et tonalité selon le type de notification (1 confirmée, 2 rappel, 3 annulée, 4 billet). */
const getNotifIcon = (type: number): { nom: NomIcone; tonalite: Tonalite } => {
    switch (type) {
        case 1: return { nom: 'checkmark-circle', tonalite: 'succes' };
        case 2: return { nom: 'alarm', tonalite: 'alerte' };
        case 3: return { nom: 'close-circle', tonalite: 'danger' };
        case 4: return { nom: 'ticket', tonalite: 'info' };
        default: return { nom: 'notifications', tonalite: 'neutre' };
    }
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH} h`;
    if (diffD < 7) return `Il y a ${diffD} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

/** Une notification : fond légèrement bleuté et point tant qu'elle n'est pas lue. */
function LigneNotification({ notif, onPress }: { notif: any; onPress: () => void }) {
    const [presse, setPresse] = useState(false);
    const icone = getNotifIcon(notif.notif_type);
    const t = tonalites[icone.tonalite];
    const nonLue = notif.notif_statut !== 3;
    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => setPresse(true)}
            onPressOut={() => setPresse(false)}
            accessibilityRole="button"
            accessibilityLabel={`${nonLue ? 'Non lue. ' : ''}${notif.notif_titre}. ${notif.notif_message}`}
            style={{
                flexDirection: 'row',
                gap: 12,
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: nonLue ? couleurs.ocean200 : couleurs.ligne,
                backgroundColor: presse ? couleurs.ocean50 : nonLue ? '#F5F9FE' : couleurs.surface,
            }}
        >
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icone.nom} size={21} color={t.texte} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Texte graisse={nonLue ? 'tresGras' : 'gras'} taille={14.5} couleur={nonLue ? couleurs.encre : couleurs.encreDouce} numberOfLines={1} style={{ flex: 1 }}>
                        {notif.notif_titre}
                    </Texte>
                    {nonLue && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: couleurs.ocean500 }} />}
                </View>
                <Texte graisse="moyen" taille={13} couleur={couleurs.encreDouce} numberOfLines={3} style={{ lineHeight: 19 }}>
                    {notif.notif_message}
                </Texte>
                <Texte variante="legende" taille={11.5}>{formatDate(notif.created_at)}</Texte>
            </View>
        </Pressable>
    );
}

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { notifications, loading, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications(1);
        setRefreshing(false);
    };

    const handleNotificationPress = useCallback(async (notif: any) => {
        if (notif.notif_statut !== 3) markAsRead(notif.notif_id);

        // Notifications liées à une réservation (types 1 à 4)
        if (notif.res_id) {
            try {
                const userJson = await SecureStore.getItemAsync('fandrioUser');
                const user = userJson ? JSON.parse(userJson) : null;

                if (user?.role === 2) {
                    router.replace({ pathname: '/screens/dashboard/compagnies/dashboardCompagnie', params: { tab: 'reservations' } });
                } else if (user?.role === 1) {
                    router.push({ pathname: '/screens/dashboard/utilisateur/reservations/reservationDetail', params: { id: String(notif.res_id) } });
                }
            } catch (e) {
                console.warn('Navigation error:', e);
            }
        }
    }, [markAsRead, router]);

    return (
        <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
            <EnTete
                titre="Notifications"
                sousTitre={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
                droite={unreadCount > 0 ? <Bouton titre="Tout lire" variante="lien" compact onPress={markAllAsRead} /> : undefined}
            />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 8, flexGrow: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
                showsVerticalScrollIndicator={false}
            >
                {loading && notifications.length === 0 ? (
                    [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={92} borderRadius={16} />)
                ) : notifications.length === 0 ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 6 }}>
                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                            <Ionicons name="notifications-off-outline" size={32} color={couleurs.ocean800} />
                        </View>
                        <Texte graisse="tresGras" taille={15}>Aucune notification</Texte>
                        <Texte variante="legende" centre>Vous serez prévenu des confirmations, rappels et annulations.</Texte>
                    </View>
                ) : (
                    notifications.map((notif: any) => (
                        <LigneNotification key={notif.notif_id} notif={notif} onPress={() => handleNotificationPress(notif)} />
                    ))
                )}
            </ScrollView>
        </View>
    );
}
