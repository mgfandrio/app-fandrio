import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texte } from '../ui';
import { couleurs, ombres } from '../../theme/ocean';

type NomIcone = keyof typeof Ionicons.glyphMap;

export interface OngletAdmin {
  key: string;
  label: string;
  icon: NomIcone;
  activeIcon: NomIcone;
  /** Bouton central surélevé (scanner). */
  central?: boolean;
}

interface Props {
  onglets: OngletAdmin[];
  actif: string;
  onPress: (key: string) => void;
}

function Onglet({ onglet, actif, onPress }: { onglet: OngletAdmin; actif: boolean; onPress: () => void }) {
  const [presse, setPresse] = useState(false);

  if (onglet.central) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => setPresse(true)}
        onPressOut={() => setPresse(false)}
        accessibilityRole="button"
        accessibilityLabel={onglet.label}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingBottom: 8 }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            marginTop: -26,
            borderRadius: 18,
            borderWidth: 4,
            borderColor: couleurs.surface,
            backgroundColor: presse ? couleurs.ocean950 : couleurs.ocean800,
            alignItems: 'center',
            justifyContent: 'center',
            ...ombres.bouton,
          }}
        >
          <Ionicons name={onglet.icon} size={23} color="#FFFFFF" />
        </View>
        <Texte graisse="tresGras" taille={11} couleur={couleurs.ocean950}>{onglet.label}</Texte>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPresse(true)}
      onPressOut={() => setPresse(false)}
      accessibilityRole="tab"
      accessibilityState={{ selected: actif }}
      accessibilityLabel={onglet.label}
      style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 6, paddingBottom: 8, minHeight: 52, opacity: presse ? 0.7 : 1 }}
    >
      <View style={{ width: 52, height: 30, borderRadius: 999, backgroundColor: actif ? couleurs.ocean50 : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={actif ? onglet.activeIcon : onglet.icon} size={22} color={actif ? couleurs.ocean800 : couleurs.grisClair} />
      </View>
      <Texte graisse={actif ? 'tresGras' : 'moyen'} taille={11} couleur={actif ? couleurs.ocean800 : couleurs.grisClair}>{onglet.label}</Texte>
    </Pressable>
  );
}

/** Barre d'onglets du bas des espaces d'administration, avec un bouton central (scanner). */
export function BarreOngletsAdmin({ onglets, actif, onPress }: Props) {
  const insets = useSafeAreaInsets();
  const [clavier, setClavier] = useState(false);

  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setClavier(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setClavier(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  if (clavier) return null;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: couleurs.surface,
        borderTopWidth: 1,
        borderTopColor: couleurs.ligne,
        paddingHorizontal: 6,
        paddingTop: 4,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {onglets.map((o) => (
        <Onglet key={o.key} onglet={o} actif={actif === o.key} onPress={() => onPress(o.key)} />
      ))}
    </View>
  );
}

export default BarreOngletsAdmin;
