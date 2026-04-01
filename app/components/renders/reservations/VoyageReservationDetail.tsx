import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { reservationAdminService } from '@/app/services/reservations/reservationAdminService';
import { genererFicheVoyageurs } from '@/app/utils/ficheVoyageurs';
import echo from '@/app/services/echo/echoConfig';

type TabType = 'plan' | 'voyageurs' | 'billets';

interface Props {
  voyage: any;
  onBack: () => void;
}

const formatMontant = (montant: number) => {
  return montant.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' Ar';
};

export const VoyageReservationDetail = ({ voyage, onBack }: Props) => {
  const [activeTab, setActiveTab] = useState<TabType>('plan');
  const [seatPlan, setSeatPlan] = useState<any>(null);
  const [voyageurs, setVoyageurs] = useState<any[]>([]);
  const [billets, setBillets] = useState<any[]>([]);
  const [billetsResume, setBilletsResume] = useState<any>({});
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [loadingVoyageurs, setLoadingVoyageurs] = useState(false);
  const [loadingBillets, setLoadingBillets] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      setLoadingPlan(true);
      const res = await reservationAdminService.obtenirPlanSieges(voyage.voyage_id);
      if (res.statut && res.data) {
        setSeatPlan(res.data);
      }
    } catch (e) {
      console.error('Error fetching seat plan:', e);
    } finally {
      setLoadingPlan(false);
    }
  }, [voyage.voyage_id]);

  const fetchVoyageurs = useCallback(async () => {
    try {
      setLoadingVoyageurs(true);
      const res = await reservationAdminService.obtenirVoyageurs(voyage.voyage_id);
      if (res.statut && res.data) {
        setVoyageurs(res.data.voyageurs || []);
      }
    } catch (e) {
      console.error('Error fetching voyageurs:', e);
    } finally {
      setLoadingVoyageurs(false);
    }
  }, [voyage.voyage_id]);

  const fetchBillets = useCallback(async () => {
    try {
      setLoadingBillets(true);
      const res = await reservationAdminService.obtenirBillets(voyage.voyage_id);
      if (res.statut && res.data) {
        setBillets(res.data.billets || []);
        setBilletsResume(res.data.resume || {});
      }
    } catch (e) {
      console.error('Error fetching billets:', e);
    } finally {
      setLoadingBillets(false);
    }
  }, [voyage.voyage_id]);

  useEffect(() => {
    fetchPlan();
    fetchVoyageurs();
    fetchBillets();

    const channel = echo.channel(`sieges.voyage.${voyage.voyage_id}`)
      .listen('.siege.updated', (event: any) => {
        setSeatPlan((prev: any) => {
          if (!prev?.plan) return prev;
          return {
            ...prev,
            plan: prev.plan.map((seat: any) => {
              if (seat.code === event.siege_numero) {
                const newStatut = event.data?.statut === 1 ? 'reserve'
                  : event.data?.statut === 3 ? 'selectionne'
                  : event.data?.statut === 2 ? 'disponible'
                  : seat.statut;
                return {
                  ...seat,
                  statut: newStatut,
                  selectable: newStatut === 'disponible',
                };
              }
              return seat;
            }),
          };
        });
      });

    return () => {
      echo.leaveChannel(`sieges.voyage.${voyage.voyage_id}`);
    };
  }, [voyage.voyage_id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'plan') await fetchPlan();
    else if (activeTab === 'voyageurs') await fetchVoyageurs();
    else await fetchBillets();
    setRefreshing(false);
  };

  const TABS: { key: TabType; label: string; icon: string }[] = [
    { key: 'plan', label: 'Plan Siège', icon: 'grid-outline' },
    { key: 'voyageurs', label: 'Voyageurs', icon: 'people-outline' },
    { key: 'billets', label: 'Billets', icon: 'receipt-outline' },
  ];

  // ── Seat rendering ──
  const renderSeat = (seat: any, width: any = '25%') => {
    const isReserved = seat.statut === 'reserve';
    const isTemporary = seat.statut === 'selectionne';

    return (
      <View key={seat.code} className="mb-4 items-center px-1" style={{ width }}>
        <View
          className={`w-full h-14 rounded-xl items-center justify-center border ${
            isReserved
              ? 'bg-red-500 border-red-500'
              : isTemporary
                ? 'bg-amber-500 border-amber-500'
                : 'bg-white border-slate-200'
          }`}
        >
          {isReserved ? (
            <Ionicons name="person" size={20} color="white" />
          ) : isTemporary ? (
            <Ionicons name="time-outline" size={20} color="white" />
          ) : (
            <Text className="text-sm font-bold text-slate-600">{seat.code}</Text>
          )}
        </View>
        <Text className="text-[9px] mt-1 font-semibold" style={{
          color: isReserved ? '#ef4444' : isTemporary ? '#f59e0b' : '#94a3b8'
        }}>
          {seat.code}
        </Text>
      </View>
    );
  };

  const renderGrid = () => {
    if (!seatPlan?.plan) return null;
    const plan = seatPlan.plan;
    const placeCount = plan.length;
    const passengers = plan.slice(2);

    if (placeCount === 16) {
      const gridItems: any[] = [];
      let passengerIdx = 0;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if ((row === 1 || row === 2) && col === 2) {
            gridItems.push(
              <View key={`aisle-${row}`} className="mb-4 items-center px-1 justify-center" style={{ width: '25%' as any }}>
                <View className="w-full h-14 rounded-xl items-center justify-center bg-yellow-500">
                  <Text className="text-[8px] font-bold text-white uppercase" style={{ transform: [{ rotate: '90deg' }] }}>COULOIRE</Text>
                </View>
              </View>
            );
          } else if (passengerIdx < passengers.length) {
            gridItems.push(renderSeat(passengers[passengerIdx]));
            passengerIdx++;
          }
        }
      }
      return gridItems;
    }

    return passengers.map((seat: any) => renderSeat(seat));
  };

  const renderPlanSiege = () => {
    if (loadingPlan) {
      return (
        <View className="items-center py-16">
          <ActivityIndicator color="#ea580c" size="large" />
          <Text className="text-slate-400 mt-3 text-sm">Chargement du plan...</Text>
        </View>
      );
    }

    if (!seatPlan?.plan) {
      return (
        <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
          <Ionicons name="grid-outline" size={40} color="#94a3b8" />
          <Text className="text-slate-400 text-sm mt-3">Plan de sièges indisponible</Text>
        </View>
      );
    }

    const plan = seatPlan.plan;
    const placeCount = plan.length;

    return (
      <View>
        {/* Stats summary */}
        <View className="flex-row mb-4">
          <View className="flex-1 bg-white rounded-xl p-3 mr-2 items-center" style={{ elevation: 2 }}>
            <Text className="text-emerald-600 font-bold text-lg">{seatPlan.sieges_disponibles}</Text>
            <Text className="text-slate-400 text-[10px]">Libres</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-3 mr-2 items-center" style={{ elevation: 2 }}>
            <Text className="text-red-500 font-bold text-lg">{seatPlan.sieges_reserves}</Text>
            <Text className="text-slate-400 text-[10px]">Réservés</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-3 items-center" style={{ elevation: 2 }}>
            <Text className="text-amber-500 font-bold text-lg">{seatPlan.sieges_temporaires}</Text>
            <Text className="text-slate-400 text-[10px]">En attente</Text>
          </View>
        </View>

        {/* Vehicle seat plan */}
        <View className="bg-white p-4 rounded-2xl border-2 border-orange-300 relative" style={{ elevation: 2, paddingBottom: 60 }}>
          <View className="flex-row items-center mb-5 border-b border-slate-100 pb-4">
            <View className="rounded-xl overflow-hidden mr-3">
              <LinearGradient colors={['#c2410c', '#ea580c']} className="p-2.5">
                <Ionicons name="bus" size={20} color="#fff" />
              </LinearGradient>
            </View>
            <View>
              <Text className="text-slate-800 font-bold text-sm uppercase">
                {seatPlan.voiture?.marque || ''} - {seatPlan.voiture?.modele || ''}
              </Text>
              <Text className="text-slate-400 text-xs">{placeCount} places • {seatPlan.voiture?.matricule || ''}</Text>
            </View>
          </View>

          <View className="px-2 pb-6">
            <View className="flex-row justify-between mb-4" style={{ paddingHorizontal: '5%' }}>
              <View className="items-center justify-center" style={{ width: '28%' as any }}>
                <View className="h-14 items-center justify-center">
                  <Ionicons name="person-circle" size={44} color="#1e293b" />
                </View>
                <Text className="text-[8px] text-slate-400 font-bold mt-1">
                  {seatPlan.voiture?.chauffeur || 'Chauffeur'}
                </Text>
              </View>
              {plan.slice(0, 2).map((seat: any) => renderSeat(seat, '28%'))}
            </View>

            <View className="flex-row flex-wrap" style={{ paddingHorizontal: '1%' }}>
              {renderGrid()}
            </View>
          </View>

          <View className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-slate-100 flex-row justify-between bg-white rounded-b-2xl">
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded bg-white border border-slate-200 mr-1.5" />
              <Text className="text-[10px] font-bold text-slate-400">Libre</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded bg-amber-500 mr-1.5" />
              <Text className="text-[10px] font-bold text-slate-400">Attente</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded bg-red-500 mr-1.5" />
              <Text className="text-[10px] font-bold text-slate-400">Réservé</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-center mt-4">
          <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          <Text className="text-slate-400 text-xs">Mise à jour en temps réel</Text>
        </View>
      </View>
    );
  };

  const renderVoyageurs = () => {
    if (loadingVoyageurs) {
      return (
        <View className="items-center py-16">
          <ActivityIndicator color="#ea580c" size="large" />
          <Text className="text-slate-400 mt-3 text-sm">Chargement des voyageurs...</Text>
        </View>
      );
    }

    if (voyageurs.length === 0) {
      return (
        <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
          <Ionicons name="people-outline" size={40} color="#94a3b8" />
          <Text className="text-slate-400 text-sm mt-3">Aucun voyageur trouvé</Text>
        </View>
      );
    }

    return (
      <View>
        <View className="bg-white rounded-xl p-4 mb-4 flex-row items-center justify-between" style={{ elevation: 2 }}>
          <View className="flex-row items-center">
            <View className="rounded-lg overflow-hidden mr-3">
              <LinearGradient colors={['#2563eb', '#3b82f6']} className="p-2">
                <Ionicons name="people" size={16} color="#fff" />
              </LinearGradient>
            </View>
            <Text className="text-slate-700 font-bold text-sm">Total voyageurs</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {voyage.statut === 3 && (
              <TouchableOpacity
                className="bg-emerald-50 rounded-lg px-3 py-2 flex-row items-center"
                activeOpacity={0.7}
                disabled={generatingPdf}
                onPress={async () => {
                  setGeneratingPdf(true);
                  await genererFicheVoyageurs(voyage);
                  setGeneratingPdf(false);
                }}
              >
                {generatingPdf ? (
                  <ActivityIndicator size={14} color="#059669" />
                ) : (
                  <Ionicons name="download-outline" size={14} color="#059669" />
                )}
                <Text className="text-emerald-700 text-xs font-bold ml-1.5">Fiche</Text>
              </TouchableOpacity>
            )}
            <View className="bg-blue-50 rounded-lg px-3 py-1.5">
              <Text className="text-blue-700 font-bold text-base">{voyageurs.length}</Text>
            </View>
          </View>
        </View>

        {voyageurs.map((v, index) => (
          <View
            key={`${v.reservation_id}-${v.voyageur_id}`}
            className="bg-white rounded-2xl mb-3 overflow-hidden"
            style={{ elevation: 2 }}
          >
            <View className="bg-slate-50 px-4 py-2.5 flex-row items-center justify-between border-b border-slate-100">
              <View className="flex-row items-center">
                <Ionicons name="ticket-outline" size={12} color="#64748b" />
                <Text className="text-slate-500 text-[10px] font-medium ml-1">{v.reservation_numero}</Text>
              </View>
              <View className="bg-orange-50 rounded-md px-2 py-0.5">
                <Text className="text-orange-600 text-[10px] font-bold">Siège {v.siege}</Text>
              </View>
            </View>

            <View className="p-4">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                  <Text className="text-blue-700 font-bold text-sm">
                    {(v.prenom?.[0] || '').toUpperCase()}{(v.nom?.[0] || '').toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 font-bold text-sm">{v.prenom} {v.nom}</Text>
                  {v.age && <Text className="text-slate-400 text-xs">{v.age} ans</Text>}
                </View>
              </View>

              <View className="flex-row flex-wrap">
                {v.phone && (
                  <TouchableOpacity
                    className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-2"
                    onPress={() => Linking.openURL(`tel:${v.phone}`)}
                  >
                    <Ionicons name="call-outline" size={11} color="#059669" />
                    <Text className="text-slate-600 text-[10px] font-medium ml-1">{v.phone}</Text>
                  </TouchableOpacity>
                )}
                {v.phone2 && (
                  <TouchableOpacity
                    className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-2"
                    onPress={() => Linking.openURL(`tel:${v.phone2}`)}
                  >
                    <Ionicons name="call-outline" size={11} color="#d97706" />
                    <Text className="text-slate-600 text-[10px] font-medium ml-1">{v.phone2}</Text>
                  </TouchableOpacity>
                )}
                {v.cin && (
                  <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-2">
                    <Ionicons name="id-card-outline" size={11} color="#64748b" />
                    <Text className="text-slate-600 text-[10px] font-medium ml-1">{v.cin}</Text>
                  </View>
                )}
              </View>

              {v.client && (
                <View className="mt-2 pt-2 border-t border-slate-100">
                  <Text className="text-slate-400 text-[9px] uppercase font-semibold mb-1">Réservé par</Text>
                  <View className="flex-row items-center">
                    <Ionicons name="person-outline" size={11} color="#94a3b8" />
                    <Text className="text-slate-500 text-[10px] ml-1">
                      {v.client.prenom} {v.client.nom} • {v.client.telephone}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ── Billets (financial details) ──
  const getPaymentIcon = (typeName: string) => {
    const name = (typeName || '').toLowerCase();
    if (name.includes('orange')) return { icon: 'phone-portrait-outline', color: '#f97316' };
    if (name.includes('mvola') || name.includes('telma')) return { icon: 'phone-portrait-outline', color: '#eab308' };
    if (name.includes('airtel')) return { icon: 'phone-portrait-outline', color: '#ef4444' };
    if (name.includes('cash') || name.includes('espèce')) return { icon: 'cash-outline', color: '#10b981' };
    return { icon: 'card-outline', color: '#64748b' };
  };

  const renderBillets = () => {
    if (loadingBillets) {
      return (
        <View className="items-center py-16">
          <ActivityIndicator color="#ea580c" size="large" />
          <Text className="text-slate-400 mt-3 text-sm">Chargement des billets...</Text>
        </View>
      );
    }

    if (billets.length === 0) {
      return (
        <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
          <Ionicons name="receipt-outline" size={40} color="#94a3b8" />
          <Text className="text-slate-400 text-sm mt-3">Aucun billet trouvé</Text>
        </View>
      );
    }

    return (
      <View>
        {/* Financial summary */}
        <View className="bg-white rounded-2xl p-4 mb-4 overflow-hidden" style={{ elevation: 2 }}>
          <View className="flex-row items-center mb-3">
            <View className="rounded-lg overflow-hidden mr-3">
              <LinearGradient colors={['#059669', '#10b981']} className="p-2">
                <Ionicons name="stats-chart" size={16} color="#fff" />
              </LinearGradient>
            </View>
            <Text className="text-slate-700 font-bold text-sm">Résumé financier</Text>
          </View>

          <View className="flex-row mb-3">
            <View className="flex-1 bg-emerald-50 rounded-xl p-3 mr-2 items-center">
              <Text className="text-emerald-600 font-extrabold text-base">
                {formatMontant(billetsResume.revenu_total || 0)}
              </Text>
              <Text className="text-emerald-800/60 text-[10px] font-semibold mt-0.5">Revenu total</Text>
            </View>
            <View className="flex-1 bg-blue-50 rounded-xl p-3 mr-2 items-center">
              <Text className="text-blue-600 font-extrabold text-base">{billetsResume.total_billets || 0}</Text>
              <Text className="text-blue-800/60 text-[10px] font-semibold mt-0.5">Billets</Text>
            </View>
            <View className="flex-1 bg-purple-50 rounded-xl p-3 items-center">
              <Text className="text-purple-600 font-extrabold text-base">{billetsResume.total_voyageurs || 0}</Text>
              <Text className="text-purple-800/60 text-[10px] font-semibold mt-0.5">Voyageurs</Text>
            </View>
          </View>

          {/* Payment method breakdown */}
          {billetsResume.repartition_paiement?.length > 0 && (
            <View className="pt-3 border-t border-slate-100">
              <Text className="text-slate-500 text-[10px] font-bold uppercase mb-2">Répartition par paiement</Text>
              {billetsResume.repartition_paiement.map((rp: any, i: number) => {
                const pi = getPaymentIcon(rp.type);
                return (
                  <View key={i} className="flex-row items-center justify-between py-1.5">
                    <View className="flex-row items-center">
                      <Ionicons name={pi.icon as any} size={14} color={pi.color} />
                      <Text className="text-slate-600 text-xs font-medium ml-2">{rp.type}</Text>
                      <View className="bg-slate-100 rounded-md px-1.5 py-0.5 ml-2">
                        <Text className="text-slate-500 text-[10px] font-bold">{rp.count}x</Text>
                      </View>
                    </View>
                    <Text className="text-slate-800 text-xs font-bold">{formatMontant(rp.montant)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Individual billets */}
        {billets.map((billet: any) => {
          const pi = getPaymentIcon(billet.type_paiement?.nom);
          return (
            <View
              key={billet.res_id}
              className="bg-white rounded-2xl mb-3 overflow-hidden"
              style={{ elevation: 2 }}
            >
              {/* Header with reservation number */}
              <View className="px-4 py-3 flex-row items-center justify-between border-b border-slate-100">
                <View className="flex-row items-center">
                  <View className="rounded-lg overflow-hidden mr-2">
                    <LinearGradient colors={['#c2410c', '#ea580c']} style={{ padding: 5 }}>
                      <Ionicons name="receipt" size={12} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View>
                    <Text className="text-slate-800 font-bold text-xs">{billet.res_numero}</Text>
                    <Text className="text-slate-400 text-[10px]">{billet.date_reservation}</Text>
                  </View>
                </View>
                <View className="bg-emerald-50 rounded-lg px-2.5 py-1">
                  <Text className="text-emerald-700 font-extrabold text-xs">{formatMontant(billet.montant_total)}</Text>
                </View>
              </View>

              <View className="p-4">
                {/* Client info */}
                {billet.client && (
                  <View className="flex-row items-center mb-3">
                    <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center mr-2.5">
                      <Text className="text-orange-600 font-bold text-[10px]">
                        {(billet.client.prenom?.[0] || '').toUpperCase()}{(billet.client.nom?.[0] || '').toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-700 font-semibold text-xs">{billet.client.prenom} {billet.client.nom}</Text>
                      <Text className="text-slate-400 text-[10px]">{billet.client.telephone}</Text>
                    </View>
                  </View>
                )}

                {/* Details grid */}
                <View className="flex-row flex-wrap">
                  {/* Payment type */}
                  <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-2">
                    <Ionicons name={pi.icon as any} size={11} color={pi.color} />
                    <Text className="text-slate-600 text-[10px] font-medium ml-1">{billet.type_paiement?.nom}</Text>
                  </View>

                  {/* Payment number */}
                  {billet.numero_paiement && (
                    <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-2">
                      <Ionicons name="call-outline" size={11} color="#64748b" />
                      <Text className="text-slate-600 text-[10px] font-medium ml-1">{billet.numero_paiement}</Text>
                    </View>
                  )}

                  {/* Number of voyageurs */}
                  <View className="bg-blue-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-2">
                    <Ionicons name="people-outline" size={11} color="#2563eb" />
                    <Text className="text-blue-700 text-[10px] font-bold ml-1">{billet.nb_voyageurs} voyag.</Text>
                  </View>

                  {/* Seats */}
                  {billet.sieges?.length > 0 && (
                    <View className="bg-orange-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2 mb-2">
                      <Ionicons name="grid-outline" size={11} color="#ea580c" />
                      <Text className="text-orange-700 text-[10px] font-bold ml-1">
                        {billet.sieges.join(', ')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Amount breakdown if applicable */}
                {billet.montant_avance > 0 && billet.montant_restant > 0 && (
                  <View className="mt-2 pt-2 border-t border-slate-100 flex-row items-center">
                    <View className="bg-emerald-50 rounded-md px-2 py-1 mr-2">
                      <Text className="text-emerald-600 text-[9px] font-bold">Avance: {formatMontant(billet.montant_avance)}</Text>
                    </View>
                    <View className="bg-amber-50 rounded-md px-2 py-1">
                      <Text className="text-amber-600 text-[9px] font-bold">Reste: {formatMontant(billet.montant_restant)}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="rounded-b-2xl overflow-hidden" style={{ elevation: 4 }}>
        <LinearGradient
          colors={['#7c2d12', '#c2410c', '#ea580c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-4 pt-4 pb-5"
        >
          {/* Back + Title */}
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-white/15 items-center justify-center mr-3"
              onPress={onBack}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white font-extrabold text-base" numberOfLines={1}>
                {voyage.trajet?.province_depart} → {voyage.trajet?.province_arrivee}
              </Text>
              <Text className="text-orange-200 text-xs">{voyage.date} • {voyage.heure_depart}</Text>
            </View>
            {voyage.est_complet && (
              <View className="bg-purple-500/30 rounded-lg px-2 py-1">
                <Text className="text-white text-[10px] font-bold">COMPLET</Text>
              </View>
            )}
          </View>

          {/* Tab buttons */}
          <View className="flex-row">
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                className="flex-1 mr-1"
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <View
                  className={`rounded-xl py-2.5 flex-row items-center justify-center ${
                    activeTab === tab.key ? 'bg-white' : 'bg-white/15'
                  }`}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={14}
                    color={activeTab === tab.key ? '#c2410c' : '#fff'}
                  />
                  <Text
                    className={`ml-1.5 text-[11px] font-bold ${
                      activeTab === tab.key ? 'text-orange-700' : 'text-white'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
      >
        {activeTab === 'plan' && renderPlanSiege()}
        {activeTab === 'voyageurs' && renderVoyageurs()}
        {activeTab === 'billets' && renderBillets()}
        <View className="h-24" />
      </ScrollView>
    </View>
  );
};
