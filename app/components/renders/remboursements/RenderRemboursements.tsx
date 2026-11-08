import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { remboursementAdminService } from '@/app/services/remboursements/remboursementAdminService';
import { useConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Bouton, Carte, ChampSaisie, EnTete, FeuilleModale, Segmente, Texte } from '@/app/components/ui';
import { couleurs, formatAriary, tonalites } from '@/app/theme/ocean';

type Filtre = 'en_attente' | 'traites' | 'refuses';

const MOTIFS: Record<string, { libelle: string; ton: 'alerte' | 'danger' }> = {
  paiement_tardif: { libelle: 'Paiement reçu après le délai', ton: 'alerte' },
  voyage_annule: { libelle: 'Voyage annulé', ton: 'danger' },
};

function Etiquette({ motif }: { motif?: string }) {
  const m = MOTIFS[motif || ''] || MOTIFS.voyage_annule;
  const t = tonalites[m.ton];
  return (
    <View style={{ alignSelf: 'flex-start', height: 22, paddingHorizontal: 8, borderRadius: 8, backgroundColor: t.fond, justifyContent: 'center' }}>
      <Texte graisse="gras" taille={11} couleur={t.texte}>{m.libelle}</Texte>
    </View>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur?: string | null }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris}>{libelle}</Texte>
      <Texte graisse="gras" taille={12.5} style={{ flexShrink: 1, textAlign: 'right' }}>{valeur || '—'}</Texte>
    </View>
  );
}

