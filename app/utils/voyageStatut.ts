import type { Tonalite } from '../theme/ocean';
import { dateLocaleISO } from '../theme/ocean';

/**
 * Source unique de vérité pour l'affichage du statut d'un voyage.
 *
 * Statuts backend (voyage_statut) :
 *   1 = Programmé | 2 = En cours | 3 = Terminé | 4 = Annulé
 *
 * `voyage_is_active` (false) = voyage mis en pause (réservations masquées).
 * La pause ne concerne que les voyages programmés / en cours.
 */

/** Extrait la valeur numérique du statut, quel que soit le nom de champ reçu. */
export function statutValeur(voyage: any): number {
  return Number(voyage?.statut ?? voyage?.voyage_statut ?? 1);
}

/** Vrai si le voyage est en pause (réservations suspendues), seulement pour programmé / en cours. */
export function estEnPause(voyage: any): boolean {
  const s = statutValeur(voyage);
  const isActive = voyage?.is_active !== false && voyage?.voyage_is_active !== false;
  return (s === 1 || s === 2) && !isActive;
}

/** Places vendues / places mises en vente, et complet ou non. */
export function remplissage(voyage: any) {
  const total = Number(voyage?.places_disponibles) || 0;
  const pris = Number(voyage?.places_reservees) || 0;
  return { total, pris, complet: total > 0 && pris >= total, pct: total > 0 ? Math.min((pris / total) * 100, 100) : 0 };
}

/** Libellé et tonalité de la pastille de statut d'un voyage. */
export function infoStatutVoyage(voyage: any): { libelle: string; tonalite: Tonalite } {
  const s = statutValeur(voyage);
  if (s === 4) return { libelle: 'Annulé', tonalite: 'danger' };
  if (s === 3) return { libelle: 'Terminé', tonalite: 'neutre' };
  if (estEnPause(voyage)) return { libelle: 'En pause', tonalite: 'alerte' };
  if (s === 2) return { libelle: 'En cours', tonalite: 'alerte' };
  if (remplissage(voyage).complet) return { libelle: 'Complet', tonalite: 'succes' };
  return { libelle: 'Programmé', tonalite: 'info' };
}

/** voyage_type : 1 = jour, 2 = nuit. */
export function libelleType(type: any) {
  return Number(type) === 2 ? 'Nuit' : 'Jour';
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « 2026-11-08 » ou « 08/11/2026 » -> Date locale (minuit). */
export function dateVoyage(texte?: string): Date | null {
  if (!texte) return null;
  const t = texte.split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [a, m, j] = t.split('-').map(Number);
    return new Date(a, m - 1, j);
  }
  const [j, m, a] = t.split('/').map(Number);
  return j && m && a ? new Date(a, m - 1, j) : null;
}

/** « Aujourd'hui · samedi 7 nov. », « Demain · dimanche 8 nov. » ou « lundi 9 nov. ». */
export function titreJour(d: Date) {
  const base = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
  const auj = dateLocaleISO(new Date());
  const dem = new Date();
  dem.setDate(dem.getDate() + 1);
  const iso = dateLocaleISO(d);
  if (iso === auj) return `Aujourd'hui · ${base}`;
  if (iso === dateLocaleISO(dem)) return `Demain · ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** « Dim. 8 nov. » */
export function dateCourte(d: Date | null) {
  if (!d) return '';
  const j = JOURS[d.getDay()];
  return `${j.charAt(0).toUpperCase()}${j.slice(1, 3)}. ${d.getDate()} ${MOIS[d.getMonth()]}`;
}
