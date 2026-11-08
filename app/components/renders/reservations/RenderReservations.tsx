import React, { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reservationAdminService } from '@/app/services/reservations/reservationAdminService';
import { genererFicheVoyageurs } from '@/app/utils/ficheVoyageurs';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Bouton, Carte, Pastille, Segmente, Texte } from '@/app/components/ui';
import { DetailVoyage } from '@/app/components/voyages/DetailVoyage';
import { FormulaireVoyage } from '@/app/components/voyages/FormulaireVoyage';
import { couleurs, dateLocaleISO, formatAriary } from '@/app/theme/ocean';
import { dateCourte, dateVoyage, infoStatutVoyage, remplissage } from '@/app/utils/voyageStatut';

type Statut = 1 | 2 | 3;

const ONGLETS: { valeur: Statut; libelle: string; revenu: string }[] = [
  { valeur: 1, libelle: 'À venir', revenu: 'Revenu à venir' },
  { valeur: 2, libelle: 'En cours', revenu: 'Revenu en cours' },
  { valeur: 3, libelle: 'Terminés', revenu: 'Revenu encaissé' },
];

const PAGES_MAX = 10;

/** « Aujourd'hui », « Demain » ou « Lun. 9 nov. ». */
function jourRelatif(iso?: string) {
  const d = dateVoyage(iso);
  if (!d) return '';
  const auj = new Date();
  const dem = new Date();
  dem.setDate(dem.getDate() + 1);
  if (dateLocaleISO(d) === dateLocaleISO(auj)) return "Aujourd'hui";
  if (dateLocaleISO(d) === dateLocaleISO(dem)) return 'Demain';
  return dateCourte(d);
}

/** Carte d'un voyage vendu : départ → arrivée, remplissage, montant, actions. */
function CarteVoyage({ v, onDetail }: { v: any; onDetail: () => void }) {
  const [pdf, setPdf] = useState(false);
  const r = remplissage(v);
  const info = infoStatutVoyage(v);
  return (
    <Carte style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Texte graisse="gras" taille={12.5} couleur={couleurs.gris} numberOfLines={1} style={{ flex: 1 }}>
          {[jourRelatif(v.date_raw || v.date), v.voiture?.matricule].filter(Boolean).join(' · ')}
        </Texte>
        <Pastille libelle={info.libelle} tonalite={info.tonalite} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ maxWidth: '42%' }}>
          <Texte variante="montant" taille={18}>{String(v.heure_depart || '').slice(0, 5)}</Texte>
          <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>{v.trajet?.province_depart}</Texte>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: couleurs.ocean800 }} />
          <View style={{ flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: couleurs.ocean100 }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: couleurs.ocean800 }} />
        </View>
        <View style={{ maxWidth: '42%', alignItems: 'flex-end' }}>
          <Texte graisse="tresGras" taille={15} numberOfLines={1}>{v.trajet?.province_arrivee}</Texte>
          <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>
            {v.total_voyageurs} voyageur{v.total_voyageurs > 1 ? 's' : ''}
          </Texte>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: couleurs.ocean50, overflow: 'hidden' }}>
          <View style={{ width: `${r.pct}%`, height: '100%', backgroundColor: r.complet ? couleurs.succes : couleurs.ocean800 }} />
        </View>
        <Texte graisse="tresGras" taille={12.5}>{r.pris}/{r.total} places</Texte>
        <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris}>· {formatAriary(Number(v.revenu_total) || 0)} Ar</Texte>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Bouton
          titre="Fiche voyageurs"
          variante="secondaire"
          icone="document-text-outline"
          compact
          chargement={pdf}
          style={{ flex: 1 }}
          onPress={async () => {
            setPdf(true);
            try {
              await genererFicheVoyageurs(v);
            } finally {
              setPdf(false);
            }
          }}
        />
        <Bouton titre="Détails" compact onPress={onDetail} style={{ flex: 1 }} />
      </View>
    </Carte>
  );
}

