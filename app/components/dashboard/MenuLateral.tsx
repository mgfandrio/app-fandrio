import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texte } from '../ui';
import { couleurs } from '../../theme/ocean';

type NomIcone = keyof typeof Ionicons.glyphMap;

export interface ElementMenu {
  key: string;
  label: string;
  icon: NomIcone;
  activeIcon: NomIcone;
  /** Pastille de compteur à droite (ex. réservations en attente). */
  compteur?: number;
}

export interface SectionMenu {
  title: string;
  items: ElementMenu[];
}

interface MenuLateralProps {
  visible: boolean;
  onClose: () => void;
  sections: SectionMenu[];
  actif: string;
  onSelect: (key: string) => void;
  /** Bloc du haut (administrateur, compagnie). */
  entete: React.ReactNode;
  onDeconnexion: () => void;
}

const ICONE_INACTIVE = '#7F9BB8';

function LigneMenu({ item, actif, onPress }: { item: ElementMenu; actif: boolean; onPress: () => void }) {
  const [presse, setPresse] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPresse(true)}
      onPressOut={() => setPresse(false)}
      accessibilityRole="button"
      accessibilityState={{ selected: actif }}
      accessibilityLabel={item.compteur ? `${item.label}, ${item.compteur}` : item.label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        height: 44,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: actif ? 'rgba(46,143,224,0.16)' : presse ? 'rgba(255,255,255,0.06)' : 'transparent',
      }}
    >
      <Ionicons name={actif ? item.activeIcon : item.icon} size={20} color={actif ? couleurs.ocean300 : ICONE_INACTIVE} />
      <Texte graisse={actif ? 'tresGras' : 'moyen'} taille={15} couleur={actif ? '#FFFFFF' : '#D5E2F0'} style={{ flex: 1 }}>{item.label}</Texte>
      {!!item.compteur && item.compteur > 0 && (
        <View style={{ minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 999, backgroundColor: couleurs.ocean500, alignItems: 'center', justifyContent: 'center' }}>
          <Texte graisse="tresGras" taille={11} couleur="#FFFFFF">{item.compteur > 99 ? '99+' : item.compteur}</Texte>
        </View>
      )}
    </Pressable>
  );
}

/** Menu latéral marine des espaces d'administration (glisse depuis la gauche). */
export function MenuLateral({ visible, onClose, sections, actif, onSelect, entete, onDeconnexion }: MenuLateralProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const largeur = Math.min(width * 0.8, 312);
  const anim = useRef(new Animated.Value(0)).current;
  const [monte, setMonte] = useState(visible);

  useEffect(() => {
    if (visible) setMonte(true);
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMonte(false);
    });
  }, [visible, anim]);

  // Bouton retour Android : ferme le menu au lieu de quitter l'écran
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!monte) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(6,20,36,0.55)', opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityLabel="Fermer le menu" />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: largeur,
          backgroundColor: couleurs.ocean950,
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-largeur, 0] }) }],
        }}
      >
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 14, paddingBottom: 12, gap: 14 }} showsVerticalScrollIndicator={false}>
          {entete}
          {sections.map((section) => (
            <View key={section.title} style={{ gap: 2 }}>
              <Texte graisse="gras" taille={11} couleur={ICONE_INACTIVE} style={{ letterSpacing: 1.1, textTransform: 'uppercase', paddingHorizontal: 12, marginBottom: 4 }}>
                {section.title}
              </Texte>
              {section.items.map((item) => (
                <LigneMenu key={item.key} item={item} actif={actif === item.key} onPress={() => onSelect(item.key)} />
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={{ marginHorizontal: 14, paddingTop: 6, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
          <Pressable
            onPress={onDeconnexion}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 46, paddingHorizontal: 12 }}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFB4AE" />
            <Texte graisse="moyen" taille={15} couleur="#FFB4AE">Déconnexion</Texte>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default MenuLateral;
