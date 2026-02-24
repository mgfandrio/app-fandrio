import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import authService, { UtilisateurMoi } from '../../services/auth/authService';

export default function MonProfil() {
  const router = useRouter();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [utilisateur, setUtilisateur] = useState<UtilisateurMoi | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);

  useEffect(() => {
    chargerProfil();
  }, []);

  const chargerProfil = async () => {
    setLoading(true);
    const response = await authService.getMoi();
    
    if (response.statut && response.data) {
      setUtilisateur(response.data);
      // Mettre à jour le SecureStore avec les dernières données
      await SecureStore.setItemAsync('fandrioUser', JSON.stringify(response.data));
    } else {
      showDialog({
        title: 'Erreur',
        message: response.message || 'Impossible de charger le profil',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {}
      });
    }
    
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await chargerProfil();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    showDialog({
      title: 'Déconnexion',
      message: 'Voulez-vous vraiment vous déconnecter ?',
      type: 'danger',
      confirmText: 'Déconnecter',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setLoadingLogout(true);
        try {
          // Appeler l'API de déconnexion
          await authService.deconnexion();
          
          // Supprimer les données locales
          await SecureStore.deleteItemAsync('fandrioToken');
          await SecureStore.deleteItemAsync('fandrioUser');
          
          // Rediriger vers la page de connexion
          router.replace('/screens/authentification/loginScreen');
        } catch (e) {
          console.warn('Erreur lors de la déconnexion', e);
          showDialog({
            title: 'Erreur',
            message: 'Une erreur est survenue lors de la déconnexion',
            type: 'danger',
            confirmText: 'OK',
            onConfirm: () => {},
            onCancel: () => {}
          });
        } finally {
          setLoadingLogout(false);
        }
      },
      onCancel: () => {}
    });
  };

  const getRoleLabel = (role: number): string => {
    switch (role) {
      case 1: return 'Client';
      case 2: return 'Admin Compagnie';
      case 3: return 'Admin Système';
      default: return 'Inconnu';
    }
  };

  const getStatutLabel = (statut: number): { label: string; color: string; bg: string } => {
    switch (statut) {
      case 1: return { label: 'Actif', color: '#10b981', bg: '#d1fae5' };
      case 2: return { label: 'Inactif', color: '#f97316', bg: '#ffedd5' };
      case 3: return { label: 'Supprimé', color: '#ef4444', bg: '#fee2e2' };
      default: return { label: 'Inconnu', color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-500 mt-4">Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!utilisateur) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text className="text-gray-900 font-bold text-xl mt-4">Erreur</Text>
          <Text className="text-gray-500 text-center mt-2">
            Impossible de charger votre profil
          </Text>
          <TouchableOpacity
            className="bg-blue-500 rounded-xl px-6 py-3 mt-6"
            onPress={chargerProfil}
          >
            <Text className="text-white font-semibold">Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statutInfo = getStatutLabel(utilisateur.statut);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <DialogComponent />
      {/* En-tête */}
      <View className="bg-blue-600 pb-6">
        <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-white/20 rounded-full p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Mon Profil</Text>
          <TouchableOpacity
            onPress={onRefresh}
            className="bg-white/20 rounded-full p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Avatar et nom */}
        <View className="items-center mt-4">
          <View className="bg-white rounded-full w-24 h-24 items-center justify-center shadow-lg">
            <Text className="text-blue-600 text-4xl font-bold">
              {utilisateur.prenom[0]}{utilisateur.nom[0]}
            </Text>
          </View>
          <Text className="text-white text-2xl font-bold mt-4">
            {utilisateur.prenom} {utilisateur.nom}
          </Text>
          <View 
            className="px-4 py-1.5 rounded-full mt-2"
            style={{ backgroundColor: statutInfo.bg }}
          >
            <Text style={{ color: statutInfo.color }} className="font-semibold text-sm">
              {statutInfo.label}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Informations personnelles */}
        <View className="bg-white rounded-3xl mx-4 mt-4 p-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <View className="bg-blue-100 rounded-full p-2 mr-3">
              <Ionicons name="person" size={24} color="#3b82f6" />
            </View>
            <Text className="text-gray-900 text-lg font-bold flex-1">Informations personnelles</Text>
          </View>

          {/* Email */}
          <View className="flex-row items-center py-3 border-b border-gray-100">
            <View className="bg-purple-100 rounded-lg p-2 mr-3">
              <Ionicons name="mail" size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-500 text-xs">Email</Text>
              <Text className="text-gray-900 font-medium">{utilisateur.email}</Text>
            </View>
          </View>

          {/* Téléphone */}
          <View className="flex-row items-center py-3 border-b border-gray-100">
            <View className="bg-green-100 rounded-lg p-2 mr-3">
              <Ionicons name="call" size={20} color="#10b981" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-500 text-xs">Téléphone</Text>
              <Text className="text-gray-900 font-medium">{utilisateur.telephone}</Text>
            </View>
          </View>

          {/* Rôle */}
          <View className="flex-row items-center py-3 border-b border-gray-100">
            <View className="bg-orange-100 rounded-lg p-2 mr-3">
              <Ionicons name="shield-checkmark" size={20} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-500 text-xs">Rôle</Text>
              <Text className="text-gray-900 font-medium">{getRoleLabel(utilisateur.role)}</Text>
            </View>
          </View>

          {/* ID Utilisateur */}
          <View className="flex-row items-center py-3">
            <View className="bg-gray-100 rounded-lg p-2 mr-3">
              <Ionicons name="finger-print" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-500 text-xs">ID Utilisateur</Text>
              <Text className="text-gray-900 font-medium">#{utilisateur.id}</Text>
            </View>
          </View>
        </View>

        {/* Compagnie (si applicable) */}
        {utilisateur.compagnie_id && (
          <View className="bg-white rounded-3xl mx-4 mt-4 p-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <View className="bg-purple-100 rounded-full p-2 mr-3">
                <Ionicons name="business" size={24} color="#8b5cf6" />
              </View>
              <Text className="text-gray-900 text-lg font-bold flex-1">Compagnie</Text>
            </View>

            <View className="flex-row items-center py-3">
              <View className="bg-purple-100 rounded-lg p-2 mr-3">
                <Ionicons name="briefcase" size={20} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs">ID Compagnie</Text>
                <Text className="text-gray-900 font-medium">#{utilisateur.compagnie_id}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View className="bg-white rounded-3xl mx-4 mt-4 p-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <View className="bg-orange-100 rounded-full p-2 mr-3">
              <Ionicons name="settings" size={24} color="#f97316" />
            </View>
            <Text className="text-gray-900 text-lg font-bold flex-1">Actions</Text>
          </View>

          <TouchableOpacity 
            className="flex-row items-center py-3 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <View className="bg-blue-100 rounded-lg p-2 mr-3">
              <Ionicons name="key" size={20} color="#3b82f6" />
            </View>
            <Text className="flex-1 text-gray-900 font-medium">Changer le mot de passe</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center py-3 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <View className="bg-green-100 rounded-lg p-2 mr-3">
              <Ionicons name="create" size={20} color="#10b981" />
            </View>
            <Text className="flex-1 text-gray-900 font-medium">Modifier mes informations</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center py-3"
            activeOpacity={0.7}
            onPress={handleLogout}
            disabled={loadingLogout}
          >
            <View className="bg-red-100 rounded-lg p-2 mr-3">
              <Ionicons name="log-out" size={20} color="#ef4444" />
            </View>
            {loadingLogout ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <>
                <Text className="flex-1 text-red-600 font-medium">Déconnexion</Text>
                <Ionicons name="chevron-forward" size={20} color="#ef4444" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}

