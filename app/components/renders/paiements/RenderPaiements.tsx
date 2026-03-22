import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import compagnieService from '../../../services/compagnies/compagnieService';
import { ModePaiementDetail } from '../../../types/compagnie';

const PAYMENT_METHODS = [
    { id: 2, nom: 'MVola', prefixes: ['034', '038'], colors: ['#dc2626', '#ef4444'] as [string, string], icon: 'phone-portrait' as const },
    { id: 1, nom: 'Orange Money', prefixes: ['032', '037'], colors: ['#ea580c', '#f97316'] as [string, string], icon: 'phone-portrait' as const },
    { id: 3, nom: 'Airtel Money', prefixes: ['033'], colors: ['#dc2626', '#b91c1c'] as [string, string], icon: 'phone-portrait' as const },
];

export const RenderPaiements = () => {
    const { showDialog, DialogComponent } = useConfirmDialog();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modesPaiement, setModesPaiement] = useState<ModePaiementDetail[]>([]);
    const [compId, setCompId] = useState<number | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const userJson = await SecureStore.getItemAsync('fandrioUser');
                if (userJson) {
                    const user = JSON.parse(userJson);
                    const companyId = user.compagnie_id || user.comp_id;
                    setCompId(companyId);

                    if (companyId) {
                        const response = await compagnieService.getCompagniePublic(companyId);
                        if (response.statut && 'data' in response && response.data) {
                            const compagnie = response.data;
                            if (compagnie.modes_paiement_acceptes) {
                                const selectedModes = compagnie.modes_paiement_acceptes.map(m => ({
                                    id: m.id,
                                    numero: m.numero || '',
                                    titulaire: m.titulaire || '',
                                }));
                                setModesPaiement(selectedModes);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading company payment data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const response = await compagnieService.updateModesPaiement(modesPaiement);
        setSaving(false);

        if (response.statut) {
            showDialog({
                title: 'Succès',
                message: 'Vos modes de paiement ont été mis à jour.',
                type: 'success',
                confirmText: 'OK',
            });
        } else {
            showDialog({
                title: 'Erreur',
                message: response.message || 'Une erreur est survenue lors de la mise à jour.',
                type: 'danger',
                confirmText: 'Réessayer',
            });
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-slate-50">
                <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden' }}>
                    <LinearGradient colors={['#059669', '#10b981']} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color="#fff" />
                    </LinearGradient>
                </View>
                <Text className="mt-4 text-slate-500 text-sm">Chargement de vos modes de paiement...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            <DialogComponent />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Hero Header */}
                <View className="mx-4 mt-5 rounded-3xl overflow-hidden" style={{ elevation: 4 }}>
                    <LinearGradient colors={['#059669', '#10b981', '#34d399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5">
                        <View className="flex-row items-center">
                            <View className="bg-white/20 rounded-2xl p-3 mr-4">
                                <Ionicons name="card" size={28} color="#fff" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white text-2xl font-bold">Paiements</Text>
                                <Text className="text-emerald-100 text-sm mt-0.5">
                                    Gérez les modes de paiement pour vos clients
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row mt-4">
                            <View className="bg-white/15 rounded-xl px-4 py-2 flex-row items-center">
                                <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                                <Text className="text-white text-sm font-medium">{modesPaiement.length} mode(s) activé(s)</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Selector section */}
                <View className="mx-4 mt-4 bg-white rounded-2xl p-4" style={{ elevation: 2 }}>
                    <Text className="text-slate-800 font-bold text-base mb-3">Choisir les opérateurs</Text>
                    <View className="flex-row flex-wrap">
                        {PAYMENT_METHODS.map((method) => {
                            const isSelected = modesPaiement.some(m => m.id === method.id);
                            return (
                                <TouchableOpacity
                                    key={method.id}
                                    className="mr-3 mb-3"
                                    onPress={() => {
                                        if (isSelected) {
                                            setModesPaiement(modesPaiement.filter(m => m.id !== method.id));
                                        } else {
                                            setModesPaiement([...modesPaiement, { id: method.id, numero: '', titulaire: '' }]);
                                        }
                                    }}
                                    disabled={saving}
                                    activeOpacity={0.8}
                                >
                                    {isSelected ? (
                                        <View className="rounded-2xl overflow-hidden">
                                            <LinearGradient
                                                colors={method.colors}
                                                className="px-4 py-3 flex-row items-center"
                                            >
                                                <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                                                <Text className="text-white font-bold">{method.nom}</Text>
                                            </LinearGradient>
                                        </View>
                                    ) : (
                                        <View className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex-row items-center">
                                            <Ionicons name="add-circle-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                                            <Text className="text-slate-500 font-semibold">{method.nom}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Payment form cards */}
                <View className="px-4 mt-4 pb-28">
                    {modesPaiement.length > 0 ? (
                        modesPaiement.map((mode) => {
                            const methodConfig = PAYMENT_METHODS.find(m => m.id === mode.id);
                            if (!methodConfig) return null;
                            return (
                                <View key={mode.id} className="bg-white rounded-2xl mb-4 overflow-hidden" style={{ elevation: 2 }}>
                                    {/* Colored accent bar */}
                                    <LinearGradient
                                        colors={methodConfig.colors}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ height: 3 }}
                                    />
                                    <View className="p-5">
                                        <View className="flex-row items-center justify-between mb-5">
                                            <View className="flex-row items-center">
                                                <View className="rounded-xl overflow-hidden mr-3">
                                                    <LinearGradient colors={methodConfig.colors} className="w-10 h-10 items-center justify-center">
                                                        <Ionicons name="wallet" size={20} color="#fff" />
                                                    </LinearGradient>
                                                </View>
                                                <View>
                                                    <Text className="font-bold text-lg text-slate-800">{methodConfig.nom}</Text>
                                                    <Text className="text-slate-400 text-xs">Préfixes: {methodConfig.prefixes.join(' / ')}</Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => setModesPaiement(modesPaiement.filter(m => m.id !== mode.id))}
                                                className="bg-red-50 rounded-xl p-2.5"
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>

                                        <View className="mb-4">
                                            <Text className="text-sm font-semibold text-slate-600 mb-2 ml-1">
                                                Numéro de téléphone
                                            </Text>
                                            <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4">
                                                <Ionicons name="call-outline" size={18} color="#94a3b8" />
                                                <TextInput
                                                    className="flex-1 ml-3 py-3.5 text-slate-800 text-base"
                                                    value={mode.numero}
                                                    onChangeText={(text) => {
                                                        const newModes = modesPaiement.map(m =>
                                                            m.id === mode.id ? { ...m, numero: text } : m
                                                        );
                                                        setModesPaiement(newModes);
                                                    }}
                                                    placeholder="03X XX XXX XX"
                                                    placeholderTextColor="#94a3b8"
                                                    keyboardType="phone-pad"
                                                    maxLength={10}
                                                />
                                            </View>
                                        </View>

                                        <View>
                                            <Text className="text-sm font-semibold text-slate-600 mb-2 ml-1">
                                                Titulaire du compte
                                            </Text>
                                            <View className="bg-slate-50 border border-slate-200 rounded-xl flex-row items-center px-4">
                                                <Ionicons name="person-outline" size={18} color="#94a3b8" />
                                                <TextInput
                                                    className="flex-1 ml-3 py-3.5 text-slate-800 text-base"
                                                    value={mode.titulaire}
                                                    onChangeText={(text) => {
                                                        const newModes = modesPaiement.map(m =>
                                                            m.id === mode.id ? { ...m, titulaire: text } : m
                                                        );
                                                        setModesPaiement(newModes);
                                                    }}
                                                    placeholder="Nom complet"
                                                    placeholderTextColor="#94a3b8"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <View className="bg-white rounded-3xl p-10 items-center" style={{ elevation: 2 }}>
                            <View className="bg-slate-100 rounded-full p-5 mb-4">
                                <Ionicons name="card-outline" size={48} color="#94a3b8" />
                            </View>
                            <Text className="text-slate-800 font-bold text-lg">Aucun mode sélectionné</Text>
                            <Text className="text-slate-400 text-sm mt-2 text-center leading-5">
                                Choisissez un opérateur ci-dessus pour{"\n"}configurer vos modes de paiement
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Floating save button with gradient */}
            <View className="absolute bottom-6 left-4 right-4">
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    <View className="rounded-2xl overflow-hidden" style={{ elevation: 4 }}>
                        <LinearGradient
                            colors={saving ? ['#94a3b8', '#94a3b8'] : ['#059669', '#10b981']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="py-4 flex-row items-center justify-center"
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
                            ) : (
                                <Ionicons name="save" size={20} color="#fff" style={{ marginRight: 10 }} />
                            )}
                            <Text className="text-white font-bold text-lg">Enregistrer les modifications</Text>
                        </LinearGradient>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};