/** Onglet « Réservations » de l'admin compagnie : billets vendus, voyage par voyage. */
export const RenderReservations = () => {
  const insets = useSafeAreaInsets();
  const [statut, setStatut] = useState<Statut>(1);
  const [voyages, setVoyages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [edition, setEdition] = useState<number | null>(null);
  const requete = useRef(0);

  /** Charge toutes les pages du statut (les sommes du résumé portent sur tout). */
  const charger = useCallback(async (s: Statut) => {
    const n = ++requete.current;
    setErreur(null);
    let tous: any[] = [];
    for (let page = 1; page <= PAGES_MAX; page++) {
      const r = await reservationAdminService.obtenirVoyagesAvecReservations(page, s);
      if (n !== requete.current) return;
      if (!r.statut) {
        setErreur(r.message || 'Impossible de charger les réservations.');
        break;
      }
      tous = tous.concat(r.data.voyages || []);
      if (!r.data.pagination?.last_page || page >= r.data.pagination.last_page) break;
    }
    setVoyages(tous);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      charger(statut).finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const changer = (s: Statut) => {
    setStatut(s);
    setVoyages([]);
    setLoading(true);
    charger(s).finally(() => setLoading(false));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await charger(statut);
    setRefreshing(false);
  };

  // À venir et en cours : du plus proche au plus lointain ; terminés : du plus récent
  const tries = useMemo(() => {
    const cle = (v: any) => `${v.date_raw || ''} ${v.heure_depart || ''}`;
    return [...voyages].sort((a, b) => (statut === 3 ? cle(b).localeCompare(cle(a)) : cle(a).localeCompare(cle(b))));
  }, [voyages, statut]);

  const revenu = voyages.reduce((s, v) => s + (Number(v.revenu_total) || 0), 0);
  const vendues = voyages.reduce((s, v) => s + (Number(v.places_reservees) || 0), 0);
  const offertes = voyages.reduce((s, v) => s + (Number(v.places_disponibles) || 0), 0);
  const onglet = ONGLETS.find((o) => o.valeur === statut)!;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 28, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Texte variante="titre" taille={26}>Réservations</Texte>
          <Texte graisse="moyen" taille={13} couleur={couleurs.gris}>Billets vendus par voyage</Texte>
        </View>

        <Segmente<string>
          libelleAccessible="Statut des voyages"
          valeur={String(statut)}
          onChange={(v) => changer(Number(v) as Statut)}
          options={ONGLETS.map((o) => ({ valeur: String(o.valeur), libelle: o.libelle }))}
        />

        <Carte style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
          <View style={{ flex: 1 }}>
            <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>{onglet.revenu}</Texte>
            <Texte variante="montant" taille={18}>{loading ? '…' : `${formatAriary(revenu)} Ar`}</Texte>
          </View>
          <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: couleurs.separateur }} />
          <View style={{ flex: 1 }}>
            <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>Places vendues</Texte>
            <Texte variante="montant" taille={18}>{loading ? '…' : `${vendues} / ${offertes}`}</Texte>
          </View>
        </Carte>

        {loading ? (
          [1, 2].map((i) => <Skeleton key={i} height={196} borderRadius={16} />)
        ) : erreur ? (
          <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
            <Ionicons name="cloud-offline-outline" size={30} color={couleurs.danger} />
            <Texte variante="legende" centre>{erreur}</Texte>
            <Bouton titre="Réessayer" variante="secondaire" compact icone="refresh" onPress={onRefresh} />
          </Carte>
        ) : tries.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 6 }}>
            <Ionicons name="ticket-outline" size={36} color={couleurs.grisClair} />
            <Texte graisse="tresGras" taille={15}>Aucun billet vendu</Texte>
            <Texte variante="legende" centre>Les voyages avec des réservations payées apparaîtront ici.</Texte>
          </View>
        ) : (
          tries.map((v) => <CarteVoyage key={v.voyage_id} v={v} onDetail={() => setDetail(v)} />)
        )}
      </ScrollView>

      <DetailVoyage
        visible={!!detail}
        voyageId={detail?.voyage_id ?? null}
        apercu={detail}
        onClose={() => setDetail(null)}
        onModifier={(id) => setEdition(id)}
        onChange={() => charger(statut)}
      />
      <FormulaireVoyage visible={edition !== null} voyageId={edition} onClose={() => setEdition(null)} onSuccess={() => charger(statut)} />
    </View>
  );
};
