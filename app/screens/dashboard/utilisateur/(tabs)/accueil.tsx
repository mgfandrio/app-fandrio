import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COMPAGNIES = [
  {
    id: 1,
    nom: 'Air Fandrio',
    logo: 'airplane',
  },
  {
    id: 2,
    nom: 'Oceanic Fandrio',
    logo: 'boat',
  },
  {
    id: 3,
    nom: 'Road Fandrio',
    logo: 'bus',
  },
];

const VOYAGES = [
  {
    id: 1,
    trajet: 'Abidjan - Yamoussoukro',
    distance: '230 km',
    duree: '2h 45m',
    places: 12,
    prix: '5,000 FCFA',
    compagnie: 'Air Fandrio',
    icon: 'airplane',
  },
  {
    id: 2,
    trajet: 'Bouaké - Korhogo',
    distance: '215 km',
    duree: '3h 15m',
    places: 8,
    prix: '4,500 FCFA',
    compagnie: 'Road Fandrio',
    icon: 'bus',
  },
];

export default function AccueilScreen() {
  const [user, setUser] = useState<any | null>(null);
  const insets = useSafeAreaInsets();

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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Fixed Section: Header & Search Bar */}
      <View>
        {/* Refined Header with Elegant Navy Background */}
        <View
          style={{
            backgroundColor: '#1e3a8a',
            borderBottomLeftRadius: 40,
            borderBottomRightRadius: 40,
            paddingTop: insets.top + 10,
            paddingBottom: 56
          }}
          className="px-6 shadow-lg"
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              {/*Avatar */}
              <View className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-md">
                <Text style={{ color: '#1e3a8a' }} className="font-bold text-2xl">
                  {user?.prenom?.[0]?.toUpperCase() || ''}{user?.nom?.[0]?.toUpperCase() || ''}
                </Text>
              </View>

              {/* User Name Display */}
              <View className="ml-4">
                <Text className="text-white font-bold text-xl leading-tight">
                  {user?.nom?.toUpperCase() || ''}
                </Text>
                <Text className="text-blue-100 text-sm font-medium opacity-80">
                  {user?.prenom || ''}
                </Text>
              </View>
            </View>

            {/* Icons */}
            <View className="flex-row items-center gap-x-6">
              <TouchableOpacity className="relative p-2 bg-white/10 rounded-full">
                <Ionicons name="notifications-outline" size={26} color="#ffffff" />
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2 border-[#1e3a8a]">
                  <Text className="text-white text-[10px] font-bold">0</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity className="relative p-2 bg-white/10 rounded-full">
                <Ionicons name="mail-outline" size={26} color="#ffffff" />
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2 border-[#1e3a8a]">
                  <Text className="text-white text-[10px] font-bold">0</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Fixed Styled Search Bar (Outside ScrollView) */}
        <View className="px-6 -mt-7 z-10">
          <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-md border border-gray-100">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              placeholder="Destination, ville ..."
              placeholderTextColor="#9ca3af"
              className="flex-1 ml-3 text-gray-800 text-base"
            />
          </View>
        </View>
      </View>

      {/* Scrollable Content Section */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pt-6">
        {/* Compagnies Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center px-6 mb-4">
            <Text style={{ color: '#1e3a8a' }} className="text-xl font-bold">Compagnies de voyage</Text>
            <TouchableOpacity>
              <Text style={{ color: '#1e3a8a' }} className="font-medium">Voir tout</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            {COMPAGNIES.map((compagnie) => (
              <View
                key={compagnie.id}
                className="bg-white rounded-3xl w-64 mr-5 shadow-sm overflow-hidden border border-blue-50"
              >
                <View className="w-full h-36 bg-blue-50 items-center justify-center border-b border-blue-100">
                  <Ionicons name={compagnie.logo as any} size={60} color="#1e3a8a" />
                </View>

                <View className="p-4">
                  <Text className="text-gray-900 font-bold text-lg mb-3">{compagnie.nom}</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: '#1e3a8a' }}
                    className="py-2.5 rounded-xl items-center shadow-sm"
                  >
                    <Text className="text-white font-semibold">Plus de détail</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Voyages à venir Section */}
        <View className="px-6 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ color: '#1e3a8a' }} className="text-xl font-bold">Voyages à venir</Text>
            <TouchableOpacity>
              <Text style={{ color: '#1e3a8a' }} className="font-medium">Voir tout</Text>
            </TouchableOpacity>
          </View>

          {VOYAGES.map((voyage) => (
            <View key={voyage.id} className="bg-white rounded-3xl mb-5 shadow-md flex-row overflow-hidden border border-blue-50">
              {/* Left Side: Company Logo (50%) */}
              <View className="w-1/2 bg-blue-50 items-center justify-center p-4 border-r border-blue-50">
                <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-sm mb-2">
                  <Ionicons name={voyage.icon as any} size={32} color="#1e3a8a" />
                </View>
                <Text className="text-[10px] text-[#1e3a8a] font-bold text-center px-1" numberOfLines={1}>
                  {voyage.compagnie}
                </Text>
              </View>

              {/* Right Side: Info + Button (50%) */}
              <View className="w-1/2 p-4 justify-between">
                <View>
                  <Text className="text-gray-900 font-bold text-base mb-1" numberOfLines={1}>{voyage.trajet}</Text>

                  <View className="flex-row items-center mb-1">
                    <Ionicons name="navigate-outline" size={12} color="#6b7280" />
                    <Text className="text-gray-500 text-[10px] ml-1">{voyage.distance} • {voyage.duree}</Text>
                  </View>

                  <View className="flex-row items-center mb-1">
                    <Ionicons name="people-outline" size={12} color="#1e3a8a" />
                    <Text className="text-[#1e3a8a] text-[10px] font-semibold ml-1">{voyage.places} places dispo</Text>
                  </View>

                  <Text style={{ color: '#1e3a8a' }} className="text-base font-bold mb-3">{voyage.prix}</Text>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: '#1e3a8a' }}
                  className="py-2.5 px-4 rounded-xl self-start shadow-sm"
                >
                  <Text className="text-white text-xs font-semibold">Réserver</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
