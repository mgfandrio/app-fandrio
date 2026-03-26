import apiClient from '../api/axiosConfig';

export const reservationAdminService = {
  /**
   * Récupère les voyages ayant des réservations validées (avec données financières)
   */
  obtenirVoyagesAvecReservations: async (page: number = 1) => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/reservations/voyages', {
        params: { page, per_page: 15 }
      });
      return {
        statut: true,
        data: response.data?.data || { resume: {}, voyages: [], pagination: {} },
      };
    } catch (error: any) {
      console.error('Erreur obtenirVoyagesAvecReservations:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération',
        data: { resume: {}, voyages: [], pagination: {} },
      };
    }
  },

  /**
   * Récupère le plan de sièges pour un voyage (temps réel côté admin)
   */
  obtenirPlanSieges: async (voyageId: number) => {
    try {
      const response = await apiClient.get(`/api/adminCompagnie/reservations/voyages/${voyageId}/plan-sieges`);
      return {
        statut: true,
        data: response.data?.data || null,
      };
    } catch (error: any) {
      console.error('Erreur obtenirPlanSieges:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération du plan',
        data: null,
      };
    }
  },

  /**
   * Récupère les voyageurs des réservations validées pour un voyage
   */
  obtenirVoyageurs: async (voyageId: number) => {
    try {
      const response = await apiClient.get(`/api/adminCompagnie/reservations/voyages/${voyageId}/voyageurs`);
      return {
        statut: true,
        data: response.data?.data || { voyageurs: [], total: 0 },
      };
    } catch (error: any) {
      console.error('Erreur obtenirVoyageurs:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération des voyageurs',
        data: { voyageurs: [], total: 0 },
      };
    }
  },

  /**
   * Récupère les billets (réservations détaillées) avec données financières pour un voyage
   */
  obtenirBillets: async (voyageId: number) => {
    try {
      const response = await apiClient.get(`/api/adminCompagnie/reservations/voyages/${voyageId}/billets`);
      return {
        statut: true,
        data: response.data?.data || { resume: {}, billets: [] },
      };
    } catch (error: any) {
      console.error('Erreur obtenirBillets:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération des billets',
        data: { resume: {}, billets: [] },
      };
    }
  },

  /**
   * Récupère les statistiques globales des réservations de la compagnie
   */
  obtenirStatistiques: async () => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/reservations/statistiques');
      return {
        statut: true,
        data: response.data?.data || {},
      };
    } catch (error: any) {
      console.error('Erreur obtenirStatistiques:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de la récupération des statistiques',
        data: {},
      };
    }
  },

  obtenirTableauBordFinancier: async () => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/reservations/tableau-bord-financier');
      return {
        statut: true,
        data: response.data?.data || {},
      };
    } catch (error: any) {
      console.error('Erreur obtenirTableauBordFinancier:', error.message);
      return { statut: false, data: {} };
    }
  },

  obtenirFactures: async (params: { page?: number; search?: string; date_debut?: string; date_fin?: string; type_paie_id?: number } = {}) => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/reservations/factures', {
        params: { per_page: 20, ...params },
      });
      return {
        statut: true,
        data: response.data?.data || { resume: {}, factures: [], pagination: {} },
      };
    } catch (error: any) {
      console.error('Erreur obtenirFactures:', error.message);
      return { statut: false, data: { resume: {}, factures: [], pagination: {} } };
    }
  },

  scannerQR: async (qrData: string) => {
    try {
      const response = await apiClient.post('/api/adminCompagnie/reservations/scanner-qr', { qr_data: qrData });
      return response.data;
    } catch (error: any) {
      return error.response?.data || { statut: false, message: 'Erreur réseau', validation: 'erreur' };
    }
  },

  embarquer: async (resId: number) => {
    try {
      const response = await apiClient.post(`/api/adminCompagnie/reservations/${resId}/embarquer`);
      return response.data;
    } catch (error: any) {
      return error.response?.data || { statut: false, message: 'Erreur réseau' };
    }
  },
};
