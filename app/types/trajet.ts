export interface Trajet {
  trajet_id: number;
  trajet_depart: string;
  trajet_destination: string;
  trajet_distance: number;
  trajet_duree: string;
  trajet_prix: number;
  trajet_statut: number;
  comp_id: number;
  created_at?: string;
  updated_at?: string;
}
