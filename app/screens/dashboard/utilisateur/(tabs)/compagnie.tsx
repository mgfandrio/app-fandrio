import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { DashboardHeader } from '@/app/components/dashboard/DashboardHeader';
import { SideMenu } from '@/app/components/dashboard/SideMenu';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { useNotifications } from '@/app/hooks/useNotifications';
import { useUser } from '@/app/hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const MENU_ITEMS = [
  { label: 'Voyages', icon: 'map-outline' },
  { label: 'Trajet', icon: 'trail-sign-outline' },
  { label: 'Facture', icon: 'document-text-outline' },
  { label: 'Paramètre', icon: 'settings-outline' },
];

export default function CompagnieScreen() {
  const { user } = useUser();
  const [menuVisible, setMenuVisible] = useState(false);
  const [compagnies, setCompagnies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { unreadCount } = useNotifications();

  useEffect(() => {
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompagnies();
    setRefreshing(false);
  };

  const filteredCompagnies = searchQuery.trim()
    ? compagnies.filter((c) =>
        c.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.localisation?.nom?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : compagnies;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <DashboardHeader
        user={user}
        insets={insets}
        onMenuPress={() => setMenuVisible(true)}
        onFilterPress={() => setSearchQuery('')}
        searchPlaceholder="Rechercher une compagnie..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onResetPress={searchQuery ? () => setSearchQuery('') : undefined}
        notificationCount={unreadCount}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {/* Hero section */}
        <View className="mx-5 mt-5 mb-4 rounded-2xl overflow-hidden" style={{ elevation: 4 }}>
          <LinearGradient
            colors={['#0f172a', '#1e3a8a', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-5 py-6"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white font-extrabold text-xl">Compagnies</Text>
                <Text className="text-blue-200 text-xs mt-1">Trouvez votre compagnie de confiance</Text>
              </View>
              <View className="bg-white/15 rounded-2xl px-4 py-2">
                <Text className="text-white font-bold text-lg">{compagnies.length}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Company list */}
        <View className="px-5">
          {loading ? (
            <View className="items-center py-16">
              <View className="rounded-full overflow-hidden" style={{ width: 48, height: 48 }}>
                <LinearGradient colors={['#1e40af', '#3b82f6']} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color="#fff" size="small" />
                </LinearGradient>
              </View>
              <Text className="text-slate-400 mt-3 text-sm">Chargement des compagnies...</Text>
            </View>
          ) : filteredCompagnies.length > 0 ? (
            filteredCompagnies.map((compagnie) => (
              <TouchableOpacity
                key={compagnie.id}
                className="bg-white rounded-2xl mb-4 overflow-hidden"
                style={{ elevation: 3 }}
                activeOpacity={0.8}
                onPress={() => router.push({
                  pathname: '/screens/dashboard/utilisateur/compagnieDetail/[id]',
                  params: { id: compagnie.id }
                })}
              >
                {/* Large logo/photo banner */}
                <View className="w-full overflow-hidden" style={{ height: 120 }}>
                  {compagnie.logo ? (
                    <Image source={{ uri: compagnie.logo }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <LinearGradient
                      colors={['#e0e7ff', '#c7d2fe', '#a5b4fc']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      className="w-full h-full items-center justify-center"
                    >
                      <View className="bg-white/60 rounded-2xl p-4" style={{ elevation: 1 }}>
                        <Ionicons name="business" size={40} color="#3b82f6" />
                      </View>
                    </LinearGradient>
                  )}
                </View>

                {/* Company info */}
                <View className="p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-3">
                      <Text className="text-slate-900 font-extrabold text-base" numberOfLines={1}>
                        {compagnie.nom}
                      </Text>
                      {compagnie.localisation && (
                        <View className="flex-row items-center mt-1.5">
                          <Ionicons name="location" size={13} color="#3b82f6" />
                          <Text className="text-slate-400 text-xs ml-1 font-medium" numberOfLines={1}>
                            {compagnie.localisation.nom}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="rounded-xl overflow-hidden">
                      <LinearGradient
                        colors={['#1e40af', '#3b82f6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="px-4 py-2.5 flex-row items-center"
                      >
                        <Text className="text-white text-xs font-bold mr-1">Détails</Text>
                        <Ionicons name="chevron-forward" size={12} color="#fff" />
                      </LinearGradient>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View className="bg-white rounded-2xl p-10 items-center" style={{ elevation: 2 }}>
              <View className="bg-slate-100 rounded-full p-5 mb-3">
                <Ionicons name="business-outline" size={36} color="#94a3b8" />
              </View>
              <Text className="text-slate-800 font-bold text-base">
                {searchQuery ? 'Aucun résultat' : 'Aucune compagnie disponible'}
              </Text>
              <Text className="text-slate-400 text-sm mt-1 text-center">
                {searchQuery ? 'Essayez un autre terme de recherche' : 'Revenez plus tard'}
              </Text>
            </View>
          )}
        </View>

        <View className="h-24" />
      </ScrollView>

      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={MENU_ITEMS}
      />
    </View>
  );
}
