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
import { Ionicons } from '@expo/vector-icons';
import {
  Compagnie,
  FiltresCompagnies,
  StatistiquesCompagnies,
} from '../types/compagnie';
import compagnieService from '../services/compagnies/compagnieService';
import { useConfirmDialog } from './common/ConfirmDialog';
import { CompagnieDetailModal } from './modals/CompagnieDetailModal';
import { CompagnieFormModal } from './modals/CompagnieFormModal';

export const RenderCompagnies = () => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [compagnies, setCompagnies] = useState<Compagnie[]>([]);
  const [statistiques, setStatistiques] = useState<StatistiquesCompagnies | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCompagnieId, setSelectedCompagnieId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCompagnieId, setEditingCompagnieId] = useState<number | null>(null);

  // Filtres
  const [filtres, setFiltres] = useState<FiltresCompagnies>({
    statut: undefined,
    recherche: '',
  });
  const [rechercheTemp, setRechercheTemp] = useState('');

  useEffect(() => {
    chargerDonnees();
  }, [filtres]);

  const chargerDonnees = async () => {
    setLoading(true);
    await Promise.all([chargerCompagnies(), chargerStatistiques()]);
    setLoading(false);
  };

  const chargerCompagnies = async () => {
    const response = await compagnieService.listerCompagnies(filtres);
    if (response.statut && response.data) {
      setCompagnies(response.data.compagnies);
    } else {
      showDialog({
        title: 'Erreur',
        message: response.message || 'Impossible de charger les compagnies',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {}
      });
    }
  };

  const chargerStatistiques = async () => {
    const response = await compagnieService.getStatistiques();
    if (response.statut && response.data) {
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

  const handleFiltreStatut = (statut?: number) => {
    setFiltres({ ...filtres, statut });
  };

  const handleOpenDetail = (compagnieId: number) => {
    setSelectedCompagnieId(compagnieId);
    setShowDetailModal(true);
  };

  const handleOpenForm = (compagnieId?: number) => {
    setEditingCompagnieId(compagnieId || null);
    setShowFormModal(true);
  };

  const handleFormSuccess = () => {
    chargerDonnees();
  };

  const getStatutBadge = (statut: number) => {
    const configs = {
      1: { bg: 'bg-green-100', text: 'text-green-600', label: 'Actif', icon: 'checkmark-circle' },
      2: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Inactif', icon: 'pause-circle' },
      3: { bg: 'bg-red-100', text: 'text-red-600', label: 'Supprimée', icon: 'close-circle' },
    };
    const config = configs[statut as keyof typeof configs] || configs[2];
    return (
      <View className={`${config.bg} rounded-full px-3 py-1 flex-row items-center`}>
        <Ionicons name={config.icon as any} size={14} color={config.text.replace('text-', '#')} />
        <Text className={`${config.text} text-xs font-semibold ml-1`}>{config.label}</Text>
      </View>
    );
  };

  const getCompagnieIcon = (index: number) => {
    const icons: Array<{ name: any; color: string; bg: string }> = [
      { name: 'business', color: '#3b82f6', bg: 'bg-blue-100' },
      { name: 'bus', color: '#8b5cf6', bg: 'bg-purple-100' },
      { name: 'car', color: '#f97316', bg: 'bg-orange-100' },
      { name: 'airplane', color: '#10b981', bg: 'bg-green-100' },
    ];
    return icons[index % icons.length];
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
                <Ionicons name="business" size={28} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">Compagnies</Text>
                <Text className="text-gray-500 text-sm mt-1">Gestion des compagnies</Text>
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
            <View className="flex-1 bg-white rounded-2xl p-4 ml-2">
              <Text className="text-gray-500 text-sm">Actives</Text>
              <Text className="text-green-600 font-bold text-2xl">{statistiques.actives}</Text>
            </View>
          </View>
        )}

        {/* Barre de recherche */}
        <View className="bg-white rounded-2xl p-3 mb-4 flex-row items-center">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-gray-900"
            placeholder="Rechercher par nom, email..."
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

        {/* Filtres par statut */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <TouchableOpacity
            className={`rounded-full px-4 py-2 mr-2 ${
              filtres.statut === undefined ? 'bg-blue-500' : 'bg-white'
            }`}
            onPress={() => handleFiltreStatut(undefined)}
          >
            <Text
              className={`font-semibold ${
                filtres.statut === undefined ? 'text-white' : 'text-gray-700'
              }`}
            >
              Toutes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`rounded-full px-4 py-2 mr-2 ${
              filtres.statut === 1 ? 'bg-green-500' : 'bg-white'
            }`}
            onPress={() => handleFiltreStatut(1)}
          >
            <Text
              className={`font-semibold ${
                filtres.statut === 1 ? 'text-white' : 'text-gray-700'
              }`}
            >
              Actives
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`rounded-full px-4 py-2 mr-2 ${
              filtres.statut === 2 ? 'bg-orange-500' : 'bg-white'
            }`}
            onPress={() => handleFiltreStatut(2)}
          >
            <Text
              className={`font-semibold ${
                filtres.statut === 2 ? 'text-white' : 'text-gray-700'
              }`}
            >
              Inactives
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`rounded-full px-4 py-2 ${
              filtres.statut === 3 ? 'bg-red-500' : 'bg-white'
            }`}
            onPress={() => handleFiltreStatut(3)}
          >
            <Text
              className={`font-semibold ${
                filtres.statut === 3 ? 'text-white' : 'text-gray-700'
              }`}
            >
              Supprimées
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Liste des compagnies */}
        {loading && compagnies.length === 0 ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-500 mt-4">Chargement...</Text>
          </View>
        ) : compagnies.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="business-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-900 font-semibold text-lg mt-4">Aucune compagnie trouvée</Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">
              Utilisez le bouton + ci-dessus pour créer une compagnie
            </Text>
          </View>
        ) : (
          compagnies.map((compagnie, index) => {
            const iconConfig = getCompagnieIcon(index);
            return (
              <TouchableOpacity
                key={compagnie.id}
                className="bg-white rounded-2xl p-4 mb-3"
                onPress={() => handleOpenDetail(compagnie.id)}
              >
                <View className="flex-row items-center mb-3">
                  <View
                    className={`${iconConfig.bg} rounded-xl w-12 h-12 items-center justify-center mr-3`}
                  >
                    <Ionicons name={iconConfig.name} size={24} color={iconConfig.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-base">{compagnie.nom}</Text>
                    <Text className="text-gray-500 text-sm">{compagnie.email}</Text>
                  </View>
                  {getStatutBadge(compagnie.statut)}
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="call" size={16} color="#6b7280" />
                    <Text className="text-gray-600 text-sm ml-2">{compagnie.telephone}</Text>
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
      <CompagnieDetailModal
        visible={showDetailModal}
        compagnieId={selectedCompagnieId}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCompagnieId(null);
        }}
        onEdit={handleOpenForm}
        onRefresh={chargerDonnees}
      />

      {/* Modal de formulaire */}
      <CompagnieFormModal
        visible={showFormModal}
        compagnieId={editingCompagnieId}
        onClose={() => {
          setShowFormModal(false);
          setEditingCompagnieId(null);
        }}
        onSuccess={handleFormSuccess}
      />
    </View>
  );
};

export const renderCompanies = RenderCompagnies;
