import type { Tonalite } from '@/app/theme/ocean';

/**
 * Statut d'une réservation pour l'affichage client.
 *
 * res_statut de l'API : 1 = en attente de paiement, 2 = confirmée (payée),
 * 4 = annulée (ou expirée / remboursée), 5 = abandonnée. Il n'y a pas de
 * statut « terminée » : un billet confirmé dont la date est passée est « Effectué ».
 */
export interface StatutBillet {
  libelle: string;
  tonalite: Tonalite;
  /** à venir, passé ou annulé : sert aux onglets de « Mes billets ». */
  groupe: 'avenir' | 'passe' | 'annule';
}

/** « 08/11/2026 » -> Date locale (minuit). */
export function dateDepuisJJMMAAAA(texte?: string): Date | null {
  if (!texte) return null;
  const [j, m, a] = texte.split(' ')[0].split('/').map((n) => parseInt(n, 10));
  if (!j || !m || !a) return null;
  return new Date(a, m - 1, j);
}

export function estPasse(dateVoyage?: string): boolean {
  const d = dateDepuisJJMMAAAA(dateVoyage);
  if (!d) return false;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return d < aujourdhui;
}

export function statutBillet(statut: number, dateVoyage?: string): StatutBillet {
  switch (statut) {
    case 1:
      return { libelle: 'En attente', tonalite: 'alerte', groupe: 'avenir' };
    case 2:
      return estPasse(dateVoyage)
        ? { libelle: 'Effectué', tonalite: 'neutre', groupe: 'passe' }
        : { libelle: 'Confirmé', tonalite: 'succes', groupe: 'avenir' };
    case 4:
      return { libelle: 'Annulé', tonalite: 'danger', groupe: 'annule' };
    case 5:
      return { libelle: 'Abandonné', tonalite: 'neutre', groupe: 'annule' };
    default:
      return { libelle: 'Inconnu', tonalite: 'neutre', groupe: 'passe' };
  }
}

const MOIS_COURTS = ['JANV.', 'FÉVR.', 'MARS', 'AVR.', 'MAI', 'JUIN', 'JUIL.', 'AOÛT', 'SEPT.', 'OCT.', 'NOV.', 'DÉC.'];

/** « 08/11/2026 » -> { jour: '08', mois: 'NOV.' } pour la vignette de date. */
export function vignetteDate(dateVoyage?: string) {
  const d = dateDepuisJJMMAAAA(dateVoyage);
  if (!d) return { jour: '--', mois: '' };
  return { jour: String(d.getDate()).padStart(2, '0'), mois: MOIS_COURTS[d.getMonth()] };
}
