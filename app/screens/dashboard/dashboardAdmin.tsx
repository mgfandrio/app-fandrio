import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import DashboardCompagnie from './compagnies/dashboardCompagnie';
import DashboardSys from './systeme/dashboardSys';

export default function DashboardAdmin() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const userJson = await SecureStore.getItemAsync('fandrioUser');
        if (userJson) {
          const userData = JSON.parse(userJson);
          setUser(userData);
        } else {
          router.replace('./authentificaion/loginScreen');
        }
      } catch (e) {
        console.warn('SecureStore read error', e);
        router.replace('./loginScreen');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Rôle 3 = Admin Système
  if (user?.role === 3) {
    return <DashboardSys />;
  }

  // Rôle 2 = Admin Compagnie
  if (user?.role === 2) {
    return <DashboardCompagnie />;
  }

  // Par défaut retourner à la connexion
  router.replace('./loginScreen');
  return <View className="flex-1" />;
}
