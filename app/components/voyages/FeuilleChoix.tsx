import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeuilleModale, Texte } from '../ui';
import { couleurs, polices } from '../../theme/ocean';

export interface OptionChoix {
  id: string;
  titre: string;
  detail?: string;
  /** Petite étiquette à droite (catégorie VIP, Premium...). */
  etiquette?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  titre: string;
  options: OptionChoix[];
  valeur?: string;
  onChoisir: (id: string) => void;
  /** Message quand la liste est vide. */
  vide?: string;
  recherche?: string;
}

/** Feuille de sélection avec recherche (trajet, véhicule, chauffeur...). */
export function FeuilleChoix({ visible, onClose, titre, options, valeur, onChoisir, vide = 'Aucun élément.', recherche = 'Rechercher' }: Props) {
  const [q, setQ] = useState('');
  useEffect(() => {
    if (visible) setQ('');
  }, [visible]);

  const filtre = q.trim().toLowerCase();
  const liste = filtre ? options.filter((o) => `${o.titre} ${o.detail || ''}`.toLowerCase().includes(filtre)) : options;

  return (
    <FeuilleModale visible={visible} onClose={onClose} titre={titre} hauteur="pleine">
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: couleurs.champ, backgroundColor: couleurs.surface }}>
          <Ionicons name="search" size={18} color={couleurs.gris} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={recherche}
            placeholderTextColor="#8A99AD"
            accessibilityLabel={recherche}
            style={{ flex: 1, fontFamily: polices.moyen, fontSize: 14.5, color: couleurs.encre, paddingVertical: 8 }}
          />
        </View>
      </View>
      <FlatList
        data={liste}
        keyExtractor={(o) => o.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        ListEmptyComponent={<Texte variante="legende" centre style={{ paddingVertical: 30 }}>{vide}</Texte>}
        renderItem={({ item, index }) => {
          const actif = item.id === valeur;
          return (
            <Pressable
              onPress={() => {
                onChoisir(item.id);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Texte graisse="tresGras" taille={14.5} numberOfLines={1}>{item.titre}</Texte>
                {!!item.detail && <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>{item.detail}</Texte>}
              </View>
              {!!item.etiquette && (
                <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: couleurs.ocean50, justifyContent: 'center' }}>
                  <Texte graisse="tresGras" taille={10.5} couleur={couleurs.ocean800}>{item.etiquette}</Texte>
                </View>
              )}
              {actif && <Ionicons name="checkmark-circle" size={22} color={couleurs.ocean800} />}
            </Pressable>
          );
        }}
      />
    </FeuilleModale>
  );
}

/** Bouton de champ « sélection » : icône, valeur, détail, chevron. */
export function ChampChoix({
  libelle,
  icone,
  titre,
  detail,
  placeholder,
  onPress,
  desactive,
}: {
  libelle: string;
  icone: keyof typeof Ionicons.glyphMap;
  titre?: string;
  detail?: string;
  placeholder: string;
  onPress: () => void;
  desactive?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>{libelle}</Texte>
      <Pressable
        onPress={onPress}
        disabled={desactive}
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : ${titre || placeholder}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: 56,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: couleurs.champ,
          backgroundColor: couleurs.surface,
          opacity: desactive ? 0.55 : 1,
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icone} size={18} color={couleurs.ocean800} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texte graisse={titre ? 'tresGras' : 'moyen'} taille={14.5} couleur={titre ? couleurs.encre : '#8A99AD'} numberOfLines={1}>{titre || placeholder}</Texte>
          {!!detail && <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>{detail}</Texte>}
        </View>
        <Ionicons name="chevron-down" size={18} color={couleurs.grisClair} />
      </Pressable>
    </View>
  );
}
