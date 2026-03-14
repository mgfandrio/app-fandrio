import apiClient from '../api/axiosConfig';

export const siegeService = {
    /**
     * Récupère le plan de sièges pour un voyage
     */
    getPlan: async (voyageId: number) => {
        try {
            const response = await apiClient.get(`/api/sieges/voyages/${voyageId}/plan`);
            return response.data;
        } catch (error: any) {
            console.error('Erreur getPlan:', error.message);
            throw error;
        }
    },

    /**
     * Sélectionne un siège temporairement
     */
    selectionner: async (voyageId: number, siegeNumero: string) => {
        try {
            const response = await apiClient.post(`/api/sieges/voyages/${voyageId}/selectionner`, {
                siege_numero: siegeNumero
            });
            return response.data;
        } catch (error: any) {
            console.error('Erreur selectionner siege:', error.message);
            throw error;
        }
    },

    /**
     * Libère un siège sélectionné
     */
    liberer: async (voyageId: number, siegeNumero: string) => {
        try {
            const response = await apiClient.post(`/api/sieges/voyages/${voyageId}/liberer`, {
                siege_numero: siegeNumero
            });
            return response.data;
        } catch (error: any) {
            console.error('Erreur liberer siege:', error.message);
            throw error;
        }
    }
};

export default siegeService;
