import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { couleurs } from '../../theme/ocean';
import { Texte } from './Texte';

/** Siège tel que renvoyé par l'API (GET plan des sièges d'un voyage). */
export interface SiegePlan {
  code: string;
  /** 'disponible' | 'reserve' | 'selectionne' (bloqué temporairement par un autre client). */
  statut: string;
}

type Case = { type: 'chauffeur' } | { type: 'couloir' } | { type: 'vide' } | { type: 'siege'; code: string };

/**
 * Disposition d'un minibus vu de dessus, 4 colonnes, l'avant en haut :
 * - rangée avant : chauffeur, vide, 2 places
 * - une banquette de 4 (côté porte)
 * - des rangées de 3 : 2 places, couloir, 1 place
 * - la banquette arrière de 4
 * Les places restantes (quand le total ne tombe pas juste) forment une
 * rangée incomplète avant la banquette arrière.
 * Exemple 16 places : [C,_,1,2] [3,4,5,6] [7,8,|,9] [10,11,|,12] [13,14,15,16]
 */
export function dispositionMinibus(codes: string[]): Case[][] {
  const rangees: Case[][] = [];
  let i = 0;
  const prendre = () => (i < codes.length ? ({ type: 'siege', code: codes[i++] } as Case) : ({ type: 'vide' } as Case));

  rangees.push([{ type: 'chauffeur' }, { type: 'vide' }, prendre(), prendre()]);

  const restants = codes.length - i;
  if (restants <= 0) return rangees;
  if (restants <= 4) {
    rangees.push([prendre(), prendre(), prendre(), prendre()]);
    return rangees;
  }

  // Banquette côté porte
  rangees.push([prendre(), prendre(), prendre(), prendre()]);

  // Rangées avec couloir, puis banquette arrière de 4
  const avantArriere = codes.length - i - 4;
  const rangeesDe3 = Math.max(0, Math.floor(avantArriere / 3));
  for (let r = 0; r < rangeesDe3; r++) {
    rangees.push([prendre(), prendre(), { type: 'couloir' }, prendre()]);
  }
  const reste = codes.length - i - 4;
  if (reste > 0) {
    rangees.push([prendre(), reste > 1 ? prendre() : { type: 'vide' }, { type: 'couloir' }, { type: 'vide' }]);
  }
  rangees.push([prendre(), prendre(), prendre(), prendre()]);
  return rangees;
}

export interface PlanSiegesProps {
  sieges: SiegePlan[];
  /** Codes choisis par l'utilisateur courant. */
  selection?: string[];
  onToggle?: (code: string) => void;
  /**
   * client    : libre / votre choix / occupé (les sièges bloqués par d'autres sont occupés)
   * compagnie : payé / en attente / libre (lecture seule)
   */
  mode?: 'client' | 'compagnie';
  /** Taille d'un siège (56 sur l'écran de réservation, 46 en vue compacte). */
  taille?: number;
}

