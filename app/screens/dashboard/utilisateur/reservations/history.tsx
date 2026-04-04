import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, SafeAreaView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { reservationService } from '@/app/services/reservations/reservationService';

export default function HistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrString, setQrString] = useState('');
    const [qrNumero, setQrNumero] = useState('');

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

    const openQrModal = async (resId: number) => {
        setQrModalVisible(true);
        setQrLoading(true);
        setQrString('');
        try {
            const response = await reservationService.obtenirFacture(resId);
            if (response.statut && response.data?.reservation?.qr_data) {
                const qrData = response.data.reservation.qr_data;
                try {
                    setQrString(atob(qrData));
                } catch {
                    setQrString(qrData);
                }
                setQrNumero(response.data.reservation.numero || '');
            }
        } catch (e) {
            console.error('Error loading QR:', e);
        } finally {
            setQrLoading(false);
        }
    };

    const getStatusColor = (statut: number) => {
        switch (statut) {
            case 2: return { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmée' };
            case 3: return { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Terminée' };
            case 4: return { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulée' };
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
                                            <Text className="text-gray-500 text-xs mt-0.5">Voyage: {res.date} • {res.heure}</Text>
                                            <Text className="text-gray-400 text-[10px] mt-0.5">Réservé le {res.date_reservation}</Text>
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
                                        <View className="flex-row items-center">
                                            {res.statut === 2 && (
                                                <TouchableOpacity
                                                    onPress={() => openQrModal(res.id)}
                                                    className="w-10 h-10 bg-green-100 rounded-xl items-center justify-center mr-2"
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="qr-code" size={22} color="#22c55e" />
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                className="bg-blue-50 px-4 py-2 rounded-xl"
                                                onPress={() => router.push({ pathname: '/screens/dashboard/utilisateur/reservations/reservationDetail', params: { id: String(res.id) } })}
                                            >
                                                <Text style={{ color: '#1e3a8a' }} className="text-xs font-bold">Voir détail</Text>
                                            </TouchableOpacity>
                                        </View>
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
            {/* QR Code Modal */}
            <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                    <View className="bg-white rounded-[32px] p-8 mx-8 items-center" style={{ minWidth: 300 }}>
                        {qrLoading ? (
                            <View className="py-10 items-center">
                                <ActivityIndicator size="large" color="#1e3a8a" />
                                <Text className="text-gray-400 mt-4 text-sm">Chargement du QR...</Text>
                            </View>
                        ) : qrString ? (
                            <>
                                <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-4">
                                    <Ionicons name="qr-code" size={28} color="#22c55e" />
                                </View>
                                <Text className="text-gray-900 font-bold text-lg mb-1">QR Code</Text>
                                <Text className="text-gray-400 text-xs mb-5">Ticket N° {qrNumero}</Text>
                                <View className="bg-white p-4 rounded-2xl border border-gray-100">
                                    <QRCode value={qrString} size={220} backgroundColor="#ffffff" />
                                </View>
                                <Text className="text-gray-400 text-[10px] text-center mt-4">Présentez ce code lors de l'embarquement</Text>
                            </>
                        ) : (
                            <View className="py-10 items-center">
                                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                                <Text className="text-gray-500 mt-3 text-sm">QR code indisponible</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={() => setQrModalVisible(false)}
                            className="mt-6 bg-gray-100 px-8 py-3 rounded-2xl"
                        >
                            <Text className="text-gray-700 font-bold">Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
