import apiClient, { handleApiError, handleApiResponse } from '../api/axiosConfig';

class CommissionService {
  private readonly BASE_PATH = '/api/admin/commissions';

  /**
   * Récupère le tableau de bord global des commissions
   */
  async getDashboard() {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/dashboard`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère la liste des compagnies avec résumé commissions
   */
  async getCompagnies(filtres?: { recherche?: string; frequence?: string }) {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/compagnies`, { params: filtres });
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère le détail des commissions d'une compagnie
   */
  async getDetailCompagnie(compagnieId: number) {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/compagnies/${compagnieId}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Confirmer la réception d'une commission (2=facturée, 3=payée)
   */
  async confirmerReception(commId: number, statut: number) {
    try {
      const response = await apiClient.patch(`${this.BASE_PATH}/${commId}/statut`, { statut });
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Mettre à jour la fréquence et le jour de collecte d'une compagnie
   */
  async updateFrequence(compagnieId: number, data: { frequence?: 'hebdomadaire' | 'mensuelle'; jour_collecte?: string }) {
    try {
      const response = await apiClient.patch(`${this.BASE_PATH}/compagnies/${compagnieId}/frequence`, data);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Activer/Désactiver la commission pour une compagnie
   */
  async toggleCommission(compagnieId: number, actif: boolean) {
    try {
      const response = await apiClient.patch(`${this.BASE_PATH}/compagnies/${compagnieId}/toggle`, { actif });
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère la liste des collectes avec filtres
   */
  async getCollectes(filtres?: { statut?: number; comp_id?: number; dues?: boolean; per_page?: number; page?: number }) {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/collectes`, { params: filtres });
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère les collectes dues (rappels)
   */
  async getCollectesDues() {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/collectes/dues`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Récupère le détail d'une collecte (facture)
   */
  async getDetailCollecte(collecteId: number) {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/collectes/${collecteId}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Confirmer une collecte
   */
  async confirmerCollecte(collecteId: number) {
    try {
      const response = await apiClient.post(`${this.BASE_PATH}/collectes/${collecteId}/confirmer`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }

  /**
   * Historique des collectes d'une compagnie
   */
  async getHistoriqueCollectes(compagnieId: number) {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/collectes/compagnie/${compagnieId}`);
      return handleApiResponse(response);
    } catch (error) {
      return handleApiError(error);
    }
  }
}

export const commissionService = new CommissionService();
export default commissionService;
