import React, { useEffect, useState } from 'react';
import { View, TextInput, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { provinceService } from '@/app/services/provinces/provinceService';
import { voyageService } from '@/app/services/voyages/voyageService';
import { Bouton, FeuilleModale, Texte } from '@/app/components/ui';
import { couleurs, polices } from '@/app/theme/ocean';

interface DestinationSearchModalProps {
    visible: boolean;
    onClose: () => void;
    onResults: (voyages: any[]) => void;
}

type Champ = 'depart' | 'destination';

/** Recherche rapide : choisir un départ (facultatif) et une destination parmi les provinces. */
export default function DestinationSearchModal({ visible, onClose, onResults }: DestinationSearchModalProps) {
    const [provinces, setProvinces] = useState<any[]>([]);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [searching, setSearching] = useState(false);

    // Recherche texte pour chaque champ
    const [departSearch, setDepartSearch] = useState('');
    const [destinationSearch, setDestinationSearch] = useState('');

    // Province sélectionnée
    const [selectedDepart, setSelectedDepart] = useState<any>(null);
    const [selectedDestination, setSelectedDestination] = useState<any>(null);

    // Champ en cours de saisie
    const [activeField, setActiveField] = useState<Champ>('destination');

    useEffect(() => {
        if (visible) {
            fetchProvinces();
            setActiveField('destination');
        }
    }, [visible]);

    const fetchProvinces = async () => {
        if (provinces.length > 0) return;
        setLoadingProvinces(true);
        try {
            const resp = await provinceService.listerProvinces() as any;
            if (resp && resp.statut) {
                const data = resp.data?.provinces || resp.data;
                setProvinces(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Erreur chargement provinces:', error);
        } finally {
            setLoadingProvinces(false);
        }
    };

    const resetAndClose = () => {
        setDepartSearch('');
        setDestinationSearch('');
        setSelectedDepart(null);
        setSelectedDestination(null);
        setActiveField('destination');
        onClose();
    };

    const handleSearch = async () => {
        // Au moins une destination OU un départ doit être sélectionné
        if (!selectedDestination && !selectedDepart) return;

        setSearching(true);
        try {
            const criteres: any = {};
            if (selectedDepart) criteres.pro_depart = selectedDepart.id;
            if (selectedDestination) criteres.pro_arrivee = selectedDestination.id;

            const res = await voyageService.rechercherVoyages(criteres);
            if (res && res.statut) {
                const data = res.data;
                const voyages = data?.voyages || (Array.isArray(data) ? data : []);
                onResults(voyages);
                resetAndClose();
            }
        } catch (error) {
            console.error('Erreur recherche destination:', error);
        } finally {
            setSearching(false);
        }
    };

    const activeSearch = activeField === 'depart' ? departSearch : destinationSearch;
    const excludeId = activeField === 'depart' ? selectedDestination?.id : selectedDepart?.id;
    const filteredProvinces = provinces.filter(p => {
        const matchSearch = !activeSearch.trim() || p.nom?.toLowerCase().includes(activeSearch.toLowerCase());
        const notExcluded = !excludeId || p.id?.toString() !== excludeId?.toString();
        return matchSearch && notExcluded;
    });

    const selectProvince = (province: any) => {
        if (activeField === 'depart') {
            setSelectedDepart(province);
            setDepartSearch(province.nom);
            if (!selectedDestination) setActiveField('destination');
        } else {
            setSelectedDestination(province);
            setDestinationSearch(province.nom);
            if (!selectedDepart) setActiveField('depart');
        }
    };

    const clearField = (field: Champ) => {
        if (field === 'depart') {
            setSelectedDepart(null);
            setDepartSearch('');
        } else {
            setSelectedDestination(null);
            setDestinationSearch('');
        }
        setActiveField(field);
    };

    // Inverser départ et destination
    const inverser = () => {
        const d = selectedDepart, a = selectedDestination;
        setSelectedDepart(a);
        setDepartSearch(a?.nom || '');
        setSelectedDestination(d);
        setDestinationSearch(d?.nom || '');
    };

    const canSearch = !!(selectedDestination || selectedDepart);

    /**
     * Un champ (départ ou destination) : texte saisissable quand il est actif.
     * Fonction de rendu appelée directement (pas un composant <ChampLieu />) :
     * un composant déclaré ici serait recréé à chaque frappe et le champ
     * perdrait le focus.
     */
    const rendreChamp = (champ: Champ) => {
        const actif = activeField === champ;
        const selection = champ === 'depart' ? selectedDepart : selectedDestination;
        const valeur = champ === 'depart' ? departSearch : destinationSearch;
        const placeholder = champ === 'depart' ? "D'où partez-vous ? (facultatif)" : 'Où allez-vous ?';
        return (
            <Pressable
                onPress={() => setActiveField(champ)}
                accessibilityRole="button"
                accessibilityLabel={champ === 'depart' ? 'Départ' : 'Destination'}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 54,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: actif ? couleurs.ocean800 : couleurs.champ,
                    backgroundColor: couleurs.surface,
                }}
            >
                {champ === 'depart' ? (
                    <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: couleurs.ocean800 }} />
                ) : (
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: couleurs.ocean800 }} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Texte variante="legende" taille={11}>{champ === 'depart' ? 'Départ' : 'Destination'}</Texte>
                    {actif ? (
                        <TextInput
                            placeholder={placeholder}
                            placeholderTextColor="#8A99AD"
                            value={valeur}
                            onChangeText={(text) => {
                                if (champ === 'depart') {
                                    setDepartSearch(text);
                                    if (selectedDepart) setSelectedDepart(null);
                                } else {
                                    setDestinationSearch(text);
                                    if (selectedDestination) setSelectedDestination(null);
                                }
                            }}
                            autoFocus
                            style={{ fontFamily: polices.gras, fontSize: 15.5, color: couleurs.encre, padding: 0 }}
                        />
                    ) : (
                        <Texte graisse="gras" taille={15.5} couleur={selection ? couleurs.encre : '#8A99AD'} numberOfLines={1}>
                            {selection ? selection.nom : placeholder}
                        </Texte>
                    )}
                </View>
                {selection && (
                    <Pressable onPress={() => clearField(champ)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Effacer">
                        <Ionicons name="close-circle" size={20} color={couleurs.grisClair} />
                    </Pressable>
                )}
            </Pressable>
        );
    };

    return (
        <FeuilleModale
            visible={visible}
            onClose={resetAndClose}
            titre="Où voulez-vous aller ?"
            hauteur="pleine"
            pied={
                <Bouton
                    titre={
                        selectedDepart && selectedDestination
                            ? `Voir ${selectedDepart.nom} → ${selectedDestination.nom}`
                            : 'Rechercher des voyages'
                    }
                    icone="search"
                    onPress={handleSearch}
                    desactive={!canSearch}
                    chargement={searching}
                />
            }
        >
            {/* Champs départ / destination */}
            <View style={{ paddingHorizontal: 20, gap: 8 }}>
                {rendreChamp('depart')}
                {rendreChamp('destination')}
                {selectedDepart && selectedDestination && (
                    <Pressable
                        onPress={inverser}
                        accessibilityRole="button"
                        hitSlop={6}
                        style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
                    >
                        <Ionicons name="swap-vertical" size={16} color={couleurs.ocean800} />
                        <Texte graisse="gras" taille={13} couleur={couleurs.ocean800}>Inverser</Texte>
                    </Pressable>
                )}
            </View>

            {/* Liste des provinces */}
            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
                <Texte variante="etiquette" style={{ marginBottom: 8, marginLeft: 2 }}>
                    {activeField === 'depart' ? 'Choisir le départ' : 'Choisir la destination'}
                </Texte>

                {loadingProvinces ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
                        <ActivityIndicator color={couleurs.ocean800} />
                        <Texte variante="legende">Chargement des provinces…</Texte>
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
                        {filteredProvinces.length > 0 ? (
                            filteredProvinces.map((province) => {
                                const isSelected = activeField === 'depart'
                                    ? selectedDepart?.id === province.id
                                    : selectedDestination?.id === province.id;
                                return (
                                    <Pressable
                                        key={province.id}
                                        onPress={() => selectProvince(province)}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isSelected }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 12,
                                            minHeight: 52,
                                            paddingHorizontal: 10,
                                            borderRadius: 12,
                                            backgroundColor: isSelected ? couleurs.ocean50 : 'transparent',
                                        }}
                                    >
                                        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: isSelected ? couleurs.surface : couleurs.fond, alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="location-outline" size={18} color={isSelected ? couleurs.ocean800 : couleurs.gris} />
                                        </View>
                                        <Texte graisse={isSelected ? 'tresGras' : 'moyen'} taille={15} couleur={isSelected ? couleurs.ocean950 : couleurs.encre} style={{ flex: 1 }}>
                                            {province.nom}
                                        </Texte>
                                        {isSelected && <Ionicons name="checkmark-circle" size={20} color={couleurs.ocean800} />}
                                    </Pressable>
                                );
                            })
                        ) : (
                            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
                                <Ionicons name="search-outline" size={30} color={couleurs.grisClair} />
                                <Texte variante="legende">Aucune province ne correspond.</Texte>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </FeuilleModale>
    );
}
