import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Carte, Texte } from '../ui';
import { couleurs, formatAriary } from '../../theme/ocean';

/**
 * Commission FANDRIO versée par tranche de voyages : progression de la tranche
 * en cours et journal des actions (qui a fait quoi, quand). Partagé par l'admin
 * compagnie (Portefeuille) et l'admin système (fiche compagnie, détail).
 */

export interface TrancheEnCours {
  nb_voyages: number;
  seuil: number;
  commission_cumulee: number;
  premier_voyage: string | null;
  date_limite: string | null;
}

export function ProgressionTranche({ tranche, pourCompagnie }: { tranche?: TrancheEnCours | null; pourCompagnie?: boolean }) {
  if (!tranche) return null;
  const { nb_voyages: n, seuil } = tranche;
  const pct = Math.min(100, Math.round((n / Math.max(1, seuil)) * 100));
  const reste = Math.max(0, seuil - n);
  return (
    <Carte style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <View>
          <Texte graisse="gras" taille={12} couleur={couleurs.gris}>Tranche en cours</Texte>
          <Texte variante="montant" taille={20}>{n} / {seuil} <Texte graisse="gras" taille={13} couleur={couleurs.gris}>voyage{seuil > 1 ? 's' : ''}</Texte></Texte>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Texte graisse="gras" taille={12} couleur={couleurs.gris}>Commission cumulée</Texte>
          <Texte variante="montant" taille={17}>{formatAriary(tranche.commission_cumulee)} Ar</Texte>
        </View>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Voyages comptés dans la tranche"
        accessibilityValue={{ min: 0, max: seuil, now: n }}
        style={{ height: 10, borderRadius: 999, backgroundColor: couleurs.ocean50, overflow: 'hidden' }}
      >
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 999, backgroundColor: couleurs.ocean800 }} />
      </View>
      <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} style={{ lineHeight: 18 }}>
        {n === 0
          ? `Chaque voyage terminé avec des billets vendus en ligne compte. ${pourCompagnie ? 'Vous verserez' : 'La compagnie versera'} la commission tous les ${seuil} voyages.`
          : `Encore ${reste} voyage${reste > 1 ? 's' : ''} avant le versement${tranche.date_limite ? `, ou au plus tard le ${tranche.date_limite}` : ''}.`}
      </Texte>
    </Carte>
  );
}

type Nom = React.ComponentProps<typeof Ionicons>['name'];
const ACTIONS: Record<string, { icone: Nom; couleur: string; fond: string }> = {
  tranche_creee: { icone: 'wallet-outline', couleur: couleurs.alerte, fond: couleurs.alerteFond },
  lien_envoye: { icone: 'card-outline', couleur: couleurs.ocean800, fond: couleurs.ocean50 },
  versement_lance: { icone: 'card-outline', couleur: couleurs.ocean800, fond: couleurs.ocean50 },
  versement_recu: { icone: 'checkmark-circle', couleur: couleurs.succes, fond: couleurs.succesFond },
  versement_confirme: { icone: 'checkmark-circle', couleur: couleurs.succes, fond: couleurs.succesFond },
  rappel: { icone: 'notifications-outline', couleur: couleurs.alerte, fond: couleurs.alerteFond },
  relance: { icone: 'notifications-outline', couleur: couleurs.alerte, fond: couleurs.alerteFond },
  avertissement: { icone: 'warning-outline', couleur: couleurs.danger, fond: couleurs.dangerFond },
  suspension: { icone: 'ban-outline', couleur: couleurs.danger, fond: couleurs.dangerFond },
  reactivation: { icone: 'shield-checkmark-outline', couleur: couleurs.succes, fond: couleurs.succesFond },
  parametres: { icone: 'settings-outline', couleur: couleurs.neutre, fond: couleurs.neutreFond },
};

export function JournalCommission({ journal, limite }: { journal?: any[]; limite?: number }) {
  const lignes = (journal || []).slice(0, limite ?? undefined);
  if (!lignes.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 18, gap: 6 }}>
        <Ionicons name="time-outline" size={26} color={couleurs.grisClair} />
        <Texte variante="legende" centre>Aucune action pour le moment.</Texte>
      </View>
    );
  }
  return (
    <View>
      {lignes.map((j, i) => {
        const a = ACTIONS[j.action] || { icone: 'ellipse-outline' as Nom, couleur: couleurs.neutre, fond: couleurs.neutreFond };
        return (
          <View key={j.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: a.fond, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={a.icone} size={15} color={a.couleur} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Texte graisse="gras" taille={13} style={{ lineHeight: 18 }}>{j.message}</Texte>
              <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>{j.date} · {j.par}</Texte>
            </View>
          </View>
        );
      })}
    </View>
  );
}
