import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { voyageService } from '../services/voyages/voyageService';
import { couleurs, dateLocaleISO, ombres } from '../theme/ocean';
import { dateVoyage, infoStatutVoyage, libelleType, remplissage, titreJour } from '../utils/voyageStatut';
import { Skeleton } from './common/Skeleton';
import { Carte, FeuilleModale, Pastille, Puce, Texte } from './ui';
import { DetailVoyage } from './voyages/DetailVoyage';
import { FormulaireVoyage } from './voyages/FormulaireVoyage';

type Statut = 1 | 2 | 3 | 4;
type Periode = 'tout' | 'jour' | 'semaine' | 'mois';

const STATUTS: { valeur: Statut; libelle: string; pluriel: string }[] = [
  { valeur: 1, libelle: 'Programmés', pluriel: 'programmés' },
  { valeur: 2, libelle: 'En cours', pluriel: 'en cours' },
  { valeur: 3, libelle: 'Terminés', pluriel: 'terminés' },
  { valeur: 4, libelle: 'Annulés', pluriel: 'annulés' },
];

const PERIODES: { valeur: Periode; libelle: string; suffixe: string }[] = [
  { valeur: 'tout', libelle: 'Toutes les dates', suffixe: 'au total' },
  { valeur: 'jour', libelle: "Aujourd'hui", suffixe: "aujourd'hui" },
  { valeur: 'semaine', libelle: 'Cette semaine', suffixe: 'cette semaine' },
  { valeur: 'mois', libelle: 'Ce mois', suffixe: 'ce mois-ci' },
];

const PAR_PAGE = 30;

/** Bornes de la période (Y-m-d), semaine du lundi au dimanche. */
function bornes(p: Periode): Record<string, string> {
  if (p === 'tout') return {};
  const d = new Date();
  if (p === 'jour') return { date_debut: dateLocaleISO(d), date_fin: dateLocaleISO(d) };
  if (p === 'semaine') {
    const lundi = new Date(d);
    lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);
    return { date_debut: dateLocaleISO(lundi), date_fin: dateLocaleISO(dimanche) };
  }
  return { date_debut: dateLocaleISO(new Date(d.getFullYear(), d.getMonth(), 1)), date_fin: dateLocaleISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
}

function idVoyage(v: any): number {
  return Number(v.id ?? v.voyage_id ?? v.id_voyage);
}

