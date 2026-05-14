import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Listener = () => void;

interface NetworkContextValue {
    /** true si la connexion réseau est active ET internet est joignable (ou inconnu) */
    isOnline: boolean;
    /** vrai juste après un retour en ligne, repasse à false après 3s */
    justReconnected: boolean;
    /** force un refresh manuel de l'état NetInfo */
    refresh: () => Promise<void>;
    /** s'abonner à l'évènement "retour en ligne" pour relancer une action */
    onReconnect: (cb: Listener) => () => void;
}

const NetworkContext = createContext<NetworkContextValue>({
    isOnline: true,
    justReconnected: false,
    refresh: async () => {},
    onReconnect: () => () => {},
});

const computeOnline = (state: NetInfoState | null): boolean => {
    if (!state) return true;
    if (state.isConnected === false) return false;
    // isInternetReachable peut être null pendant la 1re vérification → on est optimiste
    if (state.isInternetReachable === false) return false;
    return true;
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [justReconnected, setJustReconnected] = useState(false);
    const wasOnlineRef = useRef(true);
    const reconnectListeners = useRef(new Set<Listener>());
    const reconnectTimeoutRef = useRef<any>(null);

    useEffect(() => {
        const apply = (state: NetInfoState) => {
            const online = computeOnline(state);
            setIsOnline(online);
            if (!wasOnlineRef.current && online) {
                // Transition offline -> online : déclencher les listeners
                setJustReconnected(true);
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = setTimeout(() => setJustReconnected(false), 3000);
                reconnectListeners.current.forEach((cb) => {
                    try { cb(); } catch (e) { console.warn('[Network] listener error', e); }
                });
            }
            wasOnlineRef.current = online;
        };

        // état initial
        NetInfo.fetch().then(apply).catch(() => {});
        const unsubscribe = NetInfo.addEventListener(apply);

        return () => {
            unsubscribe();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, []);

    const refresh = useCallback(async () => {
        try {
            const state = await NetInfo.fetch();
            const online = computeOnline(state);
            setIsOnline(online);
        } catch {}
    }, []);

    const onReconnect = useCallback((cb: Listener) => {
        reconnectListeners.current.add(cb);
        return () => {
            reconnectListeners.current.delete(cb);
        };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline, justReconnected, refresh, onReconnect }}>
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => useContext(NetworkContext);

/**
 * Helper hors React : vérifier rapidement la connectivité depuis un service.
 * Utilisé par axiosConfig avant d'envoyer une requête.
 */
export const checkOnlineNow = async (): Promise<boolean> => {
    try {
        const state = await NetInfo.fetch();
        return computeOnline(state);
    } catch {
        return true; // en cas d'échec on laisse axios tenter
    }
};
