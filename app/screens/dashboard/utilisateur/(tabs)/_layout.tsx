import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { UserProvider } from '@/app/hooks/useUser';
import { BarreOnglets } from '@/app/components/ui';

type NomIcone = keyof typeof Ionicons.glyphMap;

/** Icône pleine pour l'onglet actif, contour pour les autres. */
const icone = (nom: NomIcone) =>
  function IconeOnglet({ focused, color }: { focused: boolean; color: string }) {
    return <Ionicons name={(focused ? nom : `${nom}-outline`) as NomIcone} size={22} color={color} />;
  };

export default function TabsLayout() {
  return (
    <UserProvider>
      <Tabs tabBar={(props) => <BarreOnglets {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="accueil" options={{ title: 'Accueil', tabBarIcon: icone('home') }} />

        {/* Recherche : ouvre la recherche sur l'accueil (search.tsx n'a pas de contenu propre) */}
        <Tabs.Screen
          name="search"
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('accueil', { openSearch: Date.now().toString() });
            },
          })}
          options={{ title: 'Recherche', tabBarIcon: icone('search') }}
        />

        <Tabs.Screen name="reservation" options={{ title: 'Billets', tabBarIcon: icone('ticket') }} />
        <Tabs.Screen name="compagnie" options={{ title: 'Compagnies', tabBarIcon: icone('business') }} />
        <Tabs.Screen name="compte" options={{ title: 'Compte', tabBarIcon: icone('person') }} />
      </Tabs>
    </UserProvider>
  );
}
