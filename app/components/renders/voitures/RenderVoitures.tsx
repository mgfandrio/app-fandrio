import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { chauffeurService, voitureService } from '../../../services';
import { couleurs } from '../../../theme/ocean';
import { Skeleton } from '../../common/Skeleton';
import { Carte, EnTete, Pastille, Texte } from '../../ui';
import { DetailVehicule } from '../../flotte/DetailVehicule';
import { FormulaireVehicule } from '../../flotte/FormulaireVehicule';
import { BoutonAjout, libelleCategorie, Recherche } from '../../flotte/communs';

/** Onglet « Véhicules » de l'admin compagnie. */
export function RenderVoitures({ onMenu }: { onMenu?: () => void }) {
  const [voitures, setVoitures] = useState<any[]>([]);
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<number | null>(null);
  const [formulaire, setFormulaire] = useState<{ visible: boolean; id: number | null }>({ visible: false, id: null });

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      const [rv, rc] = await Promise.all([voitureService.obtenirListeVoitures(), chauffeurService.obtenirListeChauffeurs().catch(() => null)]);
      setVoitures(Array.isArray(rv?.data) ? rv.data : []);
      setChauffeurs(Array.isArray(rc?.data) ? (rc as any).data : []);
    } catch (e: any) {
      // L'API répond 404 quand la compagnie n'a encore aucun véhicule
      if (e?.statut === false || e?.message?.includes('Aucune')) setVoitures([]);
      else setErreur(true);
    }
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

  const nomChauffeur = (id: any) => {
    const c = chauffeurs.find((x) => String(x.chauff_id) === String(id));
    return c ? `${c.chauff_prenom} ${String(c.chauff_nom || '').charAt(0)}.` : 'Aucun';
  };

  const filtre = q.trim().toLowerCase();
  const liste = voitures.filter((v) => !filtre || `${v.voit_marque} ${v.voit_modele} ${v.voit_matricule}`.toLowerCase().includes(filtre));
  const disponibles = voitures.filter((v) => Number(v.voit_statut) === 1).length;
  const placesTotal = voitures.reduce((s, v) => s + (Number(v.voit_places) || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre="Véhicules" gauche="menu" onGauche={onMenu} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Carte padding={0} style={{ flexDirection: 'row' }}>
          {[
            { v: voitures.length, l: 'Véhicules', c: couleurs.encre },
            { v: disponibles, l: 'Disponibles', c: couleurs.succes },
            { v: placesTotal, l: 'Places au total', c: couleurs.encre },
          ].map((s, i) => (
            <View key={s.l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: couleurs.separateur }}>
              <Texte variante="montant" taille={18} couleur={s.c}>{loading ? '–' : s.v}</Texte>
              <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>{s.l}</Texte>
            </View>
          ))}
        </Carte>

        <Recherche valeur={q} onChange={setQ} placeholder="Marque ou immatriculation" />

        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} height={110} borderRadius={16} />)
        ) : erreur ? (
          <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
            <Ionicons name="cloud-offline-outline" size={30} color={couleurs.danger} />
            <Texte variante="legende" centre>Impossible de charger les véhicules.</Texte>
          </Carte>
        ) : liste.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 6 }}>
            <Ionicons name="bus-outline" size={36} color={couleurs.grisClair} />
            <Texte graisse="tresGras" taille={15}>{filtre ? 'Aucun véhicule trouvé' : 'Aucun véhicule'}</Texte>
            <Texte variante="legende" centre>{filtre ? 'Essayez une autre marque ou immatriculation.' : 'Touchez « Ajouter » pour enregistrer votre premier véhicule.'}</Texte>
          </View>
        ) : (
          liste.map((v) => {
            const dispo = Number(v.voit_statut) === 1;
            return (
              <Carte key={v.voit_id} onPress={() => setDetail(v.voit_id)} accessibilityLabel={`${v.voit_marque} ${v.voit_modele}, ${v.voit_matricule}, ${dispo ? 'disponible' : 'indisponible'}`} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="bus-outline" size={22} color={couleurs.ocean800} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Texte graisse="tresGras" taille={14.5} numberOfLines={1}>{v.voit_marque} {v.voit_modele}</Texte>
                    <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>
                      {v.voit_matricule}{v.voit_categorie && v.voit_categorie !== 'classique' ? ` · ${libelleCategorie(v.voit_categorie)}` : ''}
                    </Texte>
                  </View>
                  <Pastille libelle={dispo ? 'Disponible' : 'Indisponible'} tonalite={dispo ? 'succes' : 'neutre'} />
                </View>
                <View style={{ flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="people-outline" size={15} color={couleurs.gris} />
                    <Texte graisse="gras" taille={12} couleur={couleurs.encreDouce}>{v.voit_places} places</Texte>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="person-outline" size={15} color={couleurs.gris} />
                    <Texte graisse="gras" taille={12} couleur={couleurs.encreDouce}>{nomChauffeur(v.chauff_id)}</Texte>
                  </View>
                </View>
              </Carte>
            );
          })
        )}
      </ScrollView>

      <BoutonAjout libelle="Ajouter" onPress={() => setFormulaire({ visible: true, id: null })} />

      <DetailVehicule
        visible={detail !== null}
        voitureId={detail}
        onClose={() => setDetail(null)}
        onModifier={(id) => {
          setDetail(null);
          setFormulaire({ visible: true, id });
        }}
        onChange={charger}
      />
      <FormulaireVehicule visible={formulaire.visible} voitureId={formulaire.id} onClose={() => setFormulaire({ visible: false, id: null })} onSuccess={charger} />
    </View>
  );
}
