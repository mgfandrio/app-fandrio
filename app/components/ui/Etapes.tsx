import React from 'react';
import { View } from 'react-native';
import { couleurs } from '../../theme/ocean';
import { Texte } from './Texte';

export interface EtapesProps {
  /** Libellés des étapes, dans l'ordre. */
  etapes: string[];
  /** Index de l'étape en cours (0 = première). */
  courante: number;
}

/** Barre de progression d'un parcours en plusieurs étapes (inscription, réservation). */
export function Etapes({ etapes, courante }: EtapesProps) {
  return (
    <View
      accessible
      accessibilityLabel={`Étape ${courante + 1} sur ${etapes.length} : ${etapes[courante]}`}
      style={{ flexDirection: 'row', gap: 6 }}
    >
      {etapes.map((libelle, i) => {
        const atteinte = i <= courante;
        return (
          <View key={libelle} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: atteinte ? couleurs.ocean800 : couleurs.ligne }} />
            <Texte
              graisse={i === courante ? 'tresGras' : 'gras'}
              taille={11.5}
              couleur={atteinte ? couleurs.ocean800 : couleurs.grisClair}
              numberOfLines={1}
            >
              {libelle}
            </Texte>
          </View>
        );
      })}
    </View>
  );
}

export default Etapes;
