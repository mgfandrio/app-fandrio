import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import authService from '@/app/services/auth/authService';

export default function CompteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.deconnexion();
    } catch (e) {
      console.warn('Logout API error', e);
    } finally {
      await SecureStore.deleteItemAsync('fandrioToken');
      await SecureStore.deleteItemAsync('fandrioUser');
      setLoading(false);
      router.replace('/screens/authentification/loginScreen');
    }
  };

  return (
    <View className="flex-1 bg-white px-6 py-8">
      <View className="flex-1 justify-center items-center">
        <Text className="text-2xl font-bold text-[#1e3a8a] mb-2">Mon Compte</Text>
        <Text className="text-gray-500 text-center">
          Contenu de la page Compte à venir...
        </Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        className={`rounded-xl py-3 px-6 mt-auto ${loading ? 'bg-gray-300' : 'bg-red-500'}`}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-center">Déconnexion</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
