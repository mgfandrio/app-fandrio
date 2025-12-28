export interface Voiture {
  voit_id: number;
  voit_matricule: string;
  voit_marque: string;
  voit_modele: string;
  voit_places: number;
  voit_statut: number;
  comp_id: number;
  chauff_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVoitureDTO {
  voit_matricule: string;
  voit_marque: string;
  voit_modele: string;
  voit_places: number;
  voit_statut: number;
  comp_id: number;
  chauff_id: number;
}

export interface UpdateVoitureDTO {
  voit_matricule?: string;
  voit_marque?: string;
  voit_modele?: string;
  voit_places?: number;
  voit_statut?: number;
  comp_id?: number;
  chauff_id?: number;
}
