import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs } from '../../theme/ocean';
import { Texte } from './Texte';

export interface CaseACocherProps {
  coche: boolean;
  onChange: (coche: boolean) => void;
  libelle: React.ReactNode;
  desactive?: boolean;
}

/** Case à cocher avec libellé cliquable (zone tactile ≥ 44 px de haut). */
export function CaseACocher({ coche, onChange, libelle, desactive }: CaseACocherProps) {
  return (
    <Pressable
      onPress={() => onChange(!coche)}
      disabled={desactive}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: coche, disabled: desactive }}
      hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, flexShrink: 1 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: coche ? couleurs.ocean800 : '#B6C2D2',
          backgroundColor: coche ? couleurs.ocean800 : couleurs.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {coche && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
      </View>
      {typeof libelle === 'string' ? (
        <Texte graisse="moyen" taille={13.5} couleur={couleurs.encreDouce} style={{ flexShrink: 1 }}>
          {libelle}
        </Texte>
      ) : (
        libelle
      )}
    </Pressable>
  );
}

export default CaseACocher;
