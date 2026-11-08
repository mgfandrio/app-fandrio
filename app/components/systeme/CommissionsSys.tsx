import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import commissionService from '../../services/commissions/commissionService';
import { Skeleton } from '../common/Skeleton';
import { Carte, Pastille, Puce, Segmente, Texte } from '../ui';
import { couleurs, formatAriary } from '../../theme/ocean';
import { DetailCollecte } from './DetailCollecte';
import { donnees, etatCollecte, initialesNom, MOIS, moisDePeriode } from './outils';

type Periode = 'cette_semaine' | 'ce_mois' | 'cette_annee';
type Filtre = 'toutes' | 'attente' | 'retard' | 'payee';

const COULEURS_ETAT = { payee: couleurs.ocean800, attente: '#E4A13A', retard: '#C2413A' };

/** Onglet « Commissions » : montant prélevé, état des collectes, collectes récentes. */
export function CommissionsSys() {
  const insets = useSafeAreaInsets();
  const [periode, setPeriode] = useState<Periode>('ce_mois');
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [dash, setDash] = useState<any>(null);
  const [collectes, setCollectes] = useState<any[]>([]);
  const [page, setPage] = useState({ courante: 1, derniere: 1, total: 0 });
  const [chargement, setChargement] = useState(true);
  const [suite, setSuite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);

  const charger = useCallback(async () => {
    const [d, c] = await Promise.all([commissionService.getDashboard().catch(() => null), commissionService.getCollectes({ per_page: 50, page: 1 }).catch(() => null)]);
    setDash(donnees(d));
    const dc: any = donnees(c);
    setCollectes(dc?.collectes || []);
    setPage({ courante: dc?.pagination?.current_page || 1, derniere: dc?.pagination?.last_page || 1, total: dc?.pagination?.total || 0 });
  }, []);

  useFocusEffect(
    useCallback(() => {
      setChargement(true);
      charger().finally(() => setChargement(false));
    }, [charger])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await charger();
    setRefreshing(false);
  };

  const plus = async () => {
    if (suite || page.courante >= page.derniere) return;
    setSuite(true);
    try {
      const dc: any = donnees(await commissionService.getCollectes({ per_page: 50, page: page.courante + 1 }));
      if (dc) {
        setCollectes((x) => [...x, ...(dc.collectes || [])]);
        setPage((p) => ({ ...p, courante: dc.pagination?.current_page || p.courante + 1 }));
      }
    } finally {
      setSuite(false);
    }
  };

  const p = dash?.par_periode?.[periode] || {};
  const evolution: any[] = dash?.evolution_mensuelle || [];
  const precedent = evolution.length >= 2 ? Number(evolution[evolution.length - 2]?.commission) || 0 : 0;
  const variation = periode === 'ce_mois' && precedent > 0 ? ((Number(p.commission) || 0) - precedent) / precedent * 100 : null;
  const sommes = { payee: 0, attente: 0, retard: 0 };
  collectes.forEach((c) => (sommes[etatCollecte(c).cle] += Number(c.montant_commission) || 0));
  const totalSommes = sommes.payee + sommes.attente + sommes.retard;
  const liste = filtre === 'toutes' ? collectes : collectes.filter((c) => etatCollecte(c).cle === filtre);

  const entete = (
    <View style={{ gap: 14, marginBottom: 10 }}>
      <View>
        <Texte variante="titre" taille={26}>Commissions</Texte>
        <Texte graisse="moyen" taille={13} couleur={couleurs.gris}>{dash?.taux_commission != null ? `${String(dash.taux_commission).replace('.', ',')} % par billet vendu` : ' '}</Texte>
      </View>
      <Segmente<Periode>
        libelleAccessible="Période"
        valeur={periode}
        onChange={setPeriode}
        options={[
          { valeur: 'cette_semaine', libelle: 'Semaine' },
          { valeur: 'ce_mois', libelle: MOIS[new Date().getMonth()].replace(/^./, (x) => x.toUpperCase()) },
          { valeur: 'cette_annee', libelle: 'Année' },
        ]}
      />
      {chargement ? (
        <>
          <Skeleton height={150} borderRadius={20} />
          <Skeleton height={100} borderRadius={16} />
        </>
      ) : (
        <>
          <View style={{ backgroundColor: couleurs.ocean950, borderRadius: 20, padding: 18, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View>
                <Texte graisse="gras" taille={12} couleur={couleurs.texteSurMarine}>Commission FANDRIO</Texte>
                <Texte variante="montant" taille={30} couleur="#FFFFFF" style={{ letterSpacing: -0.5, marginTop: 2 }}>
                  {formatAriary(Number(p.commission) || 0)} <Texte graisse="tresGras" taille={14} couleur={couleurs.texteSurMarine}>Ar</Texte>
                </Texte>
              </View>
              {variation !== null && (
                <View style={{ alignSelf: 'flex-start', height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: 'rgba(46,143,224,0.18)', justifyContent: 'center' }}>
                  <Texte graisse="tresGras" taille={11} couleur="#CFE6FB">{variation >= 0 ? '+' : '−'}{Math.abs(variation).toFixed(1).replace('.', ',')} %</Texte>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <View>
                <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>Revenu brut</Texte>
                <Texte variante="montant" taille={14} couleur="#FFFFFF">{formatAriary(Number(p.brut) || 0)} Ar</Texte>
              </View>
              <View>
                <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>Billets vendus</Texte>
                <Texte variante="montant" taille={14} couleur="#FFFFFF">{formatAriary(Number(p.billets) || 0)}</Texte>
              </View>
            </View>
          </View>

          <Carte style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Texte graisse="tresGras" taille={15}>État des collectes</Texte>
              <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{page.total} collecte{page.total > 1 ? 's' : ''}</Texte>
            </View>
            {totalSommes > 0 && (
              <View style={{ flexDirection: 'row', gap: 3, height: 10, borderRadius: 999, overflow: 'hidden' }}>
                {(['payee', 'attente', 'retard'] as const).map((k) =>
                  sommes[k] > 0 ? <View key={k} style={{ flex: sommes[k], backgroundColor: COULEURS_ETAT[k] }} /> : null
                )}
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              {([
                ['payee', 'Payées'],
                ['attente', 'En attente'],
                ['retard', 'En retard'],
              ] as const).map(([k, l]) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COULEURS_ETAT[k] }} />
                  <Texte graisse="gras" taille={12} couleur={couleurs.encreDouce}>{l} {formatAriary(sommes[k])}</Texte>
                </View>
              ))}
            </View>
          </Carte>

          <Texte graisse="tresGras" taille={16} style={{ marginTop: 4, marginLeft: 2 }}>Collectes</Texte>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {([
              ['toutes', 'Toutes'],
              ['retard', 'En retard'],
              ['attente', 'En attente'],
              ['payee', 'Payées'],
            ] as [Filtre, string][]).map(([v, l]) => (
              <Puce key={v} libelle={l} active={filtre === v} onPress={() => setFiltre(v)} />
            ))}
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <FlatList
        data={chargement ? [] : liste}
        keyExtractor={(c) => String(c.coll_id)}
        ListHeaderComponent={entete}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        onEndReached={plus}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          chargement ? null : (
            <View style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
              <Ionicons name="calendar-outline" size={32} color={couleurs.grisClair} />
              <Texte variante="legende" centre>Aucune collecte.</Texte>
            </View>
          )
        }
        ListFooterComponent={suite ? <ActivityIndicator color={couleurs.ocean800} style={{ paddingVertical: 14 }} /> : null}
        renderItem={({ item: c, index }) => {
          const e = etatCollecte(c);
          return (
            <Pressable
              onPress={() => setDetail(c.coll_id)}
              accessibilityRole="button"
              accessibilityLabel={`${c.comp_nom}, ${formatAriary(c.montant_commission)} ariary, ${e.libelle}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                paddingHorizontal: 14,
                backgroundColor: couleurs.surface,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: couleurs.ligne,
                borderTopWidth: 1,
                borderTopColor: index === 0 ? couleurs.ligne : couleurs.separateur,
                borderBottomWidth: index === liste.length - 1 ? 1 : 0,
                borderTopLeftRadius: index === 0 ? 16 : 0,
                borderTopRightRadius: index === 0 ? 16 : 0,
                borderBottomLeftRadius: index === liste.length - 1 ? 16 : 0,
                borderBottomRightRadius: index === liste.length - 1 ? 16 : 0,
              }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                <Texte graisse="tresGras" taille={12} couleur={couleurs.ocean800}>{initialesNom(c.comp_nom)}</Texte>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Texte graisse="tresGras" taille={14} numberOfLines={1}>{c.comp_nom}</Texte>
                <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>
                  {moisDePeriode(c.periode_debut).replace(/^./, (x) => x.toUpperCase())} · {c.nb_billets} billets · échéance {c.date_prevue}
                </Texte>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Texte variante="montant" taille={14}>{formatAriary(c.montant_commission)} Ar</Texte>
                <Pastille libelle={e.libelle} tonalite={e.tonalite} point={false} />
              </View>
            </Pressable>
          );
        }}
      />
      <DetailCollecte visible={detail !== null} collecteId={detail} onClose={() => setDetail(null)} onChange={charger} />
    </View>
  );
}

export default CommissionsSys;
