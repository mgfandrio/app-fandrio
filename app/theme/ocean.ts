/**
 * Thème Océan — source unique des couleurs, polices, rayons et ombres.
 *
 * - Dans les classes NativeWind : les mêmes couleurs sont déclarées dans
 *   tailwind.config.js (bg-ocean-800, text-encre, border-ligne...).
 * - Dans les `style={{ }}` et les props de couleur (icônes, ActivityIndicator...) :
 *   importer `couleurs` d'ici, jamais de code hexadécimal en dur.
 *
 * Changer une couleur ici ET dans tailwind.config.js suffit pour toute l'app.
 */

export const couleurs = {
  // Bleus Océan
  ocean950: '#062A4A', // en-têtes, blocs forts, texte sur fond clair accentué
  ocean800: '#0B4F8A', // couleur principale : boutons, liens, onglet actif
  ocean500: '#2E8FE0', // accent : pastilles, éléments vivants
  ocean300: '#5FB0F2', // accent sur fond marine
  ocean200: '#B9D1EA', // contours (sièges libres)
  ocean100: '#D2E3F3', // bordures de boutons secondaires
  ocean50: '#EBF2F9', // fonds doux : badges, icônes, onglet actif

  // Neutres (teintés de bleu)
  fond: '#F4F7FB', // fond des écrans
  surface: '#FFFFFF', // cartes
  encre: '#0F1B2D', // texte principal
  encreDouce: '#33445C', // texte secondaire fort
  gris: '#5A6B82', // texte secondaire (contraste AA sur blanc et sur fond)
  grisClair: '#7A8AA0', // icônes inactives
  ligne: '#E3EAF2', // bordures de cartes
  separateur: '#EEF2F7', // séparateurs internes
  champ: '#D9E3EE', // bordure des champs
  texteSurMarine: '#A9C3DE', // texte secondaire sur fond ocean950

  // Statuts (toujours en paire fond / texte)
  succesFond: '#E6F4EC',
  succes: '#0F6B40',
  succesVif: '#16A05D',
  alerteFond: '#FDF1E1',
  alerte: '#8F4F05',
  alerteVif: '#E4A13A',
  dangerFond: '#FDECEA',
  danger: '#A8201A',
  dangerBord: '#F3C7C3',
  neutreFond: '#EEF1F5',
  neutre: '#4A5A70',
} as const;

export type CouleurOcean = keyof typeof couleurs;

/** Familles de la police Manrope (chargées dans app/_layout.tsx). */
export const polices = {
  normal: 'Manrope_500Medium',
  moyen: 'Manrope_600SemiBold',
  gras: 'Manrope_700Bold',
  tresGras: 'Manrope_800ExtraBold',
} as const;

export type GraissePolice = keyof typeof polices;

export const rayons = {
  petit: 10,
  champ: 14,
  carte: 16,
  bloc: 20,
  pilule: 999,
} as const;

/** Ombre discrète des éléments flottants (bouton d'action, carte en relief). */
export const ombres = {
  carte: {
    shadowColor: couleurs.ocean950,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  bouton: {
    shadowColor: couleurs.ocean800,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;

/** Tonalités de statut utilisées par <Pastille>. */
export const tonalites = {
  succes: { fond: couleurs.succesFond, texte: couleurs.succes },
  alerte: { fond: couleurs.alerteFond, texte: couleurs.alerte },
  danger: { fond: couleurs.dangerFond, texte: couleurs.danger },
  info: { fond: couleurs.ocean50, texte: couleurs.ocean800 },
  neutre: { fond: couleurs.neutreFond, texte: couleurs.neutre },
  marine: { fond: couleurs.ocean950, texte: '#FFFFFF' },
} as const;

export type Tonalite = keyof typeof tonalites;

/** Formate un montant en Ariary : 35000 -> "35 000". */
export function formatAriary(montant: number): string {
  return Math.round(montant)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
