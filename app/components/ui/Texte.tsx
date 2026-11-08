import React from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';
import { couleurs, polices, GraissePolice } from '../../theme/ocean';

/**
 * Texte du thème Océan (police Manrope).
 *
 * Variantes :
 * - titre      : titre d'écran (26)
 * - sousTitre  : titre de section ou de barre (17)
 * - corps      : texte courant (14)
 * - legende    : texte secondaire gris (12)
 * - etiquette  : petite étiquette en capitales (11)
 * - montant    : chiffres alignés (tabulaires)
 */
export type VarianteTexte = 'titre' | 'sousTitre' | 'corps' | 'legende' | 'etiquette' | 'montant';

const styles = StyleSheet.create({
  titre: { fontSize: 26, letterSpacing: -0.5, color: couleurs.encre },
  sousTitre: { fontSize: 17, color: couleurs.encre },
  corps: { fontSize: 14, color: couleurs.encre },
  legende: { fontSize: 12, color: couleurs.gris },
  etiquette: { fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: couleurs.gris },
  montant: { fontSize: 15, color: couleurs.encre, fontVariant: ['tabular-nums'] },
});

const graisseParDefaut: Record<VarianteTexte, GraissePolice> = {
  titre: 'tresGras',
  sousTitre: 'tresGras',
  corps: 'normal',
  legende: 'moyen',
  etiquette: 'gras',
  montant: 'tresGras',
};

export interface TexteProps extends TextProps {
  variante?: VarianteTexte;
  graisse?: GraissePolice;
  couleur?: string;
  taille?: number;
  centre?: boolean;
}

export function Texte({
  variante = 'corps',
  graisse,
  couleur,
  taille,
  centre,
  style,
  ...reste
}: TexteProps) {
  const extra: TextStyle = {
    fontFamily: polices[graisse ?? graisseParDefaut[variante]],
  };
  if (couleur) extra.color = couleur;
  if (taille) extra.fontSize = taille;
  if (centre) extra.textAlign = 'center';

  return <Text {...reste} style={[styles[variante], extra, style]} />;
}

export default Texte;
