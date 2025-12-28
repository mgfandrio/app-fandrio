export interface Chauffeur {
  chauff_id: number;
  chauff_nom: string;
  chauff_prenom: string;
  chauff_age: number;
  chauff_cin: string;
  chauff_permis: string; // 'A' | 'B' | 'C' | 'D'
  chauff_phone: string;
  chauff_statut: number;
  chauff_photo?: string | null;
  comp_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateChauffeurDTO {
  chauff_nom: string;
  chauff_prenom: string;
  chauff_age: number;
  chauff_cin: string;
  chauff_permis: string;
  chauff_phone: string;
  chauff_statut: number;
  comp_id: number;
  chauff_photo?: any; // FormData pour image
}

export interface UpdateChauffeurDTO {
  chauff_nom?: string;
  chauff_prenom?: string;
  chauff_age?: number;
  chauff_cin?: string;
  chauff_permis?: string;
  chauff_phone?: string;
  chauff_statut?: number;
  comp_id?: number;
  chauff_photo?: any;
}
