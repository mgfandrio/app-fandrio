import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reservationAdminService } from '@/app/services/reservations/reservationAdminService';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Carte, EnTete, FeuilleModale, Puce, Segmente, Texte } from '@/app/components/ui';
import { Recherche } from '@/app/components/flotte/communs';
import { couleurs, dateLocaleISO, formatAriary } from '@/app/theme/ocean';

type Periode = 'semaine' | 'mois' | 'annee' | 'tout';

const OPERATEURS = [
  { libelle: 'Tous', id: 0 },
  { libelle: 'MVola', id: 2 },
  { libelle: 'Orange Money', id: 1 },
  { libelle: 'Airtel', id: 3 },
];

/** Bornes de dates de la période (semaine du lundi). */
function bornes(p: Periode): Record<string, string> {
  const d = new Date();
  if (p === 'semaine') {
    const lundi = new Date(d);
    lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return { date_debut: dateLocaleISO(lundi) };
  }
  if (p === 'mois') return { date_debut: dateLocaleISO(new Date(d.getFullYear(), d.getMonth(), 1)) };
  if (p === 'annee') return { date_debut: `${d.getFullYear()}-01-01` };
  return {};
}

function abregerOperateur(t?: string) {
  if (!t) return '';
  if (t.includes('Orange')) return 'Orange';
  if (t.includes('Airtel')) return 'Airtel';
  return t;
}

function Ligne({ libelle, valeur }: { libelle: string; valeur?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris}>{libelle}</Texte>
      <Texte graisse="gras" taille={13.5} style={{ flexShrink: 1, textAlign: 'right' }}>{valeur || '—'}</Texte>
    </View>
  );
}

