import React, { useState } from 'react';
import { Pressable, StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { couleurs, ombres, rayons } from '../../theme/ocean';

export interface CarteProps extends ViewProps {
  /** Espacement intérieur (14 par défaut, 0 pour une liste à lignes séparées). */
  padding?: number;
  /** Ombre portée : réservée aux cartes qui chevauchent un en-tête. */
  enRelief?: boolean;
  /** Variante marine : bloc de chiffre clé (fond ocean950, texte blanc). */
  marine?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Carte blanche à bordure fine, ou bloc marine pour le chiffre clé d'un écran. */
export function Carte({ padding = 14, enRelief, marine, onPress, style, children, ...reste }: CarteProps) {
  const base: ViewStyle = {
    backgroundColor: marine ? couleurs.ocean950 : couleurs.surface,
    borderRadius: marine ? rayons.bloc : rayons.carte,
    borderWidth: marine ? 0 : 1,
    borderColor: couleurs.ligne,
    padding,
    overflow: 'hidden',
    ...(enRelief ? ombres.carte : null),
  };

  if (onPress) {
    return (
      <CarteCliquable base={base} onPress={onPress} style={style} {...reste}>
        {children}
      </CarteCliquable>
    );
  }

  return (
    <View style={[base, style]} {...reste}>
      {children}
    </View>
  );
}

// Appui suivi à la main : NativeWind ignore `style={({ pressed }) => ...}` sur Pressable
function CarteCliquable({ base, onPress, style, children, ...reste }: ViewProps & { base: ViewStyle; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      style={[base, { opacity: pressed ? 0.9 : 1 }, style]}
      {...reste}
    >
      {children}
    </Pressable>
  );
}

/** Séparateur horizontal entre deux lignes d'une carte. */
export function Separateur({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: couleurs.separateur }, style]} />;
}

export default Carte;
