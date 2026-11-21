import type { Tonalite } from '../../theme/ocean';
import { dateVoyage } from '../../utils/voyageStatut';

/** Les réponses des services sont { statut, data } ou { statut: false, message }. */
export function donnees<T = any>(r: any): T | null {
  return r && r.statut !== false && 'data' in r ? (r.data as T) : null;
}

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * Tranche de commission (état calculé par l'API) : versée, à verser,
 * averti (7 jours sans versement), suspendu (plus de 14 jours).
 */
export function etatCollecte(c: any): { libelle: string; tonalite: Tonalite; cle: 'payee' | 'attente' | 'retard' } {
  if (Number(c?.statut) === 2 || c?.etat === 'verse') return { libelle: 'Versée', tonalite: 'succes', cle: 'payee' };
  if (c?.etat === 'suspendu') return { libelle: 'Suspension', tonalite: 'danger', cle: 'retard' };
  if (c?.etat === 'averti') return { libelle: 'Averti', tonalite: 'danger', cle: 'retard' };
  return { libelle: 'À verser', tonalite: 'alerte', cle: 'attente' };
}

/** « depuis 3 jours » pour une tranche non versée. */
export function depuisJours(c: any): string {
  const j = Number(c?.jours_ecoules) || 0;
  return j <= 0 ? "depuis aujourd'hui" : `depuis ${j} jour${j > 1 ? 's' : ''}`;
}

/** Choix du nombre de voyages par versement (la valeur actuelle est toujours incluse). */
export const optionsSeuil = (actuel?: number): number[] => Array.from(new Set([1, 3, 5, 10, 15, 20, 30, ...(actuel ? [actuel] : [])])).sort((a, b) => a - b);
export const libelleSeuil = (n: number): string => (n === 1 ? 'Après chaque voyage' : `Tous les ${n} voyages`);

/** « 01/10/2026 » -> « octobre » (mois de début de la période collectée). */
export function moisDePeriode(debut?: string) {
  const d = dateVoyage(debut);
  return d ? MOIS[d.getMonth()] : '';
}

export function initialesNom(nom?: string) {
  return (nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
}

/** Statut d'une compagnie : 1 active, 2 inactive, 3 supprimée ; suspendue = commission impayée. */
export function etatCompagnie(statut: any, suspendu?: boolean): { libelle: string; tonalite: Tonalite } {
  if (suspendu) return { libelle: 'Suspendue', tonalite: 'danger' };
  if (Number(statut) === 1) return { libelle: 'Active', tonalite: 'succes' };
  if (Number(statut) === 3) return { libelle: 'Supprimée', tonalite: 'neutre' };
  return { libelle: 'Inactive', tonalite: 'neutre' };
}
