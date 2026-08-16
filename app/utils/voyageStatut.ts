/**
 * Source unique de vérité pour l'affichage du statut d'un voyage.
 *
 * Statuts backend (voyage_statut) :
 *   1 = Programmé  | 2 = En cours | 3 = Terminé | 4 = Annulé
 *
 * `voyage_is_active` (false) = voyage mis en pause (réservations masquées).
 * La pause ne concerne que les voyages programmés / en cours.
 *
 * Réutilisé partout (liste admin, détail, cartes) pour éviter les
 * incohérences de libellés entre écrans.
 */

export type VoyageStatutKey = 'programme' | 'encours' | 'termine' | 'annule';

export interface VoyageStatutInfo {
  key: VoyageStatutKey;
  label: string;
  /** Dégradé [début, fin] pour les bandeaux / pills en LinearGradient */
  colors: [string, string];
  /** Nom d'icône Ionicons */
  icon: string;
  /** Classe de fond pour un badge simple */
  bg: string;
  /** Classe de couleur de texte pour un badge simple */
  text: string;
}

/** Extrait la valeur numérique du statut, quel que soit le nom de champ reçu. */
export function statutValeur(voyage: any): number {
  return Number(voyage?.statut ?? voyage?.voyage_statut ?? 1);
}

/** Renvoie les infos d'affichage du statut d'un voyage (label, couleurs, icône). */
export function getVoyageStatut(voyage: any): VoyageStatutInfo {
  switch (statutValeur(voyage)) {
    case 4:
      return { key: 'annule', label: 'Annulé', colors: ['#dc2626', '#ef4444'], icon: 'close-circle', bg: 'bg-red-100', text: 'text-red-600' };
    case 3:
      return { key: 'termine', label: 'Terminé', colors: ['#475569', '#64748b'], icon: 'checkmark-done-circle', bg: 'bg-slate-100', text: 'text-slate-600' };
    case 2:
      return { key: 'encours', label: 'En cours', colors: ['#d97706', '#f59e0b'], icon: 'navigate', bg: 'bg-amber-100', text: 'text-amber-700' };
    case 1:
    default:
      return { key: 'programme', label: 'Programmé', colors: ['#059669', '#10b981'], icon: 'time', bg: 'bg-green-100', text: 'text-green-600' };
  }
}

/**
 * Vrai si le voyage est en pause (réservations suspendues).
 * N'a de sens que pour un voyage programmé ou en cours.
 */
export function estEnPause(voyage: any): boolean {
  const s = statutValeur(voyage);
  const isActive = voyage?.is_active !== false && voyage?.voyage_is_active !== false;
  return (s === 1 || s === 2) && !isActive;
}
