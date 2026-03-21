import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reservationService } from '@/app/services/reservations/reservationService';

export default function HistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [page, setPage] = useState(1);

    const fetchHistory = async (pageNumber = 1, isRefreshing = false) => {
        if (!isRefreshing && pageNumber === 1) setLoading(true);
        try {
            const response = await reservationService.obtenirToutesReservations(pageNumber);
            if (response.statut) {
                if (pageNumber === 1) {
                    setReservations(response.data.items);
                } else {
                    setReservations(prev => [...prev, ...response.data.items]);
                }
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchHistory(1, true);
    };

    const loadMore = () => {
        if (pagination && pagination.current_page < pagination.last_page && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchHistory(nextPage);
        }
    };

    const getStatusColor = (statut: number) => {
        switch (statut) {
            case 2: return { bg: 'bg-green-100', text: 'text-green-700', label: 'Valider' };
            case 4: return { bg: 'bg-red-100', text: 'text-red-700', label: 'Annuler' };
            case 1: return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'En attente' };
            default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inconnu' };
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full">
                    <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-blue-900">Historique Complet</Text>
                <View className="w-10" />
            </View>

            {loading && page === 1 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#1e3a8a" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onMomentumScrollEnd={loadMore}
                >
                    {reservations.length === 0 ? (
                        <View className="items-center justify-center py-20">
                            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
                            <Text className="text-gray-400 mt-4 text-base">Aucune réservation trouvée</Text>
                        </View>
                    ) : (
                        reservations.map((res: any) => {
                            const status = getStatusColor(res.statut);
                            return (
                                <View key={res.id} className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
                                    <View className="flex-row justify-between items-start mb-3">
                                        <View className="flex-1">
                                            <Text className="text-gray-900 font-bold text-base">{res.trajet}</Text>
                                            <Text className="text-gray-500 text-xs mt-0.5">{res.date} • {res.heure}</Text>
                                            <Text className="text-gray-400 text-[10px] mt-1 italic">N° {res.numero}</Text>
                                        </View>
                                        <View className={`px-2.5 py-1 rounded-full ${status.bg}`}>
                                            <Text className={`text-[10px] font-bold uppercase ${status.text}`}>
                                                {status.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row justify-between items-center pt-3 border-t border-gray-50">
                                        <Text style={{ color: '#1e3a8a' }} className="font-bold text-base">
                                            {new Intl.NumberFormat('fr-FR').format(res.montant)} Ar
                                        </Text>
                                        <TouchableOpacity
                                            className="bg-blue-50 px-4 py-2 rounded-xl"
                                            onPress={() => {/* Navigate to details if needed */}}
                                        >
                                            <Text style={{ color: '#1e3a8a' }} className="text-xs font-bold">Voir détail</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                    
                    {loading && page > 1 && (
                        <View className="py-4">
                            <ActivityIndicator size="small" color="#1e3a8a" />
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
