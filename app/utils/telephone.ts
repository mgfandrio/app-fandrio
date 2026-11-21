/** Numéro malgache local : 10 chiffres commençant par 03 (ex. 034 12 345 67). */
export const LONGUEUR_TELEPHONE = 10;

export const MESSAGE_TELEPHONE = 'Le numéro doit contenir 10 chiffres et commencer par 03.';

/** Garde uniquement les chiffres, 10 au maximum (à brancher sur onChangeText). */
export const saisirTelephone = (texte: string): string =>
  texte.replace(/\D/g, '').slice(0, LONGUEUR_TELEPHONE);

export const telephoneValide = (texte: string | null | undefined): boolean =>
  /^03\d{8}$/.test((texte ?? '').replace(/\D/g, ''));
