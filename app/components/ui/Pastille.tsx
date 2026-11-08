import React from 'react';
import { View } from 'react-native';
import { Tonalite, tonalites } from '../../theme/ocean';
import { Texte } from './Texte';

export interface PastilleProps {
  libelle: string;
  tonalite?: Tonalite;
  /** Petit point de couleur devant le libellé (statuts). */
  point?: boolean;
}

/**
 * Pastille de statut. Les couleurs vives sont réservées au sens :
 * succes = payé/confirmé/actif, alerte = en attente, danger = en retard/annulé,
 * info = programmé, neutre = terminé/inactif.
 */
export function Pastille({ libelle, tonalite = 'info', point = true }: PastilleProps) {
  const t = tonalites[tonalite];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        height: 22,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: t.fond,
      }}
    >
      {point && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.texte }} />}
      <Texte graisse="gras" taille={11} couleur={t.texte} numberOfLines={1}>
        {libelle}
      </Texte>
    </View>
  );
}

export default Pastille;
