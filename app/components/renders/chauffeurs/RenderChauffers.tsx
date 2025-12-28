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
import { chauffeurService } from '../../../services';
import { Chauffeur } from '../../../types/chauffeur';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import { ChauffeurDetailModal } from '../../modals/chauffeurs/ChauffeurDetailModal';
import { ChauffeurFormModal } from '../../modals/chauffeurs/ChauffeurFormModal';

interface RenderChauffeursProps {
  onAddPress?: () => void;
  onEditPress?: (chauffeur: Chauffeur) => void;
}

export function RenderChauffers({ onAddPress, onEditPress }: RenderChauffeursProps) {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChauffeurId, setSelectedChauffeurId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingChauffeurId, setEditingChauffeurId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    chargerChauffeurs();
  }, []);

  const chargerChauffeurs = async () => {
    try {
      setLoading(true);
      const response = await chauffeurService.obtenirListeChauffeurs();
      
      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        setChauffeurs(data);
      } else {
        setChauffeurs([]);
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      showDialog({
        title: 'Erreur',
        message: 'Impossible de charger les chauffeurs',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {}
      });
      setChauffeurs([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await chargerChauffeurs();
    setRefreshing(false);
  }, []);

  const handleOpenDetail = (chauffeurId: number) => {
    setSelectedChauffeurId(chauffeurId);
    setShowDetailModal(true);
  };

  const handleOpenForm = (chauffeurId?: number) => {
    setEditingChauffeurId(chauffeurId || null);
    setShowFormModal(true);
  };

  const handleFormSuccess = () => {
    chargerChauffeurs();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const chauffeursFiltres = chauffeurs.filter(c =>
    `${c.chauff_nom} ${c.chauff_prenom} ${c.chauff_cin}`
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );

  const getStatutBadge = (statut: number) => {
    if (statut === 1) {
      return {
        bg: 'bg-green-100',
        text: 'text-green-600',
        label: 'Actif',
        icon: 'checkmark-circle',
      };
    }
    return {
      bg: 'bg-red-100',
      text: 'text-red-600',
      label: 'Inactif',
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
                <Ionicons name="person" size={28} color="#2563eb" />
              </View>
              <View>
                <Text className="text-2xl font-bold text-gray-900">Chauffeurs</Text>
                <Text className="text-gray-500 text-sm">{chauffeurs.length} chauffeur(s)</Text>
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
            placeholder="Rechercher par nom, CIN..."
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

        {/* Liste des chauffeurs */}
        {chauffeursFiltres.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="person-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-900 font-semibold text-lg mt-4">Aucun chauffeur trouvé</Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">
              {searchText.length > 0 
                ? 'Aucun chauffeur ne correspond à votre recherche'
                : 'Cliquez sur le bouton + pour ajouter un chauffeur'}
            </Text>
          </View>
        ) : (
          chauffeursFiltres.map((chauffeur) => {
            const badge = getStatutBadge(chauffeur.chauff_statut);
            return (
              <TouchableOpacity
                key={chauffeur.chauff_id}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
                onPress={() => handleOpenDetail(chauffeur.chauff_id)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="bg-blue-100 rounded-full w-14 h-14 items-center justify-center mr-4">
                    <Ionicons name="person" size={24} color="#2563eb" />
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base">
                      {chauffeur.chauff_nom} {chauffeur.chauff_prenom}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      CIN: {chauffeur.chauff_cin} • {chauffeur.chauff_age} ans
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
      <ChauffeurDetailModal
        visible={showDetailModal}
        chauffeurId={selectedChauffeurId}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedChauffeurId(null);
        }}
        onEdit={handleOpenForm}
        onRefresh={chargerChauffeurs}
      />

      {/* Modal de formulaire */}
      <ChauffeurFormModal
        visible={showFormModal}
        chauffeurId={editingChauffeurId}
        onClose={() => {
          setShowFormModal(false);
          setEditingChauffeurId(null);
        }}
        onSuccess={handleFormSuccess}
      />
    </View>
  );
}
