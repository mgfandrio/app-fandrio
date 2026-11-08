import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import commissionService from '../../services/commissions/commissionService';
import { Skeleton } from '../common/Skeleton';
import { Carte, Segmente, Texte } from '../ui';
import { couleurs, formatAriary, polices } from '../../theme/ocean';
import { donnees, MOIS } from './outils';

type Vue = 'commissions' | 'clients' | 'compagnies';
type Serie = { cle: string; libelle: string; couleur: string };

/**
 * Palette catégorielle validée (scripts/validate_palette.js du skill dataviz, mode clair) :
 * bandes de luminosité, chroma, séparation daltonisme et vision normale OK.
 * Le bleu clair est sous 3:1 sur fond blanc : les valeurs sont donc toujours
 * écrites en clair dans le relevé sous le graphique.
 */
const BLEU = '#2667B3';
const BLEU_CLAIR = '#5BA9EC';
const ORANGE = '#C8501F';

const SERIES: Record<Vue, Serie[]> = {
  commissions: [{ cle: 'commission', libelle: 'Commission', couleur: BLEU }],
  clients: [
    { cle: 'clients_actifs', libelle: 'Actifs', couleur: BLEU },
    { cle: 'clients_nouveaux', libelle: 'Nouveaux', couleur: BLEU_CLAIR },
    { cle: 'clients_perdus', libelle: 'Perdus', couleur: ORANGE },
  ],
  compagnies: [
    { cle: 'compagnies_actives', libelle: 'Actives', couleur: BLEU },
    { cle: 'compagnies_nouvelles', libelle: 'Nouvelles', couleur: BLEU_CLAIR },
  ],
};

const NOTES: Record<Vue, string> = {
  commissions: 'Commission FANDRIO sur les billets payés chaque mois.',
  clients: 'Actifs : ont payé au moins un billet dans le mois. Perdus : actifs le mois précédent, sans achat ce mois-ci.',
  compagnies: 'Actives : ont vendu au moins un billet dans le mois. Nouvelles : inscrites dans le mois.',
};

const HAUTEUR = 170;
const MARGE_G = 38;
const MARGE_H = 10;
const MARGE_B = 22;

/** 1 250 000 -> « 1,3 M » ; 85 000 -> « 85 k ». */
function court(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.', ',')} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(Math.round(n));
}

/** Maximum « rond » de l'axe pour 3 graduations lisibles. */
function maxRond(v: number) {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const pas = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
  return pas * p;
}

