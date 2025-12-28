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
import utilisateurService from '../../../services/utilisateurs/utilisateurService';
import {
  FiltresUtilisateurs,
  StatistiquesUtilisateurs,
  Utilisateur,
} from '../../../types/utilisateur';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import { UtilisateurDetailModal } from '../../modals/utilisateurs/UtilisateurDetailModal';

export const RenderUsers = () => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [statistiques, setStatistiques] = useState<StatistiquesUtilisateurs | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filtres
  const [filtres, setFiltres] = useState<FiltresUtilisateurs>({
    statut: undefined,
    recherche: '',
  });
  const [rechercheTemp, setRechercheTemp] = useState('');

  useEffect(() => {
    chargerDonnees();
  }, [filtres]);

  const chargerDonnees = async () => {
    setLoading(true);
    await Promise.all([chargerUtilisateurs(), chargerStatistiques()]);
    setLoading(false);
  };

  const chargerUtilisateurs = async () => {
    const response = await utilisateurService.listerUtilisateurs(filtres);
    if (response.statut && response.data) {
      setUtilisateurs(response.data.utilisateurs);
    } else {
      showDialog({
        title: 'Erreur',
        message: response.message || 'Impossible de charger les utilisateurs',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {}
      });
    }
  };

  const chargerStatistiques = async () => {
    const response = await utilisateurService.getStatistiques();
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

  const getStatutBadge = (statut: number) => {
    const configs = {
      1: { bg: 'bg-green-100', text: 'text-green-600', label: 'Actif' },
      2: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Inactif' },
      3: { bg: 'bg-red-100', text: 'text-red-600', label: 'Supprimé' },
    };
    const config = configs[statut as keyof typeof configs] || configs[2];
    return (
      <View className={`${config.bg} rounded-full px-2 py-1`}>
        <Text className={`${config.text} text-xs font-semibold`}>{config.label}</Text>
      </View>
    );
  };

  const handleOpenDetail = (utilisateurId: number) => {
    setSelectedUserId(utilisateurId);
    setShowDetailModal(true);
  };

  // Icône de personne en bleu pour tous les utilisateurs
  const getUtilisateurIcon = () => {
    return {
      name: 'person',
      color: '#2563eb', // Bleu
      bg: 'bg-blue-100',
    };
  };

  const getInitiales = (prenom: string, nom: string) => {
    return `${prenom[0] || ''}${nom[0] || ''}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const maintenant = new Date();
    const diffMs = maintenant.getTime() - date.getTime();
    const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffJours === 0) return "Aujourd'hui";
    if (diffJours === 1) return 'Hier';
    if (diffJours < 7) return `Il y a ${diffJours} jours`;
    if (diffJours < 30) return `Il y a ${Math.floor(diffJours / 7)} semaines`;
    return `Il y a ${Math.floor(diffJours / 30)} mois`;
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
          <View className="flex-row items-center">
            <View className={`${getUtilisateurIcon().bg} rounded-full p-3 mr-3`}>
              <Ionicons name={getUtilisateurIcon().name as any} size={28} color={getUtilisateurIcon().color} />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">Utilisateurs</Text>
              <Text className="text-gray-500 text-sm mt-1">Gestion des utilisateurs</Text>
            </View>
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
              <Text className="text-gray-500 text-sm">Actifs</Text>
              <Text className="text-green-600 font-bold text-2xl">{statistiques.actifs}</Text>
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
              Tous
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
              Actifs
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
              Inactifs
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
              Supprimés
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Liste des utilisateurs */}
        {loading && utilisateurs.length === 0 ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-500 mt-4">Chargement...</Text>
          </View>
        ) : utilisateurs.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="person-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-900 font-semibold text-lg mt-4">Aucun utilisateur trouvé</Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">
              Aucun utilisateur ne correspond à vos critères de recherche
            </Text>
          </View>
        ) : (
          utilisateurs.map((utilisateur) => (
            <TouchableOpacity
              key={utilisateur.id}
              className="bg-white rounded-2xl p-4 mb-3 flex-row items-center"
              onPress={() => handleOpenDetail(utilisateur.id)}
            >
              <View className="bg-blue-100 rounded-full w-12 h-12 items-center justify-center mr-3">
                <Text className="text-blue-600 font-bold">
                  {getInitiales(utilisateur.prenom, utilisateur.nom)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">
                  {utilisateur.prenom} {utilisateur.nom}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {utilisateur.email} • {formatDate(utilisateur.date_creation)}
                </Text>
              </View>
              <View className="items-end">
                {getStatutBadge(utilisateur.statut)}
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" className="mt-2" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal de détails */}
      <UtilisateurDetailModal
        visible={showDetailModal}
        utilisateurId={selectedUserId}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedUserId(null);
        }}
        onRefresh={chargerDonnees}
      />
    </View>
  );
};

export const renderUsers = RenderUsers;
