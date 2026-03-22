import * as SplashScreen from 'expo-splash-screen';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import SplashScreenAnimated from './components/SplashScreenAnimated';

// Empêche le splash natif de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Cache le splash natif dès que notre splash animé prend le relais
    SplashScreen.hideAsync();
  }, []);

  if (showSplash) {
    return <SplashScreenAnimated onFinish={() => setShowSplash(false)} />;
  }

  return <Redirect href="/screens/authentification/loginScreen" />;
}