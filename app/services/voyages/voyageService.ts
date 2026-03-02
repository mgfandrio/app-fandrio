import apiClient from '../api/axiosConfig';

export const voyageService = {
  // Récupérer la liste des voyages
  obtenirVoyages: async (filtres?: any) => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/voyage/recupererListeVoyage', {
        params: filtres || {},
      });
      console.log('Réponse obtenirVoyages:', response.data);

      // Extraire le tableau voyages de response.data.data.voyages ou response.data.voyages
      let voyages: any[] = [];
      if (response.data?.data?.voyages && Array.isArray(response.data.data.voyages)) {
        voyages = response.data.data.voyages;
      } else if (response.data?.voyages && Array.isArray(response.data.voyages)) {
        voyages = response.data.voyages;
      } else if (Array.isArray(response.data?.data)) {
        voyages = response.data.data;
      }

      console.log('Voyages extraits:', voyages);

      return {
        statut: true,
        message: 'Voyages récupérés avec succès',
        data: voyages,
      };
    } catch (error: any) {
      console.error('Erreur obtenirVoyages:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération des voyages',
        data: [],
      };
    }
  },

  // Récupérer les détails d'un voyage
  obtenirVoyage: async (id: number) => {
    try {
      const response = await apiClient.get(`/api/adminCompagnie/voyage/detailVoyage/${id}`);
      console.log('Réponse obtenirVoyage:', response.data);

      // Extraire le voyage de response.data.data ou response.data
      let voyage: any = null;
      if (response.data?.data) {
        voyage = response.data.data;
      } else if (response.data?.voyage) {
        voyage = response.data.voyage;
      } else {
        voyage = response.data;
      }

      console.log('Voyage extrait:', voyage);

      return {
        statut: true,
        message: 'Voyage récupéré avec succès',
        data: voyage,
      };
    } catch (error: any) {
      console.error('Erreur obtenirVoyage:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération du voyage',
        data: null,
      };
    }
  },

  // Créer un nouveau voyage
  ajouterVoyage: async (data: any) => {
    try {
      console.log('Envoi création voyage:', JSON.stringify(data, null, 2));
      const response = await apiClient.post('/api/adminCompagnie/voyage/programmerVoyage', data);
      console.log('Réponse création voyage:', response.data);
      return {
        statut: true,
        message: response.data?.message || 'Voyage créé avec succès',
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      console.error('Erreur création voyage:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la création du voyage',
        data: null,
      };
    }
  },

  // Modifier un voyage
  modifierVoyage: async (id: number, data: any) => {
    try {
      console.log(`Envoi modification voyage ID ${id} avec données:`, JSON.stringify(data, null, 2));
      const response = await apiClient.put(`/api/adminCompagnie/voyage/updateVoyage/${id}`, data);
      console.log('Réponse complète modifierVoyage:', response.data);
      return {
        statut: true,
        message: response.data?.message || 'Voyage modifié avec succès',
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      console.error('Erreur modifierVoyage:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la modification du voyage',
        data: null,
      };
    }
  },

  // Annuler un voyage
  annulerVoyage: async (id: number) => {
    try {
      console.log(`Envoi annulation voyage ID ${id}`);
      const response = await apiClient.patch(`/api/adminCompagnie/voyage/${id}/annuler`);
      console.log('Réponse annulation voyage:', response.data);
      return {
        statut: true,
        message: response.data?.message || 'Voyage annulé avec succès',
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      console.error('Erreur annulation voyage:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de l\'annulation du voyage',
        data: null,
      };
    }
  },

  // Réactiver un voyage annulé
  reactiverVoyage: async (id: number) => {
    try {
      console.log('Envoi réactivation voyage ID', id);
      const response = await apiClient.patch(`/api/adminCompagnie/voyage/${id}/reactiver`);
      console.log('Réponse réactivation voyage:', response.data);
      return {
        statut: true,
        message: response.data?.message || 'Voyage réactivé avec succès',
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      console.error('Erreur réactivation voyage:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la réactivation du voyage',
        data: null,
      };
    }
  },

  // Récupérer les statistiques
  obtenirStatistiques: async () => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/voyage/statistiques');
      console.log('Réponse statistiques voyages:', response.data);
      return {
        statut: true,
        message: 'Statistiques récupérées avec succès',
        data: response.data?.data || response.data || {},
      };
    } catch (error: any) {
      console.error('Erreur statistiques voyages:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération des statistiques',
        data: {},
      };
    }
  },

  // Récupérer les voyages à venir (Public)
  obtenirVoyagesAVenir: async () => {
    try {
      const response = await apiClient.get('/api/recherche/a-venir');

      let voyages: any[] = [];
      // Handle { statut: true, data: { voyages: [...] } }
      if (response.data?.data?.voyages && Array.isArray(response.data.data.voyages)) {
        voyages = response.data.data.voyages;
      }
      // Handle { statut: true, data: [...] }
      else if (response.data?.data && Array.isArray(response.data.data)) {
        voyages = response.data.data;
      }
      // Handle { voyages: [...] }
      else if (response.data?.voyages && Array.isArray(response.data.voyages)) {
        voyages = response.data.voyages;
      }

      return {
        statut: true,
        message: 'Voyages à venir récupérés avec succès',
        data: voyages,
      };
    } catch (error: any) {
      console.error('Erreur obtenirVoyagesAVenir:', error.message || error);
      return {
        statut: false,
        message: error.message || 'Erreur lors de la récupération des voyages à venir',
        data: [],
      };
    }
  },

  // Rechercher des voyages avec filtres avancés
  rechercherVoyages: async (criteres: any) => {
    try {
      const response = await apiClient.post('/api/recherche/recherche', criteres);

      let voyages: any[] = [];
      if (response.data?.data?.voyages && Array.isArray(response.data.data.voyages)) {
        voyages = response.data.data.voyages;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        voyages = response.data.data;
      }

      return {
        statut: true,
        message: response.data?.message || 'Recherche effectuée avec succès',
        data: voyages,
      };
    } catch (error: any) {
      console.error('Erreur rechercherVoyages:', error.message || error);
      return {
        statut: false,
        message: error.message || 'Erreur lors de la recherche',
        data: [],
      };
    }
  },
};
