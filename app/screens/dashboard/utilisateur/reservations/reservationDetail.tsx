import React, { useEffect, useState } from 'react';
import { View, ScrollView, Share, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { reservationService } from '@/app/services/reservations/reservationService';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Bouton, BoutonIcone, Carte, EnTete, Pastille, Texte } from '@/app/components/ui';
import { couleurs, formatAriary } from '@/app/theme/ocean';
import { dateDepuisJJMMAAAA, statutBillet } from '@/app/utils/statutBillet';
import { useConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { billetMemorise, memoriserBillet, oublierBillet } from '@/app/services/reservations/billetsHorsLigne';
import { LEGENDE_QR, AvisSansInternet } from '@/app/components/billets/AvisSansInternet';

/** Départ du voyage (date « JJ/MM/AAAA » + heure « HH:mm[:ss] »), ou null. */
function dateDepart(voyage: any): Date | null {
    const d = dateDepuisJJMMAAAA(voyage?.date);
    if (!d) return null;
    const [h, m] = String(voyage?.heure || '00:00').split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
}

/** Ligne libellé / valeur d'une carte d'informations. */
function Ligne({ libelle, valeur, fort }: { libelle: string; valeur?: string; fort?: boolean }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris}>{libelle}</Texte>
            <Texte graisse={fort ? 'tresGras' : 'gras'} taille={fort ? 17 : 13.5} style={{ flexShrink: 1, textAlign: 'right' }}>
                {valeur || '—'}
            </Texte>
        </View>
    );
}

