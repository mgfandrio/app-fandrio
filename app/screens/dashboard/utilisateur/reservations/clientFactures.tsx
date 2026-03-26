import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, SafeAreaView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { reservationService } from '@/app/services/reservations/reservationService';

const STATUS_MAP: Record<number, { label: string; color: string; bg: string; icon: string }> = {
    1: { label: 'En attente', color: '#f97316', bg: '#fff7ed', icon: 'time-outline' },
    2: { label: 'Confirmée', color: '#22c55e', bg: '#f0fdf4', icon: 'checkmark-circle-outline' },
    3: { label: 'Terminée', color: '#6b7280', bg: '#f3f4f6', icon: 'flag-outline' },
    4: { label: 'Annulée', color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline' },
};

export default function ClientFacturesScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reservations, setReservations] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [filter, setFilter] = useState<'all' | 'confirmed' | 'terminated'>('all');

    const fetchFactures = useCallback(async (pageNumber = 1, isRefreshing = false) => {
        if (!isRefreshing && pageNumber === 1) setLoading(true);
        try {
            const response = await reservationService.obtenirToutesReservations(pageNumber);
            if (response.statut) {
                // Only show reservations with payment (statut 2, 3 = confirmed/terminated)
                const allItems = response.data.items;
                if (pageNumber === 1) {
                    setReservations(allItems);
                } else {
                    setReservations(prev => [...prev, ...allItems]);
                }
                setPagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching factures:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchFactures();
    }, [fetchFactures]);

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchFactures(1, true);
    };

    const loadMore = () => {
        if (pagination && pagination.current_page < pagination.last_page && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchFactures(nextPage);
        }
    };

    const formatMontant = (montant: any) => {
        try {
            if (montant === null || montant === undefined) return '0';
            return new Intl.NumberFormat('fr-FR').format(Number(montant));
        } catch {
            return String(montant || 0);
        }
    };

    const loadInvoiceDetail = async (resId: number) => {
        setInvoiceLoading(true);
        setModalVisible(true);
        try {
            const response = await reservationService.obtenirFacture(resId);
            if (response.statut) {
                setSelectedInvoice(response.data);
            }
        } catch (error) {
            console.error('Error loading invoice:', error);
        } finally {
            setInvoiceLoading(false);
        }
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedInvoice(null);
    };

    const getQrString = (qrData: string) => {
        try {
            return qrData ? atob(qrData) : '';
        } catch {
            return qrData;
        }
    };

    const filteredReservations = reservations.filter(res => {
        if (filter === 'confirmed') return res.statut === 2;
        if (filter === 'terminated') return res.statut === 3;
        return [2, 3].includes(res.statut); // Only show paid invoices
    });

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full">
                    <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-blue-900">Mes Factures</Text>
                <View className="w-10" />
            </View>

            {/* Hero Stats */}
            <LinearGradient colors={['#1e3a8a', '#1e40af', '#2563eb']} className="mx-5 mt-5 rounded-[28px] overflow-hidden">
                <View className="p-5">
                    <View className="flex-row items-center mb-3">
                        <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                            <Ionicons name="receipt-outline" size={20} color="#ffffff" />
                        </View>
                        <Text className="text-white font-bold text-lg ml-3">Récapitulatif</Text>
                    </View>
                    <View className="flex-row justify-between">
                        <View className="flex-1 items-center">
                            <Text className="text-blue-200 text-[10px] uppercase font-bold">Factures</Text>
                            <Text className="text-white font-bold text-xl">{reservations.filter(r => [2, 3].includes(r.statut)).length}</Text>
                        </View>
                        <View className="w-px bg-white/20" />
                        <View className="flex-1 items-center">
                            <Text className="text-blue-200 text-[10px] uppercase font-bold">Total payé</Text>
                            <Text className="text-white font-bold text-lg">
                                {formatMontant(reservations.filter(r => [2, 3].includes(r.statut)).reduce((sum, r) => sum + Number(r.montant || 0), 0))} Ar
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Filters */}
            <View className="flex-row mx-5 mt-4 mb-2">
                {([
                    { key: 'all', label: 'Toutes' },
                    { key: 'confirmed', label: 'Confirmées' },
                    { key: 'terminated', label: 'Terminées' },
                ] as const).map(f => (
                    <TouchableOpacity
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        className={`mr-2 px-4 py-2 rounded-full ${filter === f.key ? 'bg-blue-900' : 'bg-white border border-gray-200'}`}
                    >
                        <Text className={`text-xs font-bold ${filter === f.key ? 'text-white' : 'text-gray-600'}`}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && page === 1 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#1e3a8a" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onMomentumScrollEnd={loadMore}
                >
                    {filteredReservations.length === 0 ? (
                        <View className="items-center justify-center py-20">
                            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
                            <Text className="text-gray-400 mt-4 text-base">Aucune facture trouvée</Text>
                        </View>
                    ) : (
                        filteredReservations.map((res: any) => {
                            const statusInfo = STATUS_MAP[res.statut] || STATUS_MAP[2];
                            return (
                                <TouchableOpacity
                                    key={res.id}
                                    className="bg-white rounded-3xl p-5 mb-3 shadow-sm border border-gray-100"
                                    onPress={() => loadInvoiceDetail(res.id)}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row justify-between items-start mb-3">
                                        <View className="flex-row items-center flex-1">
                                            <View style={{ backgroundColor: statusInfo.bg }} className="w-10 h-10 rounded-full items-center justify-center mr-3">
                                                <Ionicons name="receipt-outline" size={18} color={statusInfo.color} />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-gray-900 font-bold text-sm">{res.trajet}</Text>
                                                <Text className="text-gray-400 text-[10px] mt-0.5">N° {res.numero}</Text>
                                            </View>
                                        </View>
                                        <View style={{ backgroundColor: statusInfo.bg }} className="px-2.5 py-1 rounded-full">
                                            <Text style={{ color: statusInfo.color }} className="text-[10px] font-bold uppercase">
                                                {statusInfo.label}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row justify-between items-center pt-3 border-t border-gray-50">
                                        <View>
                                            <Text className="text-gray-400 text-[10px]">{res.date} • {res.heure}</Text>
                                            <Text className="text-gray-500 text-[10px]">{res.nb_voyageurs} voyageur(s)</Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <Text style={{ color: '#1e3a8a' }} className="font-bold text-base mr-2">
                                                {formatMontant(res.montant)} Ar
                                            </Text>
                                            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
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

            {/* Invoice Detail Modal */}
            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
                <SafeAreaView className="flex-1 bg-gray-50">
                    {/* Modal Header */}
                    <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center justify-between">
                        <TouchableOpacity onPress={closeModal} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full">
                            <Ionicons name="close" size={24} color="#1e3a8a" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold text-blue-900">Facture</Text>
                        <View className="w-10" />
                    </View>

                    {invoiceLoading ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="#1e3a8a" />
                            <Text className="text-gray-400 mt-4 text-sm">Chargement de la facture...</Text>
                        </View>
                    ) : selectedInvoice ? (
                        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                            {/* Invoice Header */}
                            <LinearGradient colors={['#1e3a8a', '#1e40af']} className="mx-5 mt-5 rounded-[28px] overflow-hidden">
                                <View className="p-6 items-center">
                                    <Text className="text-blue-200 text-xs font-bold uppercase mb-1">Facture N°</Text>
                                    <Text className="text-white text-2xl font-bold">{selectedInvoice.reservation.numero}</Text>
                                    <View className="mt-3 flex-row items-center">
                                        <View className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center">
                                            <Ionicons
                                                name={(STATUS_MAP[selectedInvoice.reservation.statut]?.icon || 'ellipse-outline') as any}
                                                size={14}
                                                color="#ffffff"
                                            />
                                            <Text className="text-white text-xs font-bold ml-1">
                                                {STATUS_MAP[selectedInvoice.reservation.statut]?.label || 'Inconnu'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>

                            {/* QR Code - Only for confirmed reservations */}
                            {selectedInvoice.reservation.statut === 2 && selectedInvoice.reservation.qr_data && (
                                <View className="mx-5 mt-5 bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm items-center">
                                    <View className="flex-row items-center mb-4">
                                        <Ionicons name="qr-code-outline" size={20} color="#1e3a8a" />
                                        <Text className="text-blue-900 font-bold text-base ml-2">QR Code</Text>
                                    </View>
                                    <View className="bg-white p-4 rounded-2xl border border-gray-100">
                                        <QRCode value={getQrString(selectedInvoice.reservation.qr_data)} size={180} backgroundColor="#ffffff" />
                                    </View>
                                    <Text className="text-gray-400 text-[10px] text-center mt-3">Présentez ce code lors de l'embarquement</Text>
                                </View>
                            )}

                            {/* Voyage Info */}
                            <View className="mx-5 mt-5 bg-white rounded-[28px] p-5 border border-gray-100 shadow-sm">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center">
                                        <Ionicons name="bus-outline" size={16} color="#1e3a8a" />
                                    </View>
                                    <Text className="text-gray-900 font-bold text-base ml-3">Voyage</Text>
                                </View>

                                <View className="space-y-2">
                                    <View className="flex-row justify-between py-2 border-b border-gray-50">
                                        <Text className="text-gray-500 text-sm">Trajet</Text>
                                        <Text className="text-gray-900 font-bold text-sm">{selectedInvoice.voyage.depart} → {selectedInvoice.voyage.arrivee}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 border-b border-gray-50">
                                        <Text className="text-gray-500 text-sm">Date</Text>
                                        <Text className="text-gray-900 font-bold text-sm">{selectedInvoice.voyage.date} à {selectedInvoice.voyage.heure}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2 border-b border-gray-50">
                                        <Text className="text-gray-500 text-sm">Compagnie</Text>
                                        <Text className="text-gray-900 font-bold text-sm">{selectedInvoice.voyage.compagnie}</Text>
                                    </View>
                                    <View className="flex-row justify-between py-2">
                                        <Text className="text-gray-500 text-sm">Véhicule</Text>
                                        <Text className="text-gray-900 font-bold text-sm">{selectedInvoice.voyage.matricule}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Voyageurs */}
                            {selectedInvoice.voyageurs && selectedInvoice.voyageurs.length > 0 && (
                                <View className="mx-5 mt-5 bg-white rounded-[28px] p-5 border border-gray-100 shadow-sm">
                                    <View className="flex-row items-center mb-4">
                                        <View className="w-8 h-8 bg-orange-50 rounded-full items-center justify-center">
                                            <Ionicons name="people-outline" size={16} color="#f97316" />
                                        </View>
                                        <Text className="text-gray-900 font-bold text-base ml-3">Voyageurs ({selectedInvoice.voyageurs.length})</Text>
                                    </View>

                                    {selectedInvoice.voyageurs.map((v: any, i: number) => (
                                        <View key={i} className={`flex-row items-center py-2.5 ${i < selectedInvoice.voyageurs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                            <View className="w-7 h-7 bg-gray-100 rounded-full items-center justify-center mr-3">
                                                <Text className="text-gray-600 font-bold text-[10px]">{i + 1}</Text>
                                            </View>
                                            <Text className="text-gray-900 font-bold text-sm flex-1">{v.nom}</Text>
                                            <View className="bg-blue-50 px-2.5 py-1 rounded-full">
                                                <Text className="text-blue-900 text-[10px] font-bold">Siège {v.siege}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Payment Summary */}
                            <View className="mx-5 mt-5 bg-white rounded-[28px] p-5 border border-gray-100 shadow-sm">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center">
                                        <Ionicons name="wallet-outline" size={16} color="#22c55e" />
                                    </View>
                                    <Text className="text-gray-900 font-bold text-base ml-3">Paiement</Text>
                                </View>

                                {selectedInvoice.reservation.paiement && (
                                    <View className="space-y-2">
                                        <View className="flex-row justify-between py-2 border-b border-gray-50">
                                            <Text className="text-gray-500 text-sm">Mode</Text>
                                            <Text className="text-gray-900 font-bold text-sm">{selectedInvoice.reservation.paiement.type}</Text>
                                        </View>
                                        <View className="flex-row justify-between py-2 border-b border-gray-50">
                                            <Text className="text-gray-500 text-sm">Référence</Text>
                                            <Text className="text-gray-900 font-bold text-sm">{selectedInvoice.reservation.paiement.numero}</Text>
                                        </View>
                                    </View>
                                )}

                                <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                    <Text className="text-gray-900 font-bold text-lg">Montant Total</Text>
                                    <Text className="text-blue-900 font-bold text-xl">{formatMontant(selectedInvoice.reservation.montant)} Ar</Text>
                                </View>

                                <View className="flex-row justify-between py-2 mt-2">
                                    <Text className="text-gray-400 text-xs">Date de réservation</Text>
                                    <Text className="text-gray-500 text-xs">{selectedInvoice.reservation.date_reservation}</Text>
                                </View>
                            </View>

                            {/* View Full Detail Button */}
                            <View className="mx-5 mt-5 mb-5">
                                <TouchableOpacity
                                    className="bg-blue-900 w-full py-4 rounded-2xl items-center flex-row justify-center"
                                    onPress={() => {
                                        closeModal();
                                        router.push({ pathname: '/screens/dashboard/utilisateur/reservations/reservationDetail', params: { id: String(selectedInvoice.reservation.id) } });
                                    }}
                                >
                                    <Ionicons name="open-outline" size={18} color="#ffffff" />
                                    <Text className="text-white font-bold text-base ml-2">Voir détail complet</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    ) : (
                        <View className="flex-1 justify-center items-center">
                            <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                            <Text className="text-gray-500 mt-4">Impossible de charger la facture</Text>
                        </View>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
