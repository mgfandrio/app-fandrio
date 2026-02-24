import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatCard } from './StatCard';
import compagnieService from '../../services/compagnies/compagnieService';

interface DashboardStatsProps {
  refreshTrigger?: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ refreshTrigger = 0 }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await compagnieService.getTableauBord();

      if ('statut' in response && response.statut === true) {
        setStats(response.data);
      } else if ('error' in response) {
        setError('Erreur lors du chargement des statistiques');
      }
    } catch (err) {
      setError('Erreur lors de la connexion');
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-red-50 rounded-xl p-4 mb-6">
        <Text className="text-red-600 text-sm">{error}</Text>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <View className="mb-6">
      {/* Voitures */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-900 mb-3">Voitures</Text>
        <View className="flex-row flex-wrap">
          <View className="w-1/3">
            <StatCard
              title="Disponibles"
              value={stats.voitures.disponibles}
              icon="checkmark-circle"
              color="bg-green-100"
              textColor="text-green-600"
              iconColor="#10b981"
            />
          </View>
          <View className="w-1/3">
            <StatCard
              title="Indisponibles"
              value={stats.voitures.indisponibles}
              icon="close-circle"
              color="bg-red-100"
              textColor="text-red-600"
              iconColor="#ef4444"
            />
          </View>
          <View className="w-1/3">
            <StatCard
              title="Total"
              value={stats.voitures.total}
              icon="car"
              color="bg-blue-100"
              textColor="text-blue-600"
              iconColor="#3b82f6"
            />
          </View>
        </View>
      </View>

      {/* Voyages */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-900 mb-3">Voyages</Text>
        <View className="flex-row flex-wrap">
          <View className="w-1/4">
            <StatCard
              title="Actifs"
              value={stats.voyages.actifs}
              icon="checkmark"
              color="bg-green-100"
              textColor="text-green-600"
              iconColor="#10b981"
            />
          </View>
          <View className="w-1/4">
            <StatCard
              title="Inactifs"
              value={stats.voyages.inactifs}
              icon="pause"
              color="bg-yellow-100"
              textColor="text-yellow-600"
              iconColor="#f59e0b"
            />
          </View>
          <View className="w-1/4">
            <StatCard
              title="Annulés"
              value={stats.voyages.annules}
              icon="ban"
              color="bg-red-100"
              textColor="text-red-600"
              iconColor="#ef4444"
            />
          </View>
          <View className="w-1/4">
            <StatCard
              title="Total"
              value={stats.voyages.total}
              icon="list"
              color="bg-blue-100"
              textColor="text-blue-600"
              iconColor="#3b82f6"
            />
          </View>
        </View>
      </View>

      {/* Chauffeurs */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-900 mb-3">Chauffeurs</Text>
        <View className="flex-row flex-wrap">
          <View className="w-1/3">
            <StatCard
              title="Disponibles"
              value={stats.chauffeurs.actifs}
              icon="person-circle"
              color="bg-green-100"
              textColor="text-green-600"
              iconColor="#10b981"
            />
          </View>
          <View className="w-1/3">
            <StatCard
              title="Indisponibles"
              value={stats.chauffeurs.inactifs}
              icon="person-remove"
              color="bg-gray-100"
              textColor="text-gray-600"
              iconColor="#6b7280"
            />
          </View>
          <View className="w-1/3">
            <StatCard
              title="Total"
              value={stats.chauffeurs.total}
              icon="people"
              color="bg-blue-100"
              textColor="text-blue-600"
              iconColor="#3b82f6"
            />
          </View>
        </View>
      </View>
    </View>
  );
};
