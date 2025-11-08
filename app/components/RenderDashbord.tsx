import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    View
} from 'react-native';
import compagnieService from '../services/compagnies/compagnieService';
import utilisateurService from '../services/utilisateurs/utilisateurService';

export const RenderDashboard = () => {
    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalCompanies: 0,
        activeCompanies: 0,
        inactiveUsers: 0,
        newUsersThisMonth: 0
    });

    useEffect(() => {
        chargerDonnees();
    }, []);

    const chargerDonnees = async () => {
        setLoading(true);
        
        // Charger l'utilisateur
        try {
            const userJson = await SecureStore.getItemAsync('fandrioUser');
            if (userJson) setUser(JSON.parse(userJson));
        } catch (e) {
            console.warn('Erreur chargement utilisateur', e);
        }

        // Charger les statistiques
        await Promise.all([
            chargerStatistiquesUtilisateurs(),
            chargerStatistiquesCompagnies()
        ]);

        setLoading(false);
    };

    const chargerStatistiquesUtilisateurs = async () => {
        const response = await utilisateurService.getStatistiques();
        if (response.statut && response.data) {
            setStats(prev => ({
                ...prev,
                totalUsers: response.data.total,
                activeUsers: response.data.actifs,
                inactiveUsers: response.data.inactifs,
                newUsersThisMonth: response.data.nouveaux_ce_mois
            }));
        }
    };

    const chargerStatistiquesCompagnies = async () => {
        const response = await compagnieService.getStatistiques();
        if (response.statut && response.data) {
            setStats(prev => ({
                ...prev,
                totalCompanies: response.data.total,
                activeCompanies: response.data.actives
            }));
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await chargerDonnees();
        setRefreshing(false);
    }, []);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-500 mt-4">Chargement...</Text>
            </View>
        );
    }

    return (
        <ScrollView 
            className="flex-1" 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header avec gradient bleu */}
            <View className="bg-blue-500 rounded-3xl p-6 mx-4 mt-4 shadow-lg">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-blue-100 text-sm mb-1">Bonjour,</Text>
            <Text className="text-white text-2xl font-bold">
              {user ? `${user.prenom}!` : 'Admin!'}
            </Text>
          </View>
          <View className="bg-white/20 rounded-full w-12 h-12 items-center justify-center">
            <Text className="text-white text-xl font-bold">
              {user?.prenom?.[0] || 'A'}
            </Text>
          </View>
        </View>

        {/* Carte d'utilisateurs actifs */}
        <View className="bg-white/15 rounded-2xl p-4 mt-4">
          <Text className="text-blue-100 text-sm mb-1">Utilisateurs Actifs</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-3xl font-bold">
              {stats.activeUsers}
            </Text>
            <View className="bg-white rounded-full w-10 h-10 items-center justify-center">
              <Ionicons name="people" size={24} color="#3b82f6" />
            </View>
          </View>
          <Text className="text-blue-200 text-xs mt-2">
            {stats.newUsersThisMonth} nouveaux ce mois
          </Text>
        </View>
      </View>

      {/* Cartes de statistiques */}
      <View className="flex-row flex-wrap px-4 mt-6">
        {/* Total Utilisateurs */}
        <View className="w-1/2 pr-2 mb-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="bg-green-100 rounded-xl p-3 w-12 h-12 items-center justify-center mb-3">
              <Ionicons name="people" size={24} color="#10b981" />
            </View>
            <Text className="text-gray-500 text-xs mb-1">Utilisateurs</Text>
            <Text className="text-gray-900 text-2xl font-bold">{stats.totalUsers}</Text>
            <Text className="text-green-600 text-xs mt-1">
              {stats.activeUsers} actifs
            </Text>
          </View>
        </View>

        {/* Compagnies */}
        <View className="w-1/2 pl-2 mb-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="bg-purple-100 rounded-xl p-3 w-12 h-12 items-center justify-center mb-3">
              <Ionicons name="business" size={24} color="#8b5cf6" />
            </View>
            <Text className="text-gray-500 text-xs mb-1">Compagnies</Text>
            <Text className="text-gray-900 text-2xl font-bold">{stats.totalCompanies}</Text>
            <Text className="text-purple-600 text-xs mt-1">
              {stats.activeCompanies} actives
            </Text>
          </View>
        </View>

        {/* Nouveaux ce mois */}
        <View className="w-1/2 pr-2 mb-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="bg-blue-100 rounded-xl p-3 w-12 h-12 items-center justify-center mb-3">
              <Ionicons name="person-add" size={24} color="#3b82f6" />
            </View>
            <Text className="text-gray-500 text-xs mb-1">Nouveaux ce mois</Text>
            <Text className="text-gray-900 text-2xl font-bold">{stats.newUsersThisMonth}</Text>
          </View>
        </View>

        {/* Taux d'activité */}
        <View className="w-1/2 pl-2 mb-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="bg-orange-100 rounded-xl p-3 w-12 h-12 items-center justify-center mb-3">
              <Ionicons name="trending-up" size={24} color="#f97316" />
            </View>
            <Text className="text-gray-500 text-xs mb-1">Taux actifs</Text>
            <Text className="text-gray-900 text-2xl font-bold">
              {stats.totalUsers > 0 
                ? Math.round((stats.activeUsers / stats.totalUsers) * 100) 
                : 0}%
            </Text>
          </View>
        </View>
      </View>

      {/* Résumé des statistiques */}
      <View className="bg-white rounded-3xl mx-4 p-6 shadow-sm mb-6">
        <View className="flex-row items-center mb-4">
          <View className="bg-blue-100 rounded-full p-2 mr-3">
            <Ionicons name="bar-chart" size={24} color="#3b82f6" />
          </View>
          <Text className="text-gray-900 text-lg font-bold flex-1">Vue d'ensemble</Text>
        </View>
        
        <View className="space-y-3">
          {/* Ligne utilisateurs */}
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-row items-center flex-1">
              <View className="bg-green-100 rounded-lg p-2 mr-3">
                <Ionicons name="people" size={20} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Utilisateurs</Text>
                <Text className="text-gray-500 text-xs">{stats.activeUsers} actifs / {stats.inactiveUsers} inactifs</Text>
              </View>
            </View>
            <Text className="text-gray-900 font-bold text-lg">{stats.totalUsers}</Text>
          </View>

          {/* Ligne compagnies */}
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-row items-center flex-1">
              <View className="bg-purple-100 rounded-lg p-2 mr-3">
                <Ionicons name="business" size={20} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Compagnies</Text>
                <Text className="text-gray-500 text-xs">{stats.activeCompanies} actives</Text>
              </View>
            </View>
            <Text className="text-gray-900 font-bold text-lg">{stats.totalCompanies}</Text>
          </View>

          {/* Ligne nouveaux utilisateurs */}
          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center flex-1">
              <View className="bg-blue-100 rounded-lg p-2 mr-3">
                <Ionicons name="person-add" size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Nouveaux ce mois</Text>
                <Text className="text-gray-500 text-xs">Utilisateurs inscrits</Text>
              </View>
            </View>
            <Text className="text-blue-600 font-bold text-lg">+{stats.newUsersThisMonth}</Text>
          </View>
        </View>
      </View>
      </ScrollView>
    );
  }