/** Une ligne de voyage : heure, trajet, véhicule, remplissage, statut. */
function LigneVoyage({ v, premiere, onPress }: { v: any; premiere: boolean; onPress: () => void }) {
  const [presse, setPresse] = useState(false);
  const r = remplissage(v);
  const info = infoStatutVoyage(v);
  const trajet = `${v.trajet?.province_depart || 'Départ'} → ${v.trajet?.province_arrivee || 'Arrivée'}`;
  const heure = String(v.heure_depart || '').slice(0, 5);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPresse(true)}
      onPressOut={() => setPresse(false)}
      accessibilityRole="button"
      accessibilityLabel={`${heure}, ${trajet}, ${r.pris} places sur ${r.total}, ${info.libelle}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur, backgroundColor: presse ? couleurs.ocean50 : 'transparent' }}
    >
      <View style={{ width: 50 }}>
        <Texte variante="montant" taille={16}>{heure}</Texte>
        <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>{libelleType(v.type)}</Texte>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texte graisse="tresGras" taille={13.5} numberOfLines={1}>{trajet}</Texte>
        <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris} numberOfLines={1}>
          {[v.voiture?.matricule, [v.voiture?.marque, v.voiture?.modele].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
        </Texte>
        <View style={{ height: 4, borderRadius: 999, backgroundColor: couleurs.ocean50, marginTop: 6, overflow: 'hidden' }}>
          <View style={{ width: `${r.pct}%`, height: '100%', backgroundColor: r.complet ? couleurs.succes : couleurs.ocean800 }} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Texte variante="montant" taille={13}>{r.pris}/{r.total}</Texte>
        <Pastille libelle={info.libelle} tonalite={info.tonalite} />
      </View>
    </Pressable>
  );
}

/** Onglet « Voyages » de l'admin compagnie : voyages par statut et par jour, programmation. */
export const RenderVoyages: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [statut, setStatut] = useState<Statut>(1);
  const [periode, setPeriode] = useState<Periode>('tout');
  const [voyages, setVoyages] = useState<any[]>([]);
  const [page, setPage] = useState({ courante: 1, derniere: 1 });
  const [compteurs, setCompteurs] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [suite, setSuite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [feuillePeriode, setFeuillePeriode] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [formulaire, setFormulaire] = useState<{ visible: boolean; id: number | null }>({ visible: false, id: null });
  const requete = useRef(0);

  const filtres = useCallback(
    (s: Statut, p: Periode, numero: number, parPage = PAR_PAGE) => ({
      statut: s,
      ...bornes(p),
      page: numero,
      per_page: parPage,
      sort_field: 'voyage_date',
      // À venir : du plus proche au plus lointain ; passés : du plus récent au plus ancien
      sort_direction: s === 1 || s === 2 ? 'asc' : 'desc',
    }),
    []
  );

  const charger = useCallback(
    async (s: Statut, p: Periode, numero = 1) => {
      const n = ++requete.current;
      if (numero === 1) setErreur(null);
      const r = await voyageService.obtenirVoyagesPage(filtres(s, p, numero));
      if (n !== requete.current) return; // une requête plus récente a été lancée
      if (!r.statut) {
        if (numero === 1) setErreur(r.message || 'Impossible de charger les voyages.');
      } else {
        setVoyages((prev) => (numero === 1 ? r.voyages : [...prev, ...r.voyages]));
        setPage({ courante: r.pagination.current_page, derniere: r.pagination.last_page });
        setCompteurs((c) => ({ ...c, [s]: r.pagination.total }));
      }
    },
    [filtres]
  );

  /** Nombre de voyages de chaque statut sur la période (pour les puces). */
  const chargerCompteurs = useCallback(
    async (p: Periode) => {
      const res = await Promise.all(STATUTS.map((x) => voyageService.obtenirVoyagesPage(filtres(x.valeur, p, 1, 1))));
      const c: Record<number, number> = {};
      res.forEach((r, i) => {
        if (r.statut) c[STATUTS[i].valeur] = r.pagination.total;
      });
      setCompteurs(c);
    },
    [filtres]
  );

  const toutRecharger = useCallback(
    async (s: Statut, p: Periode) => {
      await Promise.all([charger(s, p, 1), chargerCompteurs(p)]);
    },
    [charger, chargerCompteurs]
  );

  // Recharge à chaque retour sur l'écran
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      toutRecharger(statut, periode).finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const changerStatut = (s: Statut) => {
    if (s === statut) return;
    setStatut(s);
    setVoyages([]);
    setLoading(true);
    charger(s, periode, 1).finally(() => setLoading(false));
  };

  const changerPeriode = (p: Periode) => {
    setFeuillePeriode(false);
    if (p === periode) return;
    setPeriode(p);
    setVoyages([]);
    setLoading(true);
    toutRecharger(statut, p).finally(() => setLoading(false));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await toutRecharger(statut, periode);
    setRefreshing(false);
  };

  const plus = () => {
    if (suite || loading || page.courante >= page.derniere) return;
    setSuite(true);
    charger(statut, periode, page.courante + 1).finally(() => setSuite(false));
  };

  const apresChangement = () => toutRecharger(statut, periode);

  // Regroupement par jour, heures croissantes dans chaque jour
  const sections = useMemo(() => {
    const parJour = new Map<string, any[]>();
    voyages.forEach((v) => {
      const cle = String(v.date || '').slice(0, 10);
      if (!parJour.has(cle)) parJour.set(cle, []);
      parJour.get(cle)!.push(v);
    });
    return Array.from(parJour.entries()).map(([cle, data]) => {
      const d = dateVoyage(cle);
      return { titre: d ? titreJour(d) : cle, data: [...data].sort((a, b) => String(a.heure_depart).localeCompare(String(b.heure_depart))) };
    });
  }, [voyages]);

  const infoStatut = STATUTS.find((s) => s.valeur === statut)!;
  const infoPeriode = PERIODES.find((p) => p.valeur === periode)!;
  const total = compteurs[statut];

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <SectionList
        sections={sections}
        keyExtractor={(v) => String(idVoyage(v))}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 100, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        onEndReached={plus}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Texte variante="titre" taille={26}>Voyages</Texte>
                <Texte graisse="moyen" taille={13} couleur={couleurs.gris}>
                  {total === undefined ? ' ' : `${total} ${infoStatut.pluriel} ${infoPeriode.suffixe}`}
                </Texte>
              </View>
              <Pressable
                onPress={() => setFeuillePeriode(true)}
                accessibilityRole="button"
                accessibilityLabel={`Période : ${infoPeriode.libelle}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: couleurs.ocean100, backgroundColor: couleurs.surface }}
              >
                <Ionicons name="calendar-outline" size={18} color={couleurs.ocean800} />
                <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean800}>{infoPeriode.libelle}</Texte>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {STATUTS.map((s) => (
                <Puce key={s.valeur} libelle={s.libelle} compteur={compteurs[s.valeur] || undefined} active={statut === s.valeur} onPress={() => changerStatut(s.valeur)} />
              ))}
            </ScrollView>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Texte graisse="gras" taille={11} couleur={couleurs.gris} style={{ textTransform: 'uppercase', letterSpacing: 0.9, marginTop: 12, marginBottom: 8, marginLeft: 2 }}>
            {section.titre}
          </Texte>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={{
              backgroundColor: couleurs.surface,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: couleurs.ligne,
              borderTopWidth: index === 0 ? 1 : 0,
              borderBottomWidth: index === section.data.length - 1 ? 1 : 0,
              borderTopLeftRadius: index === 0 ? 16 : 0,
              borderTopRightRadius: index === 0 ? 16 : 0,
              borderBottomLeftRadius: index === section.data.length - 1 ? 16 : 0,
              borderBottomRightRadius: index === section.data.length - 1 ? 16 : 0,
              overflow: 'hidden',
            }}
          >
            <LigneVoyage v={item} premiere={index === 0} onPress={() => setDetail(item)} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 10, marginTop: 12 }}>
              <Skeleton height={14} width={160} borderRadius={6} />
              <Skeleton height={150} borderRadius={16} />
              <Skeleton height={14} width={140} borderRadius={6} />
              <Skeleton height={76} borderRadius={16} />
            </View>
          ) : erreur ? (
            <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24, marginTop: 12 }}>
              <Ionicons name="cloud-offline-outline" size={30} color={couleurs.danger} />
              <Texte variante="legende" centre>{erreur}</Texte>
            </Carte>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 6 }}>
              <Ionicons name="bus-outline" size={36} color={couleurs.grisClair} />
              <Texte graisse="tresGras" taille={15}>Aucun voyage {infoStatut.pluriel}</Texte>
              <Texte variante="legende" centre>{statut === 1 ? 'Touchez « Programmer » pour ouvrir un voyage aux réservations.' : 'Changez de période pour voir plus de voyages.'}</Texte>
            </View>
          )
        }
        ListFooterComponent={suite ? <ActivityIndicator color={couleurs.ocean800} style={{ paddingVertical: 14 }} /> : null}
      />

      {/* Programmer */}
      <Pressable
        onPress={() => setFormulaire({ visible: true, id: null })}
        accessibilityRole="button"
        accessibilityLabel="Programmer un voyage"
        style={{
          position: 'absolute',
          bottom: 16,
          alignSelf: 'center',
          height: 54,
          paddingHorizontal: 20,
          borderRadius: 18,
          backgroundColor: couleurs.ocean800,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          ...ombres.bouton,
        }}
      >
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Texte graisse="tresGras" taille={15} couleur="#FFFFFF">Programmer</Texte>
      </Pressable>

      <FeuilleModale visible={feuillePeriode} onClose={() => setFeuillePeriode(false)} titre="Période">
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
          {PERIODES.map((p, i) => (
            <Pressable
              key={p.valeur}
              onPress={() => changerPeriode(p.valeur)}
              accessibilityRole="radio"
              accessibilityState={{ checked: periode === p.valeur }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}
            >
              <Texte graisse={periode === p.valeur ? 'tresGras' : 'moyen'} taille={15}>{p.libelle}</Texte>
              {periode === p.valeur && <Ionicons name="checkmark-circle" size={22} color={couleurs.ocean800} />}
            </Pressable>
          ))}
        </View>
      </FeuilleModale>

      <DetailVoyage
        visible={!!detail}
        voyageId={detail ? idVoyage(detail) : null}
        apercu={detail}
        onClose={() => setDetail(null)}
        onModifier={(id) => setFormulaire({ visible: true, id })}
        onChange={apresChangement}
      />

      <FormulaireVoyage
        visible={formulaire.visible}
        voyageId={formulaire.id}
        onClose={() => setFormulaire({ visible: false, id: null })}
        onSuccess={apresChangement}
      />
    </View>
  );
};
