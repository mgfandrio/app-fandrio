import AsyncStorage from '@react-native-async-storage/async-storage';
import { reservationService } from './reservationService';
import { dateDepuisJJMMAAAA } from '../../utils/statutBillet';

/**
 * Copie locale des billets confirmés à venir (avec leur QR code), pour pouvoir
 * présenter un billet à l'embarquement sans réseau.
 *
 * - Alimentée à chaque ouverture d'un billet et à chaque chargement de l'onglet
 *   Billets (jusqu'à MAX billets).
 * - Les billets passés, annulés ou remboursés en sont retirés.
 * - Effacée à la déconnexion (le téléphone peut changer de main).
 */
const CLE = 'fandrio:billets-hors-ligne:v1';
const MAX = 10;

type Copie = { facture: any; enregistreLe: number };
type Stock = Record<string, Copie>;

async function lireStock(): Promise<Stock> {
  try {
    return JSON.parse((await AsyncStorage.getItem(CLE)) || '{}');
  } catch {
    return {};
  }
}

async function ecrireStock(stock: Stock) {
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(stock));
  } catch {}
}

function estAVenir(facture: any) {
  const d = dateDepuisJJMMAAAA(facture?.voyage?.date);
  if (!d) return false;
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  return d >= auj;
}

/** Garde (ou retire) la facture selon qu'il s'agit d'un billet confirmé à venir. */
export async function memoriserBillet(facture: any) {
  const id = facture?.reservation?.id;
  if (!id) return;
  const stock = await lireStock();
  if (Number(facture.reservation.statut) === 2 && estAVenir(facture) && facture.reservation.qr_data) {
    stock[String(id)] = { facture, enregistreLe: Date.now() };
  } else {
    delete stock[String(id)];
  }
  await ecrireStock(stock);
}

export async function oublierBillet(id: number | string) {
  const stock = await lireStock();
  delete stock[String(id)];
  await ecrireStock(stock);
}

/** Billets à venir gardés sur le téléphone (les passés sont purgés au passage). */
export async function billetsMemorises(): Promise<{ facture: any; enregistreLe: number }[]> {
  const stock = await lireStock();
  let change = false;
  for (const [id, copie] of Object.entries(stock)) {
    if (!estAVenir(copie.facture)) {
      delete stock[id];
      change = true;
    }
  }
  if (change) await ecrireStock(stock);
  return Object.values(stock).sort((a, b) => (dateDepuisJJMMAAAA(a.facture.voyage?.date)?.getTime() || 0) - (dateDepuisJJMMAAAA(b.facture.voyage?.date)?.getTime() || 0));
}

export async function billetMemorise(id: number | string) {
  return (await lireStock())[String(id)] || null;
}

/**
 * Après un chargement réussi de l'historique : télécharge les billets confirmés
 * à venir qui ne sont pas encore copiés, et retire ceux qui ne le sont plus.
 */
export async function synchroniserBillets(historique: any[]) {
  const aVenir = historique.filter((r) => Number(r?.statut) === 2 && estAVenir({ voyage: { date: r?.date } })).slice(0, MAX);
  const ids = new Set(aVenir.map((r) => String(r.id)));
  const stock = await lireStock();
  for (const id of Object.keys(stock)) if (!ids.has(id)) delete stock[id];
  await ecrireStock(stock);
  for (const r of aVenir) {
    if (stock[String(r.id)]) continue;
    try {
      const rep = await reservationService.obtenirFacture(r.id);
      if (rep?.statut && rep.data) await memoriserBillet(rep.data);
    } catch {
      return; // plus de réseau : on réessaiera au prochain chargement
    }
  }
}

/** Ligne d'historique (format de l'onglet Billets) reconstituée depuis une copie. */
export function ligneDepuisCopie(facture: any) {
  return {
    id: facture.reservation.id,
    numero: facture.reservation.numero,
    trajet: `${facture.voyage?.depart || ''} → ${facture.voyage?.arrivee || ''}`,
    date: facture.voyage?.date,
    heure: facture.voyage?.heure,
    date_reservation: facture.reservation.date_reservation,
    montant: facture.reservation.montant,
    statut: facture.reservation.statut,
    nb_voyageurs: facture.reservation.nb_voyageurs,
  };
}

export async function effacerBilletsHorsLigne() {
  try {
    await AsyncStorage.removeItem(CLE);
  } catch {}
}
