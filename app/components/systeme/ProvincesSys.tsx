import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import provinceService from '../../services/provinces/provinceService';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, BoutonIcone, Carte, ChampSaisie, EnTete, FeuilleModale, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';
import { Choix } from '../flotte/communs';
import { donnees } from './outils';

const ORIENTATIONS = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'] as const;
type Orientation = (typeof ORIENTATIONS)[number];

/** Deux lettres repères : « Antananarivo » -> « TN » (consonnes), sinon les 2 premières. */
function abreviation(nom: string) {
  const c = (nom || '').toUpperCase().replace(/[^A-Z]/g, '').replace(/[AEIOUY]/g, '');
  return (c.slice(0, 2) || nom.slice(0, 2)).toUpperCase();
}

/** Provinces (maquette « Provinces ») : liste, ajout, modification, suppression. */
export function ProvincesSys({ onRetour }: { onRetour: () => void }) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [provinces, setProvinces] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [edition, setEdition] = useState<{ visible: boolean; id: number | null }>({ visible: false, id: null });
  const [nom, setNom] = useState('');
  const [orientation, setOrientation] = useState<Orientation>('Centre');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const r: any = donnees(await provinceService.listerProvinces({ per_page: 200 }).catch(() => null));
    setProvinces((r?.provinces || (Array.isArray(r) ? r : [])).slice().sort((a: any, b: any) => String(a.nom).localeCompare(String(b.nom))));
  }, []);

  useEffect(() => {
    charger().finally(() => setChargement(false));
  }, [charger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await charger();
    setRefreshing(false);
  };

  const ouvrir = (p?: any) => {
    setNom(p?.nom || '');
    setOrientation(ORIENTATIONS.includes(p?.orientation) ? p.orientation : 'Centre');
    setEdition({ visible: true, id: p?.id ?? null });
  };

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  const enregistrer = async () => {
    if (nom.trim().length < 2) return message('Nom manquant', 'Indiquez le nom de la province.', 'warning');
    setEnvoi(true);
    try {
      const data = { pro_nom: nom.trim(), pro_orientation: orientation };
      const r: any = edition.id ? await provinceService.mettreAJourProvince(edition.id, data) : await provinceService.creerProvince(data);
      if (r?.statut) {
        setEdition({ visible: false, id: null });
        await charger();
      } else {
        message('Enregistrement impossible', r?.message || 'Une erreur est survenue.');
      }
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = () => {
    const id = edition.id!;
    showDialog({
      title: 'Supprimer cette province ?',
      message: `${nom} ne sera plus proposée pour les trajets et la recherche. Impossible si des trajets l’utilisent encore.`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Retour',
      onConfirm: async () => {
        const r: any = await provinceService.supprimerProvince(id);
        if (r?.statut) {
          setEdition({ visible: false, id: null });
          await charger();
        } else message('Suppression impossible', r?.message || 'Une erreur est survenue.');
      },
      onCancel: () => {},
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <DialogComponent />
      <EnTete
        titre="Provinces"
        sousTitre="Utilisées pour les trajets et la recherche"
        onGauche={onRetour}
        droite={<BoutonIcone icone="add" libelle="Ajouter une province" variante="plein" onPress={() => ouvrir()} />}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        showsVerticalScrollIndicator={false}
      >
        {chargement ? (
          <Skeleton height={380} borderRadius={16} />
        ) : provinces.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 6 }}>
            <Ionicons name="map-outline" size={36} color={couleurs.grisClair} />
            <Texte graisse="tresGras" taille={15}>Aucune province</Texte>
          </View>
        ) : (
          <Carte padding={0} style={{ overflow: 'hidden' }}>
            {provinces.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => ouvrir(p)}
                accessibilityRole="button"
                accessibilityLabel={`${p.nom}, ${p.orientation || ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: couleurs.ocean950, alignItems: 'center', justifyContent: 'center' }}>
                  <Texte graisse="tresGras" taille={13} couleur="#FFFFFF">{abreviation(p.nom)}</Texte>
                </View>
                <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Texte graisse="tresGras" taille={14.5} numberOfLines={1} style={{ flexShrink: 1 }}>{p.nom}</Texte>
                  {!!p.orientation && (
                    <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 8, backgroundColor: couleurs.ocean50, justifyContent: 'center' }}>
                      <Texte graisse="tresGras" taille={11} couleur={couleurs.ocean800}>{p.orientation}</Texte>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={couleurs.grisClair} />
              </Pressable>
            ))}
          </Carte>
        )}
      </ScrollView>

      <FeuilleModale
        visible={edition.visible}
        onClose={() => setEdition({ visible: false, id: null })}
        titre={edition.id ? 'Modifier la province' : 'Nouvelle province'}
        pied={<Bouton titre={edition.id ? 'Enregistrer' : 'Ajouter la province'} onPress={enregistrer} chargement={envoi} />}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}>
          <ChampSaisie libelle="Nom" value={nom} onChangeText={setNom} placeholder="Antananarivo" autoCapitalize="words" />
          <View style={{ gap: 6 }}>
            <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>Orientation</Texte>
            <View style={{ gap: 8 }}>
              <Choix<Orientation> libelle="Orientation" options={ORIENTATIONS.slice(0, 3).map((o) => ({ valeur: o, libelle: o }))} valeur={orientation} onChange={setOrientation} />
              <Choix<Orientation> libelle="Orientation" options={ORIENTATIONS.slice(3).map((o) => ({ valeur: o, libelle: o }))} valeur={orientation} onChange={setOrientation} />
            </View>
          </View>
          {!!edition.id && (
            <Pressable onPress={supprimer} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: 8 }}>
              <Texte graisse="tresGras" taille={14} couleur={couleurs.danger}>Supprimer cette province</Texte>
            </Pressable>
          )}
        </View>
      </FeuilleModale>
    </View>
  );
}

export default ProvincesSys;