/** Évolution mensuelle de la plateforme : un graphique à la fois (un seul axe), choisi par onglet. */
export function GraphiqueEvolution() {
  const [vue, setVue] = useState<Vue>('commissions');
  const [mois, setMois] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [largeur, setLargeur] = useState(0);
  const [selection, setSelection] = useState<number | null>(null);

  const charger = useCallback(async () => {
    const d: any = donnees(await commissionService.getEvolution(12).catch(() => null));
    setMois(d?.mois || []);
  }, []);

  useEffect(() => {
    charger().finally(() => setChargement(false));
  }, [charger]);

  const series = SERIES[vue];
  const n = mois.length;
  const idx = selection ?? n - 1;
  const zoneL = Math.max(largeur - MARGE_G, 1);
  const zoneH = HAUTEUR - MARGE_H - MARGE_B;
  const pasX = n > 0 ? zoneL / n : 0;

  const max = useMemo(() => maxRond(Math.max(0, ...mois.flatMap((m) => series.map((s) => Number(m[s.cle]) || 0)))), [mois, series]);
  const y = (v: number) => MARGE_H + zoneH - (v / max) * zoneH;
  const xCentre = (i: number) => MARGE_G + pasX * i + pasX / 2;

  // Toucher ou glisser sur le graphique choisit le mois affiché dans le relevé
  const choisir = (xEcran: number) => {
    if (!n || !pasX) return;
    setSelection(Math.max(0, Math.min(n - 1, Math.floor((xEcran - MARGE_G) / pasX))));
  };

  const libelleMois = (cle?: string) => {
    if (!cle) return '';
    const [a, m] = cle.split('-').map(Number);
    return `${MOIS[m - 1]} ${a}`.replace(/^./, (c) => c.toUpperCase());
  };

  const courant = mois[idx];
  const resume = courant
    ? `${libelleMois(courant.mois)} : ${series.map((s) => `${s.libelle} ${vue === 'commissions' ? `${formatAriary(courant[s.cle])} ariary` : courant[s.cle]}`).join(', ')}`
    : '';

  return (
    <Carte style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Texte graisse="tresGras" taille={16}>Évolution</Texte>
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>12 derniers mois</Texte>
      </View>

      <Segmente<Vue>
        libelleAccessible="Indicateur affiché"
        valeur={vue}
        onChange={(v) => {
          setVue(v);
          setSelection(null);
        }}
        options={[
          { valeur: 'commissions', libelle: 'Commissions' },
          { valeur: 'clients', libelle: 'Clients' },
          { valeur: 'compagnies', libelle: 'Compagnies' },
        ]}
      />

      {chargement ? (
        <Skeleton height={HAUTEUR + 70} borderRadius={12} />
      ) : n === 0 ? (
        <Texte variante="legende" centre style={{ paddingVertical: 30 }}>Pas encore de données.</Texte>
      ) : (
        <>
          <View
            onLayout={(e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width)}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Graphique ${vue}. ${resume}. Touchez le graphique pour choisir un mois.`}
            onStartShouldSetResponder={() => true}
            // Pas de capture au glissement : le défilement vertical de l'accueil reste libre
            onMoveShouldSetResponder={() => false}
            onResponderGrant={(e) => choisir(e.nativeEvent.locationX)}
            onResponderMove={(e) => choisir(e.nativeEvent.locationX)}
            style={{ height: HAUTEUR }}
          >
            {largeur > 0 && (
              <Svg width={largeur} height={HAUTEUR}>
                {/* Grille discrète et graduations */}
                {[0, 0.5, 1].map((t) => (
                  <React.Fragment key={t}>
                    <Line x1={MARGE_G} x2={largeur} y1={y(max * t)} y2={y(max * t)} stroke={couleurs.separateur} strokeWidth={1} />
                    <SvgText x={MARGE_G - 6} y={y(max * t) + 4} fontSize={10} fontFamily={polices.moyen} fill={couleurs.gris} textAnchor="end">
                      {court(max * t)}
                    </SvgText>
                  </React.Fragment>
                ))}

                {/* Repère du mois choisi */}
                <Rect x={MARGE_G + pasX * idx} y={MARGE_H} width={pasX} height={zoneH} fill={couleurs.ocean50} opacity={0.7} />

                {vue === 'commissions'
                  ? mois.map((m, i) => {
                      const v = Number(m.commission) || 0;
                      const l = Math.max(pasX - 6, 2);
                      const h = Math.max(zoneH - (y(v) - MARGE_H), v > 0 ? 2 : 0);
                      const x = MARGE_G + pasX * i + (pasX - l) / 2;
                      const haut = MARGE_H + zoneH - h;
                      const r = Math.min(4, l / 2, h);
                      // Barre ancrée sur la ligne de base, extrémité haute arrondie de 4 px
                      const d = h <= 0 ? '' : `M${x},${MARGE_H + zoneH} L${x},${haut + r} Q${x},${haut} ${x + r},${haut} L${x + l - r},${haut} Q${x + l},${haut} ${x + l},${haut + r} L${x + l},${MARGE_H + zoneH} Z`;
                      return d ? <Path key={m.mois} d={d} fill={BLEU} opacity={i === idx ? 1 : 0.75} /> : null;
                    })
                  : series.map((s) => {
                      const d = mois.map((m, i) => `${i === 0 ? 'M' : 'L'}${xCentre(i)},${y(Number(m[s.cle]) || 0)}`).join(' ');
                      return <Path key={s.cle} d={d} stroke={s.couleur} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />;
                    })}

                {/* Points du mois choisi, entourés du fond pour rester lisibles */}
                {vue !== 'commissions' &&
                  series.map((s) => <Circle key={s.cle} cx={xCentre(idx)} cy={y(Number(courant?.[s.cle]) || 0)} r={4.5} fill={s.couleur} stroke={couleurs.surface} strokeWidth={2} />)}

                {/* Ligne de base et mois */}
                <Line x1={MARGE_G} x2={largeur} y1={MARGE_H + zoneH} y2={MARGE_H + zoneH} stroke={couleurs.ligne} strokeWidth={1} />
                {mois.map((m, i) =>
                  i % 2 === (n - 1) % 2 || i === idx ? (
                    <SvgText
                      key={m.mois}
                      x={xCentre(i)}
                      y={HAUTEUR - 6}
                      fontSize={10}
                      fontFamily={i === idx ? polices.tresGras : polices.moyen}
                      fill={i === idx ? couleurs.encre : couleurs.gris}
                      textAnchor="middle"
                    >
                      {MOIS[Number(m.mois.split('-')[1]) - 1].slice(0, 3)}
                    </SvgText>
                  ) : null
                )}
              </Svg>
            )}
          </View>

          {/* Relevé du mois choisi : légende et valeurs écrites */}
          <View style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
            <Texte graisse="tresGras" taille={13.5}>{libelleMois(courant?.mois)}</Texte>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {series.map((s) => (
                <View key={s.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.couleur }} />
                  <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris}>{s.libelle}</Texte>
                  <Texte variante="montant" taille={13.5}>
                    {vue === 'commissions' ? `${formatAriary(Number(courant?.[s.cle]) || 0)} Ar` : formatAriary(Number(courant?.[s.cle]) || 0)}
                  </Texte>
                </View>
              ))}
              {vue === 'commissions' && (
                <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris}>
                  sur {formatAriary(Number(courant?.brut) || 0)} Ar · {formatAriary(Number(courant?.billets) || 0)} billets
                </Texte>
              )}
            </View>
            <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris} style={{ lineHeight: 16 }}>{NOTES[vue]}</Texte>
          </View>
        </>
      )}
    </Carte>
  );
}

export default GraphiqueEvolution;
