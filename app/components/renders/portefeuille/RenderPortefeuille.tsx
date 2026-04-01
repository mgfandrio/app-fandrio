import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { reservationAdminService } from '../../../services/reservations/reservationAdminService';

// --- Types ---
interface Solde {
  brut: number;
  commission: number;
  net: number;
  total_billets: number;
  total_reservations: number;
}

interface PeriodeSolde {
  brut: number;
  commission: number;
  net: number;
  billets: number;
}

interface EvolutionMois {
  mois: string;
  brut: number;
  commission: number;
  net: number;
  billets: number;
  nb_reservations: number;
}

interface RepartitionOperateur {
  operateur: string;
  type_id: number;
  brut: number;
  commission: number;
  net: number;
  billets: number;
  nb_transactions: number;
}

interface Transaction {
  res_id: number;
  res_numero: string;
  date: string;
  client: string | null;
  trajet: string | null;
  voyage_date: string | null;
  nb_voyageurs: number;
  brut: number;
  commission: number;
  net: number;
  operateur: string;
  type_paie_id: number;
  numero_paiement: string | null;
}

interface PortefeuilleData {
  taux_commission: number;
  solde: Solde;
  par_periode: Record<string, PeriodeSolde>;
  evolution_mensuelle: EvolutionMois[];
  repartition_operateur: RepartitionOperateur[];
  transactions: Transaction[];
  pagination: { total: number; current_page: number; last_page: number; per_page: number };
}

interface CollecteConfig {
  frequence: string;
  jour_collecte: string | null;
  commission_active: boolean;
  taux: number;
}

interface CollecteItem {
  coll_id: number;
  periode_debut: string;
  periode_fin: string;
  montant_brut: number;
  montant_commission: number;
  taux: number;
  nb_reservations: number;
  nb_billets: number;
  statut: number;
  statut_label: string;
  date_prevue: string;
  date_confirmation: string | null;
}

interface CollecteData {
  config: CollecteConfig;
  prochaine_collecte: {
    date_prevue: string;
    montant: number;
    periode: string;
  } | null;
  totaux: {
    total_collecte: number;
    total_en_attente: number;
    nb_collectes: number;
  };
  collectes: CollecteItem[];
}

// --- Utils ---
const formatMontant = (n: number) => {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' Ar';
};

const OPERATEUR_COLORS: Record<string, { color: string; bg: string; icon: string }> = {
  'Orange Money': { color: '#f97316', bg: '#fff7ed', icon: 'phone-portrait-outline' },
  'MVola': { color: '#ef4444', bg: '#fef2f2', icon: 'phone-portrait-outline' },
  'Airtel Money': { color: '#ef4444', bg: '#fef2f2', icon: 'phone-portrait-outline' },
};

