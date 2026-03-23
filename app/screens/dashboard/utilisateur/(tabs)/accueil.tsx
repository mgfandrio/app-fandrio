import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { voyageService } from '@/app/services/voyages/voyageService';
import { provinceService } from '@/app/services/provinces/provinceService';
import RechercheFilterModal from '@/app/components/modals/recherche/RechercheFilterModal';
import { DashboardHeader } from '@/app/components/dashboard/DashboardHeader';
import { SideMenu } from '@/app/components/dashboard/SideMenu';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;

const QUICK_ACTIONS = [
  { label: 'Rechercher', icon: 'search', colors: ['#1e40af', '#3b82f6'] as [string, string] },
  { label: 'Réserver', icon: 'ticket', colors: ['#059669', '#10b981'] as [string, string] },
  { label: 'Compagnies', icon: 'business', colors: ['#7c3aed', '#8b5cf6'] as [string, string] },
  { label: 'Historique', icon: 'time', colors: ['#ea580c', '#f97316'] as [string, string] },
];

const MENU_ITEMS = [
  { label: 'Voyages', icon: 'map-outline' },
  { label: 'Trajet', icon: 'trail-sign-outline' },
  { label: 'Facture', icon: 'document-text-outline' },
  { label: 'Paramètre', icon: 'settings-outline' },
];

