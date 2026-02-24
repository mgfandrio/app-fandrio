import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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

export const RenderVoyages: React.FC = () => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);
  const [activeTab, setActiveTab] = useState<'tous' | 'actifs' | 'inactifs' | 'annules'>('actifs');

  useEffect(() => {
    chargerVoyages();
  }, []);

  const chargerVoyages = async () => {
    setLoading(true);
    try {
      const response = await voyageService.obtenirVoyages();
      console.log('Réponse chargerVoyages:', response);
      
      // Handle different response structures
      let voyagesList: Voyage[] = [];
      
      if (response.statut === true && response.data) {
        voyagesList = Array.isArray(response.data) ? response.data : [];
        console.log('Voyages chargés:', voyagesList);
      } else if (Array.isArray(response)) {
        voyagesList = response;
        console.log('Voyages (format array):', voyagesList);
      } else if (response.data && Array.isArray(response.data)) {
        voyagesList = response.data;
        console.log('Voyages (response.data):', voyagesList);
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

  const filteredVoyages = (Array.isArray(voyages) ? voyages : [])
    .filter((voyage: any) => {
      // Filtrer par statut et activité
      const isActif = (voyage.statut !== 4 && voyage.voyage_statut !== 4) && (voyage.is_active !== false);
      const isInactif = (voyage.statut !== 4 && voyage.voyage_statut !== 4) && (voyage.is_active === false);
      const isAnnule = voyage.statut === 4 || voyage.voyage_statut === 4;
      
      switch (activeTab) {
        case 'tous':
          return true;
        case 'actifs':
          return isActif;
        case 'inactifs':
          return isInactif;
        case 'annules':
          return isAnnule;
        default:
          return true;
      }
    })
    .filter((voyage: any) => {
      // Filtrer par recherche
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

  const handleAddVoyage = () => {
    handleOpenForm();
  };

  return (
    <View className="flex-1 bg-gray-50">
      <DialogComponent />

      {/* Header avec recherche */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center gap-2 mb-3">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-gray-900"
            placeholder="Rechercher un voyage..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Tabs */}
        <View className="flex-row gap-2">
          {/* Tous */}
          <TouchableOpacity
            onPress={() => setActiveTab('tous')}
            className={`flex-1 py-3 rounded-lg items-center justify-center ${
              activeTab === 'tous'
                ? 'bg-gray-700'
                : 'bg-gray-100'
            }`}
          >
            <Text className={`font-semibold text-xs ${
              activeTab === 'tous'
                ? 'text-white'
                : 'text-gray-600'
            }`}>
              Tous
            </Text>
          </TouchableOpacity>

          {/* Actifs */}
          <TouchableOpacity
            onPress={() => setActiveTab('actifs')}
            className={`flex-1 py-3 rounded-lg items-center justify-center ${
              activeTab === 'actifs'
                ? 'bg-green-600'
                : 'bg-gray-100'
            }`}
          >
            <Text className={`font-semibold text-xs ${
              activeTab === 'actifs'
                ? 'text-white'
                : 'text-gray-600'
            }`}>
              Actifs
            </Text>
          </TouchableOpacity>

          {/* Inactifs */}
          <TouchableOpacity
            onPress={() => setActiveTab('inactifs')}
            className={`flex-1 py-3 rounded-lg items-center justify-center ${
              activeTab === 'inactifs'
                ? 'bg-yellow-600'
                : 'bg-gray-100'
            }`}
          >
            <Text className={`font-semibold text-xs ${
              activeTab === 'inactifs'
                ? 'text-white'
                : 'text-gray-600'
            }`}>
              Inactifs
            </Text>
          </TouchableOpacity>

          {/* Annulés */}
          <TouchableOpacity
            onPress={() => setActiveTab('annules')}
            className={`flex-1 py-3 rounded-lg items-center justify-center ${
              activeTab === 'annules'
                ? 'bg-red-600'
                : 'bg-gray-100'
            }`}
          >
            <Text className={`font-semibold text-xs ${
              activeTab === 'annules'
                ? 'text-white'
                : 'text-gray-600'
            }`}>
              Annulés
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bouton Ajouter */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity
          className="bg-blue-500 rounded-lg py-2.5 flex-row items-center justify-center gap-2"
          onPress={handleAddVoyage}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text className="text-white font-semibold">Programmer un voyage</Text>
        </TouchableOpacity>
      </View>

      {/* Liste des voyages */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredVoyages.length > 0 ? (
        <ScrollView className="flex-1 px-4 py-4">
          {filteredVoyages.map((voyage: any) => (
            <TouchableOpacity
              key={voyage.id || voyage.id_voyage || voyage.voyage_id || Math.random().toString()}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-200"
              onPress={() => handleOpenDetail(voyage)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-base">
                    {voyage.trajet?.nom || voyage.trajet?.nom_trajet || voyage.trajet?.trajet_nom || 'Trajet sans nom'}
                  </Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    {voyage.trajet?.province_depart || 'Départ'} → {voyage.trajet?.province_arrivee || 'Arrivée'}
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${
                    voyage.statut === 1 || voyage.voyage_statut === 1
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      voyage.statut === 1 || voyage.voyage_statut === 1
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {voyage.statut === 1 || voyage.voyage_statut === 1 ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="calendar" size={16} color="#6b7280" />
                    <Text className="text-gray-600 text-sm">{voyage.date || voyage.voyage_date}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="time" size={16} color="#6b7280" />
                    <Text className="text-gray-600 text-sm">{voyage.heure_depart || voyage.voyage_heure_depart}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="people" size={16} color="#6b7280" />
                    <Text className="text-gray-600 text-sm">{voyage.places_disponibles}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="navigate-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-500 text-base mt-2">Aucun voyage trouvé</Text>
        </View>
      )}

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
    </View>
  );
};
