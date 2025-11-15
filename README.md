# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Configuration des variables d'environnement

**IMPORTANT** : Avant de démarrer l'application, vous devez créer un fichier `.env` à la racine du projet avec les variables suivantes :

```env
EXPO_PUBLIC_API_URL=http://10.175.222.84:8000
EXPO_PUBLIC_X_API_KEY=fandrio_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

> **Note** : Dans Expo, les variables d'environnement doivent être préfixées par `EXPO_PUBLIC_` pour être accessibles côté client.

Voir `app/config/README.md` pour plus de détails.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Créer le fichier `.env` (voir section ci-dessus)

3. Start the app

   ```bash
   npx expo start
   ```

   > **Note** : Après avoir modifié le fichier `.env`, vous devez redémarrer le serveur Expo.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
