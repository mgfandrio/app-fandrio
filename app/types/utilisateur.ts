// Types pour la gestion des utilisateurs

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date_naissance?: string;
  statut: number; // 1: actif, 2: inactif, 3: supprimé
  photo?: string;
  date_creation: string;
  date_modification: string;
}

export interface UtilisateurDetaille extends Utilisateur {
  statistiques: {
    total_reservations: number;
    reservations_confirmees: number;
    reservations_annulees: number;
    taux_confirmation: number;
  };
  voyageurs_associes: Voyageur[];
  dernieres_reservations: ReservationSimple[];
}

export interface Voyageur {
  id: number;
  nom: string;
  prenom: string;
  age: number;
  cin?: string;
  telephone?: string;
}

export interface ReservationSimple {
  id: number;
  numero: string;
  statut: number;
  montant_total: number;
  date_reservation: string;
}

export interface StatistiquesUtilisateurs {
  total: number;
  actifs: number;
  inactifs: number;
  supprimes: number;
  nouveaux_ce_mois: number;
}

export interface PaginationInfo {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface UtilisateursListeResponse {
  utilisateurs: Utilisateur[];
  pagination: PaginationInfo;
}

export interface FiltresUtilisateurs {
  statut?: number;
  recherche?: string;
  per_page?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
}

