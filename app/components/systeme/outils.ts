import type { Tonalite } from '../../theme/ocean';
import { dateVoyage } from '../../utils/voyageStatut';

/** Les réponses des services sont { statut, data } ou { statut: false, message }. */
export function donnees<T = any>(r: any): T | null {
  return r && r.statut !== false && 'data' in r ? (r.data as T) : null;
}

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Collecte : 1 = en attente, 2 = confirmée ; en retard = en attente et échéance passée. */
export function etatCollecte(c: any): { libelle: string; tonalite: Tonalite; cle: 'payee' | 'attente' | 'retard' } {
  if (Number(c?.statut) === 2) return { libelle: 'Payée', tonalite: 'succes', cle: 'payee' };
  const echeance = dateVoyage(c?.date_prevue);
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  if (echeance && echeance < auj) return { libelle: 'En retard', tonalite: 'danger', cle: 'retard' };
  return { libelle: 'En attente', tonalite: 'alerte', cle: 'attente' };
}

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
