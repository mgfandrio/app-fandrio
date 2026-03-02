import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Platform, ActivityIndicator } from 'react-native';
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
            const [provResp, compResp] = await Promise.all([
                provinceService.listerProvinces(),
                compagnieService.listerCompagniesGenerique()
            ]);

            if (provResp && 'statut' in provResp && provResp.statut !== false) {
                setProvinces((provResp as any).data.provinces || []);
            }

            if (compResp && 'statut' in compResp && compResp.statut !== false) {
                setCompagnies((compResp as any).data.compagnies || []);
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
            <View className="flex-1 bg-black/60 justify-end">
                <View
                    style={{
                        backgroundColor: '#ffffff',
                        borderTopLeftRadius: 35,
                        borderTopRightRadius: 35,
                        paddingTop: 24,
                        paddingBottom: Platform.OS === 'ios' ? 40 : 30,
                        maxHeight: '90%'
                    }}
                    className="px-6"
                >
                    {/* Header Modal */}
                    <View className="flex-row justify-between items-center mb-6">
                        <View>
                            <Text style={{ color: '#1e3a8a' }} className="text-2xl font-bold">Filtres de recherche</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="bg-gray-100 p-2 rounded-full"
                        >
                            <Ionicons name="close" size={24} color="#1e3a8a" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Province Depart */}
                        <Text className="text-gray-700 font-bold mb-2 ml-1">Départ</Text>
                        <View className="flex-row flex-wrap mb-6">
                            <TouchableOpacity
                                onPress={() => setSearchFilters(f => ({ ...f, pro_depart: '' }))}
                                className={`px-4 py-2.5 rounded-2xl border mr-2 mb-2 ${searchFilters.pro_depart === '' ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'bg-white border-gray-200'}`}
                            >
                                <Text className={searchFilters.pro_depart === '' ? 'text-white font-bold' : 'text-gray-600'}>Tous</Text>
                            </TouchableOpacity>
                            {provinces.map((p) => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => setSearchFilters(f => ({ ...f, pro_depart: p.id.toString() }))}
                                    className={`px-4 py-2.5 rounded-2xl border mr-2 mb-2 ${searchFilters.pro_depart === p.id.toString() ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={searchFilters.pro_depart === p.id.toString() ? 'text-white font-bold' : 'text-gray-600'}>{p.nom}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Province Arrivee */}
                        <Text className="text-gray-700 font-bold mb-2 ml-1">Destination</Text>
                        <View className="flex-row flex-wrap mb-6">
                            <TouchableOpacity
                                onPress={() => setSearchFilters(f => ({ ...f, pro_arrivee: '' }))}
                                className={`px-4 py-2.5 rounded-2xl border mr-2 mb-2 ${searchFilters.pro_arrivee === '' ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'bg-white border-gray-200'}`}
                            >
                                <Text className={searchFilters.pro_arrivee === '' ? 'text-white font-bold' : 'text-gray-600'}>Tous</Text>
                            </TouchableOpacity>
                            {provinces.map((p) => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => setSearchFilters(f => ({ ...f, pro_arrivee: p.id.toString() }))}
                                    className={`px-4 py-2.5 rounded-2xl border mr-2 mb-2 ${searchFilters.pro_arrivee === p.id.toString() ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={searchFilters.pro_arrivee === p.id.toString() ? 'text-white font-bold' : 'text-gray-600'}>{p.nom}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Date */}
                        <Text className="text-gray-700 font-bold mb-2 ml-1">Date du voyage</Text>
                        <View className="flex-row flex-wrap mb-6">
                            {[
                                { label: 'Indifférent', value: '' },
                                { label: "Aujourd'hui", value: new Date().toISOString().split('T')[0] },
                                { label: 'Demain', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
                            ].map((d) => (
                                <TouchableOpacity
                                    key={d.label}
                                    onPress={() => setSearchFilters(f => ({ ...f, date_exacte: d.value }))}
                                    className={`px-4 py-2.5 rounded-2xl border mr-2 mb-2 ${searchFilters.date_exacte === d.value ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={searchFilters.date_exacte === d.value ? 'text-white font-bold' : 'text-gray-600'}>{d.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Compagnie */}
                        <Text className="text-gray-700 font-bold mb-2 ml-1">Compagnie</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
                            <TouchableOpacity
                                onPress={() => setSearchFilters(f => ({ ...f, compagnie_id: '' }))}
                                className={`px-4 py-2.5 rounded-2xl border mr-2 ${searchFilters.compagnie_id === '' ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'bg-white border-gray-200'}`}
                            >
                                <Text className={searchFilters.compagnie_id === '' ? 'text-white font-bold' : 'text-gray-600'}>Toutes</Text>
                            </TouchableOpacity>
                            {compagnies.map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => setSearchFilters(f => ({ ...f, compagnie_id: (c.id || '').toString() }))}
                                    className={`px-4 py-2.5 rounded-2xl border mr-2 ${searchFilters.compagnie_id === (c.id || '').toString() ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={searchFilters.compagnie_id === (c.id || '').toString() ? 'text-white font-bold' : 'text-gray-600'}>{c.nom}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Type Voyage */}
                        <Text className="text-gray-700 font-bold mb-2 ml-1">Type de voyage</Text>
                        <View className="flex-row mb-6">
                            {[
                                { label: 'Tous', value: '' },
                                { label: 'Jour', value: '1' },
                                { label: 'Nuit', value: '2' }
                            ].map((t) => (
                                <TouchableOpacity
                                    key={t.value}
                                    onPress={() => setSearchFilters(f => ({ ...f, type_voyage: t.value }))}
                                    className={`flex-1 py-3 items-center rounded-2xl border mr-2 ${searchFilters.type_voyage === t.value ? 'bg-[#1e3a8a] border-[#1e3a8a]' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={searchFilters.type_voyage === t.value ? 'text-white font-bold' : 'text-gray-600'}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Prix Max */}
                        <Text className="text-gray-700 font-bold mb-2 ml-1">Budget Maximum (Ar)</Text>
                        <View className="bg-gray-50 rounded-2xl px-4 py-3 mb-6 border border-gray-100">
                            <TextInput
                                placeholder="Ex: 50000"
                                keyboardType="numeric"
                                value={searchFilters.prix_max}
                                onChangeText={(val) => setSearchFilters(f => ({ ...f, prix_max: val }))}
                                className="text-gray-800 font-semibold"
                            />
                        </View>

                        {/* Places Min */}
                        <Text className="text-gray-700 font-bold mb-2 ml-1">Places nécessaires</Text>
                        <View className="flex-row items-center justify-between bg-blue-50/50 p-4 rounded-3xl mb-10">
                            <TouchableOpacity
                                onPress={() => {
                                    const current = parseInt(searchFilters.places_min) || 1;
                                    if (current > 1) setSearchFilters(f => ({ ...f, places_min: (current - 1).toString() }));
                                }}
                                className="bg-white p-2 rounded-xl shadow-sm"
                            >
                                <Ionicons name="remove" size={24} color="#1e3a8a" />
                            </TouchableOpacity>
                            <Text style={{ color: '#1e3a8a' }} className="text-2xl font-bold">{searchFilters.places_min}</Text>
                            <TouchableOpacity
                                onPress={() => setSearchFilters(f => ({ ...f, places_min: (parseInt(searchFilters.places_min) + 1).toString() }))}
                                className="bg-white p-2 rounded-xl shadow-sm"
                            >
                                <Ionicons name="add" size={24} color="#1e3a8a" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity
                                onPress={resetFilters}
                                className="flex-1 py-4 bg-gray-100 rounded-2xl items-center mr-4"
                            >
                                <Text className="text-gray-500 font-bold">Réinitialiser</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSearch}
                                style={{ backgroundColor: '#1e3a8a' }}
                                className="flex-[2] py-4 rounded-2xl items-center shadow-md"
                            >
                                <Text className="text-white font-bold text-lg">Appliquer</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
