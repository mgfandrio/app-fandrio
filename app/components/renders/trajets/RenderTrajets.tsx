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
import { trajetService } from '../../../services/trajets/trajetService';
import { Trajet } from '../../../types/trajet';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import { TrajetDetailModal } from '../../modals/trajets/TrajetDetailModal';
import { TrajetFormModal } from '../../modals/trajets/TrajetFormModal';

export const RenderTrajets: React.FC = () => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [loading, setLoading] = useState(false);
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
      
      // Handle different response structures
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

  const handleAddTrajet = () => {
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
            placeholder="Rechercher un trajet..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Bouton Ajouter */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity
          className="bg-blue-500 rounded-lg py-2.5 flex-row items-center justify-center gap-2"
          onPress={handleAddTrajet}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text className="text-white font-semibold">Ajouter un trajet</Text>
        </TouchableOpacity>
      </View>

      {/* Liste des trajets */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredTrajets.length > 0 ? (
        <ScrollView className="flex-1 px-4 py-4">
          {filteredTrajets.map((trajet: any) => (
            <TouchableOpacity
              key={trajet.id_trajet || trajet.trajet_id}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-200"
              onPress={() => handleOpenDetail(trajet)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-base">
                    {trajet.nom_trajet || trajet.trajet_nom || 'Sans nom'}
                  </Text>
                  <Text className="text-gray-600 text-sm mt-1">
                    {trajet.province_depart?.nom_province || trajet.trajet_depart} → {trajet.province_arrivee?.nom_province || trajet.trajet_destination}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Distance: {trajet.distance_km || trajet.trajet_distance} km
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${
                    trajet.statut === 1
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      trajet.statut === 1
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {trajet.statut === 1 ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="time" size={16} color="#6b7280" />
                    <Text className="text-gray-600 text-sm">{trajet.duree || trajet.trajet_duree || '-'}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="pricetag" size={16} color="#6b7280" />
                    <Text className="text-gray-600 text-sm">{trajet.tarif || trajet.trajet_prix || '0'} AR</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="map-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-500 text-base mt-2">Aucun trajet trouvé</Text>
        </View>
      )}

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