export default function ReservationDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [horsLigne, setHorsLigne] = useState(false);
    const [annulation, setAnnulation] = useState(false);
    const { showDialog, DialogComponent } = useConfirmDialog();

    useEffect(() => {
        if (id) loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadDetail = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await reservationService.obtenirFacture(Number(id));
            if (response.statut) {
                setInvoiceData(response.data);
                setHorsLigne(false);
                memoriserBillet(response.data);
            } else setError(response.message || 'Impossible de charger ce billet.');
        } catch {
            // Sans réseau : copie gardée sur le téléphone (billets confirmés à venir)
            const copie = await billetMemorise(Number(id));
            if (copie) {
                setInvoiceData(copie.facture);
                setHorsLigne(true);
            } else setError('Impossible de charger ce billet. Vérifiez votre connexion.');
        } finally {
            setLoading(false);
        }
    };

    const getQrString = () => {
        const qrData = invoiceData?.reservation?.qr_data || '';
        try {
            return qrData ? atob(qrData) : '';
        } catch {
            return qrData;
        }
    };

    const handleShare = async () => {
        if (!invoiceData) return;
        const res = invoiceData.reservation;
        const voy = invoiceData.voyage;
        const texte = `FANDRIO · Billet ${res.numero}\n\n${voy.depart} → ${voy.arrivee}\n${voy.date} à ${voy.heure}\n${voy.compagnie}\n${formatAriary(Number(res.montant) || 0)} Ar · ${res.nb_voyageurs} voyageur(s)`;
        try {
            await Share.share({ message: texte });
        } catch {}
    };

    const statut = invoiceData ? statutBillet(invoiceData.reservation.statut, invoiceData.voyage?.date) : null;
    const depart = invoiceData ? dateDepart(invoiceData.voyage) : null;
    // Annulation possible par le client jusqu'à 24 h avant le départ (règle de l'API)
    const annulable = !horsLigne && invoiceData?.reservation?.statut === 2 && !!depart && depart.getTime() - Date.now() >= 24 * 3600 * 1000;

    const annuler = () => {
        const nb = Number(invoiceData.reservation.nb_voyageurs) || 1;
        showDialog({
            title: 'Annuler ce billet ?',
            message: `${invoiceData.voyage.depart} → ${invoiceData.voyage.arrivee}, ${invoiceData.voyage.date}. ${nb > 1 ? `Les ${nb} places seront libérées` : 'La place sera libérée'} pour d'autres voyageurs. Le billet n'est pas remboursé.`,
            type: 'danger',
            confirmText: 'Annuler le billet',
            cancelText: 'Garder mon billet',
            onConfirm: async () => {
                setAnnulation(true);
                try {
                    const r = await reservationService.annulerBillet(Number(id));
                    if (r?.statut) {
                        await oublierBillet(Number(id));
                        await loadDetail();
                    } else {
                        showDialog({ title: 'Annulation impossible', message: r?.message || 'Une erreur est survenue.', type: 'danger', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
                    }
                } finally {
                    setAnnulation(false);
                }
            },
            onCancel: () => {},
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
            <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
            <DialogComponent />
            <EnTete
                titre={invoiceData ? `Billet ${invoiceData.reservation.numero}` : 'Détail du billet'}
                sousTitre={invoiceData?.reservation?.date_reservation ? `Réservé le ${invoiceData.reservation.date_reservation}` : undefined}
                droite={invoiceData ? <BoutonIcone icone="share-outline" libelle="Partager le billet" onPress={handleShare} /> : undefined}
            />

            {loading ? (
                <View style={{ padding: 16, gap: 12 }}>
                    <Skeleton height={130} borderRadius={20} />
                    <Skeleton height={280} borderRadius={16} />
                    <Skeleton height={120} borderRadius={16} />
                </View>
            ) : error || !invoiceData ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
                    <Ionicons name="alert-circle-outline" size={48} color={couleurs.danger} />
                    <Texte graisse="moyen" taille={14.5} couleur={couleurs.gris} centre>{error || 'Billet introuvable.'}</Texte>
                    <Bouton titre="Réessayer" variante="secondaire" compact icone="refresh" onPress={loadDetail} style={{ marginTop: 8 }} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }} showsVerticalScrollIndicator={false}>
                    {horsLigne && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: couleurs.alerteFond }}>
                            <Ionicons name="cloud-offline-outline" size={20} color={couleurs.alerte} />
                            <Texte graisse="gras" taille={12.5} couleur={couleurs.alerte} style={{ flex: 1, lineHeight: 18 }}>
                                Hors connexion : billet enregistré sur ce téléphone. Le QR code reste valable pour l’embarquement.
                            </Texte>
                        </View>
                    )}
                    {/* Trajet */}
                    <Carte marine style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Texte graisse="gras" taille={12.5} couleur={couleurs.texteSurMarine}>{invoiceData.voyage.compagnie}</Texte>
                            {statut && <Pastille libelle={statut.libelle} tonalite={statut.tonalite} />}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Texte graisse="tresGras" taille={19} couleur="#FFFFFF" style={{ flex: 1 }} numberOfLines={1}>{invoiceData.voyage.depart}</Texte>
                            <Ionicons name="arrow-forward" size={18} color={couleurs.texteSurMarine} />
                            <Texte graisse="tresGras" taille={19} couleur="#FFFFFF" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>{invoiceData.voyage.arrivee}</Texte>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }}>
                            {[
                                ['Date', invoiceData.voyage.date],
                                ['Heure', invoiceData.voyage.heure],
                                ['Véhicule', invoiceData.voyage.matricule],
                            ].map(([l, v]) => (
                                <View key={l}>
                                    <Texte graisse="gras" taille={10.5} couleur={couleurs.texteSurMarine} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{l}</Texte>
                                    <Texte graisse="tresGras" taille={14} couleur="#FFFFFF">{v || '—'}</Texte>
                                </View>
                            ))}
                        </View>
                    </Carte>

                    {/* QR code (billets confirmés à venir) */}
                    {invoiceData.reservation.statut === 2 && statut?.groupe === 'avenir' && getQrString() ? (
                        <Carte style={{ alignItems: 'center', gap: 10 }}>
                            <View style={{ padding: 12, borderRadius: 16, borderWidth: 1, borderColor: couleurs.ligne }}>
                                <QRCode value={getQrString()} size={200} color={couleurs.ocean950} backgroundColor="#FFFFFF" />
                            </View>
                            <Texte variante="legende" centre>{LEGENDE_QR}</Texte>
                        </Carte>
                    ) : null}
                    {invoiceData.reservation.statut === 2 && statut?.groupe === 'avenir' && getQrString() ? <AvisSansInternet /> : null}

                    {/* Voyageurs */}
                    {(invoiceData.voyageurs || []).length > 0 && (
                        <View style={{ gap: 8 }}>
                            <Texte variante="etiquette" style={{ marginLeft: 2 }}>Voyageurs</Texte>
                            <Carte padding={0}>
                                {invoiceData.voyageurs.map((v: any, i: number) => (
                                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }}>
                                            <Texte graisse="tresGras" taille={14} couleur="#FFFFFF">{v.siege}</Texte>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Texte graisse="tresGras" taille={14}>{[v.prenom, v.nom].filter(Boolean).join(' ')}</Texte>
                                            <Texte variante="legende">Siège {v.siege}</Texte>
                                        </View>
                                    </View>
                                ))}
                            </Carte>
                        </View>
                    )}

                    {/* Paiement */}
                    <View style={{ gap: 8 }}>
                        <Texte variante="etiquette" style={{ marginLeft: 2 }}>Paiement</Texte>
                        <Carte style={{ gap: 9 }}>
                            {invoiceData.reservation.paiement ? (
                                <>
                                    <Ligne libelle="Mode" valeur={invoiceData.reservation.paiement.type} />
                                    <Ligne libelle="Référence" valeur={invoiceData.reservation.paiement.numero} />
                                </>
                            ) : (
                                <Texte variante="legende">Aucun paiement enregistré.</Texte>
                            )}
                            <View style={{ paddingTop: 9, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                                <Ligne libelle="Total" valeur={`${formatAriary(Number(invoiceData.reservation.montant) || 0)} Ar`} fort />
                            </View>
                        </Carte>
                    </View>

                    {annulable && (
                        <View style={{ gap: 6, marginTop: 4 }}>
                            <Bouton titre="Annuler ce billet" variante="danger" icone="close-circle-outline" onPress={annuler} chargement={annulation} />
                            <Texte variante="legende" centre>Possible jusqu’à 24 h avant le départ. Le billet n’est pas remboursé.</Texte>
                        </View>
                    )}
                    {invoiceData.reservation.statut === 6 && (
                        <Texte variante="legende" centre>Vous avez annulé ce billet. Il n’a pas été remboursé.</Texte>
                    )}
                </ScrollView>
            )}
        </View>
    );
}