/** Onglet « Factures » de l'admin compagnie : billets payés, filtrés par période et opérateur. */
export const RenderFactures = ({ onMenu }: { onMenu?: () => void }) => {
  const insets = useSafeAreaInsets();
  const [periode, setPeriode] = useState<Periode>('mois');
  const [operateur, setOperateur] = useState(0);
  const [recherche, setRecherche] = useState('');
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState('');
  const [factures, setFactures] = useState<any[]>([]);
  const [resume, setResume] = useState<any>({});
  const [page, setPage] = useState({ courante: 1, derniere: 1 });
  const [loading, setLoading] = useState(true);
  const [suite, setSuite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const requete = useRef(0);

  // Recherche envoyée après une courte pause de frappe
  useEffect(() => {
    const t = setTimeout(() => setRechercheEnvoyee(recherche.trim()), 450);
    return () => clearTimeout(t);
  }, [recherche]);

  const charger = useCallback(
    async (numero = 1) => {
      const n = ++requete.current;
      const params: any = { page: numero, ...bornes(periode) };
      if (operateur) params.type_paie_id = operateur;
      if (rechercheEnvoyee) params.search = rechercheEnvoyee;
      const r = await reservationAdminService.obtenirFactures(params);
      if (n !== requete.current) return;
      if (r.statut) {
        setFactures((f) => (numero === 1 ? r.data.factures || [] : [...f, ...(r.data.factures || [])]));
        setResume(r.data.resume || {});
        setPage({ courante: r.data.pagination?.current_page || numero, derniere: r.data.pagination?.last_page || numero });
      }
    },
    [periode, operateur, rechercheEnvoyee]
  );

  useEffect(() => {
    setLoading(true);
    charger(1).finally(() => setLoading(false));
  }, [charger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await charger(1);
    setRefreshing(false);
  };

  const plus = () => {
    if (suite || loading || page.courante >= page.derniere) return;
    setSuite(true);
    charger(page.courante + 1).finally(() => setSuite(false));
  };

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre="Factures" gauche="menu" onGauche={onMenu} />
      <FlatList
        data={loading ? [] : factures}
        keyExtractor={(f) => String(f.res_id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        onEndReached={plus}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <Segmente<Periode>
              libelleAccessible="Période"
              valeur={periode}
              onChange={setPeriode}
              options={[
                { valeur: 'semaine', libelle: 'Semaine' },
                { valeur: 'mois', libelle: 'Ce mois' },
                { valeur: 'annee', libelle: 'Année' },
                { valeur: 'tout', libelle: 'Tout' },
              ]}
            />
            <View style={{ backgroundColor: couleurs.ocean950, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Texte graisse="gras" taille={12} couleur={couleurs.texteSurMarine}>Chiffre d'affaires facturé</Texte>
                <Texte variante="montant" taille={26} couleur="#FFFFFF">
                  {loading ? '…' : formatAriary(Number(resume.total_montant) || 0)} <Texte graisse="tresGras" taille={13} couleur={couleurs.texteSurMarine}>Ar</Texte>
                </Texte>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Texte variante="montant" taille={18} couleur="#FFFFFF">{loading ? '…' : resume.total_factures || 0}</Texte>
                <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>factures</Texte>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {OPERATEURS.map((o) => (
                <Puce key={o.id} libelle={o.libelle} active={operateur === o.id} onPress={() => setOperateur(o.id)} />
              ))}
            </ScrollView>
            <Recherche valeur={recherche} onChange={setRecherche} placeholder="N° de billet, client, téléphone" />
            {loading && <Skeleton height={260} borderRadius={16} />}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
              <Ionicons name="receipt-outline" size={34} color={couleurs.grisClair} />
              <Texte graisse="tresGras" taille={15}>Aucune facture</Texte>
              <Texte variante="legende" centre>Changez de période ou d’opérateur.</Texte>
            </View>
          )
        }
        ListFooterComponent={suite ? <ActivityIndicator color={couleurs.ocean800} style={{ paddingVertical: 14 }} /> : null}
        renderItem={({ item: f, index }) => (
          <Pressable
            onPress={() => setDetail(f)}
            accessibilityRole="button"
            accessibilityLabel={`Facture ${f.res_numero}, ${f.client?.nom || ''}, ${formatAriary(Number(f.montant_total) || 0)} ariary`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 11,
              paddingHorizontal: 14,
              backgroundColor: couleurs.surface,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: couleurs.ligne,
              borderTopWidth: 1,
              borderTopColor: index === 0 ? couleurs.ligne : couleurs.separateur,
              borderBottomWidth: index === factures.length - 1 ? 1 : 0,
              borderTopLeftRadius: index === 0 ? 16 : 0,
              borderTopRightRadius: index === 0 ? 16 : 0,
              borderBottomLeftRadius: index === factures.length - 1 ? 16 : 0,
              borderBottomRightRadius: index === factures.length - 1 ? 16 : 0,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Texte graisse="tresGras" taille={13.5}>{f.res_numero}</Texte>
                {!!f.type_paiement && (
                  <View style={{ height: 20, paddingHorizontal: 7, borderRadius: 6, backgroundColor: couleurs.fond, justifyContent: 'center' }}>
                    <Texte graisse="tresGras" taille={10.5} couleur={couleurs.encreDouce}>{abregerOperateur(f.type_paiement)}</Texte>
                  </View>
                )}
              </View>
              <Texte graisse="gras" taille={12} couleur={couleurs.encreDouce} numberOfLines={1} style={{ marginTop: 2 }}>{f.client?.nom || 'Client'}</Texte>
              <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris} numberOfLines={1}>
                {[f.trajet, `${f.nb_voyageurs} voyageur${f.nb_voyageurs > 1 ? 's' : ''}`, f.voyage_date].filter(Boolean).join(' · ')}
              </Texte>
            </View>
            <Texte variante="montant" taille={14}>{formatAriary(Number(f.montant_total) || 0)} Ar</Texte>
          </Pressable>
        )}
      />

      <FeuilleModale visible={!!detail} onClose={() => setDetail(null)} titre={detail ? `Facture ${detail.res_numero}` : 'Facture'} sousTitre={detail?.date}>
        {detail && (
          <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, gap: 12 }}>
            <Carte style={{ gap: 9 }}>
              <Ligne libelle="Client" valeur={detail.client?.nom} />
              <Ligne libelle="Téléphone" valeur={detail.client?.telephone} />
              <Ligne libelle="Trajet" valeur={detail.trajet} />
              <Ligne libelle="Voyage du" valeur={detail.voyage_date} />
              <Ligne libelle="Voyageurs" valeur={String(detail.nb_voyageurs)} />
              <Ligne libelle="Paiement" valeur={[detail.type_paiement, detail.numero_paiement].filter(Boolean).join(' · ')} />
            </Carte>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 }}>
              <Texte graisse="tresGras" taille={15}>Total</Texte>
              <Texte variante="montant" taille={20}>{formatAriary(Number(detail.montant_total) || 0)} Ar</Texte>
            </View>
          </View>
        )}
      </FeuilleModale>
    </View>
  );
};
