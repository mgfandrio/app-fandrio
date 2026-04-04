import apiClient from '../api/axiosConfig';

export const accueilService = {
    /**
     * Récupère les données de la page d'accueil (compagnies + voyages)
     * avec priorisation par géolocalisation et rotation toutes les 2h.
     */
    getDonneesAccueil: async (latitude?: number, longitude?: number) => {
        try {
            const params: any = {};
            if (latitude !== undefined && longitude !== undefined) {
                params.lat = latitude;
                params.lng = longitude;
            }

            const response = await apiClient.get('/api/accueil', { params });
            return {
                statut: true,
                data: response.data?.data || null,
            };
        } catch (error: any) {
            console.error('Erreur accueil:', error.message);
            return {
                statut: false,
                message: error.response?.data?.message || 'Erreur lors du chargement de l\'accueil',
                data: null,
            };
        }
    },
};
