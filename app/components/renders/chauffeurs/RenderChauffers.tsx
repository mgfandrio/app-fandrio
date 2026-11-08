import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { chauffeurService, voitureService } from '../../../services';
import { couleurs } from '../../../theme/ocean';
import { Skeleton } from '../../common/Skeleton';
import { BoutonIcone, Carte, EnTete, Pastille, Puce, Texte } from '../../ui';
import { FormulaireChauffeur } from '../../flotte/FormulaireChauffeur';
import { BoutonAjout, initiales, Recherche } from '../../flotte/communs';

type Filtre = 'tous' | 'actifs' | 'inactifs';

/** Ligne d'un chauffeur : avatar, nom, statut, véhicule, permis, téléphone, appel. */
function LigneChauffeur({ c, vehicule, premiere, onPress }: { c: any; vehicule?: string; premiere: boolean; onPress: () => void }) {
  const [presse, setPresse] = useState(false);
  const actif = Number(c.chauff_statut) === 1;
  const nom = `${c.chauff_prenom} ${c.chauff_nom}`;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPresse(true)}
      onPressOut={() => setPresse(false)}
      accessibilityRole="button"
      accessibilityLabel={`${nom}, ${actif ? 'actif' : 'inactif'}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur, backgroundColor: presse ? couleurs.ocean50 : 'transparent' }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: actif ? couleurs.ocean950 : couleurs.neutreFond, alignItems: 'center', justifyContent: 'center' }}>
        <Texte graisse="tresGras" taille={14} couleur={actif ? '#FFFFFF' : couleurs.neutre}>{initiales(c.chauff_prenom, c.chauff_nom)}</Texte>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Texte graisse="tresGras" taille={14.5} numberOfLines={1} style={{ flexShrink: 1 }}>{nom}</Texte>
          <Pastille libelle={actif ? 'Actif' : 'Inactif'} tonalite={actif ? 'succes' : 'neutre'} />
        </View>
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1} style={{ marginTop: 2 }}>
          {[vehicule || 'Sans véhicule', `permis ${c.chauff_permis}`, c.chauff_phone].filter(Boolean).join(' · ')}
        </Texte>
      </View>
      {!!c.chauff_phone && <BoutonIcone icone="call-outline" libelle={`Appeler ${nom}`} onPress={() => Linking.openURL(`tel:${c.chauff_phone}`)} />}
    </Pressable>
  );
}

/** Onglet « Chauffeurs » de l'admin compagnie. */
export function RenderChauffers({ onMenu }: { onMenu?: () => void }) {
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);
  const [voitures, setVoitures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [q, setQ] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [formulaire, setFormulaire] = useState<{ visible: boolean; id: number | null }>({ visible: false, id: null });

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      const [rc, rv] = await Promise.all([chauffeurService.obtenirListeChauffeurs(), voitureService.obtenirListeVoitures().catch(() => null)]);
      // Les chauffeurs supprimés (statut 3) restent en base : on les masque
      setChauffeurs((Array.isArray(rc?.data) ? rc.data : []).filter((c: any) => Number(c.chauff_statut) !== 3));
      setVoitures(Array.isArray(rv?.data) ? (rv as any).data : []);
    } catch {
      setErreur(true);
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

  const vehiculeDe = (id: any) => voitures.find((v) => String(v.chauff_id) === String(id))?.voit_matricule;
  const actifs = chauffeurs.filter((c) => Number(c.chauff_statut) === 1).length;
  const texte = q.trim().toLowerCase();
  const liste = chauffeurs
    .filter((c) => (filtre === 'tous' ? true : filtre === 'actifs' ? Number(c.chauff_statut) === 1 : Number(c.chauff_statut) !== 1))
    .filter((c) => !texte || `${c.chauff_prenom} ${c.chauff_nom} ${c.chauff_cin}`.toLowerCase().includes(texte))
    .sort((a, b) => Number(b.chauff_statut === 1) - Number(a.chauff_statut === 1) || `${a.chauff_prenom}`.localeCompare(`${b.chauff_prenom}`));

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete titre="Chauffeurs" sousTitre={loading ? undefined : `${actifs} actif${actifs > 1 ? 's' : ''} sur ${chauffeurs.length}`} gauche="menu" onGauche={onMenu} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Recherche valeur={q} onChange={setQ} placeholder="Nom ou numéro de CIN" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([
            ['tous', 'Tous'],
            ['actifs', 'Actifs'],
            ['inactifs', 'Inactifs'],
          ] as [Filtre, string][]).map(([v, l]) => (
            <Puce key={v} libelle={l} active={filtre === v} onPress={() => setFiltre(v)} />
          ))}
        </View>

        {loading ? (
          <Skeleton height={300} borderRadius={16} />
        ) : erreur ? (
          <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
            <Ionicons name="cloud-offline-outline" size={30} color={couleurs.danger} />
            <Texte variante="legende" centre>Impossible de charger les chauffeurs.</Texte>
          </Carte>
        ) : liste.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 6 }}>
            <Ionicons name="people-outline" size={36} color={couleurs.grisClair} />
            <Texte graisse="tresGras" taille={15}>Aucun chauffeur</Texte>
            <Texte variante="legende" centre>{texte || filtre !== 'tous' ? 'Aucun chauffeur ne correspond.' : 'Touchez « Ajouter » pour enregistrer votre premier chauffeur.'}</Texte>
          </View>
        ) : (
          <Carte padding={0} style={{ overflow: 'hidden' }}>
            {liste.map((c, i) => (
              <LigneChauffeur key={c.chauff_id} c={c} vehicule={vehiculeDe(c.chauff_id)} premiere={i === 0} onPress={() => setFormulaire({ visible: true, id: c.chauff_id })} />
            ))}
          </Carte>
        )}
      </ScrollView>

      <BoutonAjout libelle="Ajouter" onPress={() => setFormulaire({ visible: true, id: null })} />
      <FormulaireChauffeur visible={formulaire.visible} chauffeurId={formulaire.id} onClose={() => setFormulaire({ visible: false, id: null })} onSuccess={charger} />
    </View>
  );
}
