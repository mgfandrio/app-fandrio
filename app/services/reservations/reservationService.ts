import apiClient from '../api/axiosConfig';

export const reservationService = {
    /**
     * Récupère les données du dashboard de réservation (stats + historique)
     */
    obtenirDashboard: async () => {
        try {
            const response = await apiClient.get('/api/client/reservation/dashboard');
            return {
                statut: true,
                message: 'Dashboard récupéré avec succès',
                data: response.data?.data || null,
            };
        } catch (error: any) {
            console.error('Erreur obtenirDashboard:', error.message);
            return {
                statut: false,
                message: error.response?.data?.message || 'Erreur lors de la récupération du dashboard',
                data: null,
            };
        }
    },

    /**
     * Crée une nouvelle réservation (Étape 1-4)
     */
    creerReservation: async (data: {
        voyage_id: number;
        nb_voyageurs: number;
        montant_total: number;
        sieges: string[];
        voyageurs: Array<{
            nom: string;
            prenom: string;
            phone?: string;
            siege_numero: string;
        }>;
    }) => {
        try {
            const response = await apiClient.post('/api/client/reservation', data);
            return response.data;
        } catch (error: any) {
            console.error('Erreur creerReservation:', error.message);
            throw error;
        }
    },

    /**
     * Confirme le paiement (Étape 5)
     */
    confirmerReservation: async (resId: number, data: { type_paie_id: number; numero_paiement?: string }) => {
        try {
            const response = await apiClient.post(`/api/client/reservation/${resId}/confirm`, data);
            return response.data;
        } catch (error: any) {
            console.error('Erreur confirmerReservation:', error.message);
            throw error;
        }
    },

    /**
     * Récupère la facture/ticket (Étape 6)
     */
    obtenirFacture: async (resId: number) => {
        try {
            const response = await apiClient.get(`/api/client/reservation/${resId}/invoice`);
            return response.data;
        } catch (error: any) {
            console.error('Erreur obtenirFacture:', error.message);
            throw error;
        }
    }
};
