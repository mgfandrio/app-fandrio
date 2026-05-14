import apiClient from '../api/axiosConfig';

/**
 * Service client : consultation des remboursements de l'utilisateur connecté.
 */
export const remboursementService = {
    /**
     * GET /api/client/remboursements
     */
    obtenirMesRemboursements: async (page: number = 1) => {
        try {
            const response = await apiClient.get('/api/client/remboursements', {
                params: { page },
            });
            return {
                statut: true,
                data: response.data?.data || null,
            };
        } catch (error: any) {
            console.error('Erreur obtenirMesRemboursements:', error.message);
            return {
                statut: false,
                message: error.response?.data?.message || 'Erreur lors du chargement des remboursements',
                data: null,
            };
        }
    },
};
