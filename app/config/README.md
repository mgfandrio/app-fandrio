# Configuration des variables d'environnement

## Variables requises

Pour que l'application fonctionne correctement, vous devez créer un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# URL de l'API backend à changer selon l'adresse IP des machines.
EXPO_PUBLIC_API_URL=http://10.175.222.84:8000

# Clé API pour l'authentification
EXPO_PUBLIC_X_API_KEY=fandrio_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

## Important pour Expo

Dans Expo, les variables d'environnement doivent être préfixées par `EXPO_PUBLIC_` pour être accessibles côté client (dans le code JavaScript/TypeScript).

## Utilisation

Les variables sont centralisées dans `app/config/env.ts` et peuvent être importées ainsi :

```typescript
import config from '../config/env';

// Utilisation
const apiUrl = config.API_URL;
const apiKey = config.X_API_KEY;
```

## Valeurs par défaut

Si les variables d'environnement ne sont pas définies, des valeurs par défaut sont utilisées (voir `app/config/env.ts`). Cependant, il est recommandé de toujours définir ces variables dans le fichier `.env`.

## Redémarrage requis

Après avoir modifié le fichier `.env`, vous devez redémarrer le serveur Expo :
- Arrêtez le serveur (Ctrl+C)
- Relancez avec `npm start` ou `expo start`

