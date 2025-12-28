import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { voitureService } from '../../../services';
import { Voiture } from '../../../types/voiture';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import { VoitureDetailModal } from '../../modals/voitures/VoitureDetailModal';
import { VoitureFormModal } from '../../modals/voitures/VoitureFormModal';

interface RenderVoituresProps {
  onAddPress?: () => void;
  onEditPress?: (voiture: Voiture) => void;
}

export function RenderVoitures({ onAddPress, onEditPress }: RenderVoituresProps) {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVoitureId, setSelectedVoitureId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVoitureId, setEditingVoitureId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    chargerVoitures();
  }, []);

  const chargerVoitures = async () => {
    try {
      setLoading(true);
      const response = await voitureService.obtenirListeVoitures();
      
      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        setVoitures(data);
      } else {
        setVoitures([]);
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      showDialog({
        title: 'Erreur',
        message: 'Impossible de charger les voitures',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {}
      });
      setVoitures([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await chargerVoitures();
    setRefreshing(false);
  }, []);

  const handleOpenDetail = (voitureId: number) => {
    setSelectedVoitureId(voitureId);
    setShowDetailModal(true);
  };

  const handleOpenForm = (voitureId?: number) => {
    setEditingVoitureId(voitureId || null);
    setShowFormModal(true);
  };

  const handleFormSuccess = () => {
    chargerVoitures();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const voituresFiltres = voitures.filter(v =>
    `${v.voit_marque} ${v.voit_modele} ${v.voit_matricule}`
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );

  const getStatutBadge = (statut: number) => {
    if (statut === 1) {
      return {
        bg: 'bg-green-100',
        text: 'text-green-600',
        label: 'Disponible',
        icon: 'checkmark-circle',
      };
    }
    return {
      bg: 'bg-red-100',
      text: 'text-red-600',
      label: 'Indisponible',
      icon: 'close-circle',
    };
  };

  return (
    <View className="flex-1 bg-gray-50">
      <DialogComponent />
      <ScrollView
        className="flex-1 px-4 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* En-tête */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="bg-blue-100 rounded-full p-3 mr-3">
                <Ionicons name="car" size={28} color="#2563eb" />
              </View>
              <View>
                <Text className="text-2xl font-bold text-gray-900">Voitures</Text>
                <Text className="text-gray-500 text-sm">{voitures.length} voiture(s)</Text>
              </View>
            </View>
            <TouchableOpacity
              className="bg-blue-500 rounded-full p-3 shadow-md"
              onPress={() => handleOpenForm()}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barre de recherche */}
        <View className="bg-white rounded-2xl p-3 mb-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-gray-900"
            placeholder="Rechercher par marque, matricule..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#9ca3af"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
            >
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Liste des voitures */}
        {voituresFiltres.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="car-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-900 font-semibold text-lg mt-4">Aucune voiture trouvée</Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">
              {searchText.length > 0 
                ? 'Aucune voiture ne correspond à votre recherche'
                : 'Cliquez sur le bouton + pour ajouter une voiture'}
            </Text>
          </View>
        ) : (
          voituresFiltres.map((voiture) => {
            const badge = getStatutBadge(voiture.voit_statut);
            return (
              <TouchableOpacity
                key={voiture.voit_id}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
                onPress={() => handleOpenDetail(voiture.voit_id)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="bg-blue-100 rounded-full w-14 h-14 items-center justify-center mr-4">
                    <Ionicons name="car" size={24} color="#2563eb" />
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base">
                      {voiture.voit_marque} {voiture.voit_modele}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {voiture.voit_matricule} • {voiture.voit_places} places
                    </Text>
                  </View>

                  <View className={`${badge.bg} rounded-full px-2 py-1`}>
                    <Text className={`${badge.text} text-xs font-semibold`}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal de détails */}
      <VoitureDetailModal
        visible={showDetailModal}
        voitureId={selectedVoitureId}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedVoitureId(null);
        }}
        onEdit={handleOpenForm}
        onRefresh={chargerVoitures}
      />

      {/* Modal de formulaire */}
      <VoitureFormModal
        visible={showFormModal}
        voitureId={editingVoitureId}
        onClose={() => {
          setShowFormModal(false);
          setEditingVoitureId(null);
        }}
        onSuccess={handleFormSuccess}
      />
    </View>
  );
}
