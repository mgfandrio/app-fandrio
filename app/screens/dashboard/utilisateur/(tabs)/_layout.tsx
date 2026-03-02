import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1e3a8a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
      }}
    >
      {/* Accueil */}
      <Tabs.Screen
        name="accueil"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
          tabBarLabel: 'Accueil',
        }}
      />

      {/* Compagnie */}
      <Tabs.Screen
        name="compagnie"
        options={{
          title: 'Compagnie',
          tabBarIcon: ({ color, size }) => <FontAwesome5 name="building" color={color} size={size} />,
          tabBarLabel: 'Compagnie',
        }}
      />

      {/* Recherche - Bouton au milieu */}
      <Tabs.Screen
        name="search"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('accueil', { openSearch: Date.now().toString() });
          },
        })}
        options={{
          title: 'Recherche',
          tabBarIcon: ({ color }) => (
            <View className="w-14 h-14 rounded-full bg-[#1e3a8a] items-center justify-center -mt-6 shadow-lg">
              <Feather name="search" color="#ffffff" size={24} />
            </View>
          ),
          tabBarLabel: '',
        }}
      />

      {/* Réservation */}
      <Tabs.Screen
        name="reservation"
        options={{
          title: 'Réservation',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size} />,
          tabBarLabel: 'Réservation',
        }}
      />

      {/* Compte */}
      <Tabs.Screen
        name="compte"
        options={{
          title: 'Compte',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
          tabBarLabel: 'Compte',
        }}
      />
    </Tabs>
  );
}