/** Onglet « Remboursements » : demandes à traiter, traitées et refusées. */
export const RenderRemboursements = ({ onMenu }: { onMenu?: () => void }) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [filtre, setFiltre] = useState<Filtre>('en_attente');
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [references, setReferences] = useState<Record<number, string>>({});
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [refus, setRefus] = useState<any | null>(null);
  const [motifRefus, setMotifRefus] = useState('');

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  const charger = useCallback(async (f: Filtre) => {
    const [l, s] = await Promise.all([remboursementAdminService.obtenirListe({ statut: f, per_page: 50 }).catch(() => null), remboursementAdminService.obtenirStatistiques().catch(() => null)]);
    const liste = l?.statut && l.data ? l.data.items || [] : [];
    setItems(liste);
    if (s?.statut && s.data) setStats(s.data);
    // La première demande à traiter est dépliée
    setOuvert(f === 'en_attente' && liste[0] ? liste[0].res_id : null);
  }, []);

  useEffect(() => {
    setLoading(true);
    charger(filtre).finally(() => setLoading(false));
  }, [filtre, charger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await charger(filtre);
    setRefreshing(false);
  };

  const marquerRembourse = async (r: any) => {
    const reference = (references[r.res_id] || '').trim();
    if (reference.length < 3) return message('Référence manquante', 'Saisissez la référence du transfert mobile money.', 'warning');
    setEnvoi(r.res_id);
    try {
      const res = await remboursementAdminService.marquerTraite(r.res_id, { reference });
      if (res?.statut) {
        message('Remboursement enregistré', `${r.client?.nom || 'Le client'} est prévenu par notification.`, 'success');
        await charger(filtre);
      } else message('Action impossible', res?.message || 'Une erreur est survenue.');
    } finally {
      setEnvoi(null);
    }
  };

  const confirmerRefus = async () => {
    if (motifRefus.trim().length < 5) return message('Motif trop court', 'Expliquez le motif du refus en quelques mots.', 'warning');
    const r = refus;
    setEnvoi(r.res_id);
    try {
      const res = await remboursementAdminService.refuser(r.res_id, { motif: motifRefus.trim() });
      if (res?.statut) {
        setRefus(null);
        await charger(filtre);
      } else message('Action impossible', res?.message || 'Une erreur est survenue.');
    } finally {
      setEnvoi(null);
    }
  };

  const aRendre = Number(stats?.en_attente?.montant) || 0;
  const nbATraiter = Number(stats?.en_attente?.nombre) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <DialogComponent />
      <EnTete titre="Remboursements" sousTitre={stats ? (aRendre ? `${formatAriary(aRendre)} Ar à rendre` : 'Rien à rendre') : undefined} gauche="menu" onGauche={onMenu} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Segmente<Filtre>
          libelleAccessible="Statut"
          valeur={filtre}
          onChange={setFiltre}
          options={[
            { valeur: 'en_attente', libelle: 'À traiter', compteur: nbATraiter || undefined },
            { valeur: 'traites', libelle: 'Traités' },
            { valeur: 'refuses', libelle: 'Refusés' },
          ]}
        />

        {loading ? (
          [1, 2].map((i) => <Skeleton key={i} height={130} borderRadius={16} />)
        ) : items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 6 }}>
            <Ionicons name="checkmark-done-circle-outline" size={38} color={couleurs.grisClair} />
            <Texte graisse="tresGras" taille={15}>
              {filtre === 'en_attente' ? 'Aucun remboursement à traiter' : filtre === 'traites' ? 'Aucun remboursement traité' : 'Aucun remboursement refusé'}
            </Texte>
          </View>
        ) : (
          items.map((r) => {
            const deplie = ouvert === r.res_id && r.statut === 1;
            return (
              <Carte key={r.res_id} style={{ gap: 12, borderColor: deplie ? couleurs.ocean200 : couleurs.ligne }}>
                <Pressable onPress={() => r.statut === 1 && setOuvert(deplie ? null : r.res_id)} disabled={r.statut !== 1} accessibilityRole="button" style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Texte graisse="tresGras" taille={15} numberOfLines={1}>{r.client?.nom || 'Client'}</Texte>
                      <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>
                        {[r.res_numero, r.voyage?.trajet, r.voyage?.date].filter(Boolean).join(' · ')}
                      </Texte>
                    </View>
                    <Texte variante="montant" taille={17}>{formatAriary(Number(r.montant) || 0)} Ar</Texte>
                  </View>
                  <Etiquette motif={r.motif} />
                </Pressable>

                {(deplie || r.statut !== 1) && (
                  <View style={{ gap: 6, padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: couleurs.fond }}>
                    <Ligne libelle="À renvoyer sur" valeur={[r.paiement?.type, r.paiement?.numero || r.client?.telephone].filter(Boolean).join(' · ')} />
                    <Ligne libelle="Demande du" valeur={r.date_annulation} />
                    {r.statut === 2 && <Ligne libelle="Référence" valeur={r.reference} />}
                    {r.statut === 2 && <Ligne libelle="Remboursé le" valeur={r.date_traitement} />}
                    {r.statut === 3 && <Ligne libelle="Motif du refus" valeur={r.note} />}
                  </View>
                )}

                {deplie && (
                  <>
                    <ChampSaisie
                      libelle="Référence du transfert"
                      value={references[r.res_id] || ''}
                      onChangeText={(t) => setReferences((x) => ({ ...x, [r.res_id]: t }))}
                      placeholder="Ex. : MP261108.0915.B12345"
                      autoCapitalize="characters"
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Bouton
                        titre="Refuser"
                        variante="danger"
                        compact
                        style={{ flex: 1 }}
                        onPress={() => {
                          setMotifRefus('');
                          setRefus(r);
                        }}
                      />
                      <Bouton titre="Marquer comme remboursé" compact style={{ flex: 2 }} onPress={() => marquerRembourse(r)} chargement={envoi === r.res_id} />
                    </View>
                  </>
                )}
              </Carte>
            );
          })
        )}

        {filtre === 'en_attente' && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Ionicons name="information-circle-outline" size={18} color={couleurs.ocean800} />
            <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} style={{ flex: 1, lineHeight: 18 }}>
              Le client est prévenu par notification dès que vous marquez le remboursement comme fait.
            </Texte>
          </View>
        )}
      </ScrollView>

      <FeuilleModale
        visible={!!refus}
        onClose={() => setRefus(null)}
        titre="Refuser le remboursement"
        sousTitre={refus ? `${refus.client?.nom || ''} · ${formatAriary(Number(refus.montant) || 0)} Ar` : undefined}
        pied={<Bouton titre="Refuser" variante="dangerPlein" onPress={confirmerRefus} chargement={!!refus && envoi === refus.res_id} />}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}>
          <ChampSaisie
            libelle="Motif du refus"
            value={motifRefus}
            onChangeText={setMotifRefus}
            placeholder="Expliquez la raison au client"
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top' }}
            aide="Le client verra ce motif dans l’application."
          />
        </View>
      </FeuilleModale>
    </View>
  );
};
