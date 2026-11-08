import React, { useCallback, useState } from 'react';
import { Image, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import commissionService from '../../services/commissions/commissionService';
import compagnieService from '../../services/compagnies/compagnieService';
import { Skeleton } from '../common/Skeleton';
import { Carte, Pastille, Puce, Texte } from '../ui';
import { couleurs, formatAriary } from '../../theme/ocean';
import { BoutonAjout, Recherche } from '../flotte/communs';
import { DetailCollecte } from './DetailCollecte';
import { FicheCompagnie } from './FicheCompagnie';
import { FormulaireCompagnie } from './FormulaireCompagnie';
import { donnees, etatCompagnie, initialesNom } from './outils';

type Filtre = 'toutes' | 'actives' | 'suspendues' | 'inactives';

/** Onglet « Compagnies » de l'admin système. */
export function CompagniesSys() {
  const insets = useSafeAreaInsets();
  const [cies, setCies] = useState<any[]>([]);
  const [infos, setInfos] = useState<Record<number, any>>({});
  const [chargement, setChargement] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [fiche, setFiche] = useState<number | null>(null);
  const [formulaire, setFormulaire] = useState<{ visible: boolean; id: number | null }>({ visible: false, id: null });
  const [collecte, setCollecte] = useState<number | null>(null);

  const charger = useCallback(async () => {
    const [rl, rc] = await Promise.all([
      compagnieService.listerCompagnies({ per_page: 200 } as any).catch(() => null),
      commissionService.getCompagnies().catch(() => null),
    ]);
    setCies(donnees<any>(rl)?.compagnies || []);
    const parId: Record<number, any> = {};
    (donnees<any>(rc)?.compagnies || []).forEach((x: any) => (parId[x.comp_id] = x));
    setInfos(parId);
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

  const suspendue = (c: any) => !!infos[c.id]?.suspendu;
  const actives = cies.filter((c) => Number(c.statut) === 1 && !suspendue(c)).length;
  const nbSuspendues = cies.filter(suspendue).length;
  const inactives = cies.filter((c) => Number(c.statut) !== 1 && !suspendue(c)).length;
  const texte = q.trim().toLowerCase();
  const liste = cies
    .filter((c) =>
      filtre === 'toutes' ? true : filtre === 'suspendues' ? suspendue(c) : filtre === 'actives' ? Number(c.statut) === 1 && !suspendue(c) : Number(c.statut) !== 1 && !suspendue(c)
    )
    .filter((c) => !texte || `${c.nom} ${c.localisation?.nom || ''} ${c.email || ''}`.toLowerCase().includes(texte))
    .sort((a, b) => Number(suspendue(b)) - Number(suspendue(a)) || (Number(infos[b.id]?.billets) || 0) - (Number(infos[a.id]?.billets) || 0));

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 96, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Texte variante="titre" taille={26}>Compagnies</Texte>
          <Texte graisse="moyen" taille={13} couleur={couleurs.gris}>Partenaires de transport</Texte>
        </View>

        <Carte padding={0} style={{ flexDirection: 'row' }}>
          {[
            [cies.length, 'Total', couleurs.encre],
            [actives, 'Actives', couleurs.succes],
            [nbSuspendues, 'Suspendues', couleurs.danger],
            [inactives, inactives > 1 ? 'Inactives' : 'Inactive', couleurs.neutre],
          ].map(([v, l, col], i) => (
            <View key={String(l)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: couleurs.separateur }}>
              <Texte variante="montant" taille={18} couleur={col as string}>{chargement ? '–' : (v as number)}</Texte>
              <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>{l as string}</Texte>
            </View>
          ))}
        </Carte>

        <Recherche valeur={q} onChange={setQ} placeholder="Nom, ville ou email" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {([
            ['toutes', 'Toutes'],
            ['actives', 'Actives'],
            ['suspendues', 'Suspendues'],
            ['inactives', 'Inactives'],
          ] as [Filtre, string][]).map(([v, l]) => (
            <Puce key={v} libelle={l} active={filtre === v} onPress={() => setFiltre(v)} />
          ))}
        </ScrollView>

        {chargement ? (
          [1, 2, 3].map((i) => <Skeleton key={i} height={130} borderRadius={16} />)
        ) : liste.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 6 }}>
            <Ionicons name="business-outline" size={36} color={couleurs.grisClair} />
            <Texte graisse="tresGras" taille={15}>Aucune compagnie</Texte>
          </View>
        ) : (
          liste.map((c) => {
            const info = infos[c.id] || {};
            const etat = etatCompagnie(c.statut, suspendue(c));
            return (
              <Carte key={c.id} onPress={() => setFiche(c.id)} accessibilityLabel={`${c.nom}, ${etat.libelle}`} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: couleurs.ocean950, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {c.logo ? <Image source={{ uri: c.logo }} style={{ width: '100%', height: '100%' }} /> : <Texte graisse="tresGras" taille={15} couleur="#FFFFFF">{initialesNom(c.nom)}</Texte>}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Texte graisse="tresGras" taille={15} numberOfLines={1}>{c.nom}</Texte>
                    <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>{c.localisation?.nom || c.adresse || ''}</Texte>
                  </View>
                  <Pastille libelle={etat.libelle} tonalite={etat.tonalite} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                  {[
                    [formatAriary(Number(info.billets) || 0), 'Billets vendus'],
                    [formatAriary(Number(info.commission) || 0), 'Commission (Ar)'],
                    [(info.frequence_collecte || c.frequence_collecte) === 'hebdomadaire' ? 'Hebdo.' : 'Mensuelle', 'Collecte'],
                  ].map(([v, l]) => (
                    <View key={l} style={{ flex: 1 }}>
                      <Texte variante="montant" taille={14}>{v}</Texte>
                      <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>{l}</Texte>
                    </View>
                  ))}
                </View>
                {suspendue(c) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: couleurs.dangerFond }}>
                    <Ionicons name="warning-outline" size={18} color={couleurs.danger} />
                    <Texte graisse="gras" taille={12.5} couleur={couleurs.danger} style={{ flex: 1 }}>Commission impayée · voyages masqués</Texte>
                  </View>
                )}
              </Carte>
            );
          })
        )}
      </ScrollView>

      <BoutonAjout libelle="Nouvelle" onPress={() => setFormulaire({ visible: true, id: null })} />

      <FicheCompagnie
        visible={fiche !== null}
        compagnieId={fiche}
        suspendu={fiche !== null && !!infos[fiche]?.suspendu}
        onClose={() => setFiche(null)}
        onModifier={(id) => {
          setFiche(null);
          setFormulaire({ visible: true, id });
        }}
        onVoirCollecte={(id) => {
          setFiche(null);
          setCollecte(id);
        }}
        onChange={charger}
      />
      <FormulaireCompagnie visible={formulaire.visible} compagnieId={formulaire.id} onClose={() => setFormulaire({ visible: false, id: null })} onSuccess={charger} />
      <DetailCollecte visible={collecte !== null} collecteId={collecte} onClose={() => setCollecte(null)} onChange={charger} />
    </View>
  );
}

export default CompagniesSys;
