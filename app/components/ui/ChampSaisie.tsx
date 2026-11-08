import React, { forwardRef, useState } from 'react';
import { TextInput, TextInputProps, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, polices } from '../../theme/ocean';
import { Texte } from './Texte';

export interface ChampSaisieProps extends TextInputProps {
  libelle: string;
  icone?: keyof typeof Ionicons.glyphMap;
  /** Texte fixe avant la saisie, par exemple « +261 ». */
  prefixe?: string;
  /** Texte fixe après la saisie, par exemple « Ar » ou « km ». */
  suffixe?: string;
  /** Message d'aide sous le champ. */
  aide?: string;
  /** Message d'erreur : remplace l'aide et colore le champ en rouge. */
  erreur?: string;
  obligatoire?: boolean;
  /** Ajoute un bouton œil pour afficher le mot de passe. */
  motDePasse?: boolean;
}

/** Champ de formulaire avec libellé, état focus, aide et erreur. */
export const ChampSaisie = forwardRef<TextInput, ChampSaisieProps>(function ChampSaisie(
  { libelle, icone, prefixe, suffixe, aide, erreur, obligatoire, motDePasse, onFocus, onBlur, style, ...reste },
  ref
) {
  const [focus, setFocus] = useState(false);
  const [visible, setVisible] = useState(false);

  const bordure = erreur ? couleurs.danger : focus ? couleurs.ocean800 : couleurs.champ;

  return (
    <View style={{ gap: 6, minWidth: 0 }}>
      <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>
        {libelle}
        {obligatoire && <Texte graisse="gras" taille={12.5} couleur={couleurs.danger}> *</Texte>}
      </Texte>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: 50,
          paddingHorizontal: 12,
          borderWidth: 1.5,
          borderColor: bordure,
          borderRadius: 14,
          backgroundColor: reste.editable === false ? couleurs.fond : couleurs.surface,
          // Halo de focus
          shadowColor: couleurs.ocean800,
          shadowOpacity: focus && !erreur ? 0.15 : 0,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        {icone && <Ionicons name={icone} size={19} color={couleurs.grisClair} />}
        {!!prefixe && (
          <Texte graisse="gras" taille={15} couleur={couleurs.encreDouce} style={{ paddingRight: 8, borderRightWidth: 1, borderRightColor: couleurs.ligne }}>
            {prefixe}
          </Texte>
        )}
        <TextInput
          ref={ref}
          accessibilityLabel={libelle}
          placeholderTextColor="#8A99AD"
          secureTextEntry={motDePasse && !visible}
          onFocus={(e) => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            onBlur?.(e);
          }}
          style={[{ flex: 1, minWidth: 0, fontFamily: polices.moyen, fontSize: 15, color: couleurs.encre, paddingVertical: 12 }, style]}
          {...reste}
        />
        {!!suffixe && (
          <Texte graisse="gras" taille={13} couleur={couleurs.gris}>
            {suffixe}
          </Texte>
        )}
        {motDePasse && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            hitSlop={10}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={couleurs.gris} />
          </Pressable>
        )}
      </View>
      {!!(erreur || aide) && (
        <Texte variante="legende" couleur={erreur ? couleurs.danger : couleurs.gris} graisse={erreur ? 'gras' : 'moyen'}>
          {erreur || aide}
        </Texte>
      )}
    </View>
  );
});

export default ChampSaisie;
