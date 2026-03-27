import * as SplashScreen from 'expo-splash-screen';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import SplashScreenAnimated from './components/SplashScreenAnimated';
import authService from './services/auth/authService';

// Empêche le splash natif de se cacher automatiquement
SplashScreen.preventAutoHideAsync();

/**
 * Point d'entrée de l'application.
 * Gère :
 * 1. L'affichage du splash animé
 * 2. La vérification / renouvellement du token JWT pendant le splash
 * 3. La redirection automatique selon le rôle si session valide
 * 4. L'écoute AppState pour revérifier le token au retour en foreground
 */
export default function Index() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const appState = useRef(AppState.currentState);
  const lastCheckTimestamp = useRef<number>(0);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // --- Utilitaire de redirection par rôle ---
  const redirectByRole = useCallback((role: number) => {
    if (role === 1) {
      router.replace('/screens/dashboard/utilisateur/dashboardUser');
    } else if (role === 3) {
      router.replace('/screens/dashboard/systeme/dashboardSys');
    } else {
      router.replace('/screens/dashboard/compagnies/dashboardCompagnie');
    }
  }, [router]);

  // --- Vérification & renouvellement du token ---
  const verifierSession = useCallback(async (): Promise<'authenticated' | 'unauthenticated'> => {
    try {
      const token = await SecureStore.getItemAsync('fandrioToken');
      if (!token) return 'unauthenticated';

      // Tenter de rafraîchir le token
      const response: any = await authService.rafraichirToken();

      if (response?.statut && response?.token) {
        // Token renouvelé avec succès — sauvegarder le nouveau token
        await SecureStore.setItemAsync('fandrioToken', response.token);
        // Mettre à jour les infos utilisateur si présentes
        if (response.utilisateur) {
          await SecureStore.setItemAsync('fandrioUser', JSON.stringify(response.utilisateur));
        }
        return 'authenticated';
      }

      // Le rafraîchissement a échoué — session expirée
      await SecureStore.deleteItemAsync('fandrioToken');
      await SecureStore.deleteItemAsync('fandrioUser');
      return 'unauthenticated';
    } catch (e) {
      console.warn('Erreur vérification session:', e);
      // En cas d'erreur réseau, conserver la session si le token existe
      const token = await SecureStore.getItemAsync('fandrioToken');
      return token ? 'authenticated' : 'unauthenticated';
    }
  }, []);

  // --- Appelé quand l'animation du splash est terminée ---
  const handleAnimationReady = useCallback(async () => {
    const resultat = await verifierSession();
    lastCheckTimestamp.current = Date.now();

    if (resultat === 'authenticated') {
      // Récupérer le rôle depuis le cache local
      const userJson = await SecureStore.getItemAsync('fandrioUser');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user?.role) {
            setShowSplash(false);
            redirectByRole(user.role);
            return;
          }
        } catch { }
      }
    }

    // Non authentifié ou pas de données utilisateur → login
    setShowSplash(false);
    router.replace('/screens/authentification/loginScreen');
  }, [verifierSession, redirectByRole, router]);

  // --- AppState listener : revérifier le token au retour en foreground ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // Détecter le retour au premier plan (background/inactive → active)
      if (
        (appState.current === 'background' || appState.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        // Ne pas vérifier si on est encore sur le splash ou si une vérification est en cours
        if (showSplash || isCheckingRef.current) {
          appState.current = nextAppState;
          return;
        }

        // Ne pas revérifier trop fréquemment (minimum 2 minutes entre chaque vérif)
        const elapsed = Date.now() - lastCheckTimestamp.current;
        if (elapsed < 2 * 60 * 1000) {
          appState.current = nextAppState;
          return;
        }

        isCheckingRef.current = true;
        try {
          const token = await SecureStore.getItemAsync('fandrioToken');
          if (!token) {
            appState.current = nextAppState;
            isCheckingRef.current = false;
            return; // Pas de token = pas connecté, on ne fait rien
          }

          const resultat = await verifierSession();
          lastCheckTimestamp.current = Date.now();

          if (resultat === 'unauthenticated') {
            // Token expiré — forcer la déconnexion
            router.replace('/screens/authentification/loginScreen');
          }
        } catch (e) {
          console.warn('Erreur vérification AppState:', e);
        } finally {
          isCheckingRef.current = false;
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [showSplash, verifierSession, router]);

  if (showSplash) {
    return (
      <SplashScreenAnimated
        onFinish={() => { /* Le splash reste visible, la navigation se fait via handleAnimationReady */ }}
        onAnimationReady={handleAnimationReady}
      />
    );
  }

  return null;
}