/** Plan de sièges réaliste : véhicule vu de dessus, volant, appuie-têtes, couloir. */
export function PlanSieges({ sieges, selection = [], onToggle, mode = 'client', taille = 56 }: PlanSiegesProps) {
  const parCode = useMemo(() => new Map(sieges.map((s) => [s.code, s])), [sieges]);
  const rangees = useMemo(
    () => dispositionMinibus([...sieges].sort((a, b) => Number(a.code) - Number(b.code)).map((s) => s.code)),
    [sieges]
  );
  const ecart = taille >= 52 ? 10 : 8;

  const rendreCase = (c: Case, cle: string) => {
    if (c.type === 'chauffeur') {
      return (
        <View key={cle} accessible accessibilityLabel="Chauffeur" style={{ width: taille, height: taille, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={taille * 0.62} height={taille * 0.62} viewBox="0 0 24 24" fill="none" stroke={couleurs.grisClair} strokeWidth={1.8} strokeLinecap="round">
            <Circle cx={12} cy={12} r={9} />
            <Circle cx={12} cy={12} r={2.2} />
            <Path d="M3.5 10.5h6.3M14.2 10.5h6.3M12 14.2V21" />
          </Svg>
        </View>
      );
    }
    if (c.type !== 'siege') {
      return <View key={cle} style={{ width: taille, height: taille }} />;
    }

    const siege = parCode.get(c.code);
    const choisi = selection.includes(c.code);
    const libre = siege?.statut === 'disponible';
    const enAttente = siege?.statut === 'selectionne';

    // Apparence selon le mode
    let fond: string = couleurs.surface;
    let bord: string = couleurs.ocean200;
    let texte: string = couleurs.ocean950;
    let etat = 'libre';
    if (mode === 'client') {
      if (choisi) {
        fond = couleurs.ocean800; bord = couleurs.ocean800; texte = '#FFFFFF'; etat = 'sélectionné';
      } else if (!libre) {
        fond = '#E7EBF1'; bord = '#E1E6ED'; texte = '#9AA7B8'; etat = 'occupé';
      }
    } else if (!libre) {
      if (enAttente) {
        fond = couleurs.alerteFond; bord = couleurs.alerteVif; texte = '#7A4304'; etat = 'en attente de paiement';
      } else {
        fond = couleurs.ocean800; bord = couleurs.ocean800; texte = '#FFFFFF'; etat = 'payé';
      }
    }

    const cliquable = mode === 'client' && !!onToggle && (libre || choisi);

    return (
      <Pressable
        key={cle}
        disabled={!cliquable}
        onPress={() => onToggle?.(c.code)}
        accessibilityRole={mode === 'client' ? 'button' : 'text'}
        accessibilityLabel={`Siège ${c.code}, ${etat}`}
        accessibilityState={{ selected: choisi, disabled: !cliquable }}
        // Style objet (pas de fonction : NativeWind l'ignorerait sur Pressable).
        // Le changement de couleur à la sélection sert de retour visuel.
        style={{
          width: taille,
          height: taille + 2,
          borderRadius: taille * 0.22,
          borderBottomLeftRadius: taille * 0.28,
          borderBottomRightRadius: taille * 0.28,
          borderWidth: 1.5,
          borderColor: bord,
          backgroundColor: fond,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 6,
        }}
      >
        {/* Appui-tête */}
        <View style={{ position: 'absolute', top: 6, left: taille * 0.22, right: taille * 0.22, height: 4, borderRadius: 2, backgroundColor: texte, opacity: 0.35 }} />
        <Texte graisse="tresGras" taille={taille >= 52 ? 16 : 14} couleur={texte} style={{ fontVariant: ['tabular-nums'] }}>
          {c.code}
        </Texte>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        alignSelf: 'center',
        backgroundColor: couleurs.surface,
        borderWidth: 2,
        borderColor: couleurs.champ,
        borderTopLeftRadius: taille,
        borderTopRightRadius: taille,
        borderBottomLeftRadius: 22,
        borderBottomRightRadius: 22,
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 14,
        alignItems: 'center',
        gap: ecart + 2,
      }}
    >
      {/* Pare-brise */}
      <View style={{ width: '70%', height: 10, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, backgroundColor: '#E3EDF7' }} />
      {rangees.map((rangee, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: ecart }}>
          {rangee.map((c, k) => rendreCase(c, `${r}-${k}`))}
        </View>
      ))}
      <Texte variante="etiquette" couleur="#8A99AD">Arrière</Texte>
    </View>
  );
}

/** Légende à afficher au-dessus du plan. */
export function LegendePlan({ mode = 'client' }: { mode?: 'client' | 'compagnie' }) {
  const items =
    mode === 'client'
      ? [
          { libelle: 'Libre', fond: couleurs.surface, bord: couleurs.ocean200 },
          { libelle: 'Votre choix', fond: couleurs.ocean800, bord: couleurs.ocean800 },
          { libelle: 'Occupé', fond: '#E7EBF1', bord: '#E7EBF1' },
        ]
      : [
          { libelle: 'Payé', fond: couleurs.ocean800, bord: couleurs.ocean800 },
          { libelle: 'En attente', fond: couleurs.alerteFond, bord: couleurs.alerteVif },
          { libelle: 'Libre', fond: couleurs.surface, bord: couleurs.ocean200 },
        ];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
      {items.map((it) => (
        <View key={it.libelle} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 16, height: 16, borderRadius: 5, backgroundColor: it.fond, borderWidth: 1.5, borderColor: it.bord }} />
          <Texte graisse="gras" taille={12} couleur={couleurs.encreDouce}>{it.libelle}</Texte>
        </View>
      ))}
    </View>
  );
}

export default PlanSieges;
