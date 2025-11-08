import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

const API_URL = 'http://192.168.0.101:8000';

export default function DashboardAdmin() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userJson = await SecureStore.getItemAsync('fandrioUser');
        if (userJson) setUser(JSON.parse(userJson));
      } catch (e) {
        console.warn('SecureStore read error', e);
      }
    })();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('fandrioToken');
      if (token) {
        await axios.post(
          `${API_URL}/api/deconnexion`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (e) {
      console.warn('Logout API error', e);
    } finally {
      await SecureStore.deleteItemAsync('fandrioToken');
      await SecureStore.deleteItemAsync('fandrioUser');
      setLoading(false);
      router.replace('./loginScreen');
    }
  };

  return (
    <View className="flex-1 justify-center items-center px-6 bg-gray-50">
      <Text className="text-2xl font-bold mb-4">Dashboard Admin</Text>
      <Text className="text-base text-gray-700 mb-2">{user ? `${user.prenom} ${user.nom}` : 'Admin'}</Text>
      <Text className="text-sm text-gray-500 mb-6">Rôle : {user?.role ?? 'N/A'}</Text>

      <TouchableOpacity
        className={`rounded-xl py-3 px-6 ${loading ? 'bg-gray-300' : 'bg-red-400'}`}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Déconnexion</Text>}
      </TouchableOpacity>
    </View>
  );
}
