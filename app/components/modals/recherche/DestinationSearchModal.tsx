import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { provinceService } from '@/app/services/provinces/provinceService';
import { voyageService } from '@/app/services/voyages/voyageService';

interface DestinationSearchModalProps {
    visible: boolean;
    onClose: () => void;
    onResults: (voyages: any[]) => void;
}

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

    // Focus actif
    const [activeField, setActiveField] = useState<'depart' | 'destination'>('destination');

    useEffect(() => {
        if (visible) {
            fetchProvinces();
            // Focus par défaut sur destination
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
            if (selectedDepart) {
                criteres.pro_depart = selectedDepart.id;
            }
            if (selectedDestination) {
                criteres.pro_arrivee = selectedDestination.id;
            }

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

    const getFilteredProvinces = (search: string, excludeId?: number | string) => {
        return provinces.filter(p => {
            const matchSearch = !search.trim() || p.nom?.toLowerCase().includes(search.toLowerCase());
            const notExcluded = !excludeId || p.id?.toString() !== excludeId?.toString();
            return matchSearch && notExcluded;
        });
    };

    const activeSearch = activeField === 'depart' ? departSearch : destinationSearch;
    const excludeId = activeField === 'depart' ? selectedDestination?.id : selectedDepart?.id;
    const filteredProvinces = getFilteredProvinces(activeSearch, excludeId);

    const selectProvince = (province: any) => {
        if (activeField === 'depart') {
            setSelectedDepart(province);
            setDepartSearch(province.nom);
            // Si pas encore de destination, focus dessus
            if (!selectedDestination) {
                setActiveField('destination');
            }
        } else {
            setSelectedDestination(province);
            setDestinationSearch(province.nom);
            // Si pas encore de départ, focus dessus
            if (!selectedDepart) {
                setActiveField('depart');
            }
        }
    };

    const clearField = (field: 'depart' | 'destination') => {
        if (field === 'depart') {
            setSelectedDepart(null);
            setDepartSearch('');
        } else {
            setSelectedDestination(null);
            setDestinationSearch('');
        }
        setActiveField(field);
    };

    const canSearch = selectedDestination || selectedDepart;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={resetAndClose}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        marginTop: Platform.OS === 'ios' ? 50 : 30,
                        borderTopLeftRadius: 30,
                        borderTopRightRadius: 30,
                    }}
                >
                    {/* Header */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
                        <View className="flex-row justify-between items-center mb-4">
                            <Text style={{ color: '#1e3a8a', fontSize: 22, fontWeight: 'bold' }}>
                                Où voulez-vous aller ?
                            </Text>
                            <TouchableOpacity
                                onPress={resetAndClose}
                                style={{ backgroundColor: '#f3f4f6', padding: 8, borderRadius: 20 }}
                            >
                                <Ionicons name="close" size={24} color="#1e3a8a" />
                            </TouchableOpacity>
                        </View>

                        {/* Champs Départ / Destination */}
                        <View className="bg-slate-50 rounded-2xl p-4" style={{ borderWidth: 1, borderColor: '#e2e8f0' }}>
                            {/* Départ */}
                            <TouchableOpacity
                                onPress={() => setActiveField('depart')}
                                activeOpacity={0.8}
                            >
                                <View
                                    className="flex-row items-center rounded-xl px-3 py-3 mb-2"
                                    style={{
                                        backgroundColor: activeField === 'depart' ? '#ffffff' : '#f8fafc',
                                        borderWidth: activeField === 'depart' ? 2 : 1,
                                        borderColor: activeField === 'depart' ? '#3b82f6' : '#e2e8f0',
                                    }}
                                >
                                    <View className="bg-blue-100 rounded-full p-1.5 mr-3">
                                        <Ionicons name="radio-button-on" size={14} color="#3b82f6" />
                                    </View>
                                    {activeField === 'depart' ? (
                                        <TextInput
                                            className="flex-1 text-slate-800 text-base"
                                            placeholder="D'où partez-vous ? (optionnel)"
                                            placeholderTextColor="#94a3b8"
                                            value={departSearch}
                                            onChangeText={(text) => {
                                                setDepartSearch(text);
                                                if (selectedDepart) setSelectedDepart(null);
                                            }}
                                            autoFocus={activeField === 'depart'}
                                        />
                                    ) : (
                                        <Text className={`flex-1 text-base ${selectedDepart ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                                            {selectedDepart ? selectedDepart.nom : "D'où partez-vous ? (optionnel)"}
                                        </Text>
                                    )}
                                    {selectedDepart && (
                                        <TouchableOpacity onPress={() => clearField('depart')} className="p-1">
                                            <Ionicons name="close-circle" size={18} color="#94a3b8" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Séparateur visuel avec points */}
                            <View className="flex-row items-center ml-6 my-0.5">
                                <View className="bg-blue-200 w-0.5 h-2" />
                            </View>

                            {/* Destination */}
                            <TouchableOpacity
                                onPress={() => setActiveField('destination')}
                                activeOpacity={0.8}
                            >
                                <View
                                    className="flex-row items-center rounded-xl px-3 py-3"
                                    style={{
                                        backgroundColor: activeField === 'destination' ? '#ffffff' : '#f8fafc',
                                        borderWidth: activeField === 'destination' ? 2 : 1,
                                        borderColor: activeField === 'destination' ? '#10b981' : '#e2e8f0',
                                    }}
                                >
                                    <View className="bg-emerald-100 rounded-full p-1.5 mr-3">
                                        <Ionicons name="location" size={14} color="#10b981" />
                                    </View>
                                    {activeField === 'destination' ? (
                                        <TextInput
                                            className="flex-1 text-slate-800 text-base"
                                            placeholder="Où allez-vous ?"
                                            placeholderTextColor="#94a3b8"
                                            value={destinationSearch}
                                            onChangeText={(text) => {
                                                setDestinationSearch(text);
                                                if (selectedDestination) setSelectedDestination(null);
                                            }}
                                            autoFocus={activeField === 'destination'}
                                        />
                                    ) : (
                                        <Text className={`flex-1 text-base ${selectedDestination ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                                            {selectedDestination ? selectedDestination.nom : 'Où allez-vous ?'}
                                        </Text>
                                    )}
                                    {selectedDestination && (
                                        <TouchableOpacity onPress={() => clearField('destination')} className="p-1">
                                            <Ionicons name="close-circle" size={18} color="#94a3b8" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Liste des provinces */}
                    <View style={{ flex: 1, paddingHorizontal: 20 }}>
                        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3 ml-1">
                            {activeField === 'depart' ? 'Choisir le départ' : 'Choisir la destination'}
                        </Text>

                        {loadingProvinces ? (
                            <View className="items-center py-12">
                                <ActivityIndicator color="#3b82f6" size="small" />
                                <Text className="text-slate-400 mt-3 text-sm">Chargement des provinces...</Text>
                            </View>
                        ) : (
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: 20 }}
                            >
                                {filteredProvinces.length > 0 ? (
                                    filteredProvinces.map((province) => {
                                        const isSelected = activeField === 'depart'
                                            ? selectedDepart?.id === province.id
                                            : selectedDestination?.id === province.id;

                                        return (
                                            <TouchableOpacity
                                                key={province.id}
                                                onPress={() => selectProvince(province)}
                                                className="flex-row items-center py-3.5 px-3 rounded-xl mb-1"
                                                style={{
                                                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View
                                                    className="rounded-full p-2 mr-3"
                                                    style={{
                                                        backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="location-outline"
                                                        size={18}
                                                        color={isSelected ? '#2563eb' : '#94a3b8'}
                                                    />
                                                </View>
                                                <Text
                                                    className="flex-1 text-base"
                                                    style={{
                                                        color: isSelected ? '#1e3a8a' : '#374151',
                                                        fontWeight: isSelected ? '700' : '400',
                                                    }}
                                                >
                                                    {province.nom}
                                                </Text>
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <View className="items-center py-8">
                                        <Ionicons name="search-outline" size={32} color="#cbd5e1" />
                                        <Text className="text-slate-400 text-sm mt-2">Aucune province trouvée</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>

                    {/* Bouton Rechercher */}
                    <View
                        style={{
                            paddingHorizontal: 20,
                            paddingBottom: Platform.OS === 'ios' ? 34 : 20,
                            paddingTop: 12,
                            borderTopWidth: 1,
                            borderTopColor: '#f1f5f9',
                        }}
                    >
                        {/* Résumé de la sélection */}
                        {(selectedDepart || selectedDestination) && (
                            <View className="flex-row items-center mb-3 px-2">
                                {selectedDepart && (
                                    <View className="flex-row items-center mr-2">
                                        <Ionicons name="radio-button-on" size={10} color="#3b82f6" />
                                        <Text className="text-slate-600 text-xs ml-1">{selectedDepart.nom}</Text>
                                    </View>
                                )}
                                {selectedDepart && selectedDestination && (
                                    <Ionicons name="arrow-forward" size={12} color="#cbd5e1" style={{ marginRight: 8 }} />
                                )}
                                {selectedDestination && (
                                    <View className="flex-row items-center">
                                        <Ionicons name="location" size={10} color="#10b981" />
                                        <Text className="text-slate-600 text-xs ml-1">{selectedDestination.nom}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={handleSearch}
                            disabled={!canSearch || searching}
                            activeOpacity={0.8}
                        >
                            <View
                                className="rounded-2xl overflow-hidden"
                                style={{ opacity: canSearch && !searching ? 1 : 0.5 }}
                            >
                                <LinearGradient
                                    colors={['#1e40af', '#3b82f6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="py-4 flex-row items-center justify-center"
                                    style={{ elevation: 4 }}
                                >
                                    {searching ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="search" size={20} color="#fff" style={{ marginRight: 8 }} />
                                            <Text className="text-white font-bold text-base">Rechercher des voyages</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
