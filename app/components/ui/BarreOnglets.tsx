import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs, ombres, polices } from '../../theme/ocean';

/**
 * Barre d'onglets flottante : capsule blanche détachée des bords.
 * L'onglet actif s'élargit en pilule bleu Océan arrondie (icône + libellé),
 * les autres n'affichent que leur icône. Le passage d'un onglet à l'autre
 * est animé (élargissement, couleur, libellé qui apparaît, petit rebond de l'icône).
 *
 * La barre réserve sa place sous les écrans (elle n'est pas posée par-dessus) :
 * aucun contenu n'est masqué, sans réglage dans chaque écran.
 *
 * Animations avec l'API Animated de React Native (et non Reanimated, dont la
 * version installée ne correspond pas à celle d'Expo Go SDK 54).
 *
 * Utilisation : <Tabs tabBar={(props) => <BarreOnglets {...props} />}>
 * Les icônes viennent de `tabBarIcon` et les libellés de `title` de chaque onglet.
 */
export function BarreOnglets({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [clavierOuvert, setClavierOuvert] = useState(false);

  // Masquer la barre quand le clavier est ouvert (sinon elle remonte au-dessus)
  useEffect(() => {
    const ouvert = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setClavierOuvert(true));
    const ferme = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setClavierOuvert(false));
    return () => {
      ouvert.remove();
      ferme.remove();
    };
  }, []);

  if (clavierOuvert) return null;

  return (
    <View style={{ backgroundColor: couleurs.fond, paddingHorizontal: 16, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8) + 8 }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 64,
          paddingHorizontal: 8,
          borderRadius: 32,
          backgroundColor: couleurs.surface,
          borderWidth: 1,
          borderColor: couleurs.ligne,
          ...ombres.carte,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const actif = state.index === index;
          const libelle = typeof options.title === 'string' ? options.title : route.name;

          const auToucher = () => {
            const evenement = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!actif && !evenement.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Onglet
              key={route.key}
              actif={actif}
              libelle={libelle}
              onPress={auToucher}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              icone={(couleur) => options.tabBarIcon?.({ focused: actif, color: couleur, size: 22 })}
            />
          );
        })}
      </View>
    </View>
  );
}

interface OngletProps {
  actif: boolean;
  libelle: string;
  onPress: () => void;
  onLongPress: () => void;
  icone: (couleur: string) => React.ReactNode;
}

const DUREE = 260;

/** Un onglet : s'élargit en pilule arrondie quand il devient actif. */
function Onglet({ actif, libelle, onPress, onLongPress, icone }: OngletProps) {
  // 0 = inactif, 1 = actif
  const progression = useRef(new Animated.Value(actif ? 1 : 0)).current;
  const echelleIcone = useRef(new Animated.Value(1)).current;
  const premierRendu = useRef(true);

  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    Animated.timing(progression, {
      toValue: actif ? 1 : 0,
      duration: DUREE,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // largeur et couleur ne passent pas par le pilote natif
    }).start();

    if (actif) {
      // Petit rebond de l'icône à l'activation
      echelleIcone.setValue(0.8);
      Animated.spring(echelleIcone, { toValue: 1, friction: 4, tension: 160, useNativeDriver: false }).start();
    }
  }, [actif, progression, echelleIcone]);

  const flexGrow = progression.interpolate({ inputRange: [0, 1], outputRange: [1, 2.3] });
  const fond = progression.interpolate({ inputRange: [0, 1], outputRange: ['rgba(11,79,138,0)', couleurs.ocean800] });
  const marge = progression.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const largeurLibelle = progression.interpolate({ inputRange: [0, 1], outputRange: [0, 96] });
  const opaciteLibelle = progression.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });

  return (
    <Animated.View style={{ flexGrow, flexBasis: 0, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: actif }}
        accessibilityLabel={libelle}
        hitSlop={4}
        style={{ alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', height: 48 }}
      >
        <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 44,
            minWidth: 44,
            paddingHorizontal: marge,
            borderRadius: 999, // pilule entièrement arrondie
            backgroundColor: fond,
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Animated.View style={{ transform: [{ scale: echelleIcone }] }}>
            {icone(actif ? '#FFFFFF' : couleurs.grisClair)}
          </Animated.View>
          <Animated.Text
            numberOfLines={1}
            style={{
              maxWidth: largeurLibelle,
              opacity: opaciteLibelle,
              marginLeft: progression.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }),
              fontFamily: polices.tresGras,
              fontSize: 13,
              color: '#FFFFFF',
            }}
          >
            {libelle}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default BarreOnglets;
