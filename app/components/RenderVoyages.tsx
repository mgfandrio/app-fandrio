import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { voyageService } from '../services/voyages/voyageService';
import { Voyage } from '../types/voyage';
import { useConfirmDialog } from './common/ConfirmDialog';
import { VoyageDetailModal } from './modals/VoyageDetailModal';
import { VoyageFormModal } from './modals/VoyageFormModal';
import { VoyageMultipleModal } from './modals/VoyageMultipleModal';

type TabKey = 'tous' | 'actifs' | 'inactifs' | 'annules';

const TABS: { key: TabKey; label: string; colors: [string, string]; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'tous', label: 'Tous', colors: ['#475569', '#64748b'], icon: 'list' },
  { key: 'actifs', label: 'Actifs', colors: ['#059669', '#10b981'], icon: 'checkmark-circle' },
  { key: 'inactifs', label: 'Inactifs', colors: ['#d97706', '#f59e0b'], icon: 'pause-circle' },
  { key: 'annules', label: 'Annulés', colors: ['#dc2626', '#ef4444'], icon: 'close-circle' },
];

export const RenderVoyages: React.FC = () => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);
  const [multiModalVisible, setMultiModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('actifs');

  useEffect(() => {
    chargerVoyages();
  }, []);

  const chargerVoyages = async () => {
    setLoading(true);
    try {
      const response = await voyageService.obtenirVoyages();
      
      let voyagesList: Voyage[] = [];
      
      if (response.statut === true && response.data) {
        voyagesList = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        voyagesList = response;
      } else if (response.data && Array.isArray(response.data)) {
        voyagesList = response.data;
      }
      
      setVoyages(voyagesList);
    } catch (error: any) {
      console.error('Erreur chargerVoyages:', error);
      showDialog({
        title: 'Erreur',
        message: error?.message || 'Une erreur est survenue',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {},
      });
      setVoyages([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await chargerVoyages();
    setRefreshing(false);
  };

  const filteredVoyages = (Array.isArray(voyages) ? voyages : [])
    .filter((voyage: any) => {
      const isActif = (voyage.statut !== 4 && voyage.voyage_statut !== 4) && (voyage.is_active !== false);
      const isInactif = (voyage.statut !== 4 && voyage.voyage_statut !== 4) && (voyage.is_active === false);
      const isAnnule = voyage.statut === 4 || voyage.voyage_statut === 4;
      
      switch (activeTab) {
        case 'tous': return true;
        case 'actifs': return isActif;
        case 'inactifs': return isInactif;
        case 'annules': return isAnnule;
        default: return true;
      }
    })
    .filter((voyage: any) => {
      const trajetNom = voyage.trajet?.nom || voyage.trajet?.nom_trajet || voyage.trajet?.trajet_nom || '';
      const dateDepart = voyage.date || voyage.voyage_date || '';
      const heureDepart = voyage.heure_depart || voyage.voyage_heure_depart || '';
      const searchLower = searchText.toLowerCase();
      
      return (
        trajetNom.toLowerCase().includes(searchLower) ||
        dateDepart.toLowerCase().includes(searchLower) ||
        heureDepart.toLowerCase().includes(searchLower)
      );
    });

  const handleOpenDetail = (voyage: Voyage) => {
    setSelectedVoyage(voyage);
    setDetailModalVisible(true);
  };

  const handleOpenForm = (voyage?: Voyage) => {
    setSelectedVoyage(voyage || null);
    setFormModalVisible(true);
  };

  const getVoyageBadge = (voyage: any) => {
    if (voyage.statut === 4 || voyage.voyage_statut === 4) {
      return { colors: ['#dc2626', '#ef4444'] as const, label: 'Annulé', icon: 'close-circle' as const };
    }
    if (voyage.is_active === false) {
      return { colors: ['#d97706', '#f59e0b'] as const, label: 'Inactif', icon: 'pause-circle' as const };
    }
    return { colors: ['#059669', '#10b981'] as const, label: 'Actif', icon: 'checkmark-circle' as const };
  };

  const getCounts = () => {
    const all = Array.isArray(voyages) ? voyages : [];
    const actifs = all.filter((v: any) => (v.statut !== 4 && v.voyage_statut !== 4) && v.is_active !== false).length;
    const inactifs = all.filter((v: any) => (v.statut !== 4 && v.voyage_statut !== 4) && v.is_active === false).length;
    const annules = all.filter((v: any) => v.statut === 4 || v.voyage_statut === 4).length;
    return { tous: all.length, actifs, inactifs, annules };
  };
  const counts = getCounts();

  return (
    <View className="flex-1 bg-slate-50">
      <DialogComponent />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ea580c" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View className="mx-4 mt-5 rounded-3xl overflow-hidden" style={{ elevation: 4 }}>
          <LinearGradient colors={['#c2410c', '#ea580c', '#fb923c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <View className="bg-white/20 rounded-2xl p-3 mr-4">
                  <Ionicons name="navigate" size={28} color="#fff" />
                </View>
                <View>
                  <Text className="text-white text-2xl font-bold">Voyages</Text>
                  <Text className="text-orange-100 text-sm mt-0.5">{voyages.length} voyage(s) programmé(s)</Text>
                </View>
              </View>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <TouchableOpacity
                  className="bg-white/20 rounded-2xl p-3"
                  onPress={() => setMultiModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="layers" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-white rounded-2xl p-3"
                  onPress={() => handleOpenForm()}
                  activeOpacity={0.8}
                  style={{ elevation: 2 }}
                >
                  <Ionicons name="add" size={24} color="#c2410c" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Filter Tabs - Pill style */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 px-4">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="mr-2"
                activeOpacity={0.8}
              >
                {isActive ? (
                  <View className="rounded-2xl overflow-hidden">
                    <LinearGradient
                      colors={tab.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="px-4 py-2.5 flex-row items-center"
                    >
                      <Ionicons name={tab.icon} size={14} color="#fff" style={{ marginRight: 6 }} />
                      <Text className="text-white font-bold text-sm">{tab.label}</Text>
                      <View className="bg-white/30 rounded-full px-2 py-0.5 ml-2">
                        <Text className="text-white text-xs font-bold">{counts[tab.key]}</Text>
                      </View>
                    </LinearGradient>
                  </View>
                ) : (
                  <View className="bg-white rounded-2xl px-4 py-2.5 flex-row items-center" style={{ elevation: 1 }}>
                    <Text className="text-slate-500 font-medium text-sm">{tab.label}</Text>
                    <View className="bg-slate-100 rounded-full px-2 py-0.5 ml-2">
                      <Text className="text-slate-400 text-xs font-bold">{counts[tab.key]}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Barre de recherche */}
        <View className="mx-4 mt-4 bg-white rounded-2xl flex-row items-center px-4 py-1" style={{ elevation: 2 }}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 text-base py-3"
            placeholder="Rechercher un voyage..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#94a3b8"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} className="p-1">
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Liste des voyages */}
        <View className="px-4 mt-4 pb-6">
          {loading ? (
            <View className="items-center justify-center py-20">
              <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden' }}>
                <LinearGradient colors={['#c2410c', '#ea580c']} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#fff" />
                </LinearGradient>
              </View>
            </View>
          ) : filteredVoyages.length === 0 ? (
            <View className="bg-white rounded-3xl p-10 items-center" style={{ elevation: 2 }}>
              <View className="bg-slate-100 rounded-full p-5 mb-4">
                <Ionicons name="navigate-outline" size={48} color="#94a3b8" />
              </View>
              <Text className="text-slate-800 font-bold text-lg">Aucun voyage trouvé</Text>
              <Text className="text-slate-400 text-sm mt-2 text-center leading-5">
                {searchText.length > 0 
                  ? 'Aucun voyage ne correspond à votre recherche'
                  : 'Appuyez sur + pour programmer un nouveau voyage'}
              </Text>
            </View>
          ) : (
            filteredVoyages.map((voyage: any) => {
              const badge = getVoyageBadge(voyage);
              const trajetNom = voyage.trajet?.nom || voyage.trajet?.nom_trajet || voyage.trajet?.trajet_nom || 'Trajet sans nom';
              const depart = voyage.trajet?.province_depart || 'Départ';
              const arrivee = voyage.trajet?.province_arrivee || 'Arrivée';

              return (
                <TouchableOpacity
                  key={voyage.id || voyage.id_voyage || voyage.voyage_id || Math.random().toString()}
                  className="bg-white rounded-2xl mb-3 overflow-hidden"
                  onPress={() => handleOpenDetail(voyage)}
                  activeOpacity={0.7}
                  style={{ elevation: 2 }}
                >
                  {/* Colored top accent bar */}
                  <LinearGradient
                    colors={[...badge.colors]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 3 }}
                  />
                  <View className="p-4">
                    {/* Header: route name + badge */}
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 mr-3">
                        <Text className="text-slate-800 font-bold text-base">{trajetNom}</Text>
                        <View className="flex-row items-center mt-1">
                          <Ionicons name="location" size={14} color="#ea580c" />
                          <Text className="text-slate-500 text-sm ml-1">{depart}</Text>
                          <Ionicons name="arrow-forward" size={12} color="#cbd5e1" style={{ marginHorizontal: 6 }} />
                          <Ionicons name="flag" size={14} color="#059669" />
                          <Text className="text-slate-500 text-sm ml-1">{arrivee}</Text>
                        </View>
                      </View>
                      <View className="rounded-xl overflow-hidden">
                        <LinearGradient colors={[...badge.colors]} className="px-3 py-1.5 flex-row items-center">
                          <Ionicons name={badge.icon} size={12} color="#fff" style={{ marginRight: 4 }} />
                          <Text className="text-white text-xs font-bold">{badge.label}</Text>
                        </LinearGradient>
                      </View>
                    </View>

                    {/* Info row */}
                    <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                      <View className="flex-row items-center">
                        <View className="bg-orange-50 rounded-lg px-3 py-1.5 flex-row items-center mr-2">
                          <Ionicons name="calendar-outline" size={14} color="#ea580c" />
                          <Text className="text-orange-700 text-xs font-semibold ml-1.5">{voyage.date || voyage.voyage_date || '-'}</Text>
                        </View>
                        <View className="bg-blue-50 rounded-lg px-3 py-1.5 flex-row items-center mr-2">
                          <Ionicons name="time-outline" size={14} color="#3b82f6" />
                          <Text className="text-blue-700 text-xs font-semibold ml-1.5">{voyage.heure_depart || voyage.voyage_heure_depart || '-'}</Text>
                        </View>
                        <View className="bg-purple-50 rounded-lg px-3 py-1.5 flex-row items-center">
                          <Ionicons name="people-outline" size={14} color="#7c3aed" />
                          <Text className="text-purple-700 text-xs font-semibold ml-1.5">{voyage.places_disponibles ?? '-'}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <VoyageDetailModal
        visible={detailModalVisible}
        voyageId={selectedVoyage?.id || selectedVoyage?.id_voyage || selectedVoyage?.voyage_id || null}
        onClose={() => setDetailModalVisible(false)}
        onEdit={(id) => {
          setDetailModalVisible(false);
          const voyageToEdit = voyages.find((v) => (v.id || v.id_voyage || v.voyage_id) === id);
          handleOpenForm(voyageToEdit);
        }}
        onRefresh={chargerVoyages}
      />

      <VoyageFormModal
        visible={formModalVisible}
        voyageId={selectedVoyage?.id || selectedVoyage?.id_voyage || selectedVoyage?.voyage_id || null}
        onClose={() => setFormModalVisible(false)}
        onSuccess={chargerVoyages}
      />

      <VoyageMultipleModal
        visible={multiModalVisible}
        onClose={() => setMultiModalVisible(false)}
        onSuccess={chargerVoyages}
      />
    </View>
  );
};
