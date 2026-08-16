import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { remboursementService } from '@/app/services/remboursements/remboursementService';
import { Skeleton } from '@/app/components/common/Skeleton';

interface Remboursement {
    res_id: number;
    res_numero: string;
    voyage: { trajet: string; date: string; heure: string; compagnie?: string };
    montant: number;
    statut: number; // 1=en attente, 2=traité, 3=refusé
    statut_label: string;
    date_traitement: string | null;
    reference: string | null;
    note: string | null;
    date_annulation: string;
}

const STATUT_STYLE: Record<number, { color: string; bg: string; icon: string }> = {
    1: { color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
    2: { color: '#16a34a', bg: '#f0fdf4', icon: 'checkmark-circle' },
    3: { color: '#dc2626', bg: '#fef2f2', icon: 'close-circle' },
};

const formatMontant = (montant: number): string => {
    try {
        return new Intl.NumberFormat('fr-FR').format(Math.round(montant));
    } catch {
        return String(montant);
    }
};

export default function ClientRemboursementsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<Remboursement[]>([]);
    const [stats, setStats] = useState<{ en_attente: number; total_a_recevoir: number; total_recu: number } | null>(
        null
    );

    const charger = useCallback(async () => {
        try {
            const res = await remboursementService.obtenirMesRemboursements(1);
            if (res.statut && res.data) {
                setItems(res.data.items || []);
                setStats(res.data.stats || null);
            }
        } catch (e) {
            console.error('Erreur chargement remboursements:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        charger();
    }, [charger]);

    const onRefresh = () => {
        setRefreshing(true);
        charger();
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center justify-between">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full"
                >
                    <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-blue-900">Mes Remboursements</Text>
                <View className="w-10" />
            </View>

            {loading ? (
                <View className="px-5 mt-5">
                    {[0, 1, 2, 3].map((i) => (
                        <View
                            key={i}
                            className="bg-white rounded-3xl p-5 mb-3 border border-gray-100 shadow-sm"
                        >
                            {/* En-tête : infos voyage + badge statut */}
                            <View className="flex-row justify-between items-start mb-3">
                                <View className="flex-1 mr-2">
                                    <Skeleton width="70%" height={16} borderRadius={6} />
                                    <View className="mt-2">
                                        <Skeleton width="50%" height={12} borderRadius={6} />
                                    </View>
                                    <View className="mt-1.5">
                                        <Skeleton width="35%" height={12} borderRadius={6} />
                                    </View>
                                </View>
                                <Skeleton width={92} height={28} borderRadius={9999} />
                            </View>

                            {/* Ligne montant */}
                            <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
                                <Skeleton width={70} height={14} borderRadius={6} />
                                <Skeleton width={110} height={20} borderRadius={6} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* Hero stats */}
                    <LinearGradient
                        colors={['#1e3a8a', '#1d4ed8', '#2563eb']}
                        className="mx-5 mt-5 rounded-[28px] overflow-hidden"
                    >
                        <View className="p-5">
                            <View className="flex-row items-center mb-4">
                                <View className="w-11 h-11 bg-white/20 rounded-full items-center justify-center">
                                    <Ionicons name="cash-outline" size={22} color="#ffffff" />
                                </View>
                                <View className="ml-3 flex-1">
                                    <Text className="text-white text-base font-bold">Suivi des remboursements</Text>
                                    <Text className="text-white/80 text-sm">
                                        Voyages annulés par la compagnie
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row mt-2">
                                <View className="flex-1">
                                    <Text className="text-white/80 text-xs uppercase font-bold">En attente</Text>
                                    <Text className="text-white text-2xl font-extrabold">{stats?.en_attente ?? 0}</Text>
                                    <Text className="text-yellow-200 text-sm font-bold mt-0.5">
                                        {formatMontant(stats?.total_a_recevoir ?? 0)} Ar
                                    </Text>
                                </View>
                                <View className="w-px bg-white/20 mx-3" />
                                <View className="flex-1">
                                    <Text className="text-white/80 text-xs uppercase font-bold">Reçus</Text>
                                    <Text className="text-white text-2xl font-extrabold">
                                        {formatMontant(stats?.total_recu ?? 0)}
                                    </Text>
                                    <Text className="text-green-200 text-sm font-bold mt-0.5">Ar</Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Liste */}
                    {items.length === 0 ? (
                        <View className="items-center justify-center py-20 px-6">
                            <Ionicons name="checkmark-done-circle-outline" size={72} color="#d1d5db" />
                            <Text className="text-gray-700 text-base font-semibold mt-4 text-center">
                                Aucun remboursement
                            </Text>
                            <Text className="text-gray-500 text-sm mt-2 text-center">
                                Vos remboursements apparaîtront ici en cas d'annulation d'un voyage par la compagnie.
                            </Text>
                        </View>
                    ) : (
                        <View className="px-5 mt-5">
                            {items.map((r) => {
                                const style = STATUT_STYLE[r.statut] || STATUT_STYLE[1];
                                return (
                                    <View
                                        key={r.res_id}
                                        className="bg-white rounded-3xl p-5 mb-3 border border-gray-100 shadow-sm"
                                    >
                                        <View className="flex-row justify-between items-start mb-3">
                                            <View className="flex-1 mr-2">
                                                <Text className="text-gray-900 font-bold text-base">
                                                    {r.voyage.trajet}
                                                </Text>
                                                <Text className="text-gray-600 text-xs mt-1 font-medium">
                                                    {r.voyage.date} • {r.voyage.heure}
                                                </Text>
                                                <Text className="text-gray-500 text-xs mt-0.5">N° {r.res_numero}</Text>
                                            </View>
                                            <View
                                                style={{ backgroundColor: style.bg }}
                                                className="px-3 py-1.5 rounded-full flex-row items-center"
                                            >
                                                <Ionicons name={style.icon as any} size={14} color={style.color} />
                                                <Text
                                                    style={{ color: style.color }}
                                                    className="text-xs font-bold ml-1"
                                                >
                                                    {r.statut_label}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
                                            <Text className="text-gray-700 text-sm font-medium">Montant</Text>
                                            <Text className="text-blue-900 text-lg font-extrabold">
                                                {formatMontant(r.montant)} Ar
                                            </Text>
                                        </View>

                                        {r.statut === 2 && r.reference && (
                                            <View className="mt-3 bg-green-50 border border-green-200 rounded-2xl p-3">
                                                <Text className="text-green-800 text-xs font-bold uppercase mb-1">
                                                    Référence
                                                </Text>
                                                <Text className="text-green-900 text-sm font-semibold">
                                                    {r.reference}
                                                </Text>
                                                {r.date_traitement && (
                                                    <Text className="text-green-700 text-xs mt-1">
                                                        Reçu le {r.date_traitement}
                                                    </Text>
                                                )}
                                            </View>
                                        )}

                                        {r.statut === 3 && r.note && (
                                            <View className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-3">
                                                <Text className="text-red-800 text-xs font-bold uppercase mb-1">
                                                    Motif du refus
                                                </Text>
                                                <Text className="text-red-900 text-sm font-medium">{r.note}</Text>
                                            </View>
                                        )}

                                        {r.statut === 1 && (
                                            <View className="mt-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-3 flex-row items-start">
                                                <Ionicons
                                                    name="information-circle-outline"
                                                    size={18}
                                                    color="#b45309"
                                                />
                                                <Text className="text-yellow-900 text-xs font-medium ml-2 flex-1">
                                                    En attente de traitement par la compagnie. Vous serez notifié dès
                                                    que le remboursement sera effectué.
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
