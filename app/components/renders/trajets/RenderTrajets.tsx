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
import { trajetService } from '../../../services/trajets/trajetService';
import { Trajet } from '../../../types/trajet';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import { TrajetDetailModal } from '../../modals/trajets/TrajetDetailModal';
import { TrajetFormModal } from '../../modals/trajets/TrajetFormModal';

export const RenderTrajets: React.FC = () => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedTrajet, setSelectedTrajet] = useState<Trajet | null>(null);

  useEffect(() => {
    chargerTrajets();
  }, []);

  const chargerTrajets = async () => {
    setLoading(true);
    try {
      const response = await trajetService.obtenirTrajets();
      
      let trajetsList: Trajet[] = [];
      
      if (response.statut === true && response.data) {
        trajetsList = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        trajetsList = response;
      } else if (response.data && Array.isArray(response.data)) {
        trajetsList = response.data;
      }
      
      setTrajets(trajetsList);
    } catch (error: any) {
      console.error('Erreur chargerTrajets:', error);
      showDialog({
        title: 'Erreur',
        message: error?.message || 'Une erreur est survenue',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {},
      });
      setTrajets([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await chargerTrajets();
    setRefreshing(false);
  };

  const filteredTrajets = (Array.isArray(trajets) ? trajets : []).filter((trajet: any) => {
    const depart = trajet.province_depart?.nom_province || trajet.trajet_depart || '';
    const arrivee = trajet.province_arrivee?.nom_province || trajet.trajet_destination || '';
    const searchLower = searchText.toLowerCase();
    return depart.toLowerCase().includes(searchLower) || arrivee.toLowerCase().includes(searchLower);
  });

  const handleOpenDetail = (trajet: Trajet) => {
    setSelectedTrajet(trajet);
    setDetailModalVisible(true);
  };

  const handleOpenForm = (trajet?: Trajet) => {
    setSelectedTrajet(trajet || null);
    setFormModalVisible(true);
  };

  const actifsCount = (Array.isArray(trajets) ? trajets : []).filter((t: any) => t.statut === 1).length;

  return (
    <View className="flex-1 bg-slate-50">
      <DialogComponent />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View className="mx-4 mt-5 rounded-3xl overflow-hidden" style={{ elevation: 4 }}>
          <LinearGradient colors={['#0f766e', '#0d9488', '#2dd4bf']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <View className="bg-white/20 rounded-2xl p-3 mr-4">
                  <Ionicons name="map" size={28} color="#fff" />
                </View>
                <View>
                  <Text className="text-white text-2xl font-bold">Trajets</Text>
                  <Text className="text-teal-100 text-sm mt-0.5">{trajets.length} trajet(s) enregistré(s)</Text>
                </View>
              </View>
              <TouchableOpacity
                className="bg-white rounded-2xl p-3"
                onPress={() => handleOpenForm()}
                activeOpacity={0.8}
                style={{ elevation: 2 }}
              >
                <Ionicons name="add" size={24} color="#0f766e" />
              </TouchableOpacity>
            </View>
            {/* Mini stats */}
            <View className="flex-row mt-1">
              <View className="bg-white/15 rounded-xl px-4 py-2 mr-3 flex-row items-center">
                <View className="bg-emerald-300 rounded-full w-2.5 h-2.5 mr-2" />
                <Text className="text-white text-sm font-medium">{actifsCount} Actifs</Text>
              </View>
              <View className="bg-white/15 rounded-xl px-4 py-2 flex-row items-center">
                <View className="bg-red-400 rounded-full w-2.5 h-2.5 mr-2" />
                <Text className="text-white text-sm font-medium">{trajets.length - actifsCount} Inactifs</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Barre de recherche */}
        <View className="mx-4 mt-4 bg-white rounded-2xl flex-row items-center px-4 py-1" style={{ elevation: 2 }}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 text-base py-3"
            placeholder="Rechercher un trajet..."
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

        {/* Liste des trajets */}
        <View className="px-4 mt-4 pb-6">
          {loading ? (
            <View className="items-center justify-center py-20">
              <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden' }}>
                <LinearGradient colors={['#0f766e', '#0d9488']} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#fff" />
                </LinearGradient>
              </View>
            </View>
          ) : filteredTrajets.length === 0 ? (
            <View className="bg-white rounded-3xl p-10 items-center" style={{ elevation: 2 }}>
              <View className="bg-slate-100 rounded-full p-5 mb-4">
                <Ionicons name="map-outline" size={48} color="#94a3b8" />
              </View>
              <Text className="text-slate-800 font-bold text-lg">Aucun trajet trouvé</Text>
              <Text className="text-slate-400 text-sm mt-2 text-center leading-5">
                {searchText.length > 0 
                  ? 'Aucun trajet ne correspond à votre recherche'
                  : 'Appuyez sur + pour créer votre premier trajet'}
              </Text>
            </View>
          ) : (
            filteredTrajets.map((trajet: any) => {
              const depart = trajet.province_depart?.nom_province || trajet.trajet_depart || 'Départ';
              const arrivee = trajet.province_arrivee?.nom_province || trajet.trajet_destination || 'Arrivée';
              const isActif = trajet.statut === 1;

              return (
                <TouchableOpacity
                  key={trajet.id_trajet || trajet.trajet_id}
                  className="bg-white rounded-2xl p-4 mb-3"
                  onPress={() => handleOpenDetail(trajet)}
                  activeOpacity={0.7}
                  style={{ elevation: 2 }}
                >
                  {/* Route title + status */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 mr-3">
                      <Text className="text-slate-800 font-bold text-base mb-2">
                        {trajet.nom_trajet || trajet.trajet_nom || 'Sans nom'}
                      </Text>
                      {/* Route visualization */}
                      <View className="flex-row items-center">
                        <View className="items-center mr-2">
                          <View className="bg-teal-500 rounded-full w-3 h-3" />
                          <View className="bg-teal-300 w-0.5 h-4 my-0.5" />
                          <View className="bg-orange-500 rounded-full w-3 h-3" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-slate-600 text-sm font-medium">{depart}</Text>
                          <Text className="text-slate-400 text-xs my-0.5">vers</Text>
                          <Text className="text-slate-600 text-sm font-medium">{arrivee}</Text>
                        </View>
                      </View>
                    </View>
                    <View className="rounded-xl overflow-hidden">
                      <LinearGradient
                        colors={isActif ? ['#059669', '#10b981'] : ['#dc2626', '#ef4444']}
                        className="px-3 py-1.5 flex-row items-center"
                      >
                        <Ionicons name={isActif ? 'checkmark-circle' : 'close-circle'} size={12} color="#fff" style={{ marginRight: 4 }} />
                        <Text className="text-white text-xs font-bold">{isActif ? 'Actif' : 'Inactif'}</Text>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Info badges */}
                  <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                    <View className="flex-row items-center">
                      <View className="bg-teal-50 rounded-lg px-3 py-1.5 flex-row items-center mr-2">
                        <Ionicons name="speedometer-outline" size={14} color="#0d9488" />
                        <Text className="text-teal-700 text-xs font-semibold ml-1.5">{trajet.distance_km || trajet.trajet_distance || '?'} km</Text>
                      </View>
                      <View className="bg-blue-50 rounded-lg px-3 py-1.5 flex-row items-center mr-2">
                        <Ionicons name="time-outline" size={14} color="#3b82f6" />
                        <Text className="text-blue-700 text-xs font-semibold ml-1.5">{trajet.duree || trajet.trajet_duree || '-'}</Text>
                      </View>
                      <View className="bg-amber-50 rounded-lg px-3 py-1.5 flex-row items-center">
                        <Ionicons name="pricetag-outline" size={14} color="#d97706" />
                        <Text className="text-amber-700 text-xs font-semibold ml-1.5">{trajet.tarif || trajet.trajet_prix || '0'} AR</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modales */}
      <TrajetFormModal
        visible={formModalVisible}
        trajetId={selectedTrajet?.id_trajet}
        onClose={() => {
          setFormModalVisible(false);
          setSelectedTrajet(null);
        }}
        onSuccess={() => {
          chargerTrajets();
          setFormModalVisible(false);
          setSelectedTrajet(null);
        }}
      />

      <TrajetDetailModal
        visible={detailModalVisible}
        trajetId={selectedTrajet?.id_trajet || null}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedTrajet(null);
        }}
        onEdit={(id) => {
          setSelectedTrajet(trajets.find((t) => t.id_trajet === id) || null);
          setDetailModalVisible(false);
          setFormModalVisible(true);
        }}
        onRefresh={chargerTrajets}
      />
    </View>
  );
};
