import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fandrio:pendingReservation';
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface PendingReservationPayload {
    voyage_id: number;
    nb_voyageurs: number;
    montant_total: number;
    sieges: string[];
    voyageurs: any[];
    /** infos visuelles pour la modale "Reprendre" */
    voyageInfo?: {
        depart?: string;
        arrivee?: string;
        date?: string;
        compagnie?: string;
    };
}

export interface PendingReservation {
    payload: PendingReservationPayload;
    createdAt: number;
    /** étape où l'utilisateur en était (5 = post-création, 4 = avant POST) */
    step: number;
    /** id de la résa créée si on est passé à l'étape paiement */
    res_id?: number;
}

/**
 * Sauvegarde une réservation en cours (avant POST ou avant confirmation paiement).
 */
export const savePendingReservation = async (data: Omit<PendingReservation, 'createdAt'>) => {
    try {
        const record: PendingReservation = { ...data, createdAt: Date.now() };
        await AsyncStorage.setItem(KEY, JSON.stringify(record));
    } catch (e) {
        console.warn('[pendingReservation] save failed', e);
    }
};

/**
 * Récupère la réservation en attente si elle existe ET n'est pas expirée.
 * Si expirée, elle est supprimée silencieusement.
 */
export const loadPendingReservation = async (): Promise<PendingReservation | null> => {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return null;
        const record: PendingReservation = JSON.parse(raw);
        if (!record?.createdAt || Date.now() - record.createdAt > TTL_MS) {
            await AsyncStorage.removeItem(KEY);
            return null;
        }
        return record;
    } catch (e) {
        console.warn('[pendingReservation] load failed', e);
        return null;
    }
};

export const clearPendingReservation = async () => {
    try {
        await AsyncStorage.removeItem(KEY);
    } catch (e) {
        console.warn('[pendingReservation] clear failed', e);
    }
};
