import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chauffeurService, voitureService } from '../../services';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, BoutonIcone, Carte, dispositionMinibus, PlanSieges, Texte, ModalPleinEcran } from '../ui';
import { couleurs } from '../../theme/ocean';
import { compagnieIdCourante, libelleCategorie } from './communs';

interface Props {
  visible: boolean;
  voitureId: number | null;
  onClose: () => void;
  onModifier: (id: number) => void;
  onChange?: () => void;
}

/** Décrit une rangée du plan : « Chauffeur + 2 places », « 2 + couloir + 1 »… */
function decrireRangee(r: any[], i: number, total: number) {
  if (r.some((c) => c.type === 'chauffeur')) {
    const n = r.filter((c) => c.type === 'siege').length;
    return `Chauffeur + ${n} place${n > 1 ? 's' : ''}`;
  }
  const sieges = r.filter((c) => c.type === 'siege').length;
  const couloir = r.findIndex((c) => c.type === 'couloir');
  if (couloir === -1) return i === total - 1 && total > 2 ? `Banquette arrière de ${sieges}` : `Banquette de ${sieges}`;
  const gauche = r.slice(0, couloir).filter((c) => c.type === 'siege').length;
  const droite = r.slice(couloir + 1).filter((c) => c.type === 'siege').length;
  return `${gauche} + couloir + ${droite}`;
}

/** Détail d'un véhicule : informations, plan de sièges vu par les clients, disponibilité. */
function DetailVehiculeContenu({ visible, voitureId, onClose, onModifier, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [voiture, setVoiture] = useState<any>(null);
  const [chauffeur, setChauffeur] = useState<any>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  const charger = async () => {
    if (!voitureId) return;
    try {
      const r: any = await voitureService.obtenirVoiture(voitureId);
      const v = r?.data;
      setVoiture(v || null);
      if (v?.chauff_id) {
        const c: any = await chauffeurService.obtenirChauffeur(v.chauff_id).catch(() => null);
        setChauffeur(c?.data || null);
      } else setChauffeur(null);
    } catch {
      setVoiture(null);
    }
  };

  useEffect(() => {
    if (!visible || !voitureId) return;
    setVoiture(null);
    setChargement(true);
    charger().finally(() => setChargement(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, voitureId]);

  const places = Number(voiture?.voit_places) || 0;
  const codes = useMemo(() => Array.from({ length: places }, (_, i) => String(i + 1)), [places]);
  const rangees = useMemo(() => dispositionMinibus(codes), [codes]);
  const disponible = Number(voiture?.voit_statut) === 1;

  const basculer = () => {
    showDialog({
      title: disponible ? 'Rendre indisponible ?' : 'Rendre disponible ?',
      message: disponible
        ? 'Le véhicule ne pourra plus être choisi pour programmer un voyage. Les voyages déjà programmés ne changent pas.'
        : 'Le véhicule pourra de nouveau être choisi pour programmer des voyages.',
      type: 'warning',
      confirmText: disponible ? 'Rendre indisponible' : 'Rendre disponible',
      cancelText: 'Retour',
      onConfirm: async () => {
        setEnvoi(true);
        try {
          const comp_id = await compagnieIdCourante();
          const r: any = await voitureService.modifierVoiture(voitureId!, { voit_statut: disponible ? 0 : 1, ...(comp_id ? { comp_id } : {}) });
          if (r?.statut === false) throw new Error(r.message);
          await charger();
          onChange?.();
        } catch (e: any) {
          showDialog({ title: 'Action impossible', message: e?.message || 'Une erreur est survenue.', type: 'danger', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
        } finally {
          setEnvoi(false);
        }
      },
      onCancel: () => {},
    });
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <View style={{ backgroundColor: couleurs.surface, borderBottomWidth: 1, borderBottomColor: couleurs.ligne, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BoutonIcone icone="chevron-back" libelle="Retour" onPress={onClose} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Texte graisse="tresGras" taille={16} numberOfLines={1}>{voiture ? `${voiture.voit_marque} ${voiture.voit_modele}` : 'Véhicule'}</Texte>
            {!!voiture && <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris}>{voiture.voit_matricule}</Texte>}
          </View>
          {!!voiture && <Bouton titre="Modifier" variante="secondaire" compact onPress={() => onModifier(voitureId!)} style={{ minHeight: 44, paddingHorizontal: 12 }} />}
        </View>

        {chargement ? (
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton height={70} borderRadius={16} />
            <Skeleton height={300} borderRadius={16} />
          </View>
        ) : !voiture ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 }}>
            <Ionicons name="alert-circle-outline" size={44} color={couleurs.danger} />
            <Texte variante="legende" centre>Impossible de charger ce véhicule.</Texte>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
              <Carte style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  ['Catégorie', libelleCategorie(voiture.voit_categorie), couleurs.encre],
                  ['Chauffeur', chauffeur ? `${chauffeur.chauff_prenom} ${String(chauffeur.chauff_nom || '').charAt(0)}.` : '—', couleurs.encre],
                  ['Statut', disponible ? 'Disponible' : 'Indisponible', disponible ? couleurs.succes : couleurs.gris],
                ].map(([l, v, c]) => (
                  <View key={l} style={{ flex: 1, minWidth: 0 }}>
                    <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>{l}</Texte>
                    <Texte graisse="tresGras" taille={14} couleur={c} numberOfLines={1}>{v}</Texte>
                  </View>
                ))}
              </Carte>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                <Texte variante="etiquette">Plan de sièges</Texte>
                <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean800}>{places} places</Texte>
              </View>

              <Carte style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <PlanSieges sieges={codes.map((code) => ({ code, statut: 'disponible' }))} mode="compagnie" taille={26} />
                <View style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: couleurs.separateur, borderRadius: 12, overflow: 'hidden' }}>
                  {rangees.map((r, i) => (
                    <View key={i} style={{ paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
                      <Texte graisse="tresGras" taille={13}>Rangée {i + 1}</Texte>
                      <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>{decrireRangee(r, i, rangees.length)}</Texte>
                    </View>
                  ))}
                </View>
              </Carte>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Ionicons name="information-circle-outline" size={18} color={couleurs.ocean800} />
                <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} style={{ flex: 1, lineHeight: 18 }}>
                  Les sièges sont numérotés de 1 à {places}, de l’avant vers l’arrière. Les clients voient exactement ce plan au moment de réserver.
                </Texte>
              </View>
            </ScrollView>

            <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
              <Bouton
                titre={disponible ? 'Rendre indisponible' : 'Rendre disponible'}
                variante={disponible ? 'secondaire' : 'principal'}
                icone={disponible ? 'pause-circle-outline' : 'checkmark-circle-outline'}
                onPress={basculer}
                chargement={envoi}
              />
            </View>
          </>
        )}
      </View>
    </>
  );
}

/** DetailVehicule dans sa propre fenêtre, avec les bonnes marges de sécurité. */
export function DetailVehicule(props: Props) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <DetailVehiculeContenu {...props} />
    </ModalPleinEcran>
  );
}

export default DetailVehicule;
