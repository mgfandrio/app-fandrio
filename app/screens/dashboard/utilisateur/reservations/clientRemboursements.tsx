import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { remboursementService } from '@/app/services/remboursements/remboursementService';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Carte, EnTete, Pastille, Texte } from '@/app/components/ui';
import { couleurs, formatAriary, tonalites, Tonalite } from '@/app/theme/ocean';

interface Remboursement {
    res_id: number;
    res_numero: string;
    voyage: { trajet: string; date: string; heure: string; compagnie?: string };
    montant: number;
    statut: number; // 1 = en attente, 2 = traité, 3 = refusé
    statut_label: string;
    date_traitement: string | null;
    reference: string | null;
    note: string | null;
    date_annulation: string;
}

const TONALITE: Record<number, Tonalite> = { 1: 'alerte', 2: 'succes', 3: 'danger' };

/** Encadré coloré sous une carte de remboursement (référence, motif, info). */
function Encadre({ tonalite, titre, children }: { tonalite: Tonalite; titre?: string; children: React.ReactNode }) {
    const t = tonalites[tonalite];
    return (
        <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: t.fond, gap: 3 }}>
            {!!titre && <Texte graisse="tresGras" taille={10.5} couleur={t.texte} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{titre}</Texte>}
            {children}
        </View>
    );
}

export default function ClientRemboursementsScreen() {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<Remboursement[]>([]);
    const [stats, setStats] = useState<{ en_attente: number; total_a_recevoir: number; total_recu: number } | null>(null);

    const charger = useCallback(async () => {
        try {
            const res = await remboursementService.obtenirMesRemboursements(1);
            if (res.statut && res.data) {
                setItems(res.data.items || []);
                setStats(res.data.stats || null);
            }
        } catch (e) {
            console.error('Erreur chargement remboursements:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        charger();
    }, [charger]);

    const onRefresh = () => {
        setRefreshing(true);
        charger();
    };

    return (
        <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
            <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
            <EnTete titre="Remboursements" sousTitre="Voyages annulés par la compagnie" />

            {loading ? (
                <View style={{ padding: 16, gap: 12 }}>
                    <Skeleton height={112} borderRadius={20} />
                    {[1, 2, 3].map((i) => <Skeleton key={i} height={120} borderRadius={16} />)}
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Résumé */}
                    <Carte marine style={{ flexDirection: 'row' }}>
                        <View style={{ flex: 1, gap: 2 }}>
                            <Texte graisse="gras" taille={10.5} couleur={couleurs.texteSurMarine} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>À recevoir</Texte>
                            <Texte variante="montant" taille={21} couleur="#FFFFFF">{formatAriary(stats?.total_a_recevoir ?? 0)} Ar</Texte>
                            <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>
                                {stats?.en_attente ?? 0} en attente
                            </Texte>
                        </View>
                        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: 14 }} />
                        <View style={{ flex: 1, gap: 2 }}>
                            <Texte graisse="gras" taille={10.5} couleur={couleurs.texteSurMarine} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Déjà reçu</Texte>
                            <Texte variante="montant" taille={21} couleur="#FFFFFF">{formatAriary(stats?.total_recu ?? 0)} Ar</Texte>
                        </View>
                    </Carte>

                    {items.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16, gap: 6 }}>
                            <Ionicons name="checkmark-done-circle-outline" size={42} color={couleurs.grisClair} />
                            <Texte graisse="tresGras" taille={15}>Aucun remboursement</Texte>
                            <Texte variante="legende" centre>Si une compagnie annule votre voyage, le remboursement apparaîtra ici.</Texte>
                        </View>
                    ) : (
                        items.map((r) => (
                            <Carte key={r.res_id}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                                        <Texte graisse="tresGras" taille={14.5} numberOfLines={1}>{r.voyage.trajet}</Texte>
                                        <Texte variante="legende" numberOfLines={1}>
                                            {r.voyage.date} · {r.voyage.heure}{r.voyage.compagnie ? ` · ${r.voyage.compagnie}` : ''}
                                        </Texte>
                                        <Texte variante="legende" taille={11.5}>N° {r.res_numero}</Texte>
                                    </View>
                                    <Pastille libelle={r.statut_label} tonalite={TONALITE[r.statut] || 'neutre'} />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                                    <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris}>Montant</Texte>
                                    <Texte variante="montant" taille={17}>{formatAriary(r.montant)} Ar</Texte>
                                </View>

                                {r.statut === 2 && !!r.reference && (
                                    <Encadre tonalite="succes" titre="Référence du virement">
                                        <Texte graisse="tresGras" taille={13.5}>{r.reference}</Texte>
                                        {!!r.date_traitement && <Texte variante="legende">Reçu le {r.date_traitement}</Texte>}
                                    </Encadre>
                                )}
                                {r.statut === 3 && !!r.note && (
                                    <Encadre tonalite="danger" titre="Motif du refus">
                                        <Texte graisse="moyen" taille={13}>{r.note}</Texte>
                                    </Encadre>
                                )}
                                {r.statut === 1 && (
                                    <Encadre tonalite="alerte">
                                        <Texte graisse="moyen" taille={12.5} couleur={couleurs.encreDouce}>
                                            La compagnie doit traiter ce remboursement. Vous recevrez une notification dès qu'il sera effectué.
                                        </Texte>
                                    </Encadre>
                                )}
                            </Carte>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}
