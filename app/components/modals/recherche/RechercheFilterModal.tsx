import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { provinceService } from '@/app/services/provinces/provinceService';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { voyageService } from '@/app/services/voyages/voyageService';
import { SearchableDropdown } from '@/app/components/common';

interface RechercheFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (voyages: any[]) => void;
    setLoading: (loading: boolean) => void;
}



export default function RechercheFilterModal({ visible, onClose, onApply, setLoading }: RechercheFilterModalProps) {
    const [provinces, setProvinces] = useState<any[]>([]);
    const [compagnies, setCompagnies] = useState<any[]>([]);
    const [searchFilters, setSearchFilters] = useState({
        pro_depart: '',
        pro_arrivee: '',
        compagnie_id: '',
        date_exacte: '',
        type_voyage: '',
        prix_max: '',
        places_min: '1'
    });

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
                const resp = provResp.value;
                if (resp && 'statut' in resp && resp.statut !== false) {
                    setProvinces((resp as any).data?.provinces || []);
                }
            }

            if (compResp.status === 'fulfilled') {
                const resp = compResp.value;
                if (resp && 'statut' in resp && resp.statut !== false) {
                    setCompagnies((resp as any).data?.compagnies || []);
                }
            }
        } catch (error) {
            console.error('Modal fetch data error:', error);
        }
    };

    const resetFilters = () => {
        setSearchFilters({
            pro_depart: '',
            pro_arrivee: '',
            compagnie_id: '',
            date_exacte: '',
            type_voyage: '',
            prix_max: '',
            places_min: '1'
        });
    };

    const handleSearch = async () => {
        onClose();
        setLoading(true);
        try {
            const criteres: any = { ...searchFilters };
            Object.keys(criteres).forEach(key => {
                if (criteres[key] === '') delete criteres[key];
            });

            const res = await voyageService.rechercherVoyages(criteres);
            if (res && 'statut' in res && res.statut) {
                onApply((res as any).data);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                <View
                    style={{
                        backgroundColor: '#ffffff',
                        borderTopLeftRadius: 35,
                        borderTopRightRadius: 35,
                        paddingTop: 24,
                        paddingHorizontal: 24,
                        paddingBottom: Platform.OS === 'ios' ? 40 : 30,
                        maxHeight: '90%'
                    }}
                >
                    {/* Header Modal */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Text style={{ color: '#1e3a8a', fontSize: 22, fontWeight: 'bold' }}>Filtres de recherche</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{ backgroundColor: '#f3f4f6', padding: 8, borderRadius: 20 }}
                        >
                            <Ionicons name="close" size={24} color="#1e3a8a" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                        {/* Province Depart - Dropdown recherchable */}
                        <SearchableDropdown
                            label="Départ"
                            placeholder="Sélectionner la province de départ"
                            data={provinces}
                            selectedId={searchFilters.pro_depart}
                            onSelect={(id) => setSearchFilters(f => ({ ...f, pro_depart: id }))}
                        />

                        {/* Province Arrivee - Dropdown recherchable */}
                        <SearchableDropdown
                            label="Destination"
                            placeholder="Sélectionner la destination"
                            data={provinces}
                            selectedId={searchFilters.pro_arrivee}
                            onSelect={(id) => setSearchFilters(f => ({ ...f, pro_arrivee: id }))}
                        />

                        {/* Date */}
                        <Text style={{ color: '#374151', fontWeight: 'bold', marginBottom: 8, marginLeft: 4 }}>Date du voyage</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                            {[
                                { label: 'Indifférent', value: '' },
                                { label: "Aujourd'hui", value: new Date().toISOString().split('T')[0] },
                                { label: 'Demain', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
                            ].map((d) => {
                                const isSelected = searchFilters.date_exacte === d.value;
                                return (
                                    <TouchableOpacity
                                        key={d.label}
                                        onPress={() => setSearchFilters(f => ({ ...f, date_exacte: d.value }))}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 10,
                                            borderRadius: 16,
                                            borderWidth: 1,
                                            marginRight: 8,
                                            marginBottom: 8,
                                            backgroundColor: isSelected ? '#1e3a8a' : '#ffffff',
                                            borderColor: isSelected ? '#1e3a8a' : '#e5e7eb',
                                        }}
                                    >
                                        <Text style={{
                                            color: isSelected ? '#ffffff' : '#6b7280',
                                            fontWeight: isSelected ? 'bold' : '400',
                                        }}>{d.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Compagnie */}
                        <SearchableDropdown
                            label="Compagnie"
                            placeholder="Sélectionner une compagnie"
                            data={compagnies}
                            selectedId={searchFilters.compagnie_id}
                            onSelect={(id) => setSearchFilters(f => ({ ...f, compagnie_id: id }))}
                        />

                        {/* Type Voyage */}
                        <Text style={{ color: '#374151', fontWeight: 'bold', marginBottom: 8, marginLeft: 4 }}>Type de voyage</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                            {[
                                { label: 'Tous', value: '' },
                                { label: 'Jour', value: '1' },
                                { label: 'Nuit', value: '2' }
                            ].map((t) => {
                                const isSelected = searchFilters.type_voyage === t.value;
                                return (
                                    <TouchableOpacity
                                        key={t.value}
                                        onPress={() => setSearchFilters(f => ({ ...f, type_voyage: t.value }))}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 12,
                                            alignItems: 'center',
                                            borderRadius: 16,
                                            borderWidth: 1,
                                            marginRight: 8,
                                            backgroundColor: isSelected ? '#1e3a8a' : '#ffffff',
                                            borderColor: isSelected ? '#1e3a8a' : '#e5e7eb',
                                        }}
                                    >
                                        <Text style={{
                                            color: isSelected ? '#ffffff' : '#6b7280',
                                            fontWeight: isSelected ? 'bold' : '400',
                                        }}>{t.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Prix Max */}
                        <Text style={{ color: '#374151', fontWeight: 'bold', marginBottom: 8, marginLeft: 4 }}>Tarif Maximum (Ar)</Text>
                        <View style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: 16,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            marginBottom: 20,
                            borderWidth: 1,
                            borderColor: '#f3f4f6',
                        }}>
                            <TextInput
                                placeholder="Ex: 50000"
                                placeholderTextColor="#9ca3af"
                                keyboardType="numeric"
                                value={searchFilters.prix_max}
                                onChangeText={(val) => setSearchFilters(f => ({ ...f, prix_max: val }))}
                                style={{ color: '#1f2937', fontWeight: '600', fontSize: 15 }}
                            />
                        </View>

                        {/* Places Min */}
                        <Text style={{ color: '#374151', fontWeight: 'bold', marginBottom: 8, marginLeft: 4 }}>Places nécessaires</Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#eff6ff',
                            padding: 16,
                            borderRadius: 20,
                            marginBottom: 30,
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    const current = parseInt(searchFilters.places_min) || 1;
                                    if (current > 1) setSearchFilters(f => ({ ...f, places_min: (current - 1).toString() }));
                                }}
                                style={{
                                    backgroundColor: '#ffffff',
                                    padding: 8,
                                    borderRadius: 12,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 2,
                                    elevation: 2,
                                }}
                            >
                                <Ionicons name="remove" size={24} color="#1e3a8a" />
                            </TouchableOpacity>
                            <Text style={{ color: '#1e3a8a', fontSize: 24, fontWeight: 'bold' }}>{searchFilters.places_min}</Text>
                            <TouchableOpacity
                                onPress={() => setSearchFilters(f => ({ ...f, places_min: (parseInt(searchFilters.places_min) + 1).toString() }))}
                                style={{
                                    backgroundColor: '#ffffff',
                                    padding: 8,
                                    borderRadius: 12,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 2,
                                    elevation: 2,
                                }}
                            >
                                <Ionicons name="add" size={24} color="#1e3a8a" />
                            </TouchableOpacity>
                        </View>

                        {/* Boutons */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TouchableOpacity
                                onPress={resetFilters}
                                style={{
                                    flex: 1,
                                    paddingVertical: 16,
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    marginRight: 12,
                                }}
                            >
                                <Text style={{ color: '#6b7280', fontWeight: 'bold' }}>Réinitialiser</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSearch}
                                style={{
                                    flex: 2,
                                    paddingVertical: 16,
                                    backgroundColor: '#1e3a8a',
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    shadowColor: '#1e3a8a',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Appliquer</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
