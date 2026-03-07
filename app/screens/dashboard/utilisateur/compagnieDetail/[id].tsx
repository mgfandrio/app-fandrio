import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { voyageService } from '@/app/services/voyages/voyageService';
import { CompagnieDetaillee } from '@/app/types/compagnie';

const { width } = Dimensions.get('window');

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
    }, [id]);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const res = await compagnieService.getCompagniePublic(Number(id));
            if (res && 'statut' in res && res.statut !== false && 'data' in res) {
                setCompagnie(res.data);
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVoyages = async () => {
        try {
            setLoadingVoyages(true);
            const res = await voyageService.rechercherVoyages({
                compagnie_id: Number(id),
                per_page: 5
            });
            if (res.statut) {
                setVoyages(res.data);
            }
        } catch (error) {
            console.error('Error fetching company voyages:', error);
        } finally {
            setLoadingVoyages(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text className="mt-4 text-gray-500 font-medium">Chargement des informations...</Text>
            </View>
        );
    }

    if (!compagnie) {
        return (
            <View className="flex-1 items-center justify-center bg-white px-6">
                <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                <Text className="mt-4 text-gray-900 font-bold text-xl text-center">Compagnie non trouvée</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-6 bg-[#1e3a8a] px-8 py-3 rounded-2xl"
                >
                    <Text className="text-white font-bold">Retourner à la liste</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            {/* Custom Header with Back Button */}
            <View
                style={{ paddingTop: insets.top + 10 }}
                className="px-6 pb-4 flex-row items-center border-b border-gray-100 z-10 bg-white"
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100"
                >
                    <Ionicons name="chevron-back" size={24} color="#1e3a8a" />
                </TouchableOpacity>
                <Text className="ml-4 text-gray-900 font-bold text-lg" numberOfLines={1}>
                    {compagnie.nom}
                </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {/* Banner / Identity Section */}
                <View className="items-center py-8 px-6 bg-blue-50/30">
                    <View className="w-32 h-32 bg-white rounded-3xl items-center justify-center shadow-md border border-gray-100 overflow-hidden">
                        {compagnie.logo ? (
                            <Image
                                source={{ uri: compagnie.logo }}
                                className="w-full h-full"
                                resizeMode="contain"
                            />
                        ) : (
                            <Ionicons name="business" size={64} color="#cbd5e1" />
                        )}
                    </View>
                    <Text className="mt-6 text-gray-900 font-bold text-2xl text-center">
                        {compagnie.nom}
                    </Text>
                    {compagnie.localisation && (
                        <View className="flex-row items-center mt-2 bg-white px-4 py-1.5 rounded-full border border-blue-100">
                            <Ionicons name="location-sharp" size={16} color="#1e3a8a" />
                            <Text className="ml-1.5 text-[#1e3a8a] font-semibold">
                                {compagnie.localisation.nom}
                            </Text>
                        </View>
                    )}
                </View>

                <View className="p-6">
                    {/* À Propos */}
                    <View className="mb-8">
                        <View className="flex-row items-center mb-3">
                            <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center mr-3">
                                <Ionicons name="information-circle" size={20} color="#1e3a8a" />
                            </View>
                            <Text style={{ color: '#1e3a8a' }} className="text-lg font-bold">À propos</Text>
                        </View>
                        <Text className="text-gray-600 leading-6 text-base">
                            {compagnie.description || "Aucune description disponible pour cette compagnie."}
                        </Text>
                    </View>

                    {/* Contact Details */}
                    <View className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <Text className="text-gray-900 font-bold text-lg mb-4">Infos de contact</Text>

                        <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${compagnie.telephone}`)}
                            className="flex-row items-center mb-4"
                        >
                            <View className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm mr-3">
                                <Ionicons name="call" size={18} color="#1e3a8a" />
                            </View>
                            <View>
                                <Text className="text-gray-400 text-xs">Téléphone</Text>
                                <Text className="text-gray-900 font-semibold">{compagnie.telephone}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => Linking.openURL(`mailto:${compagnie.email}`)}
                            className="flex-row items-center mb-4"
                        >
                            <View className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm mr-3">
                                <Ionicons name="mail" size={18} color="#1e3a8a" />
                            </View>
                            <View>
                                <Text className="text-gray-400 text-xs">Email</Text>
                                <Text className="text-gray-900 font-semibold">{compagnie.email}</Text>
                            </View>
                        </TouchableOpacity>

                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm mr-3">
                                <Ionicons name="map" size={18} color="#1e3a8a" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-xs">Adresse</Text>
                                <Text className="text-gray-900 font-semibold">{compagnie.adresse}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Zones desservies */}
                    <View className="mb-8">
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center mr-3">
                                <Ionicons name="trail-sign" size={20} color="#1e3a8a" />
                            </View>
                            <Text style={{ color: '#1e3a8a' }} className="text-lg font-bold">Zones desservies</Text>
                        </View>
                        <View className="flex-row flex-wrap">
                            {compagnie.provinces && compagnie.provinces.length > 0 ? (
                                compagnie.provinces.map((prov, idx) => (
                                    <View key={idx} className="bg-blue-50 px-4 py-2 rounded-xl mr-2 mb-2 border border-blue-100">
                                        <Text className="text-[#1e3a8a] font-medium">{prov}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text className="text-gray-400 italic">Non spécifié</Text>
                            )}
                        </View>
                    </View>

                    {/* Modes de paiement */}
                    <View className="mb-10">
                        <Text className="text-gray-900 font-bold text-lg mb-4">Modes de paiement acceptés</Text>
                        <View className="flex-row items-center">
                            {compagnie.modes_paiement_acceptes && compagnie.modes_paiement_acceptes.length > 0 ? (
                                compagnie.modes_paiement_acceptes.map((mode, idx) => (
                                    <View key={idx} className="items-center mr-6">
                                        <View className="w-14 h-14 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100 mb-2">
                                            <Ionicons
                                                name={mode.type === 'mobile' ? 'phone-portrait-outline' : 'card-outline'}
                                                size={28}
                                                color="#4b5563"
                                            />
                                        </View>
                                        <Text className="text-gray-600 text-[10px] font-bold uppercase">{mode.nom}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text className="text-gray-400 italic">Non spécifié</Text>
                            )}
                        </View>
                    </View>

                    {/* Voyages à venir */}
                    <View className="mb-10">
                        <View className="flex-row justify-between items-center mb-5">
                            <Text className="text-gray-900 font-bold text-xl">Voyages à venir</Text>
                            {voyages.length > 0 && (
                                <TouchableOpacity>
                                    <Text className="text-[#1e3a8a] font-semibold">Toutes les offres</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {loadingVoyages ? (
                            <ActivityIndicator color="#1e3a8a" />
                        ) : voyages.length > 0 ? (
                            voyages.map((voyage) => (
                                <TouchableOpacity
                                    key={voyage.voyage_id}
                                    className="bg-white rounded-3xl mb-4 shadow-sm border border-gray-100 p-4 flex-row items-center"
                                >
                                    <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center mr-4">
                                        <Ionicons name={voyage.type === 'jour' ? 'sunny' : 'moon'} size={24} color="#1e3a8a" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>{voyage.trajet?.nom}</Text>
                                        <Text className="text-gray-500 text-xs">
                                            {voyage.date} • {voyage.heure_depart}
                                        </Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-[#1e3a8a] font-bold text-base">
                                            {voyage.trajet?.tarif?.toLocaleString()} Ar
                                        </Text>
                                        <View className="bg-blue-100 px-2 py-0.5 rounded-md mt-1">
                                            <Text className="text-[#1e3a8a] text-[10px] font-bold">{voyage.places_disponibles} pl.</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View className="py-8 items-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <Text className="text-gray-400 italic">Aucun voyage programmé pour le moment</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View className="h-10" />
            </ScrollView>

            {/* Booking CTA for this company */}
            <View
                style={{ paddingBottom: Math.max(insets.bottom, 20) }}
                className="px-6 pt-4 border-t border-gray-100 bg-white shadow-2xl"
            >
                <TouchableOpacity
                    style={{ backgroundColor: '#1e3a8a' }}
                    className="w-full py-4 rounded-2xl items-center shadow-lg"
                    onPress={() => router.push({ pathname: '/screens/dashboard/utilisateur/(tabs)/accueil', params: { openSearch: 'true', initialCompagnie: compagnie.id } })}
                >
                    <Text className="text-white font-bold text-lg">Rechercher un voyage</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
