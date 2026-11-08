import React, { useEffect, useState } from 'react';
import { View, ScrollView, Image, Linking, Pressable, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { voyageService } from '@/app/services/voyages/voyageService';
import { CompagnieDetaillee } from '@/app/types/compagnie';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Bouton, BoutonIcone, Carte, Pastille, Texte } from '@/app/components/ui';
import { couleurs, formatAriary } from '@/app/theme/ocean';

type NomIcone = keyof typeof Ionicons.glyphMap;

function initiales(nom?: string) {
    return (nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
}

function nomProvince(p: any, defaut: string) {
    return (typeof p === 'object' ? p?.nom : p) || defaut;
}

/** Ligne de contact (téléphone, email, adresse), cliquable si une action existe. */
function LigneContact({ icone, libelle, valeur, onPress, premiere }: { icone: NomIcone; libelle: string; valeur?: string; onPress?: () => void; premiere?: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress || !valeur}
            accessibilityRole={onPress ? 'link' : 'text'}
            accessibilityLabel={`${libelle} : ${valeur || 'non renseigné'}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur }}
        >
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icone} size={18} color={couleurs.ocean800} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Texte variante="legende" taille={11.5}>{libelle}</Texte>
                <Texte graisse="gras" taille={14} numberOfLines={2}>{valeur || 'Non renseigné'}</Texte>
            </View>
            {onPress && !!valeur && <Ionicons name="chevron-forward" size={17} color={couleurs.grisClair} />}
        </Pressable>
    );
}

export default function CompagnieDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [compagnie, setCompagnie] = useState<CompagnieDetaillee | null>(null);
    const [voyages, setVoyages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingVoyages, setLoadingVoyages] = useState(false);

    useEffect(() => {
        if (id) {
            fetchDetail();
            fetchVoyages();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const res = await compagnieService.getCompagniePublic(Number(id));
            if (res && 'statut' in res && res.statut !== false && 'data' in res && res.data) setCompagnie(res.data);
        } catch (error) {
            console.error('Error fetching company details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVoyages = async () => {
        try {
            setLoadingVoyages(true);
            const res = await voyageService.rechercherVoyages({ compagnie_id: Number(id), per_page: 5 });
            if (res.statut) {
                const data = res.data;
                setVoyages(Array.isArray(data) ? data : data?.voyages || []);
            }
        } catch (error) {
            console.error('Error fetching company voyages:', error);
        } finally {
            setLoadingVoyages(false);
        }
    };

    const reserver = (voyage: any) =>
        router.push({ pathname: '/screens/dashboard/utilisateur/reservations/reserver', params: { voyageData: JSON.stringify(voyage) } });

    const enTete = (contenu: React.ReactNode) => (
        <View style={{ backgroundColor: couleurs.ocean950, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 22, gap: 18 }}>
            <BoutonIcone icone="chevron-back" libelle="Retour" variante="marine" onPress={() => router.back()} />
            {contenu}
        </View>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
                <StatusBar barStyle="light-content" backgroundColor={couleurs.ocean950} />
                {enTete(
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <Skeleton width={64} height={64} borderRadius={18} color="rgba(255,255,255,0.15)" />
                        <View style={{ flex: 1, gap: 8 }}>
                            <Skeleton width="70%" height={20} color="rgba(255,255,255,0.15)" />
                            <Skeleton width="40%" height={13} color="rgba(255,255,255,0.12)" />
                        </View>
                    </View>
                )}
                <View style={{ padding: 16, gap: 12 }}>
                    <Skeleton height={40} borderRadius={12} />
                    <Skeleton height={190} borderRadius={16} />
                    <Skeleton height={160} borderRadius={16} />
                </View>
            </View>
        );
    }

    if (!compagnie) {
        return (
            <View style={{ flex: 1, backgroundColor: couleurs.fond, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
                <StatusBar barStyle="dark-content" />
                <Ionicons name="alert-circle-outline" size={48} color={couleurs.danger} />
                <Texte graisse="tresGras" taille={18} centre>Compagnie introuvable</Texte>
                <Texte variante="legende" centre>Cette compagnie n'existe pas ou n'est plus disponible.</Texte>
                <Bouton titre="Retour à la liste" variante="secondaire" compact onPress={() => router.back()} style={{ marginTop: 8 }} />
            </View>
        );
    }

    const destinations = compagnie.provinces_desservies || [];
    const modes = compagnie.modes_paiement_acceptes || [];

    return (
        <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
            <StatusBar barStyle="light-content" backgroundColor={couleurs.ocean950} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
                {enTete(
                    <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {compagnie.logo ? (
                                    <Image source={{ uri: compagnie.logo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                ) : (
                                    <Texte graisse="tresGras" taille={21} couleur={couleurs.ocean950}>{initiales(compagnie.nom)}</Texte>
                                )}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Texte variante="titre" taille={22} couleur="#FFFFFF" numberOfLines={2}>{compagnie.nom}</Texte>
                                {!!compagnie.localisation?.nom && (
                                    <Texte graisse="moyen" taille={13} couleur={couleurs.texteSurMarine}>{compagnie.localisation.nom}</Texte>
                                )}
                            </View>
                        </View>
                        {!!compagnie.description && (
                            <Texte graisse="normal" taille={13.5} couleur="#D5E2F0" style={{ lineHeight: 20 }}>{compagnie.description}</Texte>
                        )}
                    </>
                )}

                <View style={{ padding: 16, gap: 14 }}>
                    {/* Destinations */}
                    {destinations.length > 0 && (
                        <View style={{ gap: 8 }}>
                            <Texte variante="etiquette" style={{ marginLeft: 2 }}>Destinations</Texte>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {destinations.map((prov, idx) => (
                                    <View key={idx} style={{ height: 30, paddingHorizontal: 12, borderRadius: 9, backgroundColor: couleurs.ocean50, justifyContent: 'center' }}>
                                        <Texte graisse="gras" taille={12.5} couleur={couleurs.ocean950}>{prov.nom}</Texte>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Prochains départs */}
                    <View style={{ gap: 8 }}>
                        <Texte variante="etiquette" style={{ marginLeft: 2 }}>Prochains départs</Texte>
                        {loadingVoyages ? (
                            <Skeleton height={150} borderRadius={16} />
                        ) : voyages.length > 0 ? (
                            <Carte padding={0}>
                                {voyages.map((voyage, i) => {
                                    const complet = voyage.est_complet || voyage.places_disponibles === 0;
                                    const places = voyage.places_disponibles ?? voyage.places_disponibles_restantes;
                                    return (
                                        <Pressable
                                            key={voyage.voyage_id}
                                            onPress={complet ? undefined : () => reserver(voyage)}
                                            disabled={complet}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${nomProvince(voyage.trajet?.province_depart, 'Départ')} vers ${nomProvince(voyage.trajet?.province_arrivee, 'Arrivée')}, ${voyage.date} à ${voyage.heure_depart}${complet ? ', complet' : ''}`}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur, opacity: complet ? 0.55 : 1 }}
                                        >
                                            <View style={{ width: 56 }}>
                                                <Texte variante="montant" taille={15.5}>{voyage.heure_depart}</Texte>
                                                <Texte variante="legende" taille={11}>{voyage.date}</Texte>
                                            </View>
                                            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                                                <Texte graisse="tresGras" taille={13.5} numberOfLines={1}>
                                                    {nomProvince(voyage.trajet?.province_depart, 'Départ')} → {nomProvince(voyage.trajet?.province_arrivee, 'Arrivée')}
                                                </Texte>
                                                {complet ? (
                                                    <Pastille libelle="Complet" tonalite="neutre" />
                                                ) : places !== undefined ? (
                                                    <Texte variante="legende">{places} place{places > 1 ? 's' : ''} libre{places > 1 ? 's' : ''}</Texte>
                                                ) : null}
                                            </View>
                                            <Texte variante="montant" taille={14} couleur={couleurs.ocean800}>{formatAriary(voyage.trajet?.tarif || 0)} Ar</Texte>
                                        </Pressable>
                                    );
                                })}
                            </Carte>
                        ) : (
                            <Carte style={{ alignItems: 'center', gap: 6, paddingVertical: 20 }}>
                                <Ionicons name="bus-outline" size={26} color={couleurs.grisClair} />
                                <Texte variante="legende" centre>Aucun départ programmé pour le moment.</Texte>
                            </Carte>
                        )}
                    </View>

                    {/* Contact et paiement */}
                    <View style={{ gap: 8 }}>
                        <Texte variante="etiquette" style={{ marginLeft: 2 }}>Contact et paiement</Texte>
                        <Carte padding={0}>
                            <LigneContact premiere icone="call-outline" libelle="Téléphone" valeur={compagnie.telephone} onPress={() => Linking.openURL(`tel:${compagnie.telephone}`)} />
                            <LigneContact icone="mail-outline" libelle="Email" valeur={compagnie.email} onPress={() => Linking.openURL(`mailto:${compagnie.email}`)} />
                            <LigneContact icone="location-outline" libelle="Adresse" valeur={compagnie.adresse} />
                            <LigneContact icone="card-outline" libelle="Paiements acceptés" valeur={modes.map((m) => m.nom).join(' · ') || undefined} />
                        </Carte>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
