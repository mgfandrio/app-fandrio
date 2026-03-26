import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, TextInput, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { reservationAdminService } from '@/app/services/reservations/reservationAdminService';

const formatMontant = (montant: number) =>
  montant.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' Ar';

const PERIODES = [
  { label: 'Tout', value: '' },
  { label: "Aujourd'hui", value: 'aujourdhui' },
  { label: 'Cette semaine', value: 'semaine' },
  { label: 'Ce mois', value: 'mois' },
  { label: 'Cette année', value: 'annee' },
];

const TYPES_PAIEMENT = [
  { label: 'Tous', id: 0 },
  { label: 'MVola', id: 2 },
  { label: 'Orange Money', id: 1 },
  { label: 'Airtel Money', id: 3 },
];

export const RenderFactures = () => {
  const [factures, setFactures] = useState<any[]>([]);
  const [resume, setResume] = useState<any>({});
  const [pagination, setPagination] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [periodeIdx, setPeriodeIdx] = useState(0);
  const [typePayIdx, setTypePayIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<any>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  const buildParams = useCallback(() => {
    const params: any = { page: 1 };
    if (searchDebounced) params.search = searchDebounced;
    if (TYPES_PAIEMENT[typePayIdx].id) params.type_paie_id = TYPES_PAIEMENT[typePayIdx].id;

    const periode = PERIODES[periodeIdx].value;
    const now = new Date();
    if (periode === 'aujourdhui') {
      params.date_debut = now.toISOString().split('T')[0];
      params.date_fin = now.toISOString().split('T')[0];
    } else if (periode === 'semaine') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now);
      start.setDate(diff);
      params.date_debut = start.toISOString().split('T')[0];
    } else if (periode === 'mois') {
      params.date_debut = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (periode === 'annee') {
      params.date_debut = `${now.getFullYear()}-01-01`;
    }
    return params;
  }, [searchDebounced, periodeIdx, typePayIdx]);

  const fetchFactures = useCallback(async (page = 1) => {
    try {
      if (page === 1) setLoading(true);
      const params = { ...buildParams(), page };
      const res = await reservationAdminService.obtenirFactures(params);
      if (res.statut) {
        setFactures(page === 1 ? res.data.factures : [...factures, ...res.data.factures]);
        setResume(res.data.resume || {});
        setPagination(res.data.pagination || {});
      }
    } catch (e) {
      console.error('Error fetching factures:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildParams, factures]);

  useEffect(() => {
    fetchFactures(1);
  }, [searchDebounced, periodeIdx, typePayIdx]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFactures(1);
  };

  const paiementColor = (type: string) => {
    if (type?.includes('MVola')) return '#e7272d';
    if (type?.includes('Orange')) return '#ff6600';
    if (type?.includes('Airtel')) return '#ed1c24';
    return '#6b7280';
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* Hero */}
        <View className="mx-4 mt-4 mb-4 rounded-2xl overflow-hidden" style={{ elevation: 4 }}>
          <LinearGradient colors={['#0f172a', '#1e3a5f', '#1e40af']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="px-5 py-6">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-blue-300 text-xs font-medium">Registre des factures</Text>
                <Text className="text-white text-xl font-bold mt-1">Suivi financier</Text>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="receipt" size={24} color="#93c5fd" />
              </View>
            </View>
            <View className="flex-row" style={{ gap: 10 }}>
              <View className="flex-1 bg-white/10 rounded-xl p-3">
                <Text className="text-blue-200 text-[10px]">Total CA</Text>
                <Text className="text-white font-bold text-base">{formatMontant(resume.total_montant || 0)}</Text>
              </View>
              <View className="flex-1 bg-white/10 rounded-xl p-3">
                <Text className="text-blue-200 text-[10px]">Factures</Text>
                <Text className="text-white font-bold text-base">{resume.total_factures || 0}</Text>
              </View>
              <View className="flex-1 bg-white/10 rounded-xl p-3">
                <Text className="text-blue-200 text-[10px]">Voyageurs</Text>
                <Text className="text-white font-bold text-base">{resume.total_voyageurs || 0}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Search & Filters */}
        <View className="px-4 mb-3">
          <View className="flex-row items-center bg-white rounded-xl px-3" style={{ elevation: 1 }}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 py-3 px-2 text-sm text-gray-900"
              placeholder="Rechercher (n° résa, client, téléphone...)"
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)} className="ml-2">
              <Ionicons name="filter" size={18} color={showFilters ? '#3b82f6' : '#9ca3af'} />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View className="mt-3">
              <Text className="text-xs text-gray-500 font-bold mb-2">Période</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 6 }}>
                <View className="flex-row" style={{ gap: 6 }}>
                  {PERIODES.map((p, i) => (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setPeriodeIdx(i)}
                      className={`px-3 py-1.5 rounded-full ${periodeIdx === i ? 'bg-blue-600' : 'bg-white'}`}
                    >
                      <Text className={`text-xs font-semibold ${periodeIdx === i ? 'text-white' : 'text-gray-600'}`}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text className="text-xs text-gray-500 font-bold mb-2 mt-3">Type de paiement</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row" style={{ gap: 6 }}>
                  {TYPES_PAIEMENT.map((t, i) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setTypePayIdx(i)}
                      className={`px-3 py-1.5 rounded-full ${typePayIdx === i ? 'bg-blue-600' : 'bg-white'}`}
                    >
                      <Text className={`text-xs font-semibold ${typePayIdx === i ? 'text-white' : 'text-gray-600'}`}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Factures List */}
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : factures.length === 0 ? (
          <View className="items-center py-16 mx-4">
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="receipt-outline" size={30} color="#94a3b8" />
            </View>
            <Text className="text-gray-400 font-bold mt-3">Aucune facture trouvée</Text>
            <Text className="text-gray-300 text-xs mt-1">Ajustez vos filtres ou attendez de nouvelles réservations.</Text>
          </View>
        ) : (
          <View className="px-4" style={{ gap: 8 }}>
            <Text className="text-xs text-gray-400">{resume.total_factures || 0} résultat{(resume.total_factures || 0) > 1 ? 's' : ''}</Text>
            {factures.map((f: any) => (
              <TouchableOpacity
                key={f.res_id}
                className="bg-white rounded-2xl p-4"
                style={{ elevation: 1 }}
                onPress={() => setSelectedFacture(f)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="receipt" size={16} color="#3b82f6" />
                    </View>
                    <View className="ml-2">
                      <Text className="text-gray-900 font-bold text-xs">{f.res_numero}</Text>
                      <Text className="text-gray-400 text-[10px]">{f.date}</Text>
                    </View>
                  </View>
                  <Text className="text-green-600 font-bold text-sm">{formatMontant(f.montant_total)}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-gray-700 text-xs" numberOfLines={1}>{f.client?.nom || 'Client inconnu'}</Text>
                    <Text className="text-gray-400 text-[10px]">{f.trajet} · {f.voyage_date}</Text>
                  </View>
                  <View className="flex-row items-center ml-2">
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: paiementColor(f.type_paiement) + '15' }}>
                      <Text className="text-[9px] font-bold" style={{ color: paiementColor(f.type_paiement) }}>{f.type_paiement}</Text>
                    </View>
                    <Text className="text-gray-400 text-[10px] ml-1.5">{f.nb_voyageurs} voy.</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Load more */}
            {pagination.current_page < pagination.last_page && (
              <TouchableOpacity
                className="bg-blue-50 rounded-xl py-3 items-center mt-2 mb-8"
                onPress={() => fetchFactures(pagination.current_page + 1)}
              >
                <Text className="text-blue-600 font-bold text-sm">Charger plus</Text>
              </TouchableOpacity>
            )}
            <View className="h-4" />
          </View>
        )}
      </ScrollView>

      {/* Facture Detail Modal */}
      <Modal visible={!!selectedFacture} transparent animationType="slide" onRequestClose={() => setSelectedFacture(null)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10" style={{ maxHeight: '70%' }}>
            <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-lg font-bold text-gray-900">Détail facture</Text>
              <TouchableOpacity onPress={() => setSelectedFacture(null)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            {selectedFacture && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="bg-blue-50 rounded-xl p-4 mb-4">
                  <Text className="text-blue-800 font-bold text-base">{selectedFacture.res_numero}</Text>
                  <Text className="text-blue-600 text-xs mt-1">{selectedFacture.date}</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-400 text-[10px] font-bold mb-1">CLIENT</Text>
                  <Text className="text-gray-900 font-semibold">{selectedFacture.client?.nom || 'N/A'}</Text>
                  <Text className="text-gray-500 text-xs">{selectedFacture.client?.telephone || 'N/A'}</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-400 text-[10px] font-bold mb-1">TRAJET</Text>
                  <Text className="text-gray-900 font-semibold">{selectedFacture.trajet}</Text>
                  <Text className="text-gray-500 text-xs">Voyage du {selectedFacture.voyage_date}</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-400 text-[10px] font-bold mb-1">PAIEMENT</Text>
                  <View className="flex-row items-center">
                    <Text className="text-gray-900 font-semibold">{selectedFacture.type_paiement}</Text>
                    {selectedFacture.numero_paiement && (
                      <Text className="text-gray-500 text-xs ml-2">Réf: {selectedFacture.numero_paiement}</Text>
                    )}
                  </View>
                </View>

                <View className="bg-green-50 rounded-xl p-4">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-600 text-sm">Montant total</Text>
                    <Text className="text-green-700 font-bold text-lg">{formatMontant(selectedFacture.montant_total)}</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-500 text-xs">Voyageurs</Text>
                    <Text className="text-gray-700 font-semibold">{selectedFacture.nb_voyageurs}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
