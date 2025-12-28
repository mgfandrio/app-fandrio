import apiClient from '../api/axiosConfig';

export const trajetService = {
  // Récupérer la liste des trajets
  obtenirTrajets: async () => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/trajet/recupererListeTrajet');
      
      // Extraire le tableau trajets de response.data.data.trajets
      let trajets: any[] = [];
      if (response.data?.data?.trajets && Array.isArray(response.data.data.trajets)) {
        trajets = response.data.data.trajets;
      } else if (response.data?.trajets && Array.isArray(response.data.trajets)) {
        trajets = response.data.trajets;
      }
      
      
      return {
        statut: true,
        message: 'Trajets récupérés avec succès',
        data: trajets,
      };
    } catch (error: any) {
      console.error('Erreur obtenirTrajets:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération des trajets',
        data: [],
      };
    }
  },

  // Récupérer les détails d'un trajet
  obtenirTrajet: async (id: number) => {
    try {
      const response = await apiClient.get(`/api/adminCompagnie/trajet/detailTrajet/${id}`);
      
      // Extraire le trajet de response.data.data ou response.data
      let trajet: any = null;
      if (response.data?.data) {
        trajet = response.data.data;
      } else if (response.data?.trajet) {
        trajet = response.data.trajet;
      } else {
        trajet = response.data;
      }
      
      return {
        statut: true,
        message: 'Trajet récupéré avec succès',
        data: trajet,
      };
    } catch (error: any) {
      console.error('Erreur obtenirTrajet:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération du trajet',
        data: null,
      };
    }
  },

  // Créer un nouveau trajet
  ajouterTrajet: async (data: any) => {
    try {
      const response = await apiClient.post('/api/adminCompagnie/trajet/creerTrajet', data);
      return {
        statut: true,
        message: response.data?.message || 'Trajet créé avec succès',
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la création du trajet',
        data: null,
      };
    }
  },

  // Modifier un trajet
  modifierTrajet: async (id: number, data: any) => {
    try {
      const response = await apiClient.put(`/api/adminCompagnie/trajet/updateTrajet/${id}`, data);
      return {
        statut: true,
        message: response.data?.message || 'Trajet modifié avec succès',
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      console.error('Erreur modifierTrajet:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la modification du trajet',
        data: null,
      };
    }
  },

  // Changer le statut d'un trajet
  changerEtatTrajet: async (id: number) => {
    try {
      const response = await apiClient.patch(`/api/adminCompagnie/trajet/${id}/statut`);
      return {
        statut: true,
        message: response.data?.message || 'Statut modifié avec succès',
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors du changement de statut',
        data: null,
      };
    }
  },

  // Récupérer les statistiques
  obtenirStatistiques: async () => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/trajet/statistiques');
      return {
        statut: true,
        message: 'Statistiques récupérées avec succès',
        data: response.data?.data || response.data || {},
      };
    } catch (error: any) {
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération des statistiques',
        data: {},
      };
    }
  },
};
