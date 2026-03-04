import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Animated, Dimensions, Pressable, Image, ActivityIndicator, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { voyageService } from '@/app/services/voyages/voyageService';
import { provinceService } from '@/app/services/provinces/provinceService';
import RechercheFilterModal from '@/app/components/modals/recherche/RechercheFilterModal';
import { DashboardHeader } from '@/app/components/dashboard/DashboardHeader';
import { SideMenu } from '@/app/components/dashboard/SideMenu';

const { width } = Dimensions.get('window');



const MENU_ITEMS = [
  { label: 'Voyages', icon: 'map-outline' },
  { label: 'Trajet', icon: 'trail-sign-outline' },
  { label: 'Facture', icon: 'document-text-outline' },
  { label: 'Paramètre', icon: 'settings-outline' },
];

export default function AccueilScreen() {
  const [user, setUser] = useState<any | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [compagnies, setCompagnies] = useState<any[]>([]);
  const [voyages, setVoyages] = useState<any[]>([]);
  const [loadingCompagnies, setLoadingCompagnies] = useState(true);
  const [loadingVoyages, setLoadingVoyages] = useState(true);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    pro_depart: '',
    pro_arrivee: '',
    compagnie_id: '',
    date_exacte: '',
    type_voyage: '',
    prix_max: '',
    places_min: '1'
  });
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

      // Handle companies
      if (compResp.status === 'fulfilled') {
        const resp = compResp.value;
        if (resp && 'statut' in resp && resp.statut !== false) {
          setCompagnies((resp as any).data?.compagnies || []);
        }
      }

      // Handle voyages
      if (voyResp.status === 'fulfilled') {
        const resp = voyResp.value;
        if (resp && 'statut' in resp && resp.statut !== false) {
          setVoyages(resp.data || []);
        }
      }

      // Handle provinces
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

  const handleSearch = async () => {
    setShowSearchModal(false);
    setLoadingVoyages(true);
    try {
      const criteres: any = { ...searchFilters };
      // Nettoyer les filtres vides
      Object.keys(criteres).forEach(key => {
        if (criteres[key] === '') delete criteres[key];
      });

      const res = await voyageService.rechercherVoyages(criteres);
      if (res.statut) {
        setVoyages(res.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoadingVoyages(false);
    }
  };

  const resetFilters = () => {
    // Note: If filters are now handled inside the modal component, we might not need this here
    // unless we want to keep a local copy for the handleSearch above.
    // Actually handleSearch should probably also be simplified.
  };



  return (
    <View className="flex-1 bg-gray-50">
      {/* Fixed Section: Header & Search Bar */}
      <DashboardHeader
        user={user}
        insets={insets}
        onMenuPress={() => setMenuVisible(true)}
        onFilterPress={() => setShowSearchModal(true)}
      />

      {/* Scrollable Content Section */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pt-6">
        {/* Compagnies Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-6 mb-4">
            <Text style={{ color: '#1e3a8a' }} className="text-xl font-bold">Compagnies de voyage</Text>
            <TouchableOpacity>
              <Text style={{ color: '#1e3a8a' }} className="font-medium">Voir tout</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            {loadingCompagnies ? (
              <View className="flex-row py-10">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="bg-white rounded-3xl w-64 h-56 mr-5 items-center justify-center border border-blue-50 opacity-60">
                    <ActivityIndicator color="#1e3a8a" />
                  </View>
                ))}
              </View>
            ) : compagnies.length > 0 ? (
              compagnies.map((compagnie) => (
                <View
                  key={compagnie.id}
                  className="bg-white rounded-3xl w-64 mr-5 shadow-sm overflow-hidden border border-blue-50"
                >
                  <View className="w-full h-36 bg-blue-50 items-center justify-center border-b border-blue-100">
                    {compagnie.logo ? (
                      <Image
                        source={{ uri: compagnie.logo }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="items-center justify-center">
                        <View className="w-20 h-20 bg-white rounded-2xl items-center justify-center shadow-sm">
                          <Ionicons name="business" size={40} color="#1e3a8a" />
                        </View>
                      </View>
                    )}
                  </View>

                  <View className="p-4">
                    <Text className="text-gray-900 font-bold text-lg mb-3" numberOfLines={1}>{compagnie.nom}</Text>
                    <TouchableOpacity
                      style={{ backgroundColor: '#1e3a8a' }}
                      className="py-2.5 rounded-xl items-center shadow-sm"
                    >
                      <Text className="text-white font-semibold">Plus de détail</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View className="py-10 px-6 bg-blue-50 rounded-3xl w-[320px] items-center">
                <Text className="text-gray-400 italic">Aucune compagnie disponible</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Voyages à venir Section */}
        <View className="px-6 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ color: '#1e3a8a' }} className="text-xl font-bold">Voyages à venir</Text>
            <TouchableOpacity>
              <Text style={{ color: '#1e3a8a' }} className="font-medium">Voir tout</Text>
            </TouchableOpacity>
          </View>

          {loadingVoyages ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#1e3a8a" size="large" />
              <Text className="text-gray-400 mt-2">Chargement des voyages...</Text>
            </View>
          ) : voyages.length > 0 ? (
            voyages.map((voyage) => (
              <View key={voyage.voyage_id} className="bg-white rounded-3xl mb-5 shadow-md flex-row overflow-hidden border border-blue-50">
                {/* Left Side: Company Logo (50%) */}
                <View className="w-1/2 bg-blue-50 items-center justify-center p-4 border-r border-blue-50">
                  <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-sm mb-2 overflow-hidden">
                    {voyage.compagnie?.logo ? (
                      <Image
                        source={{ uri: voyage.compagnie.logo }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name={voyage.type === 'jour' ? 'sunny' : 'moon'} size={32} color="#1e3a8a" />
                    )}
                  </View>
                  <Text className="text-[10px] text-[#1e3a8a] font-bold text-center px-1" numberOfLines={1}>
                    {voyage.compagnie?.nom}
                  </Text>
                </View>

                {/* Right Side: Info + Button (50%) */}
                <View className="w-1/2 p-4 justify-between">
                  <View>
                    <Text className="text-gray-900 font-bold text-base mb-1" numberOfLines={1}>{voyage.trajet?.nom}</Text>

                    <View className="flex-row items-center mb-1">
                      <Ionicons name="navigate-outline" size={12} color="#6b7280" />
                      <Text className="text-gray-500 text-[10px] ml-1">{voyage.trajet?.distance_km} km • {voyage.trajet?.duree}</Text>
                    </View>

                    <View className="flex-row items-center mb-1">
                      <Ionicons name="people-outline" size={12} color="#1e3a8a" />
                      <Text className="text-[#1e3a8a] text-[10px] font-semibold ml-1">{voyage.places_disponibles} places dispo</Text>
                    </View>

                    <View className="flex-row items-center mb-1">
                      <Ionicons name="calendar-outline" size={12} color="#1e3a8a" />
                      <Text className="text-[#1e3a8a] text-[10px] font-semibold ml-1">{voyage.date}</Text>
                    </View>

                    <View className="flex-row items-center mb-1">
                      <Ionicons name="time-outline" size={12} color="#1e3a8a" />
                      <Text className="text-[#1e3a8a] text-[10px] font-semibold ml-1">{voyage.heure_depart}</Text>
                    </View>

                    <Text style={{ color: '#1e3a8a' }} className="text-base font-bold mb-3">
                      {typeof voyage.trajet?.tarif === 'number'
                        ? voyage.trajet.tarif.toLocaleString('fr-FR')
                        : voyage.trajet?.tarif} Ar
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#1e3a8a' }}
                    className="py-2.5 px-4 rounded-xl self-start shadow-sm"
                  >
                    <Text className="text-white text-xs font-semibold">Réserver</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-white rounded-3xl p-10 items-center border border-blue-50 shadow-sm">
              <Text className="text-gray-400 italic">Aucun voyage disponible</Text>
            </View>
          )}
        </View>

        <View className="h-20" />
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
