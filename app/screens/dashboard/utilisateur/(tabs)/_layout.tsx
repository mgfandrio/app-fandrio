import { Tabs } from 'expo-router';
import React from 'react';
import { View, Platform } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { UserProvider } from '@/app/hooks/useUser';

export default function TabsLayout() {
  return (
    <UserProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 70,
          elevation: 20,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
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
            <View style={{ width: 56, height: 56, borderRadius: 28, marginTop: -24, overflow: 'hidden', elevation: 8, shadowColor: '#1e40af', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
              <LinearGradient
                colors={['#1e40af', '#3b82f6']}
                style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="search" color="#ffffff" size={24} />
              </LinearGradient>
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
    </UserProvider>
  );
}
