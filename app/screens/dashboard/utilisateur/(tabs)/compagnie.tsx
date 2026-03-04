import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { DashboardHeader } from '@/app/components/dashboard/DashboardHeader';
import { SideMenu } from '@/app/components/dashboard/SideMenu';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { Ionicons } from '@expo/vector-icons';
import RechercheFilterModal from '@/app/components/modals/recherche/RechercheFilterModal';

const MENU_ITEMS = [
  { label: 'Voyages', icon: 'map-outline' },
  { label: 'Trajet', icon: 'trail-sign-outline' },
  { label: 'Facture', icon: 'document-text-outline' },
  { label: 'Paramètre', icon: 'settings-outline' },
];

export default function CompagnieScreen() {
  const [user, setUser] = useState<any | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [compagnies, setCompagnies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const userJson = await SecureStore.getItemAsync('fandrioUser');
        if (userJson) setUser(JSON.parse(userJson));
      } catch (e) {
        console.warn('SecureStore read error', e);
      }
    })();
    fetchCompagnies();
  }, []);

  const fetchCompagnies = async () => {
    try {
      setLoading(true);
      const res = await compagnieService.listerCompagniesGenerique();
      if (res && 'statut' in res && res.statut !== false) {
        setCompagnies((res as any).data?.compagnies || []);
      }
    } catch (error) {
      console.error('Error fetching compagnies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Shared Header */}
      <DashboardHeader
        user={user}
        insets={insets}
        onMenuPress={() => setMenuVisible(true)}
        onFilterPress={() => setShowSearchModal(true)}
        searchPlaceholder="Rechercher une compagnie..."
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pt-6 px-6">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-xl font-bold text-gray-900">Toutes les compagnies</Text>
          <View className="bg-blue-100 px-3 py-1 rounded-full">
            <Text className="text-[#1e3a8a] font-bold text-xs">{compagnies.length}</Text>
          </View>
        </View>

        {loading ? (
          <View className=" py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text className="mt-4 text-gray-400 italic">Chargement des compagnies...</Text>
          </View>
        ) : compagnies.length > 0 ? (
          <View className="flex-row flex-wrap justify-between">
            {compagnies.map((compagnie) => (
              <TouchableOpacity
                key={compagnie.id}
                style={{ width: '48%' }}
                className="bg-white rounded-3xl p-4 mb-4 shadow-sm border border-gray-100 items-center"
              >
                <View className="w-20 h-20 bg-gray-50 rounded-2xl items-center justify-center mb-3">
                  {compagnie.logo ? (
                    <Image
                      source={{ uri: compagnie.logo }}
                      className="w-16 h-16"
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="business" size={40} color="#cbd5e1" />
                  )}
                </View>
                <Text className="text-[#1e3a8a] font-bold text-center mb-1" numberOfLines={1}>
                  {compagnie.nom}
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="location-outline" size={12} color="#9ca3af" />
                  <Text className="text-gray-400 text-[10px] ml-1" numberOfLines={1}>
                    {compagnie.provinces && compagnie.provinces.length > 0
                      ? compagnie.provinces.join(', ')
                      : 'Non spécifié'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="bg-white rounded-3xl p-10 items-center border border-blue-50 shadow-sm mt-4">
            <Text className="text-gray-400 italic">Aucune compagnie disponible</Text>
          </View>
        )}

        <View className="h-20" />
      </ScrollView>

      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={MENU_ITEMS}
      />

      <RechercheFilterModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onApply={() => { }} // TODO: Implement filtering for this page if needed
        setLoading={setLoading}
      />
    </View>
  );
}
