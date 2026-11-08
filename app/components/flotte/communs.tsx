import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../common/Skeleton';
import { BoutonIcone, ModalPleinEcran, Texte } from '../ui';
import { couleurs, ombres, polices } from '../../theme/ocean';

export const CATEGORIES = [
  { valeur: 'classique', libelle: 'Classique' },
  { valeur: 'vip', libelle: 'VIP' },
  { valeur: 'premium', libelle: 'Premium' },
] as const;

export function libelleCategorie(c?: string) {
  return CATEGORIES.find((x) => x.valeur === (c || 'classique'))?.libelle || 'Classique';
}

/** Identifiant de la compagnie de l'administrateur connecté. */
export async function compagnieIdCourante(): Promise<number | null> {
  try {
    const u = JSON.parse((await SecureStore.getItemAsync('fandrioUser')) || '{}');
    return Number(u.compagnie_id || u.comp_id || u.compagnie?.id) || null;
  } catch {
    return null;
  }
}

export function initiales(a?: string, b?: string) {
  return `${(a?.[0] || '').toUpperCase()}${(b?.[0] || '').toUpperCase()}` || '?';
}

type ProprietesEcran = {
  visible: boolean;
  titre: string;
  onClose: () => void;
  chargement?: boolean;
  pied: React.ReactNode;
  /** <DialogComponent /> de l'écran, rendu dans la fenêtre pour rester visible. */
  dialogue?: React.ReactNode;
  children: React.ReactNode;
};

/** Écran plein de formulaire : en-tête « fermer + titre », contenu défilant, pied fixe. */
export function EcranFormulaire(props: ProprietesEcran) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <CorpsFormulaire {...props} />
    </ModalPleinEcran>
  );
}

/** Contenu de l'écran de formulaire (dans la fenêtre, pour lire ses propres marges). */
function CorpsFormulaire({
  visible,
  titre,
  onClose,
  chargement,
  pied,
  dialogue,
  children,
}: {
  visible: boolean;
  titre: string;
  onClose: () => void;
  chargement?: boolean;
  pied: React.ReactNode;
  /** <DialogComponent /> de l'écran, rendu dans la fenêtre pour rester visible. */
  dialogue?: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
      {dialogue}
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <View style={{ backgroundColor: couleurs.surface, borderBottomWidth: 1, borderBottomColor: couleurs.ligne, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BoutonIcone icone="close" libelle="Fermer" onPress={onClose} />
          <Texte graisse="tresGras" taille={17} style={{ flex: 1 }} numberOfLines={1}>{titre}</Texte>
        </View>
        {chargement ? (
          <View style={{ padding: 16, gap: 14 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={52} borderRadius={14} />)}
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8, gap: 8 }}>
              {pied}
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </>
  );
}

/** Libellé de champ. */
export function Libelle({ children }: { children: React.ReactNode }) {
  return <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>{children}</Texte>;
}

/** Boutons de choix côte à côte (catégorie, permis...). */
export function Choix<T extends string>({
  options,
  valeur,
  onChange,
  plein,
  libelle,
}: {
  options: { valeur: T; libelle: string; desactive?: boolean }[];
  valeur: T;
  onChange: (v: T) => void;
  /** true : choix actif en bleu plein ; false : contour bleu. */
  plein?: boolean;
  libelle: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={libelle} style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <Pressable
            key={o.valeur}
            onPress={() => onChange(o.valeur)}
            disabled={o.desactive}
            accessibilityRole="radio"
            accessibilityState={{ checked: actif, disabled: o.desactive }}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: actif ? couleurs.ocean800 : couleurs.champ,
              backgroundColor: actif ? (plein ? couleurs.ocean800 : '#F3F8FD') : couleurs.surface,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: o.desactive ? 0.45 : 1,
            }}
          >
            <Texte graisse={actif ? 'tresGras' : 'gras'} taille={14} couleur={actif ? (plein ? '#FFFFFF' : couleurs.ocean950) : couleurs.encreDouce}>
              {o.libelle}
            </Texte>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compteur − valeur + (nombre de places). */
export function Pas({ valeur, onChange, min = 1, max = 70, libelle }: { valeur: number; onChange: (n: number) => void; min?: number; max?: number; libelle: string }) {
  const bouton = (signe: '-' | '+') => {
    const desactive = signe === '-' ? valeur <= min : valeur >= max;
    return (
      <Pressable
        onPress={() => onChange(Math.min(max, Math.max(min, valeur + (signe === '-' ? -1 : 1))))}
        disabled={desactive}
        accessibilityRole="button"
        accessibilityLabel={signe === '-' ? `Retirer une ${libelle}` : `Ajouter une ${libelle}`}
        style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: couleurs.ocean100, backgroundColor: couleurs.surface, alignItems: 'center', justifyContent: 'center', opacity: desactive ? 0.4 : 1 }}
      >
        <Ionicons name={signe === '-' ? 'remove' : 'add'} size={22} color={couleurs.ocean800} />
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {bouton('-')}
      <Texte variante="montant" taille={22} centre style={{ flex: 1 }}>{valeur}</Texte>
      {bouton('+')}
    </View>
  );
}

/** Ligne avec interrupteur (« Chauffeur actif »). */
export function LigneInterrupteur({ titre, detail, valeur, onChange }: { titre: string; detail?: string; valeur: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!valeur)}
      accessibilityRole="switch"
      accessibilityState={{ checked: valeur }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.ligne }}
    >
      <View style={{ flex: 1 }}>
        <Texte graisse="tresGras" taille={14.5}>{titre}</Texte>
        {!!detail && <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{detail}</Texte>}
      </View>
      <Switch value={valeur} onValueChange={onChange} trackColor={{ true: couleurs.ocean800, false: couleurs.champ }} thumbColor="#FFFFFF" />
    </Pressable>
  );
}

/** Bouton flottant d'ajout, en bas à droite. */
export function BoutonAjout({ libelle, onPress }: { libelle: string; onPress: () => void }) {
  const [presse, setPresse] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPresse(true)}
      onPressOut={() => setPresse(false)}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      style={{
        position: 'absolute',
        right: 18,
        bottom: 16,
        height: 54,
        paddingHorizontal: 20,
        borderRadius: 18,
        backgroundColor: presse ? couleurs.ocean950 : couleurs.ocean800,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...ombres.bouton,
      }}
    >
      <Ionicons name="add" size={22} color="#FFFFFF" />
      <Texte graisse="tresGras" taille={15} couleur="#FFFFFF">{libelle}</Texte>
    </Pressable>
  );
}

/** Champ de recherche des listes. */
export function Recherche({ valeur, onChange, placeholder }: { valeur: string; onChange: (t: string) => void; placeholder: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 14, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.ligne, borderRadius: 14 }}>
      <Ionicons name="search" size={19} color={couleurs.gris} />
      <TextInput
        value={valeur}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#8A99AD"
        accessibilityLabel={placeholder}
        style={{ flex: 1, fontFamily: polices.moyen, fontSize: 14, color: couleurs.encre, paddingVertical: 8 }}
      />
      {!!valeur && (
        <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityLabel="Effacer la recherche">
          <Ionicons name="close-circle" size={19} color={couleurs.grisClair} />
        </Pressable>
      )}
    </View>
  );
}
