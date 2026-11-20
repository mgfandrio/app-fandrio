import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';

// Configuration de Pusher pour React Native
// @ts-ignore
global.Pusher = Pusher;

/**
 * Temps réel (Laravel Reverb). Adresse et clé fournies au build par les variables
 * EXPO_PUBLIC_REVERB_* (mêmes valeurs que REVERB_APP_KEY / REVERB_PUBLIC_* de l'API).
 * Valeurs par défaut : serveur de développement local.
 */
const scheme = process.env.EXPO_PUBLIC_REVERB_SCHEME || 'http';

const echo = new Echo({
    broadcaster: 'reverb',
    key: process.env.EXPO_PUBLIC_REVERB_KEY || 'w4eih2yp7t5kmdkkcfye',
    wsHost: process.env.EXPO_PUBLIC_REVERB_HOST || '192.168.1.100',
    wsPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT || 8080),
    wssPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT || 443),
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
});

export default echo;