export default function AccueilScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [compagnies, setCompagnies] = useState<any[]>([]);
  const [voyages, setVoyages] = useState<any[]>([]);
  const [loadingCompagnies, setLoadingCompagnies] = useState(true);
  const [loadingVoyages, setLoadingVoyages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.openSearch) {
      setShowSearchModal(true);
    }
  }, [params.openSearch]);

  const fetchData = async () => {
    try {
      setLoadingCompagnies(true);
      setLoadingVoyages(true);

      const [compResp, voyResp, provResp] = await Promise.allSettled([
        compagnieService.listerCompagniesGenerique(),
        voyageService.obtenirVoyagesAVenir(),
        provinceService.listerProvinces()
      ]);

      if (compResp.status === 'fulfilled') {
        const resp = compResp.value;
        if (resp && 'statut' in resp && resp.statut !== false) {
          setCompagnies((resp as any).data?.compagnies || []);
        }
      }

      if (voyResp.status === 'fulfilled') {
        const resp = voyResp.value;
        if (resp && 'statut' in resp && resp.statut !== false) {
          setVoyages(resp.data || []);
        }
      }

      if (provResp.status === 'fulfilled') {
        const resp = provResp.value;
        if (resp && 'statut' in resp && resp.statut !== false) {
          setProvinces((resp as any).data?.provinces || []);
        }
      }
    } catch (e) {
      console.error('Fetch data error:', e);
    } finally {
      setLoadingCompagnies(false);
      setLoadingVoyages(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const userJson = await SecureStore.getItemAsync('fandrioUser');
        if (userJson) setUser(JSON.parse(userJson));
      } catch (e) {
        console.warn('SecureStore read error', e);
      }
    })();
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleQuickAction = (label: string) => {
    switch (label) {
      case 'Rechercher':
        setShowSearchModal(true);
        break;
      case 'Compagnies':
        router.push('/screens/dashboard/utilisateur/(tabs)/compagnie');
        break;
      case 'Réserver':
        setShowSearchModal(true);
        break;
      case 'Historique':
        router.push('/screens/dashboard/utilisateur/(tabs)/reservation');
        break;
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <DashboardHeader
        user={user}
        insets={insets}
        onMenuPress={() => setMenuVisible(true)}
        onFilterPress={() => setShowSearchModal(true)}
      />

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* Quick Actions */}
        <View className="px-5 mt-6 mb-2">
          <View className="flex-row justify-between">
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                className="items-center"
                onPress={() => handleQuickAction(action.label)}
                activeOpacity={0.7}
                style={{ width: (width - 40) / 4 }}
              >
                <View className="rounded-2xl overflow-hidden mb-2" style={{ elevation: 3 }}>
                  <LinearGradient colors={action.colors} className="p-3.5">
                    <Ionicons name={action.icon as any} size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <Text className="text-slate-600 text-xs font-medium text-center">{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Compagnies Section */}
        <View className="mt-6 mb-2">
          <View className="flex-row justify-between items-center px-5 mb-4">
            <View>
              <Text className="text-slate-800 text-xl font-bold">Compagnies</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Parcourez les compagnies de taxi brousse</Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => router.push('/screens/dashboard/utilisateur/(tabs)/compagnie')}
            >
              <Text className="text-blue-600 font-semibold text-sm mr-1">Voir tout</Text>
              <Ionicons name="chevron-forward" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {loadingCompagnies ? (
              <View className="flex-row">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="bg-white rounded-2xl mr-4 items-center justify-center" style={{ width: CARD_WIDTH, height: 200, elevation: 2 }}>
                    <ActivityIndicator color="#3b82f6" />
                  </View>
                ))}
              </View>
            ) : compagnies.length > 0 ? (
              compagnies.map((compagnie) => (
                <TouchableOpacity
                  key={compagnie.id}
                  onPress={() => router.push({
                    pathname: '/screens/dashboard/utilisateur/compagnieDetail/[id]',
                    params: { id: compagnie.id }
                  })}
                  className="bg-white rounded-2xl mr-4 overflow-hidden"
                  style={{ width: CARD_WIDTH, elevation: 3 }}
                  activeOpacity={0.8}
                >
                  {/* Company image/logo area */}
                  <View className="w-full h-32 overflow-hidden">
                    {compagnie.logo ? (
                      <Image
                        source={{ uri: compagnie.logo }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={['#e0e7ff', '#c7d2fe']}
                        className="w-full h-full items-center justify-center"
                      >
                        <View className="bg-white rounded-2xl p-4" style={{ elevation: 2 }}>
                          <Ionicons name="business" size={36} color="#3b82f6" />
                        </View>
                      </LinearGradient>
                    )}
                  </View>

                  <View className="p-4">
                    <Text className="text-slate-800 font-bold text-base" numberOfLines={1}>
                      {compagnie.nom}
                    </Text>
                    {compagnie.localisation && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="location-outline" size={13} color="#94a3b8" />
                        <Text className="text-slate-400 text-xs ml-1" numberOfLines={1}>
                          {compagnie.localisation.nom}
                        </Text>
                      </View>
                    )}
                    <View className="mt-3">
                      <View className="rounded-xl overflow-hidden">
                        <LinearGradient
                          colors={['#1e40af', '#3b82f6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="py-2.5 items-center"
                        >
                          <Text className="text-white font-semibold text-sm">Voir les détails</Text>
                        </LinearGradient>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View className="bg-white rounded-2xl p-8 items-center" style={{ width: width - 40, elevation: 2 }}>
                <View className="bg-slate-100 rounded-full p-4 mb-3">
                  <Ionicons name="business-outline" size={32} color="#94a3b8" />
                </View>
                <Text className="text-slate-400 text-sm">Aucune compagnie disponible</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Voyages à venir Section */}
        <View className="px-5 mt-6 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-slate-800 text-xl font-bold">Voyages à venir</Text>
              <Text className="text-slate-400 text-xs mt-0.5">Prochains départs disponibles</Text>
            </View>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-blue-600 font-semibold text-sm mr-1">Voir tout</Text>
              <Ionicons name="chevron-forward" size={16} color="#2563eb" />
            </TouchableOpacity>
          </View>

          {loadingVoyages ? (
            <View className="items-center py-12">
              <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden' }}>
                <LinearGradient colors={['#1e40af', '#3b82f6']} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" />
                </LinearGradient>
              </View>
              <Text className="text-slate-400 mt-3 text-sm">Chargement des voyages...</Text>
            </View>
          ) : voyages.length > 0 ? (
            voyages.map((voyage) => (
              <TouchableOpacity
                key={voyage.voyage_id}
                className="bg-white rounded-2xl mb-4 overflow-hidden"
                style={{ elevation: 3 }}
                activeOpacity={0.8}
                onPress={() => router.push({
                  pathname: '/screens/dashboard/utilisateur/compagnieDetail/[id]',
                  params: { id: voyage.compagnie?.id }
                })}
              >
                {/* Top accent bar */}
                <LinearGradient
                  colors={['#1e40af', '#3b82f6', '#60a5fa']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 3 }}
                />

                {/* Company logo/photo banner */}
                <View className="w-full overflow-hidden" style={{ height: 100 }}>
                  {voyage.compagnie?.logo ? (
                    <Image source={{ uri: voyage.compagnie.logo }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <LinearGradient
                      colors={['#0f172a', '#1e3a8a', '#2563eb']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="w-full h-full items-center justify-center"
                    >
                      <View className="bg-white/15 rounded-full p-3">
                        <Ionicons name="bus" size={32} color="#fff" />
                      </View>
                    </LinearGradient>
                  )}
                </View>

                <View className="p-4">
                  {/* Company name + price */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1 mr-3">
                      <Text className="text-slate-900 font-extrabold text-lg" numberOfLines={1}>{voyage.compagnie?.nom || 'Compagnie'}</Text>
                      <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>{voyage.trajet?.nom || 'Trajet'}</Text>
                    </View>
                    {/* Price tag */}
                    <View className="rounded-xl overflow-hidden">
                      <LinearGradient colors={['#eff6ff', '#dbeafe']} className="px-3 py-2 items-center">
                        <Text className="text-blue-700 font-bold text-sm">
                          {typeof voyage.trajet?.tarif === 'number'
                            ? voyage.trajet.tarif.toLocaleString('fr-FR')
                            : voyage.trajet?.tarif} Ar
                        </Text>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Route visualization */}
                  <View className="flex-row items-center mb-3 ml-1">
                    <View className="items-center mr-3">
                      <View className="bg-blue-500 rounded-full w-3 h-3" />
                      <View className="bg-blue-200 w-0.5 h-5 my-0.5" />
                      <View className="bg-emerald-500 rounded-full w-3 h-3" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-700 text-sm font-medium">{typeof voyage.trajet?.province_depart === 'object' ? voyage.trajet.province_depart?.nom : voyage.trajet?.province_depart || 'Départ'}</Text>
                      <View className="flex-row items-center my-1">
                        <Ionicons name="swap-vertical-outline" size={12} color="#cbd5e1" />
                        <Text className="text-slate-300 text-xs ml-1">{voyage.trajet?.distance_km || '?'} km • {voyage.trajet?.duree || ''}</Text>
                      </View>
                      <Text className="text-slate-700 text-sm font-medium">{typeof voyage.trajet?.province_arrivee === 'object' ? voyage.trajet.province_arrivee?.nom : voyage.trajet?.province_arrivee || 'Arrivée'}</Text>
                    </View>
                  </View>

                  {/* Info badges + Reserve button */}
                  <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                    <View className="flex-row items-center flex-1">
                      <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2">
                        <Ionicons name="calendar-outline" size={13} color="#64748b" />
                        <Text className="text-slate-600 text-xs font-medium ml-1">{voyage.date || '-'}</Text>
                      </View>
                      <View className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-row items-center mr-2">
                        <Ionicons name="time-outline" size={13} color="#64748b" />
                        <Text className="text-slate-600 text-xs font-medium ml-1">{voyage.heure_depart || '-'}</Text>
                      </View>
                      <View className="bg-emerald-50 rounded-lg px-2.5 py-1.5 flex-row items-center">
                        <Ionicons name="people-outline" size={13} color="#059669" />
                        <Text className="text-emerald-700 text-xs font-semibold ml-1">{voyage.places_disponibles}</Text>
                      </View>
                    </View>
                    <TouchableOpacity activeOpacity={0.8}>
                      <View className="rounded-xl overflow-hidden">
                        <LinearGradient
                          colors={['#1e40af', '#3b82f6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          className="px-5 py-2.5 flex-row items-center"
                        >
                          <Ionicons name="ticket-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                          <Text className="text-white text-xs font-bold">Réserver</Text>
                        </LinearGradient>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="bg-white rounded-2xl p-10 items-center" style={{ elevation: 2 }}>
              <View className="bg-slate-100 rounded-full p-5 mb-3">
                <Ionicons name="navigate-outline" size={36} color="#94a3b8" />
              </View>
              <Text className="text-slate-800 font-bold text-base">Aucun voyage disponible</Text>
              <Text className="text-slate-400 text-sm mt-1 text-center">Essayez de rechercher avec des filtres différents</Text>
            </View>
          )}
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Advanced Search Modal */}
      <RechercheFilterModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onApply={(results) => setVoyages(results)}
        setLoading={(loading) => setLoadingVoyages(loading)}
      />

      {/* Side Menu Overlay */}
      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={MENU_ITEMS}
      />
    </View>
  );
}
