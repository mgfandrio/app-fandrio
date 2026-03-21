// Types pour la gestion des compagnies

export interface Compagnie {
  id: number;
  nom: string;
  nif: string;
  stat: string;
  description: string;
  telephone: string;
  email: string;
  adresse: string;
  statut: number; // 1: actif, 2: inactif, 3: supprimé
  logo?: string;
  localisation?: {
    id: number;
    nom: string;
  };
  date_creation: string;
}

export interface CompagnieDetaillee extends Compagnie {
  administrateurs: AdminCompagnie[];
  provinces_desservies: Province[];
  modes_paiement_acceptes: ModePaiement[];
}

export interface AdminCompagnie {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: number;
}

export interface Province {
  id: number;
  nom: string;
  orientation: string;
}

export interface ModePaiement {
  id: number;
  nom: string;
  type: string;
  numero?: string;
  titulaire?: string;
}

export interface ModePaiementDetail {
  id: number;
  numero: string;
  titulaire: string;
}

export interface StatistiquesCompagnies {
  total: number;
  actives: number;
  inactives: number;
  supprimees: number;
}

export interface PaginationInfo {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface CompagniesListeResponse {
  compagnies: Compagnie[];
  pagination: PaginationInfo;
}

export interface FiltresCompagnies {
  statut?: number;
  recherche?: string;
  per_page?: number;
}

export interface CompagnieFormData {
  comp_nom: string;
  comp_nif: string;
  comp_stat: string;
  comp_description: string;
  comp_phone: string;
  comp_email: string;
  comp_adresse: string;
  comp_localisation: number;
  provinces_desservies?: number[];
  modes_paiement?: (number | ModePaiementDetail)[];
  admin_nom: string;
  admin_prenom: string;
  admin_email: string;
  admin_telephone: string;
  admin_mot_de_passe: string;
}

export interface CompagnieUpdateData {
  comp_nom: string;
  comp_nif: string;
  comp_stat: string;
  comp_description: string;
  comp_phone: string;
  comp_email: string;
  comp_adresse: string;
  comp_localisation: number;
  provinces_desservies?: number[];
  modes_paiement?: (number | ModePaiementDetail)[];
}

