import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';

// Configuration de Pusher pour React Native
// @ts-ignore
global.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'reverb',
    key: 'w4eih2yp7t5kmdkkcfye',
    wsHost: '192.168.1.100', // À REMPLACER par l'IP locale de votre serveur ou 10.0.2.2 pour Android Emulator
    wsPort: 8080,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
});

export default echo;
