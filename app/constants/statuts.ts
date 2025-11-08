/**
 * Constantes pour les statuts dans l'application
 */

// Statuts utilisateurs
export const STATUT_UTILISATEUR = {
  ACTIF: 1,
  INACTIF: 2,
  SUPPRIME: 3,
} as const;

// Labels des statuts utilisateurs
export const STATUT_UTILISATEUR_LABELS: Record<number, string> = {
  [STATUT_UTILISATEUR.ACTIF]: 'Actif',
  [STATUT_UTILISATEUR.INACTIF]: 'Inactif',
  [STATUT_UTILISATEUR.SUPPRIME]: 'Supprimé',
};

// Statuts compagnies
export const STATUT_COMPAGNIE = {
  ACTIF: 1,
  INACTIF: 2,
  SUPPRIME: 3,
} as const;

// Labels des statuts compagnies
export const STATUT_COMPAGNIE_LABELS: Record<number, string> = {
  [STATUT_COMPAGNIE.ACTIF]: 'Actif',
  [STATUT_COMPAGNIE.INACTIF]: 'Inactif',
  [STATUT_COMPAGNIE.SUPPRIME]: 'Supprimée',
};

// Rôles utilisateurs
export const ROLE_UTILISATEUR = {
  CLIENT: 1,
  ADMIN_COMPAGNIE: 2,
  ADMIN_SYSTEME: 3,
} as const;

// Labels des rôles
export const ROLE_UTILISATEUR_LABELS: Record<number, string> = {
  [ROLE_UTILISATEUR.CLIENT]: 'Client',
  [ROLE_UTILISATEUR.ADMIN_COMPAGNIE]: 'Admin Compagnie',
  [ROLE_UTILISATEUR.ADMIN_SYSTEME]: 'Admin Système',
};

// Configuration des couleurs par statut
export const STATUT_COLORS = {
  1: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    border: 'border-green-600',
  },
  2: {
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    border: 'border-orange-600',
  },
  3: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    border: 'border-red-600',
  },
} as const;

