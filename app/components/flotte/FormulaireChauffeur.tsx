import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { chauffeurService } from '../../services';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Bouton, ChampSaisie, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';
import { Choix, compagnieIdCourante, EcranFormulaire, Libelle, LigneInterrupteur } from './communs';

interface Props {
  visible: boolean;
  /** Chauffeur à modifier ; absent = ajout. */
  chauffeurId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type Permis = 'A' | 'B' | 'C' | 'D';

/**
 * Ajouter ou modifier un chauffeur (maquette « Ajouter un chauffeur »).
 * chauff_statut : 1 = actif, 2 (ou 0) = inactif, 3 = supprimé.
 */
export function FormulaireChauffeur({ visible, chauffeurId, onClose, onSuccess }: Props) {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const edition = !!chauffeurId;
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [cin, setCin] = useState('');
  const [cinInitial, setCinInitial] = useState('');
  const [age, setAge] = useState('');
  const [telephone, setTelephone] = useState('');
  const [permis, setPermis] = useState<Permis>('D');
  const [actif, setActif] = useState(true);

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger', ensuite?: () => void) =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => ensuite?.(), onCancel: () => ensuite?.() });

  useEffect(() => {
    if (!visible) return;
    setPrenom('');
    setNom('');
    setCin('');
    setCinInitial('');
    setAge('');
    setTelephone('');
    setPermis('D');
    setActif(true);
    if (!chauffeurId) return;
    (async () => {
      setChargement(true);
      try {
        const r: any = await chauffeurService.obtenirChauffeur(chauffeurId);
        const c = r?.data;
        if (!c) throw new Error();
        setPrenom(c.chauff_prenom || '');
        setNom(c.chauff_nom || '');
        setCin(c.chauff_cin || '');
        setCinInitial(c.chauff_cin || '');
        setAge(c.chauff_age ? String(c.chauff_age) : '');
        setTelephone(c.chauff_phone || '');
        setPermis((['A', 'B', 'C', 'D'].includes(c.chauff_permis) ? c.chauff_permis : 'D') as Permis);
        setActif(Number(c.chauff_statut) === 1);
      } catch {
        message('Chauffeur introuvable', 'Impossible de charger ce chauffeur.', 'danger', onClose);
      } finally {
        setChargement(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, chauffeurId]);

  const ageNum = parseInt(age, 10) || 0;
  const erreurAge = age && ageNum < 18 ? 'Le chauffeur doit avoir au moins 18 ans.' : undefined;

  const enregistrer = async () => {
    if (!prenom.trim() || !nom.trim() || !cin.trim() || !age || !telephone.trim()) return message('Formulaire incomplet', 'Remplissez le prénom, le nom, le CIN, l’âge et le téléphone.', 'warning');
    if (ageNum < 18) return message('Âge invalide', 'Le chauffeur doit avoir au moins 18 ans.', 'warning');
    const comp_id = await compagnieIdCourante();
    if (!comp_id) return message('Compte incomplet', 'Votre compte n’est rattaché à aucune compagnie.');
    const data: any = {
      chauff_prenom: prenom.trim(),
      chauff_nom: nom.trim(),
      chauff_age: ageNum,
      chauff_permis: permis,
      chauff_phone: telephone.trim(),
      chauff_statut: actif ? 1 : 2,
      comp_id,
    };
    // En modification, le CIN n'est envoyé que s'il change (règle d'unicité)
    if (!edition || cin.trim() !== cinInitial) data.chauff_cin = cin.trim();
    setEnvoi(true);
    try {
      const r: any = edition ? await chauffeurService.modifierChauffeur(chauffeurId!, data) : await chauffeurService.ajouterChauffeur(data);
      if (r?.statut === false) {
        message(edition ? 'Modification impossible' : 'Ajout impossible', r.message || 'Une erreur est survenue.');
      } else {
        message(edition ? 'Chauffeur modifié' : 'Chauffeur ajouté', edition ? 'Les modifications sont enregistrées.' : 'Vous pouvez maintenant l’attribuer à un véhicule.', 'success', () => {
          onSuccess?.();
          onClose();
        });
      }
    } catch (e: any) {
      const detail = e?.errors ? Object.values(e.errors).flat().join('\n') : e?.message;
      message(edition ? 'Modification impossible' : 'Ajout impossible', detail || 'Une erreur est survenue.');
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = () => {
    showDialog({
      title: 'Supprimer ce chauffeur ?',
      message: `${prenom} ${nom} n’apparaîtra plus dans vos listes.`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const r: any = await chauffeurService.supprimerChauffeur(chauffeurId!);
          if (r?.statut === false) throw new Error(r.message);
          onSuccess?.();
          onClose();
        } catch (e: any) {
          message('Suppression impossible', e?.message || 'Une erreur est survenue.');
        }
      },
      onCancel: () => {},
    });
  };

  return (
    <EcranFormulaire
      visible={visible}
      titre={edition ? 'Modifier le chauffeur' : 'Ajouter un chauffeur'}
      onClose={onClose}
      chargement={chargement}
      dialogue={<DialogComponent />}
      pied={<Bouton titre={edition ? 'Enregistrer les modifications' : 'Ajouter le chauffeur'} onPress={enregistrer} chargement={envoi} />}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <ChampSaisie libelle="Prénom" value={prenom} onChangeText={setPrenom} autoCapitalize="words" />
        </View>
        <View style={{ flex: 1 }}>
          <ChampSaisie libelle="Nom" value={nom} onChangeText={setNom} autoCapitalize="words" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 2 }}>
          <ChampSaisie libelle="N° CIN" value={cin} onChangeText={setCin} keyboardType="number-pad" placeholder="101 211 345 678" />
        </View>
        <View style={{ flex: 1 }}>
          <ChampSaisie libelle="Âge" value={age} onChangeText={(t) => setAge(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" erreur={erreurAge} />
        </View>
      </View>
      <ChampSaisie libelle="Téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" placeholder="034 12 345 67" icone="call-outline" />

      <View style={{ gap: 6 }}>
        <Libelle>Catégorie de permis</Libelle>
        <Choix<Permis> libelle="Catégorie de permis" plein options={(['A', 'B', 'C', 'D'] as Permis[]).map((p) => ({ valeur: p, libelle: p }))} valeur={permis} onChange={setPermis} />
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Vérifiez que la catégorie correspond au véhicule conduit.</Texte>
      </View>

      <LigneInterrupteur titre="Chauffeur actif" detail="Peut être attribué à un véhicule" valeur={actif} onChange={setActif} />

      {edition && (
        <Pressable onPress={supprimer} accessibilityRole="button" style={{ alignSelf: 'center', paddingVertical: 10 }}>
          <Texte graisse="tresGras" taille={14} couleur={couleurs.danger}>Supprimer ce chauffeur</Texte>
        </Pressable>
      )}
    </EcranFormulaire>
  );
}

export default FormulaireChauffeur;
