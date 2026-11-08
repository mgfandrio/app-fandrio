import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { trajetService } from '../../../services/trajets/trajetService';
import { couleurs, formatAriary } from '../../../theme/ocean';
import { Skeleton } from '../../common/Skeleton';
import { Carte, EnTete, Pastille, Texte } from '../../ui';
import { FormulaireTrajet } from '../../flotte/FormulaireTrajet';
import { BoutonAjout, libelleCategorie, Recherche } from '../../flotte/communs';

/** « 18:00 » -> « 18 h » ; « 08:15 » -> « 8 h 15 ». */
function duree(t: any) {
  const [h, m] = String(t.duree || '').split(':').map((x) => parseInt(x, 10));
  if (!h && !m) return t.duree_formatee || '—';
  return `${h || 0} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
}

/** Onglet « Trajets » de l'admin compagnie. */
export const RenderTrajets: React.FC<{ onMenu?: () => void }> = ({ onMenu }) => {
  const [trajets, setTrajets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [formulaire, setFormulaire] = useState<{ visible: boolean; id: number | null }>({ visible: false, id: null });

  const charger = useCallback(async () => {
    const r = await trajetService.obtenirTrajets();
    if (r.statut) {
      setTrajets(r.data || []);
      setErreur(null);
    } else setErreur(r.message || 'Impossible de charger les trajets.');
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

  const dep = (t: any) => t.province_depart?.nom_province || '';
  const arr = (t: any) => t.province_arrivee?.nom_province || '';
  const texte = q.trim().toLowerCase();
  const liste = trajets
    .filter((t) => !texte || `${dep(t)} ${arr(t)} ${t.nom_trajet}`.toLowerCase().includes(texte))
    .sort((a, b) => Number(b.statut === 1) - Number(a.statut === 1) || arr(a).localeCompare(arr(b)));
  const provinces = new Set(trajets.flatMap((t) => [dep(t), arr(t)]).filter(Boolean)).size;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete
        titre="Trajets"
        sousTitre={loading ? undefined : `${trajets.length} trajet${trajets.length > 1 ? 's' : ''} · ${provinces} province${provinces > 1 ? 's' : ''}`}
        gauche="menu"
        onGauche={onMenu}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Recherche valeur={q} onChange={setQ} placeholder="Ville de départ ou d'arrivée" />

        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} height={128} borderRadius={16} />)
        ) : erreur ? (
          <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
            <Ionicons name="cloud-offline-outline" size={30} color={couleurs.danger} />
            <Texte variante="legende" centre>{erreur}</Texte>
          </Carte>
        ) : liste.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 6 }}>
            <Ionicons name="map-outline" size={36} color={couleurs.grisClair} />
            <Texte graisse="tresGras" taille={15}>{texte ? 'Aucun trajet trouvé' : 'Aucun trajet'}</Texte>
            <Texte variante="legende" centre>{texte ? 'Essayez une autre ville.' : 'Créez un trajet pour pouvoir programmer des voyages.'}</Texte>
          </View>
        ) : (
          liste.map((t) => {
            const actif = Number(t.statut) === 1;
            return (
              <Carte
                key={t.id_trajet}
                onPress={() => setFormulaire({ visible: true, id: t.id_trajet })}
                accessibilityLabel={`${dep(t)} vers ${arr(t)}, ${formatAriary(Number(t.tarif) || 0)} ariary la place${actif ? '' : ', inactif'}`}
                style={{ gap: 10, opacity: actif ? 1 : 0.7 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 2.5, borderColor: couleurs.ocean800 }} />
                    <View style={{ width: 2, height: 14, backgroundColor: couleurs.ocean100 }} />
                    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: couleurs.ocean800 }} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Texte graisse="tresGras" taille={14.5} numberOfLines={1}>{dep(t)}</Texte>
                    <Texte graisse="tresGras" taille={14.5} numberOfLines={1}>{arr(t)}</Texte>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Texte variante="montant" taille={16} couleur={couleurs.ocean800}>{formatAriary(Number(t.tarif) || 0)}</Texte>
                    <Texte graisse="gras" taille={11} couleur={couleurs.gris}>Ar / place</Texte>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: couleurs.separateur, alignItems: 'flex-end' }}>
                  {[
                    ['Distance', t.distance_km ? `${t.distance_km} km` : '—'],
                    ['Durée', duree(t)],
                    ['Catégorie', libelleCategorie(t.categorie)],
                  ].map(([l, v]) => (
                    <View key={l} style={{ flex: 1 }}>
                      <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>{l}</Texte>
                      <Texte graisse="tresGras" taille={13.5}>{v}</Texte>
                    </View>
                  ))}
                  {!actif && <Pastille libelle="Inactif" tonalite="neutre" />}
                </View>
              </Carte>
            );
          })
        )}
      </ScrollView>

      <BoutonAjout libelle="Nouveau trajet" onPress={() => setFormulaire({ visible: true, id: null })} />
      <FormulaireTrajet visible={formulaire.visible} trajetId={formulaire.id} onClose={() => setFormulaire({ visible: false, id: null })} onSuccess={charger} />
    </View>
  );
};
