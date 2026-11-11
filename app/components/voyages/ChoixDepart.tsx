import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeuilleModale, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';

/**
 * Plusieurs départs le même jour sur un trajet (matin, après-midi, soir) :
 * le client choisit d'abord son heure de départ, puis réserve.
 */

export type Depart = {
  voyage_id: number;
  heure_depart: string;
  type?: string;
  places_disponibles?: number;
  est_complet?: boolean;
  voiture?: { marque?: string; modele?: string; matricule?: string } | null;
};

type Creneau = { cle: 'matin' | 'apres_midi' | 'soir'; libelle: string; detail: string; icone: keyof typeof Ionicons.glyphMap };

const CRENEAUX: Creneau[] = [
  { cle: 'matin', libelle: 'Matin', detail: 'avant 12 h', icone: 'sunny-outline' },
  { cle: 'apres_midi', libelle: 'Après-midi', detail: '12 h – 18 h', icone: 'partly-sunny-outline' },
  { cle: 'soir', libelle: 'Soir et nuit', detail: 'après 18 h', icone: 'moon-outline' },
];

export const heureCourte = (h?: string) => String(h || '').slice(0, 5);

/** Créneau d'une heure « HH:MM(:SS) ». */
export function creneauDe(heure?: string): Creneau {
  const h = Number(String(heure || '0').slice(0, 2));
  return h < 12 ? CRENEAUX[0] : h < 18 ? CRENEAUX[1] : CRENEAUX[2];
}

/** Icône du créneau d'une heure (pour les puces d'heures de la carte). */
export const iconeCreneau = (heure?: string) => creneauDe(heure).icone;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** « Fianarantsoa → Antsirabe » */
  trajet: string;
  /** « Mercredi 19 novembre · Kofiam » */
  sousTitre: string;
  departs: Depart[];
  onChoisir: (depart: Depart) => void;
}

export function ChoixDepart({ visible, onClose, trajet, sousTitre, departs, onChoisir }: Props) {
  const insets = useSafeAreaInsets();
  const groupes = CRENEAUX.map((c) => ({ ...c, departs: departs.filter((d) => creneauDe(d.heure_depart).cle === c.cle) })).filter((g) => g.departs.length);

  return (
    <FeuilleModale visible={visible} onClose={onClose} titre="Choisissez votre heure de départ" sousTitre={`${trajet} · ${sousTitre}`}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: couleurs.ocean50 }}>
          <Ionicons name="information-circle-outline" size={18} color={couleurs.ocean800} />
          <Texte graisse="moyen" taille={12.5} couleur={couleurs.ocean800} style={{ flex: 1, lineHeight: 18 }}>
            {departs.length} départs ce jour-là. Votre billet sera valable uniquement pour l’heure choisie.
          </Texte>
        </View>

        {groupes.map((g) => (
          <View key={g.cle} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={g.icone} size={16} color={couleurs.ocean800} />
              <Texte graisse="tresGras" taille={14}>{g.libelle}</Texte>
              <Texte variante="legende">{g.detail}</Texte>
            </View>
            {g.departs.map((d) => {
              const complet = !!d.est_complet || d.places_disponibles === 0;
              const vehicule = [d.voiture?.marque, d.voiture?.modele].filter(Boolean).join(' ');
              return (
                <Pressable
                  key={d.voyage_id}
                  disabled={complet}
                  onPress={() => onChoisir(d)}
                  accessibilityRole="button"
                  accessibilityLabel={`Départ à ${heureCourte(d.heure_depart)}, ${complet ? 'complet' : `${d.places_disponibles} places libres`}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: couleurs.ligne,
                    backgroundColor: couleurs.surface,
                    opacity: complet ? 0.5 : 1,
                  }}
                >
                  <Texte variante="montant" taille={22} couleur={couleurs.ocean950}>{heureCourte(d.heure_depart)}</Texte>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Texte graisse="tresGras" taille={13.5} couleur={complet ? couleurs.gris : (d.places_disponibles ?? 0) <= 3 ? couleurs.alerte : couleurs.succes}>
                      {complet ? 'Complet' : `${d.places_disponibles} place${(d.places_disponibles ?? 0) > 1 ? 's' : ''} libre${(d.places_disponibles ?? 0) > 1 ? 's' : ''}`}
                    </Texte>
                    {!!vehicule && <Texte variante="legende" numberOfLines={1}>{vehicule}</Texte>}
                  </View>
                  {!complet && <Ionicons name="chevron-forward" size={18} color={couleurs.grisClair} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </FeuilleModale>
  );
}

export default ChoixDepart;
