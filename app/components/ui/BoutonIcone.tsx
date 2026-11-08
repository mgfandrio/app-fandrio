import React, { useState } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs } from '../../theme/ocean';
import { Texte } from './Texte';

/**
 * Bouton carré 44×44 (taille tactile minimale) avec une icône.
 * - clair  : sur fond blanc (bordure fine)
 * - marine : sur un en-tête marine (fond translucide)
 * - plein  : action principale compacte (fond ocean800)
 */
export interface BoutonIconeProps {
  icone: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** Obligatoire : le lecteur d'écran n'a que ce texte. */
  libelle: string;
  variante?: 'clair' | 'marine' | 'plein';
  /** Compteur affiché en haut à droite (notifications). */
  compteur?: number;
  style?: StyleProp<ViewStyle>;
}

export function BoutonIcone({ icone, onPress, libelle, variante = 'clair', compteur, style }: BoutonIconeProps) {
  const fond = variante === 'marine' ? 'rgba(255,255,255,0.08)' : variante === 'plein' ? couleurs.ocean800 : couleurs.surface;
  const couleurIcone = variante === 'clair' ? couleurs.ocean950 : '#FFFFFF';

  // Appui suivi à la main : NativeWind ignore `style` en fonction sur Pressable
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={compteur ? `${libelle}, ${compteur} non lus` : libelle}
      hitSlop={4}
      style={[
        {
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: fond,
          borderWidth: variante === 'clair' ? 1 : 0,
          borderColor: couleurs.ligne,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icone} size={22} color={couleurIcone} />
      {!!compteur && compteur > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: couleurs.ocean800,
            borderWidth: 2,
            borderColor: variante === 'marine' ? couleurs.ocean950 : couleurs.fond,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Texte graisse="tresGras" taille={10} couleur="#FFFFFF">
            {compteur > 99 ? '99+' : compteur}
          </Texte>
        </View>
      )}
    </Pressable>
  );
}

export default BoutonIcone;
