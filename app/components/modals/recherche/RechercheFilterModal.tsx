import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { provinceService } from '@/app/services/provinces/provinceService';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { voyageService } from '@/app/services/voyages/voyageService';
import { SearchableDropdown } from '@/app/components/common';
import { Bouton, ChampSaisie, FeuilleModale, Puce, Texte } from '@/app/components/ui';
import { couleurs } from '@/app/theme/ocean';
import { CalendrierDates } from '@/app/components/voyages/CalendrierDates';

interface RechercheFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (voyages: any[]) => void;
    setLoading: (loading: boolean) => void;
}

const FILTRES_VIDES = {
    pro_depart: '',
    pro_arrivee: '',
    compagnie_id: '',
    date_exacte: '',
    type_voyage: '',
    prix_max: '',
    places_min: '1'
};

const JOURS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Bloc titré du formulaire (déclaré hors du composant pour ne pas être recréé à chaque rendu). */
function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
    return (
        <View style={{ gap: 8, marginBottom: 18 }}>
            <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>{titre}</Texte>
            {children}
        </View>
    );
}

/** Recherche détaillée : départ, destination, date, compagnie, type, prix, places. */
export default function RechercheFilterModal({ visible, onClose, onApply, setLoading }: RechercheFilterModalProps) {
    const [provinces, setProvinces] = useState<any[]>([]);
    const [compagnies, setCompagnies] = useState<any[]>([]);
    const [searchFilters, setSearchFilters] = useState(FILTRES_VIDES);

    // Calendrier replié par défaut ; « aujourd'hui » recalculé à chaque ouverture
    const [calendrierOuvert, setCalendrierOuvert] = useState(false);
    const aujourdhui = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);
    const libelleDate = (iso: string) => {
        const d = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
        const ecart = Math.round((d.getTime() - aujourdhui.getTime()) / 86400000);
        const prefixe = ecart === 0 ? "Aujourd'hui, " : ecart === 1 ? 'Demain, ' : '';
        return `${prefixe}${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
    };

    useEffect(() => {
        if (visible) {
            fetchInitialData();
        }
    }, [visible]);

    const fetchInitialData = async () => {
        try {
            const [provResp, compResp] = await Promise.allSettled([
                provinceService.listerProvinces(),
                compagnieService.listerCompagniesGenerique()
            ]);

            if (provResp.status === 'fulfilled') {
                const resp = provResp.value as any;
                if (resp && resp.statut) {
                    const data = resp.data?.provinces || resp.data;
                    setProvinces(Array.isArray(data) ? data : []);
                }
            }

            if (compResp.status === 'fulfilled') {
                const resp = compResp.value as any;
                if (resp && resp.statut) {
                    const data = resp.data?.compagnies || resp.data;
                    setCompagnies(Array.isArray(data) ? data : []);
                }
            }
        } catch (error) {
            console.error('Modal fetch data error:', error);
        }
    };

    const resetFilters = () => setSearchFilters(FILTRES_VIDES);

    const handleSearch = async () => {
        onClose();
        setLoading(true);
        try {
            const criteres: any = { ...searchFilters };
            Object.keys(criteres).forEach(key => {
                if (criteres[key] === '') delete criteres[key];
            });

            const res = await voyageService.rechercherVoyages(criteres);
            if (res && res.statut) {
                const data = res.data;
                const voyages = data?.voyages || (Array.isArray(data) ? data : []);
                onApply(voyages);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const places = parseInt(searchFilters.places_min) || 1;
    const changerPlaces = (delta: number) =>
        setSearchFilters(f => ({ ...f, places_min: String(Math.min(20, Math.max(1, places + delta))) }));

    return (
        <FeuilleModale
            visible={visible}
            onClose={onClose}
            titre="Recherche détaillée"
            sousTitre="Tous les champs sont facultatifs"
            pied={
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Bouton titre="Réinitialiser" variante="secondaire" onPress={resetFilters} style={{ flex: 1 }} />
                    <Bouton titre="Voir les voyages" icone="search" onPress={handleSearch} style={{ flex: 1.6 }} />
                </View>
            }
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 }}
            >
                <SearchableDropdown
                    label="Départ"
                    placeholder="Province de départ"
                    data={provinces}
                    selectedId={searchFilters.pro_depart}
                    onSelect={(id) => setSearchFilters(f => ({ ...f, pro_depart: id }))}
                    allOptionLabel="Toutes les provinces"
                />
                <SearchableDropdown
                    label="Destination"
                    placeholder="Province d'arrivée"
                    data={provinces}
                    selectedId={searchFilters.pro_arrivee}
                    onSelect={(id) => setSearchFilters(f => ({ ...f, pro_arrivee: id }))}
                    allOptionLabel="Toutes les provinces"
                />

                <Section titre="Date du voyage">
                    <Pressable
                        onPress={() => setCalendrierOuvert(o => !o)}
                        accessibilityRole="button"
                        accessibilityLabel="Choisir la date du voyage"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: calendrierOuvert ? couleurs.ocean800 : couleurs.champ, backgroundColor: couleurs.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 }}
                    >
                        <Ionicons name="calendar-outline" size={20} color={couleurs.ocean800} />
                        <Texte graisse="moyen" taille={14.5} couleur={searchFilters.date_exacte ? couleurs.encre : couleurs.encreDouce} style={{ flex: 1 }}>
                            {searchFilters.date_exacte ? libelleDate(searchFilters.date_exacte) : 'Toutes les dates'}
                        </Texte>
                        <Ionicons name={calendrierOuvert ? 'chevron-up' : 'chevron-down'} size={18} color={couleurs.encreDouce} />
                    </Pressable>
                    {calendrierOuvert && (
                        <View style={{ borderWidth: 1, borderColor: couleurs.ligne, borderRadius: 14, padding: 10, backgroundColor: couleurs.surface }}>
                            <CalendrierDates
                                multiple={false}
                                minimum={aujourdhui}
                                selection={searchFilters.date_exacte ? [searchFilters.date_exacte] : []}
                                onChange={(dates) => {
                                    setSearchFilters(f => ({ ...f, date_exacte: dates[0] ?? '' }));
                                    if (dates[0]) setCalendrierOuvert(false);
                                }}
                            />
                        </View>
                    )}
                    {searchFilters.date_exacte !== '' && (
                        <Pressable onPress={() => setSearchFilters(f => ({ ...f, date_exacte: '' }))} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                            <Texte graisse="moyen" taille={13} couleur={couleurs.ocean800}>Afficher toutes les dates</Texte>
                        </Pressable>
                    )}
                </Section>

                <SearchableDropdown
                    label="Compagnie"
                    placeholder="Toutes les compagnies"
                    data={compagnies}
                    selectedId={searchFilters.compagnie_id}
                    onSelect={(id) => setSearchFilters(f => ({ ...f, compagnie_id: id }))}
                    allOptionLabel="Toutes les compagnies"
                />

                <Section titre="Type de voyage">
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                            { label: 'Tous', value: '', icone: undefined },
                            { label: 'Jour', value: '1', icone: 'sunny-outline' as const },
                            { label: 'Nuit', value: '2', icone: 'moon-outline' as const },
                        ].map((t) => (
                            <View key={t.value} style={{ flex: 1 }}>
                                <Puce
                                    libelle={t.label}
                                    icone={t.icone}
                                    active={searchFilters.type_voyage === t.value}
                                    onPress={() => setSearchFilters(f => ({ ...f, type_voyage: t.value }))}
                                />
                            </View>
                        ))}
                    </View>
                </Section>

                <View style={{ marginBottom: 18 }}>
                    <ChampSaisie
                        libelle="Prix maximum par place"
                        placeholder="Ex. 50 000"
                        keyboardType="numeric"
                        suffixe="Ar"
                        value={searchFilters.prix_max}
                        onChangeText={(val) => setSearchFilters(f => ({ ...f, prix_max: val.replace(/[^0-9]/g, '') }))}
                    />
                </View>

                <Section titre="Nombre de places">
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 16, backgroundColor: couleurs.fond }}>
                        <Pressable
                            onPress={() => changerPlaces(-1)}
                            disabled={places <= 1}
                            accessibilityRole="button"
                            accessibilityLabel="Une place de moins"
                            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.ligne, alignItems: 'center', justifyContent: 'center', opacity: places <= 1 ? 0.4 : 1 }}
                        >
                            <Ionicons name="remove" size={22} color={couleurs.ocean800} />
                        </Pressable>
                        <Texte variante="montant" taille={22} accessibilityLiveRegion="polite">
                            {places} place{places > 1 ? 's' : ''}
                        </Texte>
                        <Pressable
                            onPress={() => changerPlaces(1)}
                            accessibilityRole="button"
                            accessibilityLabel="Une place de plus"
                            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.ligne, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="add" size={22} color={couleurs.ocean800} />
                        </Pressable>
                    </View>
                </Section>
            </ScrollView>
        </FeuilleModale>
    );
}
