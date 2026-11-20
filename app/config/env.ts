/**
 * Configuration des variables d'environnement
 * 
 * Dans Expo, les variables d'environnement doivent être préfixées par EXPO_PUBLIC_
 * pour être accessibles côté client.
 * 
 * Exemple dans .env :
 * EXPO_PUBLIC_API_URL=http://10.175.222.84:8000
 * EXPO_PUBLIC_X_API_KEY=fandrio_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
 */

/**
 * Les variables EXPO_PUBLIC_* ne sont remplacées au build que si elles sont
 * écrites en toutes lettres (process.env.EXPO_PUBLIC_…) : un accès dynamique
 * (process.env[cle]) reste vide dans une app installée (APK).
 */
const lire = (cle: string, valeur: string | undefined): string => {
  if (__DEV__ && !valeur) console.warn(`Variable d'environnement ${cle} non définie`);
  return valeur || '';
};

export const config = {
  API_URL: lire('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL),
  X_API_KEY: lire('EXPO_PUBLIC_X_API_KEY', process.env.EXPO_PUBLIC_X_API_KEY),
} as const;

// Validation des variables critiques
if (!config.API_URL) {
  console.error('EXPO_PUBLIC_API_URL est requise mais non définie');
}

if (!config.X_API_KEY) {
  console.error(' EXPO_PUBLIC_X_API_KEY est requise mais non définie');
}

// Afficher la configuration en mode développement
if (__DEV__) {
  console.log('📱 Configuration API:', {
    API_URL: config.API_URL,
    X_API_KEY: config.X_API_KEY ? `${config.X_API_KEY.substring(0, 20)}...` : 'non définie',
  });
}

export default config;

