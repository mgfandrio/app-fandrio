import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BoutonIcone, Texte } from '../ui';
import { couleurs, dateLocaleISO } from '../../theme/ocean';

/**
 * Calendrier mensuel pour choisir une ou plusieurs dates de voyage.
 * On touche un jour pour l'ajouter, on le retouche pour le retirer.
 *
 * - `multiple` : plusieurs dates (jusqu'à `max`) ; sinon une seule date.
 * - `selection` : dates « AAAA-MM-JJ ».
 * - Les jours avant `minimum` ne peuvent pas être choisis.
 */

const MOIS_LONGS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const JOURS_LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

interface Props {
  selection: string[];
  onChange: (dates: string[]) => void;
  multiple?: boolean;
  max?: number;
  /** Premier jour sélectionnable (minuit). */
  minimum: Date;
}

export function CalendrierDates({ selection, onChange, multiple = true, max = 20, minimum }: Props) {
  // Mois affiché : celui de la première date choisie, sinon le mois du minimum
  const depart = selection[0] ? new Date(Number(selection[0].slice(0, 4)), Number(selection[0].slice(5, 7)) - 1, 1) : new Date(minimum.getFullYear(), minimum.getMonth(), 1);
  const [mois, setMois] = useState(depart);

  const semaines = useMemo(() => {
    const annee = mois.getFullYear();
    const m = mois.getMonth();
    const nbJours = new Date(annee, m + 1, 0).getDate();
    const decalage = (new Date(annee, m, 1).getDay() + 6) % 7; // lundi = 0
    const cases: (Date | null)[] = [...Array(decalage).fill(null), ...Array.from({ length: nbJours }, (_, i) => new Date(annee, m, i + 1))];
    while (cases.length % 7) cases.push(null);
    return Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
  }, [mois]);

  const premierMois = new Date(minimum.getFullYear(), minimum.getMonth(), 1);
  const peutReculer = mois.getTime() > premierMois.getTime();
  const plein = multiple && selection.length >= max;
  const isoAujourdhui = dateLocaleISO(new Date());

  const basculer = (iso: string) => {
    if (selection.includes(iso)) onChange(selection.filter((d) => d !== iso));
    else if (!multiple) onChange([iso]);
    else if (!plein) onChange([...selection, iso].sort());
  };

  /** Ajoute au mois affiché tous les jours libres d'un jour de semaine (colonne). */
  const basculerColonne = (colonne: number) => {
    const jours = semaines.map((s) => s[colonne]).filter((d): d is Date => !!d && d.getTime() >= minimum.getTime()).map(dateLocaleISO);
    if (!jours.length) return;
    const tousChoisis = jours.every((d) => selection.includes(d));
    if (tousChoisis) onChange(selection.filter((d) => !jours.includes(d)));
    else onChange([...new Set([...selection, ...jours])].sort().slice(0, max));
  };

  return (
    <View style={{ gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: couleurs.ligne, backgroundColor: couleurs.surface }}>
      {/* Mois */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <BoutonIcone icone="chevron-back" libelle="Mois précédent" onPress={() => peutReculer && setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))} />
        <Texte graisse="tresGras" taille={15} centre style={{ flex: 1, opacity: 1 }} accessibilityRole="header">
          {MOIS_LONGS[mois.getMonth()]} {mois.getFullYear()}
        </Texte>
        <BoutonIcone icone="chevron-forward" libelle="Mois suivant" onPress={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))} />
      </View>

      {/* Jours de la semaine : en sélection multiple, toucher une lettre choisit toute la colonne */}
      <View style={{ flexDirection: 'row' }}>
        {JOURS.map((j, i) => (
          <Pressable
            key={i}
            disabled={!multiple}
            onPress={() => basculerColonne(i)}
            accessibilityRole={multiple ? 'button' : 'text'}
            accessibilityLabel={multiple ? `Tous les ${JOURS_LONGS[i]}s du mois` : JOURS_LONGS[i]}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
          >
            <Texte graisse="tresGras" taille={12} couleur={multiple ? couleurs.ocean800 : couleurs.gris}>{j}</Texte>
          </Pressable>
        ))}
      </View>

      {/* Jours */}
      {semaines.map((semaine, s) => (
        <View key={s} style={{ flexDirection: 'row' }}>
          {semaine.map((d, k) => {
            if (!d) return <View key={k} style={{ flex: 1, height: 42 }} />;
            const iso = dateLocaleISO(d);
            const choisi = selection.includes(iso);
            const passe = d.getTime() < minimum.getTime();
            const bloque = passe || (!choisi && plein);
            return (
              <Pressable
                key={k}
                disabled={bloque}
                onPress={() => basculer(iso)}
                accessibilityRole="button"
                accessibilityState={{ selected: choisi, disabled: bloque }}
                accessibilityLabel={`${d.getDate()} ${MOIS_LONGS[d.getMonth()]}${choisi ? ', choisi' : ''}`}
                style={{ flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: choisi ? couleurs.ocean800 : 'transparent',
                    borderWidth: !choisi && iso === isoAujourdhui ? 1.5 : 0,
                    borderColor: couleurs.ocean200,
                  }}
                >
                  <Texte
                    graisse={choisi ? 'tresGras' : 'gras'}
                    taille={14}
                    couleur={choisi ? '#FFFFFF' : passe ? couleurs.grisClair : bloque ? couleurs.grisClair : couleurs.encre}
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {d.getDate()}
                  </Texte>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {multiple && (
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris} centre>
          {plein ? `Maximum atteint : ${max} dates.` : 'Touchez les jours voulus. Une lettre (L, M…) choisit ce jour pour tout le mois.'}
        </Texte>
      )}
    </View>
  );
}

export default CalendrierDates;
