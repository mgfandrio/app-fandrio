import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { reservationService } from '@/app/services/reservations/reservationService';
import { Skeleton } from '@/app/components/common/Skeleton';
import { BoutonIcone, Carte, EnTete, FeuilleModale, Pastille, Texte } from '@/app/components/ui';
import { couleurs, formatAriary } from '@/app/theme/ocean';
import { statutBillet, vignetteDate } from '@/app/utils/statutBillet';

/** Historique complet des réservations du client, toutes dates et tous statuts, paginé. */
export default function HistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [chargementSuite, setChargementSuite] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [qr, setQr] = useState<{ visible: boolean; chargement: boolean; valeur: string; numero: string }>({ visible: false, chargement: false, valeur: '', numero: '' });

    const fetchHistory = async (pageNumber = 1) => {
        try {
            const response = await reservationService.obtenirToutesReservations(pageNumber);
            if (response.statut) {
                const items = response.data.items || [];
                setReservations((prev) => (pageNumber === 1 ? items : [...prev, ...items]));
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setChargementSuite(false);
        }
    };

    useEffect(() => {
        fetchHistory(1);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory(1);
    };

    const loadMore = () => {
        if (!pagination || chargementSuite || loading || pagination.current_page >= pagination.last_page) return;
        setChargementSuite(true);
        fetchHistory(pagination.current_page + 1);
    };

    const ouvrirQr = async (resId: number) => {
        setQr({ visible: true, chargement: true, valeur: '', numero: '' });
        try {
            const response = await reservationService.obtenirFacture(resId);
            const brut = response.statut ? response.data?.reservation?.qr_data : '';
            let valeur = '';
            if (brut) {
                try {
                    valeur = atob(brut);
                } catch {
                    valeur = brut;
                }
            }
            setQr({ visible: true, chargement: false, valeur, numero: response.data?.reservation?.numero || '' });
        } catch {
            setQr((q) => ({ ...q, chargement: false }));
        }
    };

    const total = pagination?.total;

    return (
        <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
            <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
            <EnTete titre="Historique" sousTitre={total !== undefined ? `${total} réservation${total > 1 ? 's' : ''}` : undefined} />

            {loading ? (
                <View style={{ padding: 16, gap: 10 }}>
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={84} borderRadius={16} />)}
                </View>
            ) : (
                <FlatList
                    data={reservations}
                    keyExtractor={(r) => String(r.id)}
                    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10, flexGrow: 1 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 6 }}>
                            <Ionicons name="time-outline" size={40} color={couleurs.grisClair} />
                            <Texte graisse="tresGras" taille={15}>Aucune réservation</Texte>
                            <Texte variante="legende" centre>Vos réservations apparaîtront ici.</Texte>
                        </View>
                    }
                    ListFooterComponent={chargementSuite ? <ActivityIndicator color={couleurs.ocean800} style={{ paddingVertical: 12 }} /> : null}
                    renderItem={({ item: res }) => {
                        const statut = statutBillet(res.statut, res.date);
                        const vignette = vignetteDate(res.date);
                        const qrDispo = res.statut === 2 && statut.groupe === 'avenir';
                        return (
                            <Carte
                                onPress={() => router.push({ pathname: '/screens/dashboard/utilisateur/reservations/reservationDetail', params: { id: String(res.id) } })}
                                accessibilityLabel={`${res.trajet}, ${res.date} à ${res.heure}, ${statut.libelle}`}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                            >
                                <View style={{ width: 50, height: 54, borderRadius: 13, backgroundColor: statut.groupe === 'avenir' ? couleurs.ocean50 : couleurs.separateur, alignItems: 'center', justifyContent: 'center' }}>
                                    <Texte graisse="tresGras" taille={18} couleur={statut.groupe === 'avenir' ? couleurs.ocean950 : couleurs.gris}>{vignette.jour}</Texte>
                                    <Texte graisse="gras" taille={10} couleur={couleurs.gris}>{vignette.mois}</Texte>
                                </View>
                                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                                    <Texte graisse="tresGras" taille={14.5} numberOfLines={1}>{res.trajet}</Texte>
                                    <Texte variante="legende" numberOfLines={1}>
                                        {res.heure} · N° {res.numero}
                                    </Texte>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                        <Pastille libelle={statut.libelle} tonalite={statut.tonalite} />
                                        <Texte variante="montant" taille={13.5} couleur={couleurs.ocean800}>{formatAriary(Number(res.montant) || 0)} Ar</Texte>
                                    </View>
                                </View>
                                {qrDispo ? (
                                    <BoutonIcone icone="qr-code-outline" libelle={`QR code du billet ${res.numero}`} onPress={() => ouvrirQr(res.id)} />
                                ) : (
                                    <Ionicons name="chevron-forward" size={19} color={couleurs.grisClair} />
                                )}
                            </Carte>
                        );
                    }}
                />
            )}

            <FeuilleModale
                visible={qr.visible}
                onClose={() => setQr((q) => ({ ...q, visible: false }))}
                titre="QR code d'embarquement"
                sousTitre={qr.numero ? `Billet ${qr.numero}` : undefined}
            >
                <View style={{ alignItems: 'center', padding: 20, paddingBottom: insets.bottom + 28, gap: 12 }}>
                    {qr.chargement ? (
                        <Skeleton width={232} height={232} borderRadius={16} />
                    ) : qr.valeur ? (
                        <>
                            <View style={{ padding: 14, borderRadius: 18, borderWidth: 1, borderColor: couleurs.ligne }}>
                                <QRCode value={qr.valeur} size={204} color={couleurs.ocean950} backgroundColor="#FFFFFF" />
                            </View>
                            <Texte variante="legende" centre>Présentez ce code au chauffeur à l'embarquement.</Texte>
                        </>
                    ) : (
                        <View style={{ alignItems: 'center', gap: 6, paddingVertical: 20 }}>
                            <Ionicons name="alert-circle-outline" size={40} color={couleurs.danger} />
                            <Texte variante="legende" centre>QR code indisponible pour le moment.</Texte>
                        </View>
                    )}
                </View>
            </FeuilleModale>
        </View>
    );
}
