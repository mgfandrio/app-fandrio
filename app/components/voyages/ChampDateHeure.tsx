import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Bouton, FeuilleModale, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';

interface Props {
  libelle: string;
  mode: 'date' | 'time';
  valeur: Date | null;
  /** Texte affiché (ex. « Lun. 9 nov. », « 07:30 »). */
  affichage?: string;
  placeholder: string;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  /** Sans boîte de champ : seulement le déclencheur (pour « Ajouter une date »). */
  declencheur?: (ouvrir: () => void) => React.ReactNode;
}

/**
 * Champ date ou heure : dialogue natif sur Android, roue dans une feuille sur iOS.
 */
export function ChampDateHeure({ libelle, mode, valeur, affichage, placeholder, onChange, minimumDate, declencheur }: Props) {
  const [ios, setIos] = useState(false);
  const [brouillon, setBrouillon] = useState<Date>(valeur || new Date());

  const ouvrir = () => {
    const depart = valeur || minimumDate || new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: depart,
        mode,
        is24Hour: true,
        minimumDate: mode === 'date' ? minimumDate : undefined,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(d);
        },
      });
    } else {
      setBrouillon(depart);
      setIos(true);
    }
  };

  return (
    <>
      {declencheur ? (
        declencheur(ouvrir)
      ) : (
        <View style={{ gap: 6, flex: 1, minWidth: 0 }}>
          <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>{libelle}</Texte>
          <Pressable
            onPress={ouvrir}
            accessibilityRole="button"
            accessibilityLabel={`${libelle} : ${affichage || placeholder}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: couleurs.champ, backgroundColor: couleurs.surface }}
          >
            <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={couleurs.ocean800} />
            <Texte graisse={affichage ? 'tresGras' : 'moyen'} taille={15} couleur={affichage ? couleurs.encre : '#8A99AD'} numberOfLines={1} style={{ flex: 1 }}>
              {affichage || placeholder}
            </Texte>
          </Pressable>
        </View>
      )}

      {Platform.OS === 'ios' && (
        <FeuilleModale
          visible={ios}
          onClose={() => setIos(false)}
          titre={libelle}
          pied={
            <Bouton
              titre="Valider"
              onPress={() => {
                onChange(brouillon);
                setIos(false);
              }}
            />
          }
        >
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker
              value={brouillon}
              mode={mode}
              display="spinner"
              locale="fr-FR"
              is24Hour
              minimumDate={mode === 'date' ? minimumDate : undefined}
              onChange={(_, d) => d && setBrouillon(d)}
            />
          </View>
        </FeuilleModale>
      )}
    </>
  );
}

export default ChampDateHeure;
