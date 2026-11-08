import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs } from '../../theme/ocean';
import { Texte } from './Texte';

/**
 * Bouton du thème Océan.
 * - principal  : action principale de l'écran (une seule par écran)
 * - secondaire : action alternative (contour)
 * - danger     : action destructive secondaire (contour rouge : déconnexion, refus)
 * - dangerPlein: confirmation d'une action destructive (fond rouge : « Supprimer »)
 * - succes     : validation positive (confirmer l'embarquement)
 * - lien       : action discrète sans fond
 */
export type VarianteBouton = 'principal' | 'secondaire' | 'danger' | 'dangerPlein' | 'succes' | 'lien';

const apparences: Record<VarianteBouton, { fond: string; texte: string; bord?: string }> = {
  principal: { fond: couleurs.ocean800, texte: '#FFFFFF' },
  secondaire: { fond: couleurs.surface, texte: couleurs.ocean950, bord: couleurs.ocean100 },
  danger: { fond: couleurs.surface, texte: couleurs.danger, bord: couleurs.dangerBord },
  dangerPlein: { fond: couleurs.danger, texte: '#FFFFFF' },
  succes: { fond: couleurs.succesVif, texte: '#FFFFFF' },
  lien: { fond: 'transparent', texte: couleurs.ocean800 },
};

export interface BoutonProps {
  titre: string;
  onPress?: () => void;
  variante?: VarianteBouton;
  icone?: keyof typeof Ionicons.glyphMap;
  chargement?: boolean;
  desactive?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Bouton({
  titre,
  onPress,
  variante = 'principal',
  icone,
  chargement = false,
  desactive = false,
  compact = false,
  style,
  accessibilityLabel,
}: BoutonProps) {
  const a = apparences[variante];
  const inactif = desactive || chargement;
  // Pas de `style={({ pressed }) => ...}` : NativeWind ignore les styles en
  // fonction sur Pressable (le bouton perdait son fond). On suit l'appui à la main.
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={inactif}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titre}
      accessibilityState={{ disabled: inactif, busy: chargement }}
      style={[
        {
          minHeight: compact ? 46 : 54,
          paddingHorizontal: 18,
          borderRadius: compact ? 13 : 15,
          backgroundColor: a.fond,
          borderWidth: a.bord ? 1.5 : 0,
          borderColor: a.bord,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: desactive ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={a.texte} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icone && <Ionicons name={icone} size={19} color={a.texte} />}
          <Texte graisse="tresGras" taille={compact ? 14 : 15.5} couleur={a.texte}>
            {titre}
          </Texte>
        </View>
      )}
    </Pressable>
  );
}

export default Bouton;
