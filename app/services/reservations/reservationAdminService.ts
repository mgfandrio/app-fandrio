import apiClient from '../api/axiosConfig';

export const reservationAdminService = {
  /**
   * Récupère les voyages ayant des réservations validées (avec données financières)
   */
  obtenirVoyagesAvecReservations: async (page: number = 1, statut?: number) => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/reservations/voyages', {
        params: { page, per_page: 20, ...(statut ? { statut } : {}) }
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

  /** Vérifie un billet à partir de son numéro (QR illisible, téléphone du client hors d'usage). */
  scannerNumero: async (numero: string) => {
    try {
      const response = await apiClient.post('/api/adminCompagnie/reservations/scanner-qr', { numero });
      return response.data;
    } catch (error: any) {
      return error.response?.data || { statut: false, message: 'Erreur réseau', validation: 'erreur' };
    }
  },

  /** Embarque les voyageurs présents (voya_id) d'un billet ; sans liste : tout le billet. */
  embarquer: async (resId: number, voyageurs?: number[]) => {
    try {
      const response = await apiClient.post(`/api/adminCompagnie/reservations/${resId}/embarquer`, voyageurs?.length ? { voyageurs } : {});
      return response.data;
    } catch (error: any) {
      return error.response?.data || { statut: false, message: 'Erreur réseau' };
    }
  },

  /**
   * Vente au guichet : places payées en espèces sur place (sans commission FANDRIO).
   * Renvoie { res_id, res_numero, montant_total, trajet, date, heure, voyageurs, qr_data }.
   */
  vendreAuGuichet: async (params: {
    voyage_id: number;
    voyageurs: { siege: string; nom: string; prenom?: string; telephone?: string }[];
    embarquer?: boolean;
  }) => {
    try {
      const response = await apiClient.post('/api/adminCompagnie/reservations/guichet', params);
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      const premiereErreur = data?.errors ? (Object.values(data.errors)[0] as string[])?.[0] : null;
      return { statut: false, message: premiereErreur || data?.message || 'Erreur réseau : la vente n’a pas été enregistrée.' };
    }
  },

  /**
   * Portefeuille : solde, commission, historique transactions
   */
  obtenirPortefeuille: async (params?: {
    page?: number;
    per_page?: number;
    date_debut?: string;
    date_fin?: string;
    type_paie_id?: number;
  }) => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/reservations/portefeuille', { params });
      return { statut: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erreur obtenirPortefeuille:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur',
        data: null,
      };
    }
  },

  /**
   * Informations de collecte de commission pour la compagnie
   */
  obtenirMaCollecte: async () => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/reservations/ma-collecte');
      return { statut: true, data: response.data?.data };
    } catch (error: any) {
      console.error('Erreur obtenirMaCollecte:', error.message);
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur',
        data: null,
      };
    }
  },

  /**
   * Initie le paiement en ligne d'une collecte de commission via PAPI.
   * Renvoie { payment_url, transaction_id, montant } à ouvrir dans le navigateur.
   */
  payerCollecte: async (collecteId: number) => {
    try {
      const response = await apiClient.post(`/api/adminCompagnie/commissions/collectes/${collecteId}/payer`);
      return { statut: true, data: response.data?.data };
    } catch (error: any) {
      return {
        statut: false,
        message: error.response?.data?.message || 'Erreur lors de l\'initiation du paiement',
        data: null,
      };
    }
  },
};
