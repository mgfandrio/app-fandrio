import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
                const data = res.data;
                setVoyages(Array.isArray(data) ? data : data?.voyages || []);
            }
        } catch (error) {
            console.error('Error fetching company voyages:', error);
        } finally {
            setLoadingVoyages(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-slate-50">
                <View className="rounded-full overflow-hidden" style={{ width: 52, height: 52 }}>
                    <LinearGradient colors={['#1e40af', '#3b82f6']} style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color="#fff" size="small" />
                    </LinearGradient>
                </View>
                <Text className="mt-4 text-slate-400 text-sm">Chargement des informations...</Text>
            </View>
        );
    }

    if (!compagnie) {
        return (
            <View className="flex-1 items-center justify-center bg-slate-50 px-6">
                <View className="bg-red-50 rounded-full p-5 mb-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                </View>
                <Text className="text-slate-800 font-bold text-xl text-center">Compagnie non trouvée</Text>
                <Text className="text-slate-400 text-sm mt-2 text-center">Cette compagnie n'existe pas ou a été supprimée</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-6">
                    <View className="rounded-xl overflow-hidden">
                        <LinearGradient colors={['#1e40af', '#3b82f6']} className="px-8 py-3.5">
                            <Text className="text-white font-bold">Retourner à la liste</Text>
                        </LinearGradient>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            {/* Hero header with gradient + logo */}
            <View>
                <LinearGradient
                    colors={['#0f172a', '#1e3a8a', '#2563eb']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ paddingTop: insets.top + 10, paddingBottom: 60 }}
                    className="px-5"
                >
                    {/* Back button row */}
                    <View className="flex-row items-center mb-6">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="w-10 h-10 rounded-full bg-white/15 items-center justify-center mr-3"
                        >
                            <Ionicons name="chevron-back" size={22} color="#fff" />
                        </TouchableOpacity>
                        <Text className="text-white/70 text-sm font-medium flex-1" numberOfLines={1}>Détail compagnie</Text>
                    </View>

                    {/* Company name */}
                    <Text className="text-white font-extrabold text-2xl" numberOfLines={2}>{compagnie.nom}</Text>
                    {compagnie.localisation && (
                        <View className="flex-row items-center mt-2">
                            <Ionicons name="location" size={14} color="#93c5fd" />
                            <Text className="text-blue-200 text-sm ml-1.5 font-medium">{compagnie.localisation.nom}</Text>
                        </View>
                    )}
                </LinearGradient>

                {/* Floating logo card */}
                <View className="absolute left-0 right-0 items-center" style={{ bottom: -40 }}>
                    <View className="w-20 h-20 rounded-2xl bg-white overflow-hidden" style={{ elevation: 6 }}>
                        {compagnie.logo ? (
                            <Image source={{ uri: compagnie.logo }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <View className="w-full h-full items-center justify-center bg-slate-50">
                                <Ionicons name="business" size={36} color="#3b82f6" />
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1" style={{ marginTop: 0 }}>
                {/* Spacer for floating logo */}
                <View style={{ height: 52 }} />

                {/* Quick stats */}
                <View className="flex-row mx-5 mb-5">
                    <View className="flex-1 bg-white rounded-xl p-3 mr-2 items-center" style={{ elevation: 2 }}>
                        <View className="bg-blue-50 rounded-lg p-2 mb-1.5">
                            <Ionicons name="trail-sign" size={18} color="#1e40af" />
                        </View>
                        <Text className="text-slate-800 font-bold text-sm">{compagnie.provinces_desservies?.length || 0}</Text>
                        <Text className="text-slate-400 text-[10px]">Destinations</Text>
                    </View>
                    <View className="flex-1 bg-white rounded-xl p-3 mr-2 items-center" style={{ elevation: 2 }}>
                        <View className="bg-emerald-50 rounded-lg p-2 mb-1.5">
                            <Ionicons name="navigate" size={18} color="#059669" />
                        </View>
                        <Text className="text-slate-800 font-bold text-sm">{voyages.length}</Text>
                        <Text className="text-slate-400 text-[10px]">Voyages</Text>
                    </View>
                    <View className="flex-1 bg-white rounded-xl p-3 items-center" style={{ elevation: 2 }}>
                        <View className="bg-amber-50 rounded-lg p-2 mb-1.5">
                            <Ionicons name="card" size={18} color="#d97706" />
                        </View>
                        <Text className="text-slate-800 font-bold text-sm">{compagnie.modes_paiement_acceptes?.length || 0}</Text>
                        <Text className="text-slate-400 text-[10px]">Paiements</Text>
                    </View>
                </View>

                {/* À propos */}
                <View className="mx-5 mb-5 bg-white rounded-2xl p-5" style={{ elevation: 2 }}>
                    <View className="flex-row items-center mb-3">
                        <View className="rounded-xl overflow-hidden mr-3">
                            <LinearGradient colors={['#1e40af', '#3b82f6']} className="p-2">
                                <Ionicons name="information-circle" size={18} color="#fff" />
                            </LinearGradient>
                        </View>
                        <Text className="text-slate-800 font-bold text-base">À propos</Text>
                    </View>
                    <Text className="text-slate-500 leading-6 text-sm">
                        {compagnie.description || "Aucune description disponible pour cette compagnie."}
                    </Text>
                </View>

                {/* Contact */}
                <View className="mx-5 mb-5 bg-white rounded-2xl p-5" style={{ elevation: 2 }}>
                    <View className="flex-row items-center mb-4">
                        <View className="rounded-xl overflow-hidden mr-3">
                            <LinearGradient colors={['#059669', '#10b981']} className="p-2">
                                <Ionicons name="call" size={18} color="#fff" />
                            </LinearGradient>
                        </View>
                        <Text className="text-slate-800 font-bold text-base">Contact</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${compagnie.telephone}`)}
                        className="flex-row items-center bg-slate-50 rounded-xl p-3.5 mb-2.5"
                        activeOpacity={0.7}
                    >
                        <View className="w-9 h-9 rounded-lg bg-blue-50 items-center justify-center mr-3">
                            <Ionicons name="call" size={16} color="#1e40af" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-slate-400 text-[10px] uppercase font-semibold">Téléphone</Text>
                            <Text className="text-slate-700 font-semibold text-sm">{compagnie.telephone}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => Linking.openURL(`mailto:${compagnie.email}`)}
                        className="flex-row items-center bg-slate-50 rounded-xl p-3.5 mb-2.5"
                        activeOpacity={0.7}
                    >
                        <View className="w-9 h-9 rounded-lg bg-purple-50 items-center justify-center mr-3">
                            <Ionicons name="mail" size={16} color="#7c3aed" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-slate-400 text-[10px] uppercase font-semibold">Email</Text>
                            <Text className="text-slate-700 font-semibold text-sm">{compagnie.email}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                    </TouchableOpacity>

                    <View className="flex-row items-center bg-slate-50 rounded-xl p-3.5">
                        <View className="w-9 h-9 rounded-lg bg-amber-50 items-center justify-center mr-3">
                            <Ionicons name="map" size={16} color="#d97706" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-slate-400 text-[10px] uppercase font-semibold">Adresse</Text>
                            <Text className="text-slate-700 font-semibold text-sm">{compagnie.adresse}</Text>
                        </View>
                    </View>
                </View>

                {/* Zones desservies */}
                <View className="mx-5 mb-5 bg-white rounded-2xl p-5" style={{ elevation: 2 }}>
                    <View className="flex-row items-center mb-4">
                        <View className="rounded-xl overflow-hidden mr-3">
                            <LinearGradient colors={['#7c3aed', '#8b5cf6']} className="p-2">
                                <Ionicons name="trail-sign" size={18} color="#fff" />
                            </LinearGradient>
                        </View>
                        <Text className="text-slate-800 font-bold text-base">Destinations</Text>
                    </View>
                    <View className="flex-row flex-wrap">
                        {compagnie.provinces_desservies && compagnie.provinces_desservies.length > 0 ? (
                            compagnie.provinces_desservies.map((prov, idx) => (
                                <View key={idx} className="rounded-xl overflow-hidden mr-2 mb-2">
                                    <LinearGradient
                                        colors={['#ede9fe', '#e0e7ff']}
                                        className="px-4 py-2.5"
                                    >
                                        <Text className="text-purple-700 font-semibold text-xs">{prov.nom}</Text>
                                    </LinearGradient>
                                </View>
                            ))
                        ) : (
                            <Text className="text-slate-400 text-sm">Non spécifié</Text>
                        )}
                    </View>
                </View>

                {/* Modes de paiement */}
                <View className="mx-5 mb-5 bg-white rounded-2xl p-5" style={{ elevation: 2 }}>
                    <View className="flex-row items-center mb-4">
                        <View className="rounded-xl overflow-hidden mr-3">
                            <LinearGradient colors={['#d97706', '#f59e0b']} className="p-2">
                                <Ionicons name="card" size={18} color="#fff" />
                            </LinearGradient>
                        </View>
                        <Text className="text-slate-800 font-bold text-base">Modes de paiement</Text>
                    </View>
                    <View className="flex-row flex-wrap">
                        {compagnie.modes_paiement_acceptes && compagnie.modes_paiement_acceptes.length > 0 ? (
                            compagnie.modes_paiement_acceptes.map((mode, idx) => (
                                <View key={idx} className="bg-slate-50 rounded-xl p-3.5 mr-3 mb-3 items-center" style={{ minWidth: 80 }}>
                                    <View className="w-10 h-10 rounded-lg bg-white items-center justify-center mb-2" style={{ elevation: 1 }}>
                                        <Ionicons
                                            name={mode.type === 'mobile' ? 'phone-portrait' : 'card'}
                                            size={20}
                                            color={mode.type === 'mobile' ? '#059669' : '#1e40af'}
                                        />
                                    </View>
                                    <Text className="text-slate-600 text-[10px] font-bold uppercase">{mode.nom}</Text>
                                </View>
                            ))
                        ) : (
                            <Text className="text-slate-400 text-sm">Non spécifié</Text>
                        )}
                    </View>
                </View>

                {/* Voyages à venir */}
                <View className="mx-5 mb-5">
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center">
                            <View className="rounded-xl overflow-hidden mr-3">
                                <LinearGradient colors={['#ea580c', '#f97316']} className="p-2">
                                    <Ionicons name="navigate" size={18} color="#fff" />
                                </LinearGradient>
                            </View>
                            <Text className="text-slate-800 font-bold text-base">Voyages à venir</Text>
                        </View>
                        {voyages.length > 0 && (
                            <View className="bg-orange-50 px-3 py-1 rounded-full">
                                <Text className="text-orange-600 font-bold text-xs">{voyages.length}</Text>
                            </View>
                        )}
                    </View>

                    {loadingVoyages ? (
                        <View className="items-center py-8">
                            <ActivityIndicator color="#3b82f6" />
                        </View>
                    ) : voyages.length > 0 ? (
                        voyages.map((voyage) => (
                            <View
                                key={voyage.voyage_id}
                                className="bg-white rounded-2xl mb-3 overflow-hidden"
                                style={{ elevation: 2 }}
                            >
                                {/* Top accent */}
                                <LinearGradient
                                    colors={['#ea580c', '#f97316', '#fb923c']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ height: 3 }}
                                />

                                <View className="p-4">
                                    {/* Trajet name + type icon */}
                                    <View className="flex-row items-center justify-between mb-3">
                                        <View className="flex-row items-center flex-1 mr-3">
                                            <View className="rounded-lg overflow-hidden mr-3">
                                                <LinearGradient
                                                    colors={voyage.type === 'jour' ? ['#f59e0b', '#fbbf24'] : ['#4338ca', '#6366f1']}
                                                    className="p-2"
                                                >
                                                    <Ionicons name={voyage.type === 'jour' ? 'sunny' : 'moon'} size={16} color="#fff" />
                                                </LinearGradient>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-slate-800 font-bold text-sm" numberOfLines={1}>{voyage.trajet?.nom}</Text>
                                            </View>
                                        </View>
                                        <Text className="text-blue-700 font-bold text-base">
                                            {voyage.trajet?.tarif?.toLocaleString()} Ar
                                        </Text>
                                    </View>

                                    {/* Route dots */}
                                    <View className="flex-row items-center mb-3 ml-1">
                                        <View className="items-center mr-3">
                                            <View className="bg-blue-500 rounded-full w-2.5 h-2.5" />
                                            <View className="bg-blue-200 w-0.5 h-4 my-0.5" />
                                            <View className="bg-emerald-500 rounded-full w-2.5 h-2.5" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-slate-600 text-xs font-medium">
                                                {typeof voyage.trajet?.province_depart === 'object' ? voyage.trajet.province_depart?.nom : voyage.trajet?.province_depart || 'Départ'}
                                            </Text>
                                            <Text className="text-slate-600 text-xs font-medium mt-1">
                                                {typeof voyage.trajet?.province_arrivee === 'object' ? voyage.trajet.province_arrivee?.nom : voyage.trajet?.province_arrivee || 'Arrivée'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Info badges + CTA */}
                                    <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                                        <View className="flex-row items-center">
                                            <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2">
                                                <Ionicons name="calendar-outline" size={12} color="#64748b" />
                                                <Text className="text-slate-500 text-[10px] font-medium ml-1">{voyage.date}</Text>
                                            </View>
                                            <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2">
                                                <Ionicons name="time-outline" size={12} color="#64748b" />
                                                <Text className="text-slate-500 text-[10px] font-medium ml-1">{voyage.heure_depart}</Text>
                                            </View>
                                            <View className="bg-emerald-50 rounded-lg px-2.5 py-1.5 flex-row items-center">
                                                <Ionicons name="people-outline" size={12} color="#059669" />
                                                <Text className="text-emerald-700 text-[10px] font-bold ml-1">{voyage.places_disponibles}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            onPress={() => router.push({ pathname: '/screens/dashboard/utilisateur/reservation', params: { voyage_id: voyage.voyage_id } })}
                                        >
                                            <View className="rounded-xl overflow-hidden">
                                                <LinearGradient
                                                    colors={['#1e40af', '#3b82f6']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    className="px-4 py-2 flex-row items-center"
                                                >
                                                    <Ionicons name="ticket-outline" size={12} color="#fff" style={{ marginRight: 4 }} />
                                                    <Text className="text-white text-[10px] font-bold">Réserver</Text>
                                                </LinearGradient>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                            <View className="bg-slate-100 rounded-full p-4 mb-3">
                                <Ionicons name="navigate-outline" size={28} color="#94a3b8" />
                            </View>
                            <Text className="text-slate-400 text-sm text-center">Aucun voyage programmé pour le moment</Text>
                        </View>
                    )}
                </View>

                <View className="h-10" />
            </ScrollView>
        </View>
    );
}
