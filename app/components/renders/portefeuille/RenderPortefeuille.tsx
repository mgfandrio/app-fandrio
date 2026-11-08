import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reservationAdminService } from '../../../services/reservations/reservationAdminService';
import { couleurs, formatAriary } from '../../../theme/ocean';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import { Skeleton } from '../../common/Skeleton';
import { Bouton, Carte, FeuilleModale, Pastille, Texte } from '../../ui';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Onglet « Portefeuille » : solde du mois, collecte de commission, encaissements, transactions. */
export function RenderPortefeuille() {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [data, setData] = useState<any>(null);
  const [collecte, setCollecte] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState({ courante: 1, derniere: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [suite, setSuite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paiementEnCours, setPaiementEnCours] = useState<number | null>(null);
  const [historique, setHistorique] = useState(false);
  const [compagnie, setCompagnie] = useState('');

  const charger = useCallback(async () => {
    try {
      const u = JSON.parse((await SecureStore.getItemAsync('fandrioUser')) || '{}');
      setCompagnie(u?.compagnie?.nom || '');
    } catch {}
    const [p, c] = await Promise.all([
      reservationAdminService.obtenirPortefeuille({ page: 1, per_page: 20 }).catch(() => null),
      reservationAdminService.obtenirMaCollecte().catch(() => null),
    ]);
    if (p?.statut && p.data) {
      setData(p.data);
      setTransactions(p.data.transactions || []);
      setPage({ courante: p.data.pagination?.current_page || 1, derniere: p.data.pagination?.last_page || 1, total: p.data.pagination?.total || 0 });
    }
    if (c?.statut && c.data) setCollecte(c.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      charger().finally(() => setLoading(false));
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
      const r = await reservationAdminService.obtenirPortefeuille({ page: page.courante + 1, per_page: 20 });
      if (r.statut && r.data) {
        setTransactions((t) => [...t, ...(r.data.transactions || [])]);
        setPage((x) => ({ ...x, courante: r.data.pagination?.current_page || x.courante + 1 }));
      }
    } finally {
      setSuite(false);
    }
  };

  /** Paiement en ligne d'une collecte : ouvre la page de paiement renvoyée par l'API. */
  const payer = async (coll: any) => {
    setPaiementEnCours(coll.coll_id);
    try {
      const r = await reservationAdminService.payerCollecte(coll.coll_id);
      if (r.statut && r.data?.payment_url) await Linking.openURL(r.data.payment_url);
      else showDialog({ title: 'Paiement indisponible', message: r.message || "Impossible d'ouvrir le paiement pour le moment.", type: 'warning', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
    } catch (e: any) {
      showDialog({ title: 'Paiement indisponible', message: e?.message || 'Une erreur est survenue.', type: 'danger', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
    } finally {
      setPaiementEnCours(null);
    }
  };

  const mois = data?.par_periode?.ce_mois || { brut: 0, commission: 0, net: 0, billets: 0 };
  const taux = data?.taux_commission ?? collecte?.config?.taux;
  const aPayer = (collecte?.collectes || []).find((c: any) => c.payable);
  const prochaine = collecte?.prochaine_collecte;
  const operateurs: any[] = data?.repartition_operateur || [];
  const maxOp = Math.max(...operateurs.map((o) => Number(o.brut) || 0), 1);

  const entete = (
    <View style={{ gap: 14, marginBottom: 6 }}>
      <View>
        <Texte variante="titre" taille={26}>Portefeuille</Texte>
        <Texte graisse="moyen" taille={13} couleur={couleurs.gris}>{[compagnie, MOIS[new Date().getMonth()]].filter(Boolean).join(' · ')}</Texte>
      </View>

      {loading ? (
        <>
          <Skeleton height={170} borderRadius={20} />
          <Skeleton height={120} borderRadius={16} />
        </>
      ) : !data ? (
        <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
          <Ionicons name="cloud-offline-outline" size={30} color={couleurs.danger} />
          <Texte variante="legende" centre>Impossible de charger le portefeuille.</Texte>
          <Bouton titre="Réessayer" variante="secondaire" compact icone="refresh" onPress={onRefresh} />
        </Carte>
      ) : (
        <>
          {/* Solde du mois */}
          <View style={{ backgroundColor: couleurs.ocean950, borderRadius: 20, padding: 18, gap: 14 }}>
            <View>
              <Texte graisse="gras" taille={12} couleur={couleurs.texteSurMarine}>Solde net après commission</Texte>
              <Texte variante="montant" taille={32} couleur="#FFFFFF" style={{ letterSpacing: -0.5, marginTop: 2 }}>
                {formatAriary(mois.net)} <Texte graisse="tresGras" taille={14} couleur={couleurs.texteSurMarine}>Ar</Texte>
              </Texte>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }}>
              <View style={{ flex: 1 }}>
                <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>Revenu brut</Texte>
                <Texte variante="montant" taille={15} couleur="#FFFFFF">{formatAriary(mois.brut)} Ar</Texte>
              </View>
              <View style={{ flex: 1 }}>
                <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>Commission FANDRIO{taux != null ? ` (${String(taux).replace('.', ',')} %)` : ''}</Texte>
                <Texte variante="montant" taille={15} couleur="#FFFFFF">− {formatAriary(mois.commission)} Ar</Texte>
              </View>
            </View>
            <Texte graisse="moyen" taille={11.5} couleur={couleurs.texteSurMarine}>
              Depuis le début : {formatAriary(data.solde?.net || 0)} Ar net · {data.solde?.total_billets || 0} billets
            </Texte>
          </View>

          {/* Compte suspendu */}
          {collecte?.suspendu && (
            <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: couleurs.dangerFond }}>
              <Ionicons name="alert-circle" size={20} color={couleurs.danger} />
              <Texte graisse="gras" taille={12.5} couleur={couleurs.danger} style={{ flex: 1, lineHeight: 18 }}>
                Compte suspendu : commission impayée. Vos voyages sont masqués des clients jusqu’au règlement.
              </Texte>
            </View>
          )}

          {/* Collecte de commission */}
          {collecte && (
            <Carte style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: aPayer?.en_retard ? couleurs.dangerFond : couleurs.alerteFond, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="calendar-outline" size={20} color={aPayer?.en_retard ? couleurs.danger : couleurs.alerte} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texte graisse="tresGras" taille={14}>{aPayer ? 'Commission à payer' : 'Prochaine collecte'}</Texte>
                  <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>
                    {aPayer ? `${aPayer.periode_debut} → ${aPayer.periode_fin} · ${aPayer.nb_billets} billets` : prochaine ? prochaine.periode : 'Aucune collecte prévue'}
                  </Texte>
                </View>
                {(aPayer || prochaine) && (
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Texte variante="montant" taille={15}>{formatAriary(aPayer ? aPayer.montant_commission : prochaine.montant)} Ar</Texte>
                    <Pastille
                      libelle={aPayer?.en_retard ? 'En retard' : `Le ${aPayer ? aPayer.date_prevue : prochaine.date_prevue}`}
                      tonalite={aPayer?.en_retard ? 'danger' : 'alerte'}
                      point={false}
                    />
                  </View>
                )}
              </View>
              {aPayer && <Bouton titre="Payer la commission" icone="card-outline" onPress={() => payer(aPayer)} chargement={paiementEnCours === aPayer.coll_id} compact />}
              {(collecte.collectes || []).length > 0 && (
                <Pressable onPress={() => setHistorique(true)} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: 4 }}>
                  <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean800}>Historique des collectes</Texte>
                </Pressable>
              )}
            </Carte>
          )}

          {/* Par opérateur */}
          {operateurs.length > 0 && (
            <Carte style={{ gap: 11 }}>
              <Texte graisse="tresGras" taille={15}>Encaissements par opérateur</Texte>
              {operateurs.map((o) => (
                <View key={o.operateur} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Texte graisse="gras" taille={12.5} style={{ width: 96 }} numberOfLines={1}>{o.operateur}</Texte>
                  <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: couleurs.ocean50, overflow: 'hidden' }}>
                    <View style={{ width: `${((Number(o.brut) || 0) / maxOp) * 100}%`, height: '100%', borderRadius: 999, backgroundColor: couleurs.ocean800 }} />
                  </View>
                  <Texte variante="montant" taille={12.5} style={{ width: 92, textAlign: 'right' }}>{formatAriary(o.brut)}</Texte>
                </View>
              ))}
            </Carte>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 2, marginTop: 4 }}>
            <Texte graisse="tresGras" taille={16}>Transactions</Texte>
            <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris}>{page.total} au total</Texte>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <DialogComponent />
      <FlatList
        data={loading || !data ? [] : transactions}
        keyExtractor={(t) => String(t.res_id)}
        ListHeaderComponent={entete}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        onEndReached={plus}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && data ? (
            <View style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
              <Ionicons name="receipt-outline" size={32} color={couleurs.grisClair} />
              <Texte variante="legende" centre>Aucune transaction pour le moment.</Texte>
            </View>
          ) : null
        }
        ListFooterComponent={suite ? <ActivityIndicator color={couleurs.ocean800} style={{ paddingVertical: 14 }} /> : null}
        renderItem={({ item: t, index }) => (
          <View
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
              borderBottomWidth: index === transactions.length - 1 ? 1 : 0,
              borderTopLeftRadius: index === 0 ? 16 : 0,
              borderTopRightRadius: index === 0 ? 16 : 0,
              borderBottomLeftRadius: index === transactions.length - 1 ? 16 : 0,
              borderBottomRightRadius: index === transactions.length - 1 ? 16 : 0,
            }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="ticket-outline" size={18} color={couleurs.ocean800} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Texte graisse="tresGras" taille={13.5} numberOfLines={1}>
                Billet {t.res_numero} · {t.nb_voyageurs} place{t.nb_voyageurs > 1 ? 's' : ''}
              </Texte>
              <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>{[t.operateur, t.date, t.client].filter(Boolean).join(' · ')}</Texte>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Texte variante="montant" taille={14} couleur={couleurs.succes}>+{formatAriary(t.net)}</Texte>
              <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>sur {formatAriary(t.brut)}</Texte>
            </View>
          </View>
        )}
      />

      <FeuilleModale visible={historique} onClose={() => setHistorique(false)} titre="Historique des collectes" sousTitre={collecte?.config ? `Collecte ${collecte.config.frequence} · ${collecte.config.taux} %` : undefined} hauteur="pleine">
        <FlatList
          data={collecte?.collectes || []}
          keyExtractor={(c) => String(c.coll_id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item: c, index }) => (
            <View style={{ paddingVertical: 12, gap: 6, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Texte graisse="tresGras" taille={14} style={{ flex: 1 }}>{c.periode_debut} → {c.periode_fin}</Texte>
                <Pastille libelle={c.en_retard ? 'En retard' : c.statut_label} tonalite={c.statut === 2 ? 'succes' : c.en_retard ? 'danger' : 'alerte'} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>
                  {c.nb_billets} billets · brut {formatAriary(c.montant_brut)} Ar
                </Texte>
                <Texte variante="montant" taille={13.5}>− {formatAriary(c.montant_commission)} Ar</Texte>
              </View>
              <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>
                {c.date_confirmation ? `Réglée le ${c.date_confirmation}` : `Prévue le ${c.date_prevue}`}
              </Texte>
              {c.payable && <Bouton titre="Payer" compact onPress={() => payer(c)} chargement={paiementEnCours === c.coll_id} />}
            </View>
          )}
        />
      </FeuilleModale>
    </View>
  );
}
