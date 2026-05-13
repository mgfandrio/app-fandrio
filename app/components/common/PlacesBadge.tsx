import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type PlacesBadgeSize = 'sm' | 'md';

interface PlacesBadgeProps {
  /** Nombre de places encore disponibles (déjà décrémenté des réservations). */
  places?: number | null;
  /** Drapeau renvoyé par l'API. Si fourni, prime sur `places <= 0`. */
  estComplet?: boolean;
  size?: PlacesBadgeSize;
}

/**
 * Badge explicite pour afficher la disponibilité des places sur un voyage.
 * - Icône de siège (MaterialCommunityIcons `car-seat`) plus parlante qu'une silhouette.
 * - Libellé textuel "X places" / "Dernière place" / "Complet" pour lever toute ambiguïté.
 * - Couleur sémantique : vert (dispo), orange (≤ 3), rouge (complet).
 */
export function PlacesBadge({ places, estComplet, size = 'sm' }: PlacesBadgeProps) {
  const nb = typeof places === 'number' && places >= 0 ? places : null;
  const complet = estComplet ?? (nb !== null && nb <= 0);
  const faible = !complet && nb !== null && nb <= 3;

  const palette = complet
    ? { bg: 'bg-red-50', fg: '#dc2626', text: 'text-red-700' }
    : faible
    ? { bg: 'bg-amber-50', fg: '#d97706', text: 'text-amber-700' }
    : { bg: 'bg-emerald-50', fg: '#059669', text: 'text-emerald-700' };

  const dims = size === 'md'
    ? { pad: 'px-3 py-1.5', icon: 16, text: 'text-sm' }
    : { pad: 'px-2.5 py-1.5', icon: 14, text: 'text-xs' };

  let label: string;
  if (complet) {
    label = 'Complet';
  } else if (nb === null) {
    label = 'Places —';
  } else if (nb === 1) {
    label = '1 place disponible';
  } else {
    label = `${nb} places disponibles`;
  }

  return (
    <View className={`${palette.bg} rounded-lg ${dims.pad} flex-row items-center`}>
      <MaterialCommunityIcons name="car-seat" size={dims.icon} color={palette.fg} />
      <Text className={`${palette.text} ${dims.text} font-bold ml-1.5`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default PlacesBadge;
