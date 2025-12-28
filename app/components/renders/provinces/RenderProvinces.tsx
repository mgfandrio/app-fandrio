import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import provinceService from '../../../services/provinces/provinceService';
import {
  FiltresProvinces,
  Province,
  StatistiquesProvinces,
} from '../../../types/province';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import { ProvinceDetailModal } from '../../modals/provinces/ProvinceDetailModal';
import { ProvinceFormModal } from '../../modals/provinces/ProvinceFormModal';

export const RenderProvinces = () => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [statistiques, setStatistiques] = useState<StatistiquesProvinces | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProvinceId, setEditingProvinceId] = useState<number | null>(null);

  // Filtres
  const [filtres, setFiltres] = useState<FiltresProvinces>({
    recherche: '',
    orientation: undefined,
  });
  const [rechercheTemp, setRechercheTemp] = useState('');

  useEffect(() => {
    chargerDonnees();
  }, [filtres]);

  const chargerDonnees = async () => {
    setLoading(true);
    await Promise.all([chargerProvinces(), chargerStatistiques()]);
    setLoading(false);
  };

  const chargerProvinces = async () => {
    const response = await provinceService.listerProvinces(filtres);
    if (response.statut && 'data' in response && response.data) {
      // Si l'API retourne un objet avec provinces, utiliser ça, sinon utiliser directement
      const provincesData = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).provinces || [];
      setProvinces(provincesData);
    } else {
      showDialog({
        title: 'Erreur',
        message: ('message' in response ? response.message : 'Impossible de charger les provinces') || 'Impossible de charger les provinces',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {}
      });
    }
  };

  const chargerStatistiques = async () => {
    const response = await provinceService.getStatistiques();
    if (response.statut && 'data' in response && response.data) {
      setStatistiques(response.data);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await chargerDonnees();
    setRefreshing(false);
  }, [filtres]);

  const handleRecherche = () => {
    setFiltres({ ...filtres, recherche: rechercheTemp });
  };

  const handleFiltreOrientation = (orientation?: string) => {
    setFiltres({ ...filtres, orientation });
  };

  const handleOpenDetail = (provinceId: number) => {
    setSelectedProvinceId(provinceId);
    setShowDetailModal(true);
  };

  const handleOpenForm = (provinceId?: number) => {
    setEditingProvinceId(provinceId || null);
    setShowFormModal(true);
  };

  const handleFormSuccess = () => {
    chargerDonnees();
  };

  // Palette de couleurs uniforme pour les orientations (utilise les flèches sauf pour Centre)
  const getOrientationConfig = (orientation: string) => {
    // Couleurs spécifiques pour Est (bleu foncé) et Ouest (bleu clair)
    const orientationColors: { [key: string]: { bg: string; text: string; hex: string } } = {
      'Est': { bg: 'bg-blue-200', text: 'text-blue-700', hex: '#1e40af' }, // Bleu foncé
      'Ouest': { bg: 'bg-blue-100', text: 'text-blue-600', hex: '#2563eb' }, // Bleu plus clair
    };
    
    // Si c'est Est ou Ouest, utiliser les couleurs spécifiques
    if (orientationColors[orientation]) {
      const iconMap: { [key: string]: string } = {
        'Nord': 'arrow-up',
        'Sud': 'arrow-down',
        'Est': 'arrow-forward',
        'Ouest': 'arrow-back',
        'Centre': 'location',
      };
      
      return {
        ...orientationColors[orientation],
        icon: iconMap[orientation] || 'location',
      };
    }
    
    // Pour les autres orientations, utiliser le système de hash
    const hash = orientation.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Palette de couleurs moderne et uniforme
    const colorPalette = [
      { bg: 'bg-indigo-100', text: 'text-indigo-600', hex: '#4f46e5' },
      { bg: 'bg-purple-100', text: 'text-purple-600', hex: '#7c3aed' },
      { bg: 'bg-pink-100', text: 'text-pink-600', hex: '#db2777' },
      { bg: 'bg-rose-100', text: 'text-rose-600', hex: '#e11d48' },
      { bg: 'bg-cyan-100', text: 'text-cyan-600', hex: '#06b6d4' },
      { bg: 'bg-teal-100', text: 'text-teal-600', hex: '#14b8a6' },
      { bg: 'bg-emerald-100', text: 'text-emerald-600', hex: '#10b981' },
    ];
    
    // Assigner une couleur basée sur le hash (toujours la même pour la même orientation)
    const config = colorPalette[hash % colorPalette.length];
    
    // Icônes spécifiques par orientation (flèches sauf pour Centre)
    const iconMap: { [key: string]: string } = {
      'Nord': 'arrow-up',
      'Sud': 'arrow-down',
      'Est': 'arrow-forward',
      'Ouest': 'arrow-back',
      'Centre': 'location',
    };
    
    return {
      ...config,
      icon: iconMap[orientation] || 'location',
    };
  };

  const getOrientationBadge = (orientation: string) => {
    const config = getOrientationConfig(orientation);
    return (
      <View className={`${config.bg} rounded-full px-3 py-1 flex-row items-center`}>
        <Ionicons name={config.icon as any} size={14} color={config.hex} />
        <Text className={`${config.text} text-xs font-semibold ml-1`}>{orientation}</Text>
      </View>
    );
  };

  // Icône de boussole en bleu pour toutes les provinces
  const getProvinceIcon = () => {
    return {
      name: 'compass',
      color: '#2563eb', // Bleu
      bg: 'bg-blue-100',
    };
  };

  const ORIENTATIONS = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'];

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
                <Ionicons name="map" size={28} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">Provinces</Text>
                <Text className="text-gray-500 text-sm mt-1">Gestion des provinces</Text>
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

        {/* Statistiques */}
        {statistiques && (
          <View className="flex-row mb-4">
            <View className="flex-1 bg-white rounded-2xl p-4 mr-2">
              <Text className="text-gray-500 text-sm">Total</Text>
              <Text className="text-gray-900 font-bold text-2xl">{statistiques.total}</Text>
            </View>
            {statistiques.orientations && (
              <View className="flex-1 bg-white rounded-2xl p-4 ml-2">
                <Text className="text-gray-500 text-sm">Orientations</Text>
                <Text className="text-blue-600 font-bold text-2xl">
                  {Object.keys(statistiques.orientations).length}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Barre de recherche */}
        <View className="bg-white rounded-2xl p-3 mb-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-gray-900"
            placeholder="Rechercher par nom..."
            value={rechercheTemp}
            onChangeText={setRechercheTemp}
            onSubmitEditing={handleRecherche}
            returnKeyType="search"
          />
          {rechercheTemp.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setRechercheTemp('');
                setFiltres({ ...filtres, recherche: '' });
              }}
            >
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres par orientation */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="mb-4"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <TouchableOpacity
            className={`rounded-full px-4 py-2 mr-2 ${
              filtres.orientation === undefined ? 'bg-blue-500' : 'bg-white'
            }`}
            onPress={() => handleFiltreOrientation(undefined)}
          >
            <Text
              className={`font-semibold ${
                filtres.orientation === undefined ? 'text-white' : 'text-gray-700'
              }`}
            >
              Toutes
            </Text>
          </TouchableOpacity>
          {ORIENTATIONS.map((orientation) => {
            const config = getOrientationConfig(orientation);
            const isSelected = filtres.orientation === orientation;
            return (
              <TouchableOpacity
                key={orientation}
                className={`rounded-full px-4 py-2 mr-2 flex-row items-center ${
                  isSelected ? config.bg : 'bg-white'
                }`}
                onPress={() => handleFiltreOrientation(orientation)}
              >
                <Ionicons 
                  name={config.icon as any} 
                  size={16} 
                  color={isSelected ? config.hex : '#6b7280'} 
                  style={{ marginRight: 4 }}
                />
                <Text
                  className={`font-semibold ${
                    isSelected ? config.text : 'text-gray-700'
                  }`}
                >
                  {orientation}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Liste des provinces */}
        {loading && provinces.length === 0 ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-500 mt-4">Chargement...</Text>
          </View>
        ) : provinces.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="map-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-900 font-semibold text-lg mt-4">Aucune province trouvée</Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">
              Utilisez le bouton + ci-dessus pour créer une province
            </Text>
          </View>
        ) : (
          provinces.map((province) => {
            const iconConfig = getProvinceIcon();
            return (
              <TouchableOpacity
                key={province.id}
                className="bg-white rounded-2xl p-4 mb-3"
                onPress={() => handleOpenDetail(province.id)}
              >
                <View className="flex-row items-center mb-3">
                  <View
                    className={`${iconConfig.bg} rounded-xl w-12 h-12 items-center justify-center mr-3`}
                  >
                    <Ionicons name={iconConfig.name as any} size={24} color={iconConfig.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-base">{province.nom}</Text>
                    <Text className="text-gray-500 text-sm">Province</Text>
                  </View>
                  {getOrientationBadge(province.orientation)}
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="compass" size={16} color="#6b7280" />
                    <Text className="text-gray-600 text-sm ml-2">{province.orientation}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-sm mr-2">Voir détails</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal de détails */}
      <ProvinceDetailModal
        visible={showDetailModal}
        provinceId={selectedProvinceId}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProvinceId(null);
        }}
        onEdit={handleOpenForm}
        onRefresh={chargerDonnees}
      />

      {/* Modal de formulaire */}
      <ProvinceFormModal
        visible={showFormModal}
        provinceId={editingProvinceId}
        onClose={() => {
          setShowFormModal(false);
          setEditingProvinceId(null);
        }}
        onSuccess={handleFormSuccess}
      />
    </View>
  );
};

