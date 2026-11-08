import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { reservationService } from '@/app/services/reservations/reservationService';
import { genererBilletPdf } from '@/app/utils/genererBilletPdf';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Bouton, Carte, EnTete, FeuilleModale, Pastille, Segmente, Texte } from '@/app/components/ui';
import { couleurs, formatAriary } from '@/app/theme/ocean';
import { statutBillet } from '@/app/utils/statutBillet';

type Filtre = 'toutes' | 'avenir' | 'passe';

/** Ligne libellé / valeur dans le détail d'une facture. */
function Ligne({ libelle, valeur, fort }: { libelle: string; valeur?: string; fort?: boolean }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris}>{libelle}</Texte>
            <Texte graisse={fort ? 'tresGras' : 'gras'} taille={fort ? 18 : 13.5} style={{ flexShrink: 1, textAlign: 'right' }}>{valeur || '—'}</Texte>
        </View>
    );
}

/** Factures du client : seules les réservations payées (statut 2) ont une facture. */
export default function ClientFacturesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [chargementSuite, setChargementSuite] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [filtre, setFiltre] = useState<Filtre>('toutes');
    const [facture, setFacture] = useState<any>(null);
    const [factureChargement, setFactureChargement] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const qrRef = useRef<any>(null);

    const fetchFactures = useCallback(async (pageNumber = 1) => {
        try {
            const response = await reservationService.obtenirToutesReservations(pageNumber);
            if (response.statut) {
                const items = response.data.items || [];
                setReservations((prev) => (pageNumber === 1 ? items : [...prev, ...items]));
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching factures:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setChargementSuite(false);
        }
    }, []);

    useEffect(() => {
        fetchFactures(1);
    }, [fetchFactures]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFactures(1);
    };

    const loadMore = () => {
        if (!pagination || chargementSuite || loading || pagination.current_page >= pagination.last_page) return;
        setChargementSuite(true);
        fetchFactures(pagination.current_page + 1);
    };

    const ouvrirFacture = async (resId: number) => {
        setFacture(null);
        setFactureChargement(true);
        setModalVisible(true);
        try {
            const response = await reservationService.obtenirFacture(resId);
            if (response.statut) setFacture(response.data);
        } catch (error) {
            console.error('Error loading invoice:', error);
        } finally {
            setFactureChargement(false);
        }
    };

    const fermer = () => {
        setModalVisible(false);
        qrRef.current = null;
    };

    /** Récupère le QR code en data URL via la ref de <QRCode>, puis génère et partage le PDF. */
    const handleDownloadPdf = async () => {
        if (!facture || downloadingPdf) return;
        setDownloadingPdf(true);
        const qrDataUrl = await new Promise<string>((resolve) => {
            if (qrRef.current && typeof qrRef.current.toDataURL === 'function') {
                try {
                    qrRef.current.toDataURL((data: string) => resolve(data ? `data:image/png;base64,${data}` : ''));
                    setTimeout(() => resolve(''), 1500); // filet de sécurité
                } catch {
                    resolve('');
                }
            } else {
                resolve('');
            }
        });
        try {
            await genererBilletPdf(
                {
                    reservation: {
                        numero: facture.reservation.numero,
                        statut: facture.reservation.statut,
                        montant: facture.reservation.montant,
                        date_reservation: facture.reservation.date_reservation,
                        paiement: facture.reservation.paiement,
                    },
                    voyage: facture.voyage,
                    voyageurs: facture.voyageurs,
                },
                qrDataUrl
            );
        } finally {
            setDownloadingPdf(false);
        }
    };

    const qrString = (() => {
        const brut = facture?.reservation?.qr_data;
        if (!brut) return '';
        try {
            return atob(brut);
        } catch {
            return brut;
        }
    })();

    const payees = reservations.filter((r) => r.statut === 2);
    const affichees = payees.filter((r) => filtre === 'toutes' || statutBillet(r.statut, r.date).groupe === filtre);
    const totalPaye = payees.reduce((s, r) => s + Number(r.montant || 0), 0);
    const toutCharge = !pagination || pagination.current_page >= pagination.last_page;

    const statutFacture = facture ? statutBillet(facture.reservation.statut, facture.voyage?.date) : null;

    return (
        <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
            <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
            <EnTete titre="Factures" sousTitre="Réservations payées" />

            {loading ? (
                <View style={{ padding: 16, gap: 10 }}>
                    <Skeleton height={92} borderRadius={20} />
                    <Skeleton height={46} borderRadius={14} />
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={76} borderRadius={16} />)}
                </View>
            ) : (
                <FlatList
                    data={affichees}
                    keyExtractor={(r) => String(r.id)}
                    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10, flexGrow: 1 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <View style={{ gap: 12, marginBottom: 2 }}>
                            <Carte marine style={{ flexDirection: 'row' }}>
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Texte graisse="gras" taille={10.5} couleur={couleurs.texteSurMarine} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Factures</Texte>
                                    <Texte variante="montant" taille={22} couleur="#FFFFFF">{payees.length}{toutCharge ? '' : '+'}</Texte>
                                </View>
                                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: 14 }} />
                                <View style={{ flex: 2, gap: 2 }}>
                                    <Texte graisse="gras" taille={10.5} couleur={couleurs.texteSurMarine} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Total payé</Texte>
                                    <Texte variante="montant" taille={22} couleur="#FFFFFF">{formatAriary(totalPaye)} Ar</Texte>
                                </View>
                            </Carte>
                            <Segmente<Filtre>
                                libelleAccessible="Filtrer les factures"
                                valeur={filtre}
                                onChange={setFiltre}
                                options={[
                                    { valeur: 'toutes', libelle: 'Toutes' },
                                    { valeur: 'avenir', libelle: 'À venir' },
                                    { valeur: 'passe', libelle: 'Effectuées' },
                                ]}
                            />
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 6 }}>
                            <Ionicons name="document-text-outline" size={40} color={couleurs.grisClair} />
                            <Texte graisse="tresGras" taille={15}>Aucune facture</Texte>
                            <Texte variante="legende" centre>Les factures apparaissent une fois la réservation payée.</Texte>
                        </View>
                    }
                    ListFooterComponent={chargementSuite ? <ActivityIndicator color={couleurs.ocean800} style={{ paddingVertical: 12 }} /> : null}
                    renderItem={({ item: res }) => {
                        const statut = statutBillet(res.statut, res.date);
                        return (
                            <Carte
                                onPress={() => ouvrirFacture(res.id)}
                                accessibilityLabel={`Facture ${res.numero}, ${res.trajet}, ${formatAriary(Number(res.montant) || 0)} ariary`}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                            >
                                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="receipt-outline" size={20} color={couleurs.ocean800} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                                    <Texte graisse="tresGras" taille={14.5} numberOfLines={1}>{res.trajet}</Texte>
                                    <Texte variante="legende" numberOfLines={1}>
                                        {res.date} · {res.nb_voyageurs} voyageur{res.nb_voyageurs > 1 ? 's' : ''} · N° {res.numero}
                                    </Texte>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <Texte variante="montant" taille={14.5} couleur={couleurs.ocean800}>{formatAriary(Number(res.montant) || 0)} Ar</Texte>
                                    <Pastille libelle={statut.libelle} tonalite={statut.tonalite} point={false} />
                                </View>
                            </Carte>
                        );
                    }}
                />
            )}

            <FeuilleModale
                visible={modalVisible}
                onClose={fermer}
                hauteur="pleine"
                titre={facture ? `Facture ${facture.reservation.numero}` : 'Facture'}
                sousTitre={facture?.reservation?.date_reservation ? `Réservé le ${facture.reservation.date_reservation}` : undefined}
                pied={
                    facture ? (
                        <View style={{ gap: 8 }}>
                            <Bouton
                                titre={downloadingPdf ? 'Génération du PDF…' : 'Télécharger le PDF'}
                                icone="download-outline"
                                chargement={downloadingPdf}
                                onPress={handleDownloadPdf}
                            />
                            <Bouton
                                titre="Voir le billet"
                                variante="secondaire"
                                onPress={() => {
                                    fermer();
                                    router.push({ pathname: '/screens/dashboard/utilisateur/reservations/reservationDetail', params: { id: String(facture.reservation.id) } });
                                }}
                            />
                        </View>
                    ) : undefined
                }
            >
                {factureChargement ? (
                    <View style={{ padding: 20, gap: 12 }}>
                        <Skeleton height={120} borderRadius={18} />
                        <Skeleton height={160} borderRadius={16} />
                    </View>
                ) : facture ? (
                    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 14 }} showsVerticalScrollIndicator={false}>
                        {/* Trajet */}
                        <Carte marine style={{ gap: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Texte graisse="gras" taille={12.5} couleur={couleurs.texteSurMarine}>{facture.voyage.compagnie}</Texte>
                                {statutFacture && <Pastille libelle={statutFacture.libelle} tonalite={statutFacture.tonalite} />}
                            </View>
                            <Texte graisse="tresGras" taille={18} couleur="#FFFFFF">{facture.voyage.depart} → {facture.voyage.arrivee}</Texte>
                            <Texte graisse="moyen" taille={13} couleur={couleurs.texteSurMarine}>
                                {facture.voyage.date} à {facture.voyage.heure} · {facture.voyage.matricule}
                            </Texte>
                        </Carte>

                        {/* QR (sert aussi à l'image du PDF) */}
                        {facture.reservation.statut === 2 && !!qrString && (
                            <View style={{ alignItems: 'center', gap: 8 }}>
                                <View style={{ padding: 12, borderRadius: 16, borderWidth: 1, borderColor: couleurs.ligne, backgroundColor: '#FFFFFF' }}>
                                    <QRCode value={qrString} size={168} color={couleurs.ocean950} backgroundColor="#FFFFFF" getRef={(c: any) => (qrRef.current = c)} />
                                </View>
                                {statutFacture?.groupe === 'avenir' && <Texte variante="legende" centre>Présentez ce code au chauffeur à l'embarquement.</Texte>}
                            </View>
                        )}

                        {/* Voyageurs */}
                        {(facture.voyageurs || []).length > 0 && (
                            <View style={{ gap: 8 }}>
                                <Texte variante="etiquette" style={{ marginLeft: 2 }}>Voyageurs ({facture.voyageurs.length})</Texte>
                                <Carte padding={0}>
                                    {facture.voyageurs.map((v: any, i: number) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
                                            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }}>
                                                <Texte graisse="tresGras" taille={13.5} couleur="#FFFFFF">{v.siege}</Texte>
                                            </View>
                                            <Texte graisse="gras" taille={14} style={{ flex: 1 }} numberOfLines={1}>{v.nom}</Texte>
                                        </View>
                                    ))}
                                </Carte>
                            </View>
                        )}

                        {/* Paiement */}
                        <View style={{ gap: 8 }}>
                            <Texte variante="etiquette" style={{ marginLeft: 2 }}>Paiement</Texte>
                            <Carte style={{ gap: 9 }}>
                                {facture.reservation.paiement && (
                                    <>
                                        <Ligne libelle="Mode" valeur={facture.reservation.paiement.type} />
                                        <Ligne libelle="Référence" valeur={facture.reservation.paiement.numero} />
                                    </>
                                )}
                                <View style={{ paddingTop: facture.reservation.paiement ? 9 : 0, borderTopWidth: facture.reservation.paiement ? 1 : 0, borderTopColor: couleurs.separateur }}>
                                    <Ligne libelle="Total" valeur={`${formatAriary(Number(facture.reservation.montant) || 0)} Ar`} fort />
                                </View>
                            </Carte>
                        </View>
                    </ScrollView>
                ) : (
                    <View style={{ alignItems: 'center', padding: 32, gap: 8 }}>
                        <Ionicons name="alert-circle-outline" size={44} color={couleurs.danger} />
                        <Texte variante="legende" centre>Impossible de charger la facture. Vérifiez votre connexion.</Texte>
                    </View>
                )}
            </FeuilleModale>
        </View>
    );
}
