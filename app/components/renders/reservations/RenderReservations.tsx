import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { reservationAdminService } from '@/app/services/reservations/reservationAdminService';
import { VoyageReservationDetail } from './VoyageReservationDetail';

const formatMontant = (montant: number) => {
  return montant.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' Ar';
};

export const RenderReservations = () => {
  const [voyages, setVoyages] = useState<any[]>([]);
  const [resume, setResume] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVoyage, setSelectedVoyage] = useState<any>(null);

  const fetchVoyages = useCallback(async () => {
    try {
      const res = await reservationAdminService.obtenirVoyagesAvecReservations();
      if (res.statut) {
        setVoyages(Array.isArray(res.data.voyages) ? res.data.voyages : []);
        setResume(res.data.resume || {});
      }
    } catch (e) {
      console.error('Error fetching voyages with reservations:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVoyages();
  }, [fetchVoyages]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVoyages();
  };

  const getStatutLabel = (statut: number, estComplet?: boolean) => {
    if (statut === 1 && estComplet) return { label: 'Complet', color: '#7c3aed', bg: '#f5f3ff' };
    switch (statut) {
      case 1: return { label: 'Programmé', color: '#3b82f6', bg: '#eff6ff' };
      case 2: return { label: 'En cours', color: '#f59e0b', bg: '#fffbeb' };
      case 3: return { label: 'Terminé', color: '#10b981', bg: '#ecfdf5' };
      case 4: return { label: 'Annulé', color: '#ef4444', bg: '#fef2f2' };
      default: return { label: 'Inconnu', color: '#94a3b8', bg: '#f1f5f9' };
    }
  };

  if (selectedVoyage) {
    return (
      <VoyageReservationDetail
        voyage={selectedVoyage}
        onBack={() => { setSelectedVoyage(null); fetchVoyages(); }}
      />
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      >
        {/* Hero */}
        <View className="mx-4 mt-4 mb-4 rounded-2xl overflow-hidden" style={{ elevation: 4 }}>
          <LinearGradient
            colors={['#7c2d12', '#c2410c', '#ea580c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-5 py-6"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-white font-extrabold text-xl">Réservations</Text>
                <Text className="text-orange-200 text-xs mt-1">Gestion des billets et revenus</Text>
              </View>
              <View className="bg-white/15 rounded-2xl p-3">
                <Ionicons name="ticket" size={24} color="#fff" />
              </View>
            </View>

            {/* Stats cards */}
            {!loading && (resume.revenu_total !== undefined) && (
              <View className="flex-row mt-2">
                <View className="flex-1 bg-white/15 rounded-xl p-3 mr-2">
                  <Text className="text-orange-200 text-[10px] font-semibold">REVENU TOTAL</Text>
                  <Text className="text-white font-extrabold text-base mt-1">
                    {formatMontant(resume.revenu_total || 0)}
                  </Text>
                </View>
                <View className="flex-1 bg-white/15 rounded-xl p-3 mr-2">
                  <Text className="text-orange-200 text-[10px] font-semibold">RÉSERVATIONS</Text>
                  <Text className="text-white font-extrabold text-base mt-1">
                    {resume.total_reservations || 0}
                  </Text>
                </View>
                <View className="flex-1 bg-white/15 rounded-xl p-3">
                  <Text className="text-orange-200 text-[10px] font-semibold">VOYAGES</Text>
                  <Text className="text-white font-extrabold text-base mt-1">
                    {resume.total_voyages || 0}
                  </Text>
                </View>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Content */}
        <View className="px-4">
          {loading ? (
            <View className="items-center py-16">
              <View className="rounded-full overflow-hidden" style={{ width: 48, height: 48 }}>
                <LinearGradient colors={['#c2410c', '#ea580c']} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" />
                </LinearGradient>
              </View>
              <Text className="text-slate-400 mt-3 text-sm">Chargement...</Text>
            </View>
          ) : voyages.length > 0 ? (
            voyages.map((voyage) => {
              const statut = getStatutLabel(voyage.statut, voyage.est_complet);
              return (
                <TouchableOpacity
                  key={voyage.voyage_id}
                  className="bg-white rounded-2xl mb-3 overflow-hidden"
                  style={{ elevation: 2 }}
                  activeOpacity={0.8}
                  onPress={() => setSelectedVoyage(voyage)}
                >
                  {/* Top accent */}
                  <LinearGradient
                    colors={['#c2410c', '#ea580c', '#fb923c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 3 }}
                  />

                  <View className="p-4">
                    {/* Trajet + Status */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-1 mr-3">
                        <Text className="text-slate-800 font-bold text-base" numberOfLines={1}>
                          {voyage.trajet?.province_depart} → {voyage.trajet?.province_arrivee}
                        </Text>
                        <Text className="text-slate-400 text-xs mt-0.5">{voyage.trajet?.nom}</Text>
                      </View>
                      <View className="rounded-lg px-2.5 py-1" style={{ backgroundColor: statut.bg }}>
                        <Text className="text-xs font-bold" style={{ color: statut.color }}>{statut.label}</Text>
                      </View>
                    </View>

                    {/* Stats row */}
                    <View className="flex-row items-center mb-3">
                      <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2">
                        <Ionicons name="calendar-outline" size={12} color="#64748b" />
                        <Text className="text-slate-500 text-[10px] font-medium ml-1">{voyage.date}</Text>
                      </View>
                      <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2">
                        <Ionicons name="time-outline" size={12} color="#64748b" />
                        <Text className="text-slate-500 text-[10px] font-medium ml-1">{voyage.heure_depart}</Text>
                      </View>
                      <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2">
                        <Ionicons name="car-outline" size={12} color="#64748b" />
                        <Text className="text-slate-500 text-[10px] font-medium ml-1">{voyage.voiture?.matricule}</Text>
                      </View>
                    </View>

                    {/* Reservation + Revenue info */}
                    <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                      <View className="flex-row items-center flex-1 flex-wrap">
                        <View className="bg-orange-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-1">
                          <Ionicons name="ticket-outline" size={13} color="#ea580c" />
                          <Text className="text-orange-700 text-xs font-bold ml-1">{voyage.reservations_count} rés.</Text>
                        </View>
                        <View className="bg-blue-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-1">
                          <Ionicons name="people-outline" size={13} color="#2563eb" />
                          <Text className="text-blue-700 text-xs font-bold ml-1">{voyage.total_voyageurs} voyag.</Text>
                        </View>
                        <View className="bg-emerald-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-1">
                          <Ionicons name="grid-outline" size={13} color="#059669" />
                          <Text className="text-emerald-700 text-xs font-bold ml-1">
                            {voyage.places_reservees}/{voyage.places_disponibles}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                    </View>

                    {/* Revenue row */}
                    {voyage.revenu_total > 0 && (
                      <View className="mt-2 pt-2 border-t border-slate-100 flex-row items-center">
                        <View className="bg-amber-50 rounded-lg px-3 py-1.5 flex-row items-center">
                          <Ionicons name="cash-outline" size={13} color="#d97706" />
                          <Text className="text-amber-700 text-xs font-bold ml-1.5">
                            {formatMontant(voyage.revenu_total)}
                          </Text>
                        </View>
                        <Text className="text-slate-300 text-[10px] ml-2">
                          {voyage.trajet?.tarif ? `Tarif: ${formatMontant(voyage.trajet.tarif)}/pers.` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View className="bg-white rounded-2xl p-10 items-center" style={{ elevation: 2 }}>
              <View className="bg-slate-100 rounded-full p-5 mb-3">
                <Ionicons name="ticket-outline" size={36} color="#94a3b8" />
              </View>
              <Text className="text-slate-800 font-bold text-base">Aucune réservation</Text>
              <Text className="text-slate-400 text-sm mt-1 text-center">
                Les réservations validées par vos clients apparaîtront ici
              </Text>
            </View>
          )}
        </View>

        <View className="h-24" />
      </ScrollView>
    </View>
  );
};
