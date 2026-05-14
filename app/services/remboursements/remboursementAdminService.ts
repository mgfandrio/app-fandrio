import apiClient from '../api/axiosConfig';

/**
 * Service compagnie : gestion des remboursements à effectuer aux clients.
 */
export const remboursementAdminService = {
    /**
     * GET /api/adminCompagnie/remboursements
     */
    obtenirListe: async (params: {
        statut?: 'en_attente' | 'traites' | 'refuses' | 'all';
        search?: string;
        page?: number;
    } = {}) => {
        try {
            const response = await apiClient.get('/api/adminCompagnie/remboursements', { params });
            return {
                statut: true,
                data: response.data?.data || null,
            };
        } catch (error: any) {
            console.error('Erreur remboursements obtenirListe:', error.message);
            return {
                statut: false,
                message: error.response?.data?.message || 'Erreur lors du chargement',
                data: null,
            };
        }
    },

    /**
     * GET /api/adminCompagnie/remboursements/statistiques
     */
    obtenirStatistiques: async () => {
        try {
            const response = await apiClient.get('/api/adminCompagnie/remboursements/statistiques');
            return {
                statut: true,
                data: response.data?.data || null,
            };
        } catch (error: any) {
            console.error('Erreur remboursements statistiques:', error.message);
            return { statut: false, data: null };
        }
    },

    /**
     * POST /api/adminCompagnie/remboursements/{resId}/marquer-traite
     */
    marquerTraite: async (resId: number, payload: { reference: string; note?: string }) => {
        try {
            const response = await apiClient.post(
                `/api/adminCompagnie/remboursements/${resId}/marquer-traite`,
                payload
            );
            return response.data;
        } catch (error: any) {
            console.error('Erreur marquerTraite:', error.message);
            return {
                statut: false,
                message: error.response?.data?.message || 'Erreur lors du marquage',
            };
        }
    },

    /**
     * POST /api/adminCompagnie/remboursements/{resId}/refuser
     */
    refuser: async (resId: number, payload: { motif: string }) => {
        try {
            const response = await apiClient.post(
                `/api/adminCompagnie/remboursements/${resId}/refuser`,
                payload
            );
            return response.data;
        } catch (error: any) {
            console.error('Erreur refuser remboursement:', error.message);
            return {
                statut: false,
                message: error.response?.data?.message || 'Erreur lors du refus',
            };
        }
    },
};
