import React from 'react';
import { Pressable, View } from 'react-native';
import { couleurs } from '../../theme/ocean';
import { Texte } from './Texte';

export interface OptionSegment<T extends string> {
  valeur: T;
  libelle: string;
  /** Nombre affiché à côté du libellé (ex. « À traiter 2 »). */
  compteur?: number;
}

export interface SegmenteProps<T extends string> {
  options: OptionSegment<T>[];
  valeur: T;
  onChange: (valeur: T) => void;
  libelleAccessible: string;
}

/** Sélecteur à segments (onglets internes d'un écran : À venir / Passés / Annulés...). */
export function Segmente<T extends string>({ options, valeur, onChange, libelleAccessible }: SegmenteProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={libelleAccessible}
      style={{ flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: '#E7EEF6' }}
    >
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <Pressable
            key={o.valeur}
            onPress={() => onChange(o.valeur)}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            style={{
              flex: 1,
              minHeight: 38,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 4,
              backgroundColor: actif ? couleurs.surface : 'transparent',
              shadowColor: couleurs.ocean950,
              shadowOpacity: actif ? 0.12 : 0,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: actif ? 1 : 0,
            }}
          >
            <Texte graisse={actif ? 'tresGras' : 'gras'} taille={13} couleur={actif ? couleurs.ocean950 : couleurs.encreDouce} numberOfLines={1}>
              {o.libelle}
            </Texte>
            {o.compteur !== undefined && o.compteur > 0 && (
              <Texte graisse="tresGras" taille={13} couleur={couleurs.alerte}>
                {o.compteur}
              </Texte>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default Segmente;
