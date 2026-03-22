import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
      <View className="flex-1 justify-center items-center bg-slate-50">
        <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient colors={['#1e40af', '#3b82f6']} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
          </LinearGradient>
        </View>
        <Text className="text-slate-500 mt-4 text-sm">Chargement des voitures...</Text>
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
      return { colors: ['#059669', '#10b981'] as const, label: 'Disponible', icon: 'checkmark-circle' as const };
    }
    return { colors: ['#dc2626', '#ef4444'] as const, label: 'Indisponible', icon: 'close-circle' as const };
  };

  const disponiblesCount = voitures.filter(v => v.voit_statut === 1).length;
  const indisponiblesCount = voitures.length - disponiblesCount;

  return (
    <View className="flex-1 bg-slate-50">
      <DialogComponent />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View className="mx-4 mt-5 rounded-3xl overflow-hidden" style={{ elevation: 4 }}>
          <LinearGradient colors={['#7c3aed', '#8b5cf6', '#a78bfa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <View className="bg-white/20 rounded-2xl p-3 mr-4">
                  <Ionicons name="car-sport" size={28} color="#fff" />
                </View>
                <View>
                  <Text className="text-white text-2xl font-bold">Voitures</Text>
                  <Text className="text-purple-100 text-sm mt-0.5">{voitures.length} véhicule(s) enregistré(s)</Text>
                </View>
              </View>
              <TouchableOpacity
                className="bg-white rounded-2xl p-3"
                onPress={() => handleOpenForm()}
                activeOpacity={0.8}
                style={{ elevation: 2 }}
              >
                <Ionicons name="add" size={24} color="#7c3aed" />
              </TouchableOpacity>
            </View>
            {/* Mini stats */}
            <View className="flex-row mt-1">
              <View className="bg-white/15 rounded-xl px-4 py-2 mr-3 flex-row items-center">
                <View className="bg-emerald-400 rounded-full w-2.5 h-2.5 mr-2" />
                <Text className="text-white text-sm font-medium">{disponiblesCount} Disponibles</Text>
              </View>
              <View className="bg-white/15 rounded-xl px-4 py-2 flex-row items-center">
                <View className="bg-red-400 rounded-full w-2.5 h-2.5 mr-2" />
                <Text className="text-white text-sm font-medium">{indisponiblesCount} Indisponibles</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Barre de recherche */}
        <View className="mx-4 mt-4 bg-white rounded-2xl flex-row items-center px-4 py-1" style={{ elevation: 2 }}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 text-base py-3"
            placeholder="Rechercher par marque, matricule..."
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

        {/* Liste des voitures */}
        <View className="px-4 mt-4 pb-6">
          {voituresFiltres.length === 0 ? (
            <View className="bg-white rounded-3xl p-10 items-center" style={{ elevation: 2 }}>
              <View className="bg-slate-100 rounded-full p-5 mb-4">
                <Ionicons name="car-outline" size={48} color="#94a3b8" />
              </View>
              <Text className="text-slate-800 font-bold text-lg">Aucune voiture trouvée</Text>
              <Text className="text-slate-400 text-sm mt-2 text-center leading-5">
                {searchText.length > 0 
                  ? 'Aucune voiture ne correspond à votre recherche'
                  : 'Appuyez sur + pour ajouter votre premier véhicule'}
              </Text>
            </View>
          ) : (
            voituresFiltres.map((voiture) => {
              const badge = getStatutBadge(voiture.voit_statut);
              return (
                <TouchableOpacity
                  key={voiture.voit_id}
                  className="bg-white rounded-2xl p-4 mb-3"
                  onPress={() => handleOpenDetail(voiture.voit_id)}
                  activeOpacity={0.7}
                  style={{ elevation: 2 }}
                >
                  <View className="flex-row items-center">
                    {/* Car icon with gradient */}
                    <View className="rounded-2xl w-14 h-14 overflow-hidden mr-4">
                      <LinearGradient
                        colors={['#7c3aed', '#8b5cf6']}
                        className="w-full h-full items-center justify-center"
                      >
                        <Ionicons name="car-sport" size={24} color="#fff" />
                      </LinearGradient>
                    </View>
                    
                    <View className="flex-1">
                      <Text className="text-slate-800 font-bold text-base">
                        {voiture.voit_marque} {voiture.voit_modele}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="document-text-outline" size={14} color="#94a3b8" />
                        <Text className="text-slate-400 text-sm ml-1.5">
                          {voiture.voit_matricule}
                        </Text>
                        <Text className="text-slate-300 mx-2">•</Text>
                        <Ionicons name="people-outline" size={14} color="#94a3b8" />
                        <Text className="text-slate-400 text-sm ml-1">
                          {voiture.voit_places} places
                        </Text>
                      </View>
                    </View>

                    {/* Status badge with gradient */}
                    <View className="rounded-xl overflow-hidden">
                      <LinearGradient
                        colors={[...badge.colors]}
                        className="px-3 py-1.5 flex-row items-center"
                      >
                        <Ionicons name={badge.icon} size={12} color="#fff" style={{ marginRight: 4 }} />
                        <Text className="text-white text-xs font-bold">{badge.label}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
