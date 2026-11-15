import apiClient from '../api/axiosConfig';

/** Compagnie (partenaire, de départ ou de réception) telle que renvoyée par l'API. */
export interface CompagnieSuivi {
  id: number;
  nom: string;
  logo?: string | null;
  telephone?: string | null;
  province?: { id: number; nom: string } | null;
  depuis?: string | null;
  ajoute_par?: 'moi' | 'partenaire' | 'admin';
}

export type StatutSuivi = 'a_cloturer' | 'attendu' | 'en_route' | 'arrive';

/** Voyage dans l'écran Suivi des voyages. */
export interface VoyageSuivi {
  id: number;
  sens: 'depart' | 'arrivee';
  statut_suivi: StatutSuivi;
  en_retard: boolean;
  date: string;
  heure_depart: string;
  depart_prevu: string;
  depart_le: string | null;
  depart_auto: boolean;
  arrivee_prevue: string;
  duree_connue: boolean;
  arrivee_le: string | null;
  arrivee_confirmee_par: 'depart' | 'reception' | null;
  trajet: { depart: string | null; arrivee: string | null };
  compagnie_depart: CompagnieSuivi | null;
  compagnie_reception: CompagnieSuivi | null;
  voiture: { matricule: string; marque: string; modele?: string | null } | null;
  chauffeur: { nom: string; prenom: string; telephone: string } | null;
  nb_voyageurs: number;
  embarques: number;
  confirmes: number;
  peut_cloturer: boolean;
  peut_marquer_arrive: boolean;
  arrivee_possible_des: string | null;
  // Détail seulement
  liste_visible?: boolean;
  voyageurs?: { nom: string; prenom: string; siege: number; embarque: boolean }[];
}

export interface CompteursSuivi {
  a_cloturer: number;
  en_retard: number;
  en_route_vers_moi: number;
  total: number;
}

const COMPTEURS_VIDES: CompteursSuivi = { a_cloturer: 0, en_retard: 0, en_route_vers_moi: 0, total: 0 };

const erreur = (e: any, defaut: string) => e?.response?.data?.message || defaut;

export const suiviService = {
  // ------------------------------------------------------------ partenaires
  async partenaires() {
    try {
      const r = await apiClient.get('/api/adminCompagnie/partenaires');
      return { statut: true, data: (r.data?.data || []) as CompagnieSuivi[] };
    } catch (e) {
      return { statut: false, data: [] as CompagnieSuivi[], message: erreur(e, 'Impossible de charger vos partenaires.') };
    }
  },

  async compagniesDisponibles(recherche?: string) {
    try {
      const r = await apiClient.get('/api/adminCompagnie/partenaires/disponibles', { params: recherche ? { recherche } : {} });
      return { statut: true, data: (r.data?.data || []) as CompagnieSuivi[] };
    } catch (e) {
      return { statut: false, data: [] as CompagnieSuivi[], message: erreur(e, 'Impossible de charger les compagnies.') };
    }
  },

  /** Compagnies de réception possibles : partenaires situées dans la province d'arrivée. */
  async receptionsPourProvince(provinceId: number) {
    try {
      const r = await apiClient.get(`/api/adminCompagnie/partenaires/destination/${provinceId}`);
      return { statut: true, data: (r.data?.data || []) as CompagnieSuivi[] };
    } catch {
      return { statut: false, data: [] as CompagnieSuivi[] };
    }
  },

  async ajouterPartenaire(compId: number) {
    try {
      const r = await apiClient.post('/api/adminCompagnie/partenaires', { comp_id: compId });
      return { statut: true, message: r.data?.message as string };
    } catch (e) {
      return { statut: false, message: erreur(e, "Impossible d'ajouter ce partenaire.") };
    }
  },

  async retirerPartenaire(compId: number) {
    try {
      const r = await apiClient.delete(`/api/adminCompagnie/partenaires/${compId}`);
      return { statut: true, message: r.data?.message as string };
    } catch (e) {
      return { statut: false, message: erreur(e, 'Impossible de retirer ce partenaire.') };
    }
  },

  // ------------------------------------------------------------ suivi
  async liste(onglet: 'departs' | 'arrivees') {
    try {
      const r = await apiClient.get('/api/adminCompagnie/suivi', { params: { onglet } });
      return {
        statut: true,
        voyages: (r.data?.data?.voyages || []) as VoyageSuivi[],
        compteurs: (r.data?.data?.compteurs || COMPTEURS_VIDES) as CompteursSuivi,
      };
    } catch (e) {
      return { statut: false, voyages: [] as VoyageSuivi[], compteurs: COMPTEURS_VIDES, message: erreur(e, 'Impossible de charger le suivi des voyages.') };
    }
  },

  async compteurs() {
    try {
      const r = await apiClient.get('/api/adminCompagnie/suivi/compteurs');
      return { statut: true, data: (r.data?.data || COMPTEURS_VIDES) as CompteursSuivi };
    } catch {
      return { statut: false, data: COMPTEURS_VIDES };
    }
  },

  async detail(id: number) {
    try {
      const r = await apiClient.get(`/api/adminCompagnie/suivi/${id}`);
      return { statut: true, data: r.data?.data as VoyageSuivi };
    } catch (e) {
      return { statut: false, data: null, message: erreur(e, 'Impossible de charger ce voyage.') };
    }
  },

  async cloturer(id: number) {
    try {
      const r = await apiClient.post(`/api/adminCompagnie/suivi/${id}/cloturer`);
      return { statut: true, message: r.data?.message as string, data: r.data?.data as VoyageSuivi };
    } catch (e) {
      return { statut: false, message: erreur(e, "Impossible de clôturer l'embarquement."), data: null };
    }
  },

  async marquerArrive(id: number) {
    try {
      const r = await apiClient.post(`/api/adminCompagnie/suivi/${id}/arrive`);
      return { statut: true, message: r.data?.message as string, data: r.data?.data as VoyageSuivi };
    } catch (e) {
      return { statut: false, message: erreur(e, "Impossible de confirmer l'arrivée."), data: null };
    }
  },
};

export default suiviService;
