import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { VenteGuichet } from '../../components/voyages/VenteGuichet';

/** Admin compagnie : vente de places au guichet (espèces, sans commission). */
export default function GuichetScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <VenteGuichet onClose={() => router.back()} />
    </>
  );
}
