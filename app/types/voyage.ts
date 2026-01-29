export interface Voyage {
  id_voyage?: number;
  voyage_id?: number;
  voyage_date: string;
  voyage_heure_depart: string;
  traj_id: number;
  voit_id: number;
  voyage_type?: number;
  places_disponibles: number;
  places_disponibles_restantes?: number;
  statut?: number;
  voyage_statut?: number;
  trajet?: {
    id_trajet?: number;
    traj_id?: number;
    nom_trajet?: string;
    trajet_nom?: string;
    province_depart?: {
      id_province?: number;
      pro_id?: number;
      nom_province?: string;
      pro_nom?: string;
    };
    province_arrivee?: {
      id_province?: number;
      pro_id?: number;
      nom_province?: string;
      pro_nom?: string;
    };
    distance_km?: number;
    trajet_distance?: number;
    tarif?: number;
    trajet_prix?: number;
  };
  voiture?: {
    id_voiture?: number;
    voit_id?: number;
    voit_immatriculation?: string;
    immatriculation?: string;
    voit_marque?: string;
    marque?: string;
    voit_model?: string;
    model?: string;
    voit_couleur?: string;
    couleur?: string;
  };
  chauffeur?: {
    id_chauffeur?: number;
    chauf_id?: number;
    chauf_nom?: string;
    nom?: string;
    chauf_prenom?: string;
    prenom?: string;
    chauf_telephone?: string;
    telephone?: string;
  };
  date_creation?: string;
  created_at?: string;
  date_modification?: string;
  updated_at?: string;
}
