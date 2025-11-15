// Types pour la gestion des provinces

export interface Province {
  id: number;
  nom: string;
  orientation: string;
}

export interface ProvinceDetaillee extends Province {
  date_creation?: string;
  date_modification?: string;
}

export interface StatistiquesProvinces {
  total: number;
  orientations?: {
    [key: string]: number;
  };
}

export interface ProvincesListeResponse {
  provinces: Province[];
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface FiltresProvinces {
  recherche?: string;
  orientation?: string;
  per_page?: number;
}

export interface ProvinceFormData {
  pro_nom: string;
  pro_orientation: string;
}

export interface ProvinceUpdateData {
  pro_nom?: string;
  pro_orientation?: string;
}

