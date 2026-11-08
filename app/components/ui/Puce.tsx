import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs } from '../../theme/ocean';
import { Texte } from './Texte';

export interface PuceProps {
  libelle: string;
  /** Petite ligne sous le libellé (ex. date « 10 nov. » sous « Mar. »). */
  detail?: string;
  active: boolean;
  onPress: () => void;
  icone?: keyof typeof Ionicons.glyphMap;
}

/** Puce sélectionnable (filtres : date, type de voyage, province...). */
export function Puce({ libelle, detail, active, onPress, icone }: PuceProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={detail ? `${libelle} ${detail}` : libelle}
      style={{
        minHeight: detail ? 52 : 40,
        paddingHorizontal: 14,
        borderRadius: detail ? 14 : 999,
        borderWidth: 1.5,
        borderColor: active ? couleurs.ocean800 : couleurs.ocean100,
        backgroundColor: active ? couleurs.ocean800 : couleurs.surface,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: detail ? 'column' : 'row',
        gap: detail ? 0 : 6,
      }}
    >
      {icone && <Ionicons name={icone} size={16} color={active ? '#FFFFFF' : couleurs.ocean800} />}
      <Texte graisse={active ? 'tresGras' : 'gras'} taille={13} couleur={active ? '#FFFFFF' : couleurs.encreDouce}>
        {libelle}
      </Texte>
      {!!detail && (
        <Texte graisse="moyen" taille={11.5} couleur={active ? couleurs.ocean100 : couleurs.gris}>
          {detail}
        </Texte>
      )}
    </Pressable>
  );
}

export default Puce;
