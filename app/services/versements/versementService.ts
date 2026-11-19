import apiClient from '../api/axiosConfig';

export interface FiltresVersements {
  etat?: 'a_regler' | 'retard' | 'en_cours' | 'regles' | 'tous';
  voit_id?: number;
  chauffeur?: string;
  traj_id?: number;
  du?: string; // AAAA-MM-JJ
  au?: string;
  page?: number;
}

/** Versements aux chauffeurs des voitures de particuliers (admin compagnie). */
export const versementService = {
  lister: async (filtres: FiltresVersements = {}) => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/versements', { params: { per_page: 20, ...filtres } });
      return { statut: true, data: response.data?.data };
    } catch (error: any) {
      return { statut: false, message: error?.message || 'Impossible de charger les versements.' };
    }
  },

  /** « Marquer comme réglé » : le chauffeur a bien reçu sa part. */
  regler: async (id: number) => {
    try {
      const response = await apiClient.post(`/api/adminCompagnie/versements/${id}/regler`);
      return { statut: true, message: response.data?.message as string, data: response.data?.data };
    } catch (error: any) {
      return { statut: false, message: error?.message || 'Impossible de régler ce versement.' };
    }
  },
};

export default versementService;
