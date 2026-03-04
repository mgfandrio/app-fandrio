import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { provinceService } from '@/app/services/provinces/provinceService';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { voyageService } from '@/app/services/voyages/voyageService';

interface RechercheFilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (voyages: any[]) => void;
    setLoading: (loading: boolean) => void;
}

// Composant dropdown recherchable réutilisable
function SearchableDropdown({
    label,
    placeholder,
    data,
    selectedId,
    onSelect,
    displayKey = 'nom',
    valueKey = 'id',
}: {
    label: string;
    placeholder: string;
    data: any[];
    selectedId: string;
    onSelect: (id: string) => void;
    displayKey?: string;
    valueKey?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState('');

    const selectedItem = data.find(item => (item[valueKey] || '').toString() === selectedId);
    const filteredData = data.filter(item =>
        (item[displayKey] || '').toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#374151', fontWeight: 'bold', marginBottom: 8, marginLeft: 4 }}>{label}</Text>

            {/* Bouton d'ouverture du dropdown */}
            <TouchableOpacity
                onPress={() => setIsOpen(!isOpen)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f9fafb',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderWidth: 1,
                    borderColor: isOpen ? '#1e3a8a' : '#e5e7eb',
                }}
            >
                <Text style={{
                    color: selectedItem ? '#1f2937' : '#9ca3af',
                    fontWeight: selectedItem ? '600' : '400',
                    fontSize: 15,
                }}>
                    {selectedItem ? selectedItem[displayKey] : placeholder}
                </Text>
                <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#1e3a8a"
                />
            </TouchableOpacity>

            {/* Liste déroulante */}
            {isOpen && (
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 4,
                }}>
                    {/* Champ de recherche */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f3f4f6',
                        backgroundColor: '#f9fafb',
                    }}>
                        <Ionicons name="search" size={18} color="#9ca3af" />
                        <TextInput
                            placeholder="Rechercher..."
                            placeholderTextColor="#9ca3af"
                            value={searchText}
                            onChangeText={setSearchText}
                            style={{
                                flex: 1,
                                marginLeft: 8,
                                fontSize: 14,
                                color: '#1f2937',
                                paddingVertical: 2,
                            }}
                            autoFocus
                        />
                        {searchText !== '' && (
                            <TouchableOpacity onPress={() => setSearchText('')}>
                                <Ionicons name="close-circle" size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Option "Tous" */}
                    <TouchableOpacity
                        onPress={() => {
                            onSelect('');
                            setIsOpen(false);
                            setSearchText('');
                        }}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            backgroundColor: selectedId === '' ? '#eff6ff' : 'transparent',
                            borderBottomWidth: 1,
                            borderBottomColor: '#f3f4f6',
                        }}
                    >
                        <Text style={{
                            color: selectedId === '' ? '#1e3a8a' : '#6b7280',
                            fontWeight: selectedId === '' ? 'bold' : '400',
                            fontSize: 14,
                        }}>
                            Tous
                        </Text>
                        {selectedId === '' && (
                            <Ionicons name="checkmark-circle" size={20} color="#1e3a8a" />
                        )}
                    </TouchableOpacity>

                    {/* Liste des items */}
                    <ScrollView
                        style={{ maxHeight: 180 }}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        {filteredData.length > 0 ? filteredData.map((item) => {
                            const itemId = (item[valueKey] || '').toString();
                            const isSelected = selectedId === itemId;
                            return (
                                <TouchableOpacity
                                    key={itemId}
                                    onPress={() => {
                                        onSelect(itemId);
                                        setIsOpen(false);
                                        setSearchText('');
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#f3f4f6',
                                    }}
                                >
                                    <Text style={{
                                        color: isSelected ? '#1e3a8a' : '#374151',
                                        fontWeight: isSelected ? 'bold' : '400',
                                        fontSize: 14,
                                    }}>
                                        {item[displayKey]}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={20} color="#1e3a8a" />
                                    )}
                                </TouchableOpacity>
                            );
                        }) : (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 13 }}>
                                    Aucun résultat
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );
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
