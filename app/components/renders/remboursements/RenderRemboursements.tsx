import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    TextInput,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { remboursementAdminService } from '@/app/services/remboursements/remboursementAdminService';

type FiltreStatut = 'en_attente' | 'traites' | 'refuses';

interface Stats {
    en_attente: { nombre: number; montant: number };
    traites: { nombre: number; montant: number };
    refuses: { nombre: number; montant: number };
}

interface Remboursement {
    res_id: number;
    res_numero: string;
    client: { util_id: number; nom: string; email: string; telephone?: string };
    voyage: { trajet: string; date: string; heure: string };
    montant: number;
    statut: number;
    date_traitement: string | null;
    reference: string | null;
    note: string | null;
    date_annulation: string;
}

const formatMontant = (m: number) => {
    try {
        return new Intl.NumberFormat('fr-FR').format(Math.round(m));
    } catch {
        return String(m);
    }
};

export const RenderRemboursements = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filtre, setFiltre] = useState<FiltreStatut>('en_attente');
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<Remboursement[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);

    // Modal traiter / refuser
    const [actionModal, setActionModal] = useState<{
        visible: boolean;
        type: 'traite' | 'refus' | null;
        remb: Remboursement | null;
    }>({ visible: false, type: null, remb: null });
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const charger = useCallback(async () => {
        try {
            const [listeRes, statsRes] = await Promise.all([
                remboursementAdminService.obtenirListe({ statut: filtre, search: search.trim() || undefined }),
                remboursementAdminService.obtenirStatistiques(),
            ]);
            if (listeRes.statut && listeRes.data) setItems(listeRes.data.items || []);
            if (statsRes.statut && statsRes.data) setStats(statsRes.data);
        } catch (e) {
            console.error('Chargement remboursements:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filtre, search]);

    useEffect(() => {
        setLoading(true);
        charger();
    }, [filtre]);

    const onRefresh = () => {
        setRefreshing(true);
        charger();
    };

    const ouvrirAction = (type: 'traite' | 'refus', r: Remboursement) => {
        setActionModal({ visible: true, type, remb: r });
        setReference('');
        setNote('');
    };

    const fermerAction = () => {
        if (submitting) return;
        setActionModal({ visible: false, type: null, remb: null });
        setReference('');
        setNote('');
    };

    const soumettreAction = async () => {
        if (!actionModal.remb || !actionModal.type) return;

        if (actionModal.type === 'traite') {
            if (!reference.trim() || reference.trim().length < 3) {
                Alert.alert('Référence requise', 'Veuillez saisir la référence de la transaction (mobile money, etc.).');
                return;
            }
        } else {
            if (!note.trim() || note.trim().length < 5) {
                Alert.alert('Motif requis', 'Veuillez expliquer le motif du refus (5 caractères minimum).');
                return;
            }
        }

        setSubmitting(true);
        try {
            const res =
                actionModal.type === 'traite'
                    ? await remboursementAdminService.marquerTraite(actionModal.remb.res_id, {
                          reference: reference.trim(),
                          note: note.trim() || undefined,
                      })
                    : await remboursementAdminService.refuser(actionModal.remb.res_id, {
                          motif: note.trim(),
                      });

            if (res?.statut) {
                Alert.alert(
                    'Succès',
                    actionModal.type === 'traite'
                        ? 'Remboursement marqué comme traité. Le client a été notifié.'
                        : 'Remboursement refusé. Le client a été notifié.'
                );
                fermerAction();
                setLoading(true);
                charger();
            } else {
                Alert.alert('Erreur', res?.message || 'Opération impossible.');
            }
        } catch (e: any) {
            Alert.alert('Erreur', e.message || 'Opération impossible.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Hero stats */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
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
                                <Text className="text-white text-base font-bold">Remboursements</Text>
                                <Text className="text-white/80 text-sm">Voyages annulés à régulariser</Text>
                            </View>
                        </View>
                        <View className="flex-row mt-2">
                            <View className="flex-1">
                                <Text className="text-white/80 text-xs uppercase font-bold">À traiter</Text>
                                <Text className="text-white text-2xl font-extrabold">
                                    {stats?.en_attente.nombre ?? 0}
                                </Text>
                                <Text className="text-yellow-200 text-sm font-bold mt-0.5">
                                    {formatMontant(stats?.en_attente.montant ?? 0)} Ar
                                </Text>
                            </View>
                            <View className="w-px bg-white/20 mx-3" />
                            <View className="flex-1">
                                <Text className="text-white/80 text-xs uppercase font-bold">Traités</Text>
                                <Text className="text-white text-2xl font-extrabold">
                                    {stats?.traites.nombre ?? 0}
                                </Text>
                                <Text className="text-green-200 text-sm font-bold mt-0.5">
                                    {formatMontant(stats?.traites.montant ?? 0)} Ar
                                </Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* Recherche */}
                <View className="mx-5 mt-4 bg-white rounded-2xl border border-gray-200 px-4 py-2 flex-row items-center">
                    <Ionicons name="search-outline" size={18} color="#6b7280" />
                    <TextInput
                        className="flex-1 ml-2 text-sm text-gray-900"
                        placeholder="Rechercher (n° résa, nom client...)"
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={charger}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(''); setTimeout(charger, 0); }}>
                            <Ionicons name="close-circle" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filtres */}
                <View className="flex-row mx-5 mt-3">
                    {([
                        { key: 'en_attente', label: 'À traiter', n: stats?.en_attente.nombre ?? 0 },
                        { key: 'traites', label: 'Traités', n: stats?.traites.nombre ?? 0 },
                        { key: 'refuses', label: 'Refusés', n: stats?.refuses.nombre ?? 0 },
                    ] as const).map((f) => {
                        const actif = filtre === f.key;
                        return (
                            <TouchableOpacity
                                key={f.key}
                                onPress={() => setFiltre(f.key)}
                                className={`mr-2 px-3 py-2 rounded-full flex-row items-center ${actif ? 'bg-blue-900' : 'bg-white border border-gray-200'}`}
                            >
                                <Text className={`text-xs font-bold ${actif ? 'text-white' : 'text-gray-700'}`}>
                                    {f.label}
                                </Text>
                                {f.n > 0 && (
                                    <View
                                        className={`ml-2 px-1.5 rounded-full ${actif ? 'bg-white/30' : 'bg-blue-100'}`}
                                    >
                                        <Text
                                            className={`text-xs font-bold ${actif ? 'text-white' : 'text-blue-900'}`}
                                        >
                                            {f.n}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Liste */}
                {loading ? (
                    <View className="py-12 items-center">
                        <ActivityIndicator size="large" color="#1e3a8a" />
                    </View>
                ) : items.length === 0 ? (
                    <View className="items-center justify-center py-16 px-6">
                        <Ionicons
                            name={filtre === 'en_attente' ? 'checkmark-done-circle-outline' : 'document-outline'}
                            size={64}
                            color="#d1d5db"
                        />
                        <Text className="text-gray-700 text-base font-semibold mt-4 text-center">
                            {filtre === 'en_attente'
                                ? 'Aucun remboursement à traiter'
                                : filtre === 'traites'
                                ? 'Aucun remboursement traité'
                                : 'Aucun remboursement refusé'}
                        </Text>
                    </View>
                ) : (
                    <View className="px-5 mt-4">
                        {items.map((r) => (
                            <View
                                key={r.res_id}
                                className="bg-white rounded-3xl p-5 mb-3 border border-gray-100 shadow-sm"
                            >
                                {/* Client + montant */}
                                <View className="flex-row justify-between items-start mb-3">
                                    <View className="flex-1 mr-2">
                                        <Text className="text-gray-900 font-bold text-base">{r.client.nom}</Text>
                                        {r.client.telephone && (
                                            <Text className="text-gray-600 text-xs mt-0.5 font-medium">
                                                {r.client.telephone}
                                            </Text>
                                        )}
                                        <Text className="text-gray-500 text-xs mt-0.5">N° {r.res_numero}</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-blue-900 text-lg font-extrabold">
                                            {formatMontant(r.montant)} Ar
                                        </Text>
                                    </View>
                                </View>

                                {/* Voyage */}
                                <View className="bg-gray-50 rounded-2xl p-3 mb-3">
                                    <View className="flex-row items-center">
                                        <Ionicons name="navigate-outline" size={14} color="#6b7280" />
                                        <Text className="text-gray-700 text-sm font-semibold ml-2 flex-1">
                                            {r.voyage.trajet}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center mt-1">
                                        <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                                        <Text className="text-gray-600 text-xs font-medium ml-2">
                                            {r.voyage.date} • {r.voyage.heure}
                                        </Text>
                                    </View>
                                </View>

                                {/* Détails selon statut */}
                                {r.statut === 2 && (
                                    <View className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-3">
                                        <Text className="text-green-800 text-xs font-bold uppercase mb-1">
                                            Référence
                                        </Text>
                                        <Text className="text-green-900 text-sm font-semibold">
                                            {r.reference || '—'}
                                        </Text>
                                        {r.date_traitement && (
                                            <Text className="text-green-700 text-xs mt-1">
                                                Traité le {r.date_traitement}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                {r.statut === 3 && (
                                    <View className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-3">
                                        <Text className="text-red-800 text-xs font-bold uppercase mb-1">
                                            Motif du refus
                                        </Text>
                                        <Text className="text-red-900 text-sm font-medium">{r.note}</Text>
                                    </View>
                                )}

                                {/* Actions (uniquement si en attente) */}
                                {r.statut === 1 && (
                                    <View className="flex-row mt-2">
                                        <TouchableOpacity
                                            className="flex-1 bg-green-600 rounded-2xl py-3 mr-2 items-center flex-row justify-center"
                                            onPress={() => ouvrirAction('traite', r)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                                            <Text className="text-white font-bold text-sm ml-1.5">
                                                Marquer traité
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            className="bg-red-50 border border-red-200 rounded-2xl py-3 px-4 items-center flex-row justify-center"
                                            onPress={() => ouvrirAction('refus', r)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
                                            <Text className="text-red-700 font-bold text-sm ml-1.5">Refuser</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Modal action (traiter / refuser) */}
            <Modal
                visible={actionModal.visible}
                animationType="slide"
                transparent
                onRequestClose={fermerAction}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1 bg-black/50 justify-end"
                >
                    <View className="bg-white rounded-t-[32px] p-6 pb-10">
                        <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-5" />
                        <Text className="text-blue-900 text-xl font-bold mb-1">
                            {actionModal.type === 'traite' ? 'Marquer comme traité' : 'Refuser le remboursement'}
                        </Text>
                        <Text className="text-gray-600 text-sm mb-4">
                            {actionModal.remb?.client.nom} • {formatMontant(actionModal.remb?.montant ?? 0)} Ar
                        </Text>

                        {actionModal.type === 'traite' ? (
                            <>
                                <Text className="text-gray-700 text-sm font-semibold mb-2">
                                    Référence de la transaction *
                                </Text>
                                <TextInput
                                    value={reference}
                                    onChangeText={setReference}
                                    placeholder="Ex: MVOLA-12345 ou n° transfert"
                                    placeholderTextColor="#9ca3af"
                                    className="border border-gray-300 rounded-2xl px-4 py-3 text-base text-gray-900 mb-4"
                                />
                                <Text className="text-gray-700 text-sm font-semibold mb-2">
                                    Note (optionnelle)
                                </Text>
                                <TextInput
                                    value={note}
                                    onChangeText={setNote}
                                    placeholder="Information complémentaire..."
                                    placeholderTextColor="#9ca3af"
                                    multiline
                                    numberOfLines={3}
                                    className="border border-gray-300 rounded-2xl px-4 py-3 text-base text-gray-900 mb-5"
                                    style={{ minHeight: 80, textAlignVertical: 'top' }}
                                />
                            </>
                        ) : (
                            <>
                                <Text className="text-gray-700 text-sm font-semibold mb-2">Motif du refus *</Text>
                                <TextInput
                                    value={note}
                                    onChangeText={setNote}
                                    placeholder="Expliquez la raison du refus..."
                                    placeholderTextColor="#9ca3af"
                                    multiline
                                    numberOfLines={4}
                                    className="border border-gray-300 rounded-2xl px-4 py-3 text-base text-gray-900 mb-5"
                                    style={{ minHeight: 100, textAlignVertical: 'top' }}
                                />
                            </>
                        )}

                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={fermerAction}
                                disabled={submitting}
                                className="flex-1 bg-gray-100 rounded-2xl py-4 mr-2 items-center"
                            >
                                <Text className="text-gray-700 font-bold text-base">Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={soumettreAction}
                                disabled={submitting}
                                className={`flex-1 rounded-2xl py-4 ml-2 items-center flex-row justify-center ${
                                    actionModal.type === 'traite' ? 'bg-green-600' : 'bg-red-600'
                                }`}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text className="text-white font-bold text-base">
                                        {actionModal.type === 'traite' ? 'Confirmer' : 'Refuser'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};
