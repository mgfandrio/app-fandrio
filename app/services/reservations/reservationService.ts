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
};
