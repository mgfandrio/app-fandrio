import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import utilisateurService from '../../services/utilisateurs/utilisateurService';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, Carte, FeuilleModale, Pastille, Puce, Texte } from '../ui';
import { couleurs, formatAriary, Tonalite } from '../../theme/ocean';
import { Recherche } from '../flotte/communs';
import { donnees, initialesNom } from './outils';

type Filtre = 'tous' | '1' | '2' | '3';

const STATUTS: Record<number, { libelle: string; tonalite: Tonalite; point: string }> = {
  1: { libelle: 'Actif', tonalite: 'succes', point: couleurs.succesVif },
  2: { libelle: 'Inactif', tonalite: 'neutre', point: '#B6C2D2' },
  3: { libelle: 'Supprimé', tonalite: 'danger', point: couleurs.danger },
};

function Ligne({ libelle, valeur, onPress }: { libelle: string; valeur?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress || !valeur} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris}>{libelle}</Texte>
      <Texte graisse="gras" taille={13.5} couleur={onPress && valeur ? couleurs.ocean800 : couleurs.encre} style={{ flexShrink: 1, textAlign: 'right' }}>{valeur || '—'}</Texte>
    </Pressable>
  );
}

/** Onglet « Utilisateurs » de l'admin système : comptes clients, recherche, statut. */
export function UtilisateursSys() {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [q, setQ] = useState('');
  const [qEnvoye, setQEnvoye] = useState('');
  const [liste, setListe] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState({ courante: 1, derniere: 1 });
  const [chargement, setChargement] = useState(true);
  const [suite, setSuite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fiche, setFiche] = useState<any>(null);
  const [ficheDetail, setFicheDetail] = useState<any>(null);
  const [occupe, setOccupe] = useState(false);
  const requete = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQEnvoye(q.trim()), 450);
    return () => clearTimeout(t);
  }, [q]);

  const charger = useCallback(
    async (numero = 1) => {
      const n = ++requete.current;
      const params: any = { per_page: 30, page: numero, sort_field: 'created_at', sort_direction: 'desc' };
      if (filtre !== 'tous') params.statut = Number(filtre);
      if (qEnvoye) params.recherche = qEnvoye;
      const r: any = donnees(await utilisateurService.listerUtilisateurs(params).catch(() => null));
      if (n !== requete.current) return;
      setListe((x) => (numero === 1 ? r?.utilisateurs || [] : [...x, ...(r?.utilisateurs || [])]));
      setPage({ courante: r?.pagination?.current_page || numero, derniere: r?.pagination?.last_page || numero });
    },
    [filtre, qEnvoye]
  );

  const chargerStats = useCallback(async () => setStats(donnees(await utilisateurService.getStatistiques().catch(() => null))), []);

  useEffect(() => {
    setChargement(true);
    Promise.all([charger(1), chargerStats()]).finally(() => setChargement(false));
  }, [charger, chargerStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([charger(1), chargerStats()]);
    setRefreshing(false);
  };

  const plus = () => {
    if (suite || chargement || page.courante >= page.derniere) return;
    setSuite(true);
    charger(page.courante + 1).finally(() => setSuite(false));
  };

  const ouvrir = async (u: any) => {
    setFiche(u);
    setFicheDetail(null);
    setFicheDetail(donnees(await utilisateurService.getUtilisateur(u.id).catch(() => null)));
  };

  const agir = (titre: string, texte: string, bouton: string, danger: boolean, appel: () => Promise<any>) => {
    showDialog({
      title: titre,
      message: texte,
      type: danger ? 'danger' : 'warning',
      confirmText: bouton,
      cancelText: 'Retour',
      onConfirm: async () => {
        setOccupe(true);
        try {
          const r: any = await appel();
          if (r?.statut === false) showDialog({ title: 'Action impossible', message: r.message || 'Une erreur est survenue.', type: 'danger', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
          setFiche(null);
          await Promise.all([charger(1), chargerStats()]);
        } finally {
          setOccupe(false);
        }
      },
      onCancel: () => {},
    });
  };

  const statutFiche = Number(fiche?.statut);
  const nomFiche = fiche ? `${fiche.prenom} ${fiche.nom}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <DialogComponent />
      <FlatList
        data={chargement ? [] : liste}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        onEndReached={plus}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 12 }}>
            <View>
              <Texte variante="titre" taille={26}>Utilisateurs</Texte>
              <Texte graisse="moyen" taille={13} couleur={couleurs.gris}>
                {stats ? `${formatAriary(stats.total || 0)} comptes clients · ${stats.nouveaux_ce_mois || 0} nouveaux ce mois` : ' '}
              </Texte>
            </View>
            <Recherche valeur={q} onChange={setQ} placeholder="Nom, email ou téléphone" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {([
                ['tous', 'Tous', stats?.total],
                ['1', 'Actifs', stats?.actifs],
                ['2', 'Inactifs', stats?.inactifs],
                ['3', 'Supprimés', stats?.supprimes],
              ] as [Filtre, string, number | undefined][]).map(([v, l, n]) => (
                <Puce key={v} libelle={l} compteur={n || undefined} active={filtre === v} onPress={() => setFiltre(v)} />
              ))}
            </ScrollView>
            {chargement && <Skeleton height={360} borderRadius={16} />}
          </View>
        }
        ListEmptyComponent={
          chargement ? null : (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
              <Ionicons name="people-outline" size={34} color={couleurs.grisClair} />
              <Texte graisse="tresGras" taille={15}>Aucun utilisateur</Texte>
            </View>
          )
        }
        ListFooterComponent={suite ? <ActivityIndicator color={couleurs.ocean800} style={{ paddingVertical: 14 }} /> : null}
        renderItem={({ item: u, index }) => {
          const s = STATUTS[Number(u.statut)] || STATUTS[2];
          return (
            <Pressable
              onPress={() => ouvrir(u)}
              accessibilityRole="button"
              accessibilityLabel={`${u.prenom} ${u.nom}, ${s.libelle}`}
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
              <View>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                  <Texte graisse="tresGras" taille={14} couleur={couleurs.ocean800}>{initialesNom(`${u.prenom} ${u.nom}`)}</Texte>
                </View>
                <View style={{ position: 'absolute', right: 0, bottom: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: couleurs.surface, backgroundColor: s.point }} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Texte graisse="tresGras" taille={14} numberOfLines={1}>{u.prenom} {u.nom}</Texte>
                <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>{u.email || u.telephone}</Texte>
              </View>
              {Number(u.statut) !== 1 && <Pastille libelle={s.libelle} tonalite={s.tonalite} point={false} />}
            </Pressable>
          );
        }}
      />

      <FeuilleModale visible={!!fiche} onClose={() => setFiche(null)} titre={nomFiche} sousTitre={fiche ? `Client · ${STATUTS[statutFiche]?.libelle || ''}` : undefined}>
        {fiche && (
          <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
            <Carte style={{ gap: 9 }}>
              <Ligne libelle="Email" valeur={fiche.email} onPress={() => Linking.openURL(`mailto:${fiche.email}`)} />
              <Ligne libelle="Téléphone" valeur={fiche.telephone} onPress={() => Linking.openURL(`tel:${fiche.telephone}`)} />
              <Ligne libelle="Inscrit le" valeur={String(fiche.date_creation || '').slice(0, 10).split('-').reverse().join('/')} />
              {ficheDetail?.statistiques ? (
                <>
                  <Ligne libelle="Réservations" valeur={String(ficheDetail.statistiques.total_reservations ?? 0)} />
                  <Ligne libelle="Confirmées · annulées" valeur={`${ficheDetail.statistiques.reservations_confirmees ?? 0} · ${ficheDetail.statistiques.reservations_annulees ?? 0}`} />
                </>
              ) : !ficheDetail ? (
                <Skeleton height={40} borderRadius={8} />
              ) : null}
            </Carte>
            {statutFiche === 1 && (
              <Bouton titre="Désactiver le compte" variante="secondaire" icone="pause-circle-outline" chargement={occupe} onPress={() => agir('Désactiver ce compte ?', `${nomFiche} ne pourra plus se connecter. Ses billets restent valables.`, 'Désactiver', false, () => utilisateurService.desactiverUtilisateur(fiche.id))} />
            )}
            {statutFiche === 2 && (
              <Bouton titre="Réactiver le compte" icone="checkmark-circle-outline" chargement={occupe} onPress={() => agir('Réactiver ce compte ?', `${nomFiche} pourra de nouveau se connecter.`, 'Réactiver', false, () => utilisateurService.activerUtilisateur(fiche.id))} />
            )}
            {statutFiche === 3 && (
              <Bouton titre="Restaurer le compte" icone="refresh-outline" chargement={occupe} onPress={() => agir('Restaurer ce compte ?', `Le compte de ${nomFiche} sera réactivé.`, 'Restaurer', false, () => utilisateurService.reactiverUtilisateur(fiche.id))} />
            )}
            {statutFiche !== 3 && (
              <Bouton titre="Supprimer le compte" variante="danger" icone="trash-outline" onPress={() => agir('Supprimer ce compte ?', `${nomFiche} ne pourra plus utiliser FANDRIO. Vous pourrez le restaurer plus tard.`, 'Supprimer', true, () => utilisateurService.supprimerUtilisateur(fiche.id))} />
            )}
          </View>
        )}
      </FeuilleModale>
    </View>
  );
}

export default UtilisateursSys;
