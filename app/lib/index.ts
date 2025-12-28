/**
 * Point d'entrée centralisé pour tous les exports de l'application
 * Facilite les imports en permettant d'importer depuis un seul fichier
 */

// Services
export { default as apiClient } from '../services/api/axiosConfig';
export { default as authService } from '../services/auth/authService';
export { default as chauffeurService } from '../services/chauffeurs/chauffeurService';
export { default as compagnieService } from '../services/compagnies/compagnieService';
export { provinceService } from '../services/provinces/provinceService';
export { trajetService } from '../services/trajets/trajetService';
export { default as utilisateurService } from '../services/utilisateurs/utilisateurService';
export { default as voitureService } from '../services/voitures/voitureService';

// Types
export * from '../types/index';

// Hooks
export * from '../hooks/index';

// Utils
export * from '../utils/helpers';

// Constants
export * from '../constants/statuts';

// Modals
export * from '../components/modals';