const PERIODE_LABELS: Record<string, string> = {
  aujourdhui: "Aujourd'hui",
  cette_semaine: 'Cette semaine',
  ce_mois: 'Ce mois',
  cette_annee: 'Cette année',
};

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export function RenderPortefeuille() {
  const [data, setData] = useState<PortefeuilleData | null>(null);
  const [collecteData, setCollecteData] = useState<CollecteData | null>(null);
  const [showCollectes, setShowCollectes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriode, setSelectedPeriode] = useState<string>('ce_mois');
  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const charger = useCallback(async (resetPage = true) => {
    try {
      const p = resetPage ? 1 : page;
      const [portefeuilleRes, collecteRes] = await Promise.all([
        reservationAdminService.obtenirPortefeuille({ page: p, per_page: 15 }),
        reservationAdminService.obtenirMaCollecte(),
      ]);
      if (portefeuilleRes.statut && portefeuilleRes.data) {
        setData(portefeuilleRes.data);
        if (resetPage) {
          setAllTransactions(portefeuilleRes.data.transactions);
          setPage(1);
        } else {
          setAllTransactions(prev => [...prev, ...portefeuilleRes.data.transactions]);
        }
      }
      if (collecteRes.statut && collecteRes.data) {
        setCollecteData(collecteRes.data);
      }
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => { charger(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    charger(true);
  }, [charger]);

  const loadMore = useCallback(async () => {
    if (!data || loadingMore) return;
    if (page >= data.pagination.last_page) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const response = await reservationAdminService.obtenirPortefeuille({ page: nextPage, per_page: 15 });
      if (response.statut && response.data) {
        setAllTransactions(prev => [...prev, ...response.data.transactions]);
        setData(prev => prev ? { ...prev, pagination: response.data.pagination } : prev);
        setPage(nextPage);
      }
    } catch { } finally {
      setLoadingMore(false);
    }
  }, [data, page, loadingMore]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text className="text-gray-500 mt-3">Chargement du portefeuille...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Ionicons name="wallet-outline" size={56} color="#9ca3af" />
        <Text className="text-gray-500 mt-3 text-center">Impossible de charger le portefeuille</Text>
        <TouchableOpacity className="bg-blue-600 rounded-xl px-6 py-3 mt-4" onPress={() => { setLoading(true); charger(); }}>
          <Text className="text-white font-semibold">Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const periodeActuelle = data.par_periode[selectedPeriode];

  const renderHeader = () => (
    <View>
      {/* ====== HERO SOLDE ====== */}
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#2563eb']}
        className="mx-4 mt-4 rounded-3xl px-5 pt-6 pb-5"
        style={{ elevation: 6 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="bg-white/10 rounded-full p-2 mr-2">
              <Ionicons name="wallet" size={20} color="#fff" />
            </View>
            <Text className="text-white/80 text-sm font-medium">Portefeuille</Text>
          </View>
          <View className="bg-yellow-400/20 rounded-full px-3 py-1">
            <Text className="text-yellow-300 text-xs font-bold">Commission {data.taux_commission}%</Text>
          </View>
        </View>

        {/* Solde net */}
        <Text className="text-white text-3xl font-bold">{formatMontant(data.solde.net)}</Text>
        <Text className="text-white/50 text-xs mt-1">Solde net après commission</Text>

        {/* Brut / Commission */}
        <View className="flex-row mt-4 gap-4">
          <View className="flex-1 bg-white/10 rounded-xl p-3">
            <Text className="text-white/60 text-xs">Revenu brut</Text>
            <Text className="text-white font-bold text-base mt-0.5">{formatMontant(data.solde.brut)}</Text>
          </View>
          <View className="flex-1 bg-red-500/20 rounded-xl p-3">
            <Text className="text-red-300/80 text-xs">Commission FANDRIO</Text>
            <Text className="text-red-300 font-bold text-base mt-0.5">- {formatMontant(data.solde.commission)}</Text>
          </View>
        </View>

        {/* Stats rapides */}
        <View className="flex-row mt-3 gap-4">
          <View className="flex-1 items-center">
            <Text className="text-white font-bold text-lg">{data.solde.total_billets}</Text>
            <Text className="text-white/50 text-xs">Billets vendus</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-white font-bold text-lg">{data.solde.total_reservations}</Text>
            <Text className="text-white/50 text-xs">Réservations</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ====== CONFIGURATION DE COLLECTE ====== */}
      {collecteData && (
        <View className="mx-4 mt-4">
          <TouchableOpacity
            className="bg-white rounded-2xl p-4"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}
            onPress={() => setShowCollectes(!showCollectes)}
            activeOpacity={0.7}
          >
            {/* En-tête */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="bg-blue-50 rounded-xl p-2 mr-3">
                  <Ionicons name="calendar" size={20} color="#2563eb" />
                </View>
                <View>
                  <Text className="text-gray-900 font-bold text-sm">Collecte de commission</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">
                    {collecteData.config.commission_active ? 'Active' : 'Inactive'} · {collecteData.config.taux}%
                  </Text>
                </View>
              </View>
              <Ionicons name={showCollectes ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
            </View>

            {/* Configuration */}
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1 bg-blue-50 rounded-xl p-3">
                <Text className="text-blue-500 text-xs">Fréquence</Text>
                <Text className="text-blue-700 font-bold text-sm mt-0.5 capitalize">
                  {collecteData.config.frequence}
                </Text>
              </View>
              <View className="flex-1 bg-purple-50 rounded-xl p-3">
                <Text className="text-purple-500 text-xs">
                  {collecteData.config.frequence === 'hebdomadaire' ? 'Jour' : 'Date'}
                </Text>
                <Text className="text-purple-700 font-bold text-sm mt-0.5 capitalize">
                  {collecteData.config.jour_collecte
                    ? (collecteData.config.frequence === 'mensuelle'
                        ? `Le ${collecteData.config.jour_collecte}`
                        : collecteData.config.jour_collecte)
                    : 'Non défini'}
                </Text>
              </View>
            </View>

            {/* Prochaine collecte */}
            {collecteData.prochaine_collecte && (
              <View className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="time" size={16} color="#ea580c" />
                    <Text className="text-orange-700 font-semibold text-xs ml-1.5">Prochaine collecte</Text>
                  </View>
                  <Text className="text-orange-800 font-bold text-sm">
                    {formatMontant(collecteData.prochaine_collecte.montant)}
                  </Text>
                </View>
                <Text className="text-orange-600 text-xs mt-1">
                  Prévue le {collecteData.prochaine_collecte.date_prevue} · {collecteData.prochaine_collecte.periode}
                </Text>
              </View>
            )}

            {/* Totaux */}
            <View className="flex-row gap-2">
              <View className="flex-1 bg-green-50 rounded-xl p-2.5 items-center">
                <Text className="text-green-500 text-[10px]">Collectées</Text>
                <Text className="text-green-700 font-bold text-xs mt-0.5">
                  {formatMontant(collecteData.totaux.total_collecte)}
                </Text>
              </View>
              <View className="flex-1 bg-yellow-50 rounded-xl p-2.5 items-center">
                <Text className="text-yellow-500 text-[10px]">En attente</Text>
                <Text className="text-yellow-700 font-bold text-xs mt-0.5">
                  {formatMontant(collecteData.totaux.total_en_attente)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Historique des collectes (dépliable) */}
          {showCollectes && collecteData.collectes.length > 0 && (
            <View className="mt-2">
              <Text className="text-gray-700 font-bold text-sm mb-2 px-1">Historique des collectes</Text>
              {collecteData.collectes.map((coll) => (
                <View
                  key={coll.coll_id}
                  className="bg-white rounded-xl p-3 mb-1.5"
                  style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 }}
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-xs">
                        {coll.periode_debut} → {coll.periode_fin}
                      </Text>
                      <Text className="text-gray-400 text-[10px] mt-0.5">
                        {coll.nb_reservations} rés. · {coll.nb_billets} billets · Prévue: {coll.date_prevue}
                      </Text>
                    </View>
                    <View className={`rounded-full px-2 py-0.5 ${coll.statut === 2 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      <Text className={`text-[10px] font-semibold ${coll.statut === 2 ? 'text-green-700' : 'text-yellow-700'}`}>
                        {coll.statut_label}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-400 text-[10px]">
                      Brut: {formatMontant(coll.montant_brut)} · {coll.taux}%
                    </Text>
                    <Text className="text-red-500 font-bold text-xs">
                      -{formatMontant(coll.montant_commission)}
                    </Text>
                  </View>
                  {coll.date_confirmation && (
                    <Text className="text-green-600 text-[10px] mt-1">
                      Confirmée le {coll.date_confirmation}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {showCollectes && collecteData.collectes.length === 0 && (
            <View className="mt-2 bg-white rounded-xl p-4 items-center" style={{ elevation: 1 }}>
              <Ionicons name="receipt-outline" size={32} color="#d1d5db" />
              <Text className="text-gray-400 text-xs mt-2">Aucune collecte enregistrée</Text>
            </View>
          )}
        </View>
      )}

      {/* ====== SOLDE PAR PÉRIODE ====== */}
      <View className="mx-4 mt-4">
        <Text className="text-gray-900 text-base font-bold mb-3">Revenus par période</Text>

        {/* Sélecteur de période */}
        <View className="flex-row mb-3 gap-2">
          {Object.keys(PERIODE_LABELS).map((key) => (
            <TouchableOpacity
              key={key}
              className={`flex-1 py-2 rounded-lg ${selectedPeriode === key ? 'bg-blue-600' : 'bg-gray-100'}`}
              onPress={() => setSelectedPeriode(key)}
            >
              <Text className={`text-center text-xs font-semibold ${selectedPeriode === key ? 'text-white' : 'text-gray-600'}`}>
                {PERIODE_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Détail période */}
        {periodeActuelle && (
          <View className="bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-gray-500 text-xs">Brut</Text>
                <Text className="text-gray-900 font-bold text-lg">{formatMontant(periodeActuelle.brut)}</Text>
              </View>
              <View className="items-center">
                <Text className="text-red-400 text-xs">Commission</Text>
                <Text className="text-red-500 font-bold text-lg">- {formatMontant(periodeActuelle.commission)}</Text>
              </View>
              <View className="items-end">
                <Text className="text-emerald-500 text-xs">Net</Text>
                <Text className="text-emerald-600 font-bold text-lg">{formatMontant(periodeActuelle.net)}</Text>
              </View>
            </View>
            <View className="bg-gray-50 rounded-lg p-2 flex-row items-center justify-center">
              <Ionicons name="ticket-outline" size={14} color="#6b7280" />
              <Text className="text-gray-500 text-xs ml-1">{periodeActuelle.billets} billets vendus</Text>
            </View>
          </View>
        )}
      </View>

      {/* ====== RÉPARTITION PAR OPÉRATEUR ====== */}
      {data.repartition_operateur.length > 0 && (
        <View className="mx-4 mt-4">
          <Text className="text-gray-900 text-base font-bold mb-3">Par opérateur</Text>
          {data.repartition_operateur.map((op, i) => {
            const config = OPERATEUR_COLORS[op.operateur] || { color: '#6b7280', bg: '#f3f4f6', icon: 'card-outline' };
            const pourcentage = data.solde.brut > 0 ? Math.round((op.brut / data.solde.brut) * 100) : 0;
            return (
              <View
                key={i}
                className="bg-white rounded-2xl p-4 mb-2"
                style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="rounded-xl p-2.5 mr-3" style={{ backgroundColor: config.bg }}>
                      <Ionicons name={config.icon as any} size={20} color={config.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-sm">{op.operateur}</Text>
                      <Text className="text-gray-400 text-xs">{op.nb_transactions} transactions • {op.billets} billets</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-900 font-bold text-sm">{formatMontant(op.net)}</Text>
                    <Text className="text-gray-400 text-xs">{pourcentage}%</Text>
                  </View>
                </View>
                {/* Barre de progression */}
                <View className="bg-gray-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${pourcentage}%`, backgroundColor: config.color }} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ====== ÉVOLUTION MENSUELLE ====== */}
      {data.evolution_mensuelle.length > 0 && (
        <View className="mx-4 mt-4">
          <Text className="text-gray-900 text-base font-bold mb-3">Évolution mensuelle</Text>
          <View className="bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
            {data.evolution_mensuelle.slice(-6).map((m, i) => {
              const [annee, moisNum] = m.mois.split('-');
              const moisLabel = MOIS_LABELS[parseInt(moisNum) - 1] || m.mois;
              const maxBrut = Math.max(...data.evolution_mensuelle.map(e => e.brut), 1);
              const barWidth = Math.max((m.brut / maxBrut) * 100, 2);
              return (
                <View key={i} className={`flex-row items-center py-2.5 ${i < data.evolution_mensuelle.slice(-6).length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <Text className="text-gray-500 text-xs font-medium w-12">{moisLabel} {annee.slice(2)}</Text>
                  <View className="flex-1 mx-3">
                    <View className="bg-gray-100 h-5 rounded-full overflow-hidden flex-row">
                      <LinearGradient
                        colors={['#2563eb', '#3b82f6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ width: `${barWidth}%`, height: '100%', borderRadius: 999 }}
                      />
                    </View>
                  </View>
                  <View className="items-end w-24">
                    <Text className="text-gray-900 font-bold text-xs">{formatMontant(m.net)}</Text>
                    <Text className="text-red-400 text-[10px]">-{formatMontant(m.commission)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ====== EN-TÊTE TRANSACTIONS ====== */}
      <View className="mx-4 mt-5 mb-2 flex-row items-center justify-between">
        <Text className="text-gray-900 text-base font-bold">Historique des transactions</Text>
        <View className="bg-blue-50 rounded-lg px-2.5 py-1">
          <Text className="text-blue-600 text-xs font-semibold">{data.pagination.total} au total</Text>
        </View>
      </View>
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View
      className="bg-white mx-4 mb-2 rounded-xl p-4"
      style={{ elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1">
            <Text className="text-gray-900 font-bold text-sm">{item.res_numero}</Text>
            <View className="bg-gray-100 rounded px-1.5 py-0.5 ml-2">
              <Text className="text-gray-500 text-[10px]">{item.nb_voyageurs} billet{item.nb_voyageurs > 1 ? 's' : ''}</Text>
            </View>
          </View>
          {item.client && <Text className="text-gray-500 text-xs">{item.client}</Text>}
          {item.trajet && <Text className="text-gray-400 text-xs mt-0.5">{item.trajet}</Text>}
          <View className="flex-row items-center mt-1.5">
            <Ionicons name="time-outline" size={11} color="#9ca3af" />
            <Text className="text-gray-400 text-[10px] ml-1">{item.date}</Text>
            <Text className="text-gray-300 mx-1.5">•</Text>
            <Text className="text-gray-500 text-[10px] font-medium">{item.operateur}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-emerald-600 font-bold text-sm">+{formatMontant(item.net)}</Text>
          <Text className="text-red-400 text-[10px] mt-0.5">-{formatMontant(item.commission)}</Text>
          <Text className="text-gray-400 text-[10px]">sur {formatMontant(item.brut)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={allTransactions}
      keyExtractor={(item) => String(item.res_id)}
      renderItem={renderTransaction}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={
        <View className="pb-8">
          {loadingMore && (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          )}
          {!loadingMore && allTransactions.length > 0 && page >= (data.pagination.last_page) && (
            <Text className="text-gray-400 text-xs text-center py-4">Toutes les transactions sont affichées</Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View className="items-center py-10">
          <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 mt-3 text-center">Aucune transaction pour le moment</Text>
        </View>
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e3a8a']} />}
      showsVerticalScrollIndicator={false}
      className="flex-1 bg-gray-50"
    />
  );
}
