import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import compagnieService from '../../services/compagnies/compagnieService';
import { reservationAdminService } from '../../services/reservations/reservationAdminService';

interface DashboardStatsProps {
  refreshTrigger?: number;
  onNavigate?: (tab: string) => void;
}

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const formatMontant = (montant: number): string => {
  if (montant >= 1000000) {
    const m = montant / 1000000;
    return (m >= 10 ? m.toFixed(0) : m.toFixed(1).replace('.', ',')) + ' M';
  }
  if (montant >= 1000) return Math.round(montant / 1000) + ' K';
  return montant.toLocaleString('fr-FR');
};

const formatFull = (montant: number): string => {
  return montant.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' Ar';
};

export const DashboardStats: React.FC<DashboardStatsProps> = ({ refreshTrigger = 0, onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [refreshTrigger]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [opRes, finRes] = await Promise.all([
        compagnieService.getTableauBord(),
        reservationAdminService.obtenirTableauBordFinancier(),
      ]);
      if (opRes.statut) setStats(opRes.data);
      if (finRes.statut) setFinance(finRes.data);
    } catch {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="py-12 items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-400 text-sm mt-3">Chargement du tableau de bord...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-red-50 rounded-2xl p-5 items-center">
        <Ionicons name="alert-circle" size={32} color="#ef4444" />
        <Text className="text-red-600 font-bold mt-2">{error}</Text>
        <TouchableOpacity onPress={fetchAll} className="mt-3 bg-red-100 px-4 py-2 rounded-xl">
          <Text className="text-red-700 font-bold text-sm">Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ca = finance?.ca || {};
  const totaux = finance?.totaux || {};
  const evolutionMensuelle = finance?.evolution_mensuelle || [];
  const repartition = finance?.repartition_paiement || [];
  const prochains = finance?.prochains_voyages || [];
  const recentes = finance?.reservations_recentes || [];
  const taux = finance?.taux_remplissage || 0;
  const totalPaiements = repartition.reduce((s: number, r: any) => s + r.montant, 0) || 1;
  const paiementColors: Record<string, string> = { 'MVola': '#e7272d', 'Orange Money': '#ff6600', 'Airtel Money': '#ed1c24' };

  return (
    <View>
      {/* CA Summary Cards */}
      <View className="mb-5">
        <Text className="text-base font-bold text-gray-900 mb-3">Chiffre d'Affaires</Text>
        <View className="flex-row" style={{ gap: 10 }}>
          <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
            <View className="flex-row items-center mb-2">
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="today" size={16} color="#3b82f6" />
              </View>
            </View>
            <Text className="text-gray-400 text-[10px] font-medium">AUJOURD'HUI</Text>
            <Text className="text-gray-900 text-lg font-bold mt-0.5">{formatMontant(ca.aujourdhui || 0)}</Text>
            <Text className="text-gray-300 text-[9px]">Ar</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
            <View className="flex-row items-center mb-2">
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar" size={16} color="#10b981" />
              </View>
            </View>
            <Text className="text-gray-400 text-[10px] font-medium">CETTE SEMAINE</Text>
            <Text className="text-gray-900 text-lg font-bold mt-0.5">{formatMontant(ca.cette_semaine || 0)}</Text>
            <Text className="text-gray-300 text-[9px]">Ar</Text>
          </View>
        </View>
        <View className="flex-row mt-2.5" style={{ gap: 10 }}>
          <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
            <View className="flex-row items-center justify-between mb-2">
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trending-up" size={16} color="#8b5cf6" />
              </View>
              {ca.evolution_mois != null && (
                <View className={`flex-row items-center px-2 py-0.5 rounded-full ${ca.evolution_mois >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <Ionicons name={ca.evolution_mois >= 0 ? 'arrow-up' : 'arrow-down'} size={10} color={ca.evolution_mois >= 0 ? '#10b981' : '#ef4444'} />
                  <Text className={`text-[9px] font-bold ml-0.5 ${ca.evolution_mois >= 0 ? 'text-green-600' : 'text-red-500'}`}>{Math.abs(ca.evolution_mois)}%</Text>
                </View>
              )}
            </View>
            <Text className="text-gray-400 text-[10px] font-medium">CE MOIS</Text>
            <Text className="text-gray-900 text-lg font-bold mt-0.5">{formatMontant(ca.ce_mois || 0)}</Text>
            <Text className="text-gray-300 text-[9px]">Ar · vs {formatMontant(ca.mois_dernier || 0)} mois dernier</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
            <View className="flex-row items-center mb-2">
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="stats-chart" size={16} color="#f59e0b" />
              </View>
            </View>
            <Text className="text-gray-400 text-[10px] font-medium">CETTE ANNÉE</Text>
            <Text className="text-gray-900 text-lg font-bold mt-0.5">{formatMontant(ca.cette_annee || 0)}</Text>
            <Text className="text-gray-300 text-[9px]">Ar</Text>
          </View>
        </View>
      </View>

      {/* Evolution Chart */}
      {evolutionMensuelle.length > 0 && (
        <View className="bg-white rounded-2xl p-4 mb-5" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <Text className="text-sm font-bold text-gray-900 mb-1">Évolution du CA</Text>
          <Text className="text-[10px] text-gray-400 mb-4">12 derniers mois</Text>
          <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            {evolutionMensuelle.map((item: any, i: number) => {
              const maxCa = Math.max(...evolutionMensuelle.map((d: any) => parseFloat(d.ca) || 0), 1);
              const h = Math.max(((parseFloat(item.ca) || 0) / maxCa) * 100, 3);
              const moisNum = parseInt(item.mois?.split('-')[1] || '0') - 1;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text className="text-[7px] text-gray-400 mb-1">{formatMontant(parseFloat(item.ca) || 0)}</Text>
                  <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={{ width: '75%', height: h, borderRadius: 4, minHeight: 3 }} />
                  <Text className="text-[8px] text-gray-400 mt-1">{MOIS_COURTS[moisNum] || ''}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Key Metrics */}
      <View className="bg-white rounded-2xl p-4 mb-5" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
        <Text className="text-sm font-bold text-gray-900 mb-3">Indicateurs clés</Text>
        <View className="flex-row" style={{ gap: 8 }}>
          <View className="flex-1 items-center bg-blue-50 rounded-xl py-3">
            <Ionicons name="ticket" size={20} color="#3b82f6" />
            <Text className="text-blue-700 text-lg font-bold mt-1">{totaux.reservations || 0}</Text>
            <Text className="text-blue-400 text-[9px]">Réservations</Text>
          </View>
          <View className="flex-1 items-center bg-green-50 rounded-xl py-3">
            <Ionicons name="people" size={20} color="#10b981" />
            <Text className="text-green-700 text-lg font-bold mt-1">{totaux.voyageurs || 0}</Text>
            <Text className="text-green-400 text-[9px]">Voyageurs</Text>
          </View>
          <View className="flex-1 items-center bg-purple-50 rounded-xl py-3">
            <Ionicons name="speedometer" size={20} color="#8b5cf6" />
            <Text className="text-purple-700 text-lg font-bold mt-1">{taux}%</Text>
            <Text className="text-purple-400 text-[9px]">Remplissage</Text>
          </View>
          <View className="flex-1 items-center bg-orange-50 rounded-xl py-3">
            <Ionicons name="checkmark-done" size={20} color="#f59e0b" />
            <Text className="text-orange-700 text-lg font-bold mt-1">{totaux.voyages_complets || 0}</Text>
            <Text className="text-orange-400 text-[9px]">Complets</Text>
          </View>
        </View>
      </View>

      {/* Payment Breakdown */}
      {repartition.length > 0 && (
        <View className="bg-white rounded-2xl p-4 mb-5" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <Text className="text-sm font-bold text-gray-900 mb-3">Répartition des paiements</Text>
          {repartition.map((item: any, i: number) => {
            const pct = ((item.montant / totalPaiements) * 100).toFixed(0);
            const color = paiementColors[item.type] || '#6b7280';
            return (
              <View key={i} className="mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-gray-700 font-semibold">{item.type}</Text>
                  <View className="flex-row items-center">
                    <Text className="text-[10px] text-gray-400 mr-2">{item.count} résa</Text>
                    <Text className="text-xs font-bold" style={{ color }}>{formatFull(item.montant)}</Text>
                  </View>
                </View>
                <View className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <View style={{ width: `${pct}%`, backgroundColor: color, height: '100%', borderRadius: 999 }} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Operational Stats */}
      {stats && (
        <View className="bg-white rounded-2xl p-4 mb-5" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <Text className="text-sm font-bold text-gray-900 mb-3">Parc & Équipe</Text>
          <View className="flex-row" style={{ gap: 8 }}>
            <TouchableOpacity className="flex-1 bg-blue-50 rounded-xl p-3 items-center" onPress={() => onNavigate?.('voitures')} activeOpacity={0.7}>
              <Ionicons name="car" size={22} color="#3b82f6" />
              <Text className="text-gray-900 font-bold text-base mt-1">{stats.voitures?.total || 0}</Text>
              <Text className="text-gray-400 text-[9px]">Voitures</Text>
              <Text className="text-green-500 text-[8px]">{stats.voitures?.disponibles || 0} dispo</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-purple-50 rounded-xl p-3 items-center" onPress={() => onNavigate?.('voyages')} activeOpacity={0.7}>
              <Ionicons name="navigate" size={22} color="#8b5cf6" />
              <Text className="text-gray-900 font-bold text-base mt-1">{stats.voyages?.total || 0}</Text>
              <Text className="text-gray-400 text-[9px]">Voyages</Text>
              <Text className="text-green-500 text-[8px]">{stats.voyages?.actifs || 0} actifs</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-green-50 rounded-xl p-3 items-center" onPress={() => onNavigate?.('chauffeurs')} activeOpacity={0.7}>
              <Ionicons name="people" size={22} color="#10b981" />
              <Text className="text-gray-900 font-bold text-base mt-1">{stats.chauffeurs?.total || 0}</Text>
              <Text className="text-gray-400 text-[9px]">Chauffeurs</Text>
              <Text className="text-green-500 text-[8px]">{stats.chauffeurs?.actifs || 0} actifs</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upcoming Voyages */}
      {prochains.length > 0 && (
        <View className="bg-white rounded-2xl p-4 mb-5" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-bold text-gray-900">Prochains voyages</Text>
            <TouchableOpacity onPress={() => onNavigate?.('voyages')}><Text className="text-blue-600 text-xs font-bold">Voir tout</Text></TouchableOpacity>
          </View>
          {prochains.map((v: any, i: number) => (
            <View key={i} className={`flex-row items-center py-3 ${i < prochains.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: v.statut === 2 ? '#fef3c7' : '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={v.statut === 2 ? 'navigate' : 'time'} size={18} color={v.statut === 2 ? '#f59e0b' : '#3b82f6'} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-gray-900 font-bold text-xs" numberOfLines={1}>{v.trajet}</Text>
                <Text className="text-gray-400 text-[10px] mt-0.5">{v.date} · {v.heure} · {v.voiture}</Text>
              </View>
              <View className="items-end">
                <Text className="text-blue-600 font-bold text-xs">{v.places_reservees}/{v.places_disponibles}</Text>
                <Text className="text-gray-300 text-[9px]">places</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Reservations */}
      {recentes.length > 0 && (
        <View className="bg-white rounded-2xl p-4 mb-2" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-bold text-gray-900">Dernières réservations</Text>
            <TouchableOpacity onPress={() => onNavigate?.('reservations')}><Text className="text-blue-600 text-xs font-bold">Voir tout</Text></TouchableOpacity>
          </View>
          {recentes.map((r: any, i: number) => (
            <View key={i} className={`flex-row items-center py-3 ${i < recentes.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
                <Text className="text-blue-600 font-bold text-xs">{r.client?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'}</Text>
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-gray-900 font-bold text-xs" numberOfLines={1}>{r.client || 'Client'}</Text>
                <Text className="text-gray-400 text-[10px] mt-0.5">{r.trajet} · {r.nb_voyageurs} voy.</Text>
              </View>
              <View className="items-end">
                <Text className="text-green-600 font-bold text-xs">{formatFull(r.montant || 0)}</Text>
                <Text className="text-gray-300 text-[9px]">{r.type_paiement}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
