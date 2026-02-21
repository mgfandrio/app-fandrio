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

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  
  // Debug: Afficher si la variable est chargée depuis .env ou utilise la valeur par défaut
  if (__DEV__) {
    if (value) {
      console.log(`Variable ${key} chargée depuis .env`);
    } else if (defaultValue) {
      console.warn(`Variable ${key} non trouvée, utilisation de la valeur par défaut`);
    } else {
      console.warn(`Variable d'environnement ${key} non définie`);
    }
  }
  
  return value || defaultValue || '';
};

export const config = {
  API_URL: getEnvVar('EXPO_PUBLIC_API_URL', 'http://192.168.87.84:8000/api'),
  X_API_KEY: getEnvVar('EXPO_PUBLIC_X_API_KEY', 'fandrio_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'),
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

