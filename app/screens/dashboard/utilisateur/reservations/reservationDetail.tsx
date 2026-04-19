import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { reservationService } from '@/app/services/reservations/reservationService';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_MAP: Record<number, { label: string; color: string; bg: string; icon: string }> = {
    1: { label: 'En attente', color: '#f97316', bg: 'bg-orange-100', icon: 'time-outline' },
    2: { label: 'Confirmée', color: '#22c55e', bg: 'bg-green-100', icon: 'checkmark-circle-outline' },
    3: { label: 'Terminée', color: '#6b7280', bg: 'bg-gray-100', icon: 'flag-outline' },
    4: { label: 'Annulée', color: '#ef4444', bg: 'bg-red-100', icon: 'close-circle-outline' },
};

export default function ReservationDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadDetail();
        }
    }, [id]);

    const loadDetail = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await reservationService.obtenirFacture(Number(id));
            if (response.statut) {
                setInvoiceData(response.data);
            } else {
                setError(response.message || 'Impossible de charger les détails');
            }
        } catch (e: any) {
            setError('Erreur lors du chargement des détails');
        } finally {
            setLoading(false);
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

    const getQrString = () => {
        const qrData = invoiceData?.reservation?.qr_data || '';
        try {
            return qrData ? atob(qrData) : '';
        } catch {
            return qrData;
        }
    };

    const handleShare = async () => {
        if (!invoiceData) return;
        const res = invoiceData.reservation;
        const voy = invoiceData.voyage;
        const text = `🎫 FANDRIO - Ticket N° ${res.numero}\n\n📍 ${voy.depart} → ${voy.arrivee}\n📅 ${voy.date} à ${voy.heure}\n🚐 ${voy.compagnie}\n💰 ${formatMontant(res.montant)} Ar\n👥 ${res.nb_voyageurs} voyageur(s)`;
        try {
            await Share.share({ message: text });
        } catch {}
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text className="text-gray-400 mt-4 text-sm">Chargement des détails...</Text>
            </SafeAreaView>
        );
    }

    if (error || !invoiceData) {
        return (
            <SafeAreaView className="flex-1 bg-gray-50">
                <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full">
                        <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-blue-900">Détail Réservation</Text>
                    <View className="w-10" />
                </View>
                <View className="flex-1 justify-center items-center px-8">
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <Text className="text-gray-600 text-center mt-4">{error || 'Données introuvables'}</Text>
                    <TouchableOpacity onPress={loadDetail} className="mt-6 bg-blue-900 px-6 py-3 rounded-2xl">
                        <Text className="text-white font-bold">Réessayer</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const reservation = invoiceData.reservation;
    const voyage = invoiceData.voyage;
    const voyageurs = invoiceData.voyageurs || [];
    const statusInfo = STATUS_MAP[reservation.statut] || STATUS_MAP[1];
    const isConfirmed = reservation.statut === 2;
    const qrString = getQrString();

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full">
                    <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-blue-900">Détail Réservation</Text>
                <TouchableOpacity onPress={handleShare} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full">
                    <Ionicons name="share-outline" size={20} color="#1e3a8a" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Hero Ticket Card */}
                <LinearGradient colors={['#1e3a8a', '#1e40af', '#2563eb']} className="mx-5 mt-5 rounded-[32px] overflow-hidden">
                    <View className="p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <View>
                                <Text className="text-blue-200 text-xs font-bold uppercase">Ticket N°</Text>
                                <Text className="text-white text-xl font-bold">{reservation.numero}</Text>
                            </View>
                            <View className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center">
                                <Ionicons name={statusInfo.icon as any} size={14} color="#ffffff" />
                                <Text className="text-white text-xs font-bold ml-1">{statusInfo.label}</Text>
                            </View>
                        </View>

                        <View className="flex-row items-center justify-between mt-2">
                            <View className="flex-1">
                                <Text className="text-blue-200 text-[10px] uppercase font-bold">Départ</Text>
                                <Text className="text-white font-bold text-base">{voyage.depart}</Text>
                            </View>
                            <View className="mx-3 items-center">
                                <Ionicons name="arrow-forward" size={20} color="#93c5fd" />
                                <View className="w-16 h-0.5 bg-blue-300/30 mt-1" />
                            </View>
                            <View className="flex-1 items-end">
                                <Text className="text-blue-200 text-[10px] uppercase font-bold">Arrivée</Text>
                                <Text className="text-white font-bold text-base">{voyage.arrivee}</Text>
                            </View>
                        </View>

                        <View className="flex-row justify-between mt-4 pt-4 border-t border-white/10">
                            <View>
                                <Text className="text-blue-200 text-[10px] uppercase font-bold">Date</Text>
                                <Text className="text-white font-bold text-sm">{voyage.date}</Text>
                            </View>
                            <View>
                                <Text className="text-blue-200 text-[10px] uppercase font-bold">Heure</Text>
                                <Text className="text-white font-bold text-sm">{voyage.heure}</Text>
                            </View>
                            <View>
                                <Text className="text-blue-200 text-[10px] uppercase font-bold">Voyageurs</Text>
                                <Text className="text-white font-bold text-sm">{reservation.nb_voyageurs}</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* QR Code Section - Only for confirmed reservations (statut === 2) */}
                {isConfirmed && qrString ? (
                    <View className="mx-5 mt-5 bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm items-center">
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="qr-code-outline" size={20} color="#1e3a8a" />
                            <Text className="text-blue-900 font-bold text-base ml-2">QR Code d'embarquement</Text>
                        </View>
                        <View className="bg-white p-4 rounded-2xl border border-gray-100">
                            <QRCode value={qrString} size={200} backgroundColor="#ffffff" />
                        </View>
                        <Text className="text-gray-400 text-[10px] text-center mt-3">Présentez ce QR code lors de l'embarquement</Text>
                    </View>
                ) : null}

                {/* Voyage Details */}
                <View className="mx-5 mt-5 bg-white rounded-[28px] p-5 border border-gray-100 shadow-sm">
                    <View className="flex-row items-center mb-4">
                        <View className="w-8 h-8 bg-blue-50 rounded-full items-center justify-center">
                            <Ionicons name="bus-outline" size={16} color="#1e3a8a" />
                        </View>
                        <Text className="text-gray-900 font-bold text-base ml-3">Informations du voyage</Text>
                    </View>

                    <View className="space-y-3">
                        <View className="flex-row justify-between py-2 border-b border-gray-50">
                            <Text className="text-gray-500 text-sm">Compagnie</Text>
                            <Text className="text-gray-900 font-bold text-sm">{voyage.compagnie}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-gray-50">
                            <Text className="text-gray-500 text-sm">Véhicule</Text>
                            <Text className="text-gray-900 font-bold text-sm">{voyage.matricule}</Text>
                        </View>
                        <View className="flex-row justify-between py-2 border-b border-gray-50">
                            <Text className="text-gray-500 text-sm">Date de réservation</Text>
                            <Text className="text-gray-900 font-bold text-sm">{reservation.date_reservation}</Text>
                        </View>
                    </View>
                </View>

                {/* Voyageurs */}
                {voyageurs.length > 0 && (
                    <View className="mx-5 mt-5 bg-white rounded-[28px] p-5 border border-gray-100 shadow-sm">
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 bg-orange-50 rounded-full items-center justify-center">
                                <Ionicons name="people-outline" size={16} color="#f97316" />
                            </View>
                            <Text className="text-gray-900 font-bold text-base ml-3">Voyageurs ({voyageurs.length})</Text>
                        </View>

                        {voyageurs.map((v: any, i: number) => (
                            <View key={i} className={`flex-row items-center py-3 ${i < voyageurs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center mr-3">
                                    <Text className="text-gray-600 font-bold text-xs">{i + 1}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold text-sm">{v.nom}</Text>
                                </View>
                                <View className="bg-blue-50 px-3 py-1 rounded-full">
                                    <Text className="text-blue-900 text-xs font-bold">Siège {v.siege}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Payment Info */}
                <View className="mx-5 mt-5 bg-white rounded-[28px] p-5 border border-gray-100 shadow-sm">
                    <View className="flex-row items-center mb-4">
                        <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center">
                            <Ionicons name="wallet-outline" size={16} color="#22c55e" />
                        </View>
                        <Text className="text-gray-900 font-bold text-base ml-3">Paiement</Text>
                    </View>

                    {reservation.paiement ? (
                        <View className="space-y-3">
                            <View className="flex-row justify-between py-2 border-b border-gray-50">
                                <Text className="text-gray-500 text-sm">Mode de paiement</Text>
                                <Text className="text-gray-900 font-bold text-sm">{reservation.paiement.type}</Text>
                            </View>
                            <View className="flex-row justify-between py-2 border-b border-gray-50">
                                <Text className="text-gray-500 text-sm">Référence</Text>
                                <Text className="text-gray-900 font-bold text-sm">{reservation.paiement.numero}</Text>
                            </View>
                        </View>
                    ) : (
                        <Text className="text-gray-400 text-sm italic">Aucun paiement enregistré</Text>
                    )}

                    <View className="flex-row justify-between items-center mt-4 pt-4 border-t border-gray-100">
                        <Text className="text-gray-900 font-bold text-lg">Montant Total</Text>
                        <Text className="text-blue-900 font-bold text-xl">{formatMontant(reservation.montant)} Ar</Text>
                    </View>
                </View>

                {/* Actions */}
                <View className="mx-5 mt-5 mb-5">
                    <TouchableOpacity
                        className="bg-blue-900 w-full py-4 rounded-2xl items-center"
                        onPress={() => router.back()}
                    >
                        <Text className="text-white font-bold text-base">Retour</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
