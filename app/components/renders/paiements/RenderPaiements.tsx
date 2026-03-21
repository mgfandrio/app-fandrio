import { Ionicons } from '@expo/vector-icons';
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

export const RenderPaiements = () => {
    const { showDialog, DialogComponent } = useConfirmDialog();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modesPaiement, setModesPaiement] = useState<ModePaiementDetail[]>([]);
    const [compId, setCompId] = useState<number | null>(null);

    const PAYMENT_METHODS = [
        { id: 2, nom: 'MVola', prefixes: ['034', '038'] },
        { id: 1, nom: 'Orange Money', prefixes: ['032', '037'] },
        { id: 3, nom: 'Airtel Money', prefixes: ['033'] },
    ];

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
            <View className="flex-1 items-center justify-center p-4">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="mt-4 text-gray-500">Chargement de vos modes de paiement...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1">
            <DialogComponent />
            <ScrollView className="flex-1 px-4 pt-6 pb-20">
                <View className="mb-6">
                    <Text className="text-2xl font-bold text-gray-900 mb-2">Modes de Paiement</Text>
                    <Text className="text-gray-500 text-sm">
                        Gérez les modes de paiement que vos clients utiliseront pour réserver.
                    </Text>
                </View>

                {/* Boutons de sélection */}
                <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 shadow-sm">
                    <Text className="text-gray-900 font-bold text-base mb-4">Choisir les opérateurs</Text>
                    <View className="flex-row flex-wrap">
                        {PAYMENT_METHODS.map((method) => {
                            const isSelected = modesPaiement.some(m => m.id === method.id);
                            return (
                                <TouchableOpacity
                                    key={method.id}
                                    className={`rounded-xl px-4 py-3 mr-3 mb-3 flex-row items-center border ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'}`}
                                    onPress={() => {
                                        if (isSelected) {
                                            setModesPaiement(modesPaiement.filter(m => m.id !== method.id));
                                        } else {
                                            setModesPaiement([...modesPaiement, { id: method.id, numero: '', titulaire: '' }]);
                                        }
                                    }}
                                    disabled={saving}
                                >
                                    <Ionicons
                                        name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                                        size={20}
                                        color={isSelected ? "#fff" : "#4b5563"}
                                        style={{ marginRight: 8 }}
                                    />
                                    <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                                        {method.nom}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Formulaires détaillés */}
                {modesPaiement.length > 0 ? (
                    modesPaiement.map((mode) => {
                        const methodConfig = PAYMENT_METHODS.find(m => m.id === mode.id);
                        return (
                            <View key={mode.id} className="bg-white border border-gray-100 rounded-3xl p-5 mb-5 shadow-sm">
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-row items-center">
                                        <View className="bg-blue-100 rounded-2xl w-10 h-10 items-center justify-center mr-3">
                                            <Ionicons name="card" size={20} color="#3b82f6" />
                                        </View>
                                        <Text className="font-bold text-xl text-gray-800">{methodConfig?.nom}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setModesPaiement(modesPaiement.filter(m => m.id !== mode.id))}
                                        className="p-2"
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>

                                <View className="mb-4">
                                    <Text className="text-sm font-medium text-gray-700 mb-2 ml-1">
                                        Numéro de téléphone
                                    </Text>
                                    <View className="relative">
                                        <TextInput
                                            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
                                            value={mode.numero}
                                            onChangeText={(text) => {
                                                const newModes = modesPaiement.map(m =>
                                                    m.id === mode.id ? { ...m, numero: text } : m
                                                );
                                                setModesPaiement(newModes);
                                            }}
                                            placeholder="03X XX XXX XX"
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                        />
                                        <View className="absolute right-4 top-3">
                                            <Text className="text-[10px] text-gray-400 font-bold uppercase">
                                                {methodConfig?.prefixes.join('/')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View>
                                    <Text className="text-sm font-medium text-gray-700 mb-2 ml-1">
                                        Titulaire du compte
                                    </Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
                                        value={mode.titulaire}
                                        onChangeText={(text) => {
                                            const newModes = modesPaiement.map(m =>
                                                m.id === mode.id ? { ...m, titulaire: text } : m
                                            );
                                            setModesPaiement(newModes);
                                        }}
                                        placeholder="Nom complet"
                                    />
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View className="bg-white border border-dashed border-gray-300 rounded-3xl p-10 items-center justify-center">
                        <Ionicons name="card-outline" size={48} color="#9ca3af" />
                        <Text className="text-gray-500 text-center mt-4">
                            Aucun mode de paiement sélectionné.{"\n"}Veuillez en choisir un ci-dessus.
                        </Text>
                    </View>
                )}

                {/* Espace pour le scroll */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bouton de sauvegarde flottant */}
            <View className="absolute bottom-6 left-6 right-6">
                <TouchableOpacity
                    className={`bg-blue-600 rounded-2xl py-4 flex-row items-center justify-center shadow-lg ${saving ? 'opacity-70' : ''}`}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
                    ) : (
                        <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                    )}
                    <Text className="text-white font-bold text-lg">Enregistrer les modifications</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
