import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { chauffeurService, voitureService } from '../../services';
import { useCompagnieModes } from '../../hooks/useCompagnieModes';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Bouton, ChampSaisie, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';
import { ChampChoix, FeuilleChoix } from '../voyages/FeuilleChoix';
import { CATEGORIES, Choix, compagnieIdCourante, EcranFormulaire, Libelle, Pas } from './communs';

interface Props {
  visible: boolean;
  /** Véhicule à modifier ; absent = ajout. */
  voitureId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type Categorie = 'classique' | 'vip' | 'premium';

/** Ajouter ou modifier un véhicule (maquette « Ajouter un véhicule »). */
export function FormulaireVehicule({ visible, voitureId, onClose, onSuccess }: Props) {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const edition = !!voitureId;
  const { mode_vip, mode_premium } = useCompagnieModes(visible);
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);
  const [voitures, setVoitures] = useState<any[]>([]);
  const [feuille, setFeuille] = useState(false);

  const [marque, setMarque] = useState('');
  const [modele, setModele] = useState('');
  const [matricule, setMatricule] = useState('');
  const [places, setPlaces] = useState(16);
  const [categorie, setCategorie] = useState<Categorie>('classique');
  const [chauffId, setChauffId] = useState('');
  const [statut, setStatut] = useState(1);

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger', ensuite?: () => void) =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => ensuite?.(), onCancel: () => ensuite?.() });

  useEffect(() => {
    if (!visible) return;
    setMarque('');
    setModele('');
    setMatricule('');
    setPlaces(16);
    setCategorie('classique');
    setChauffId('');
    setStatut(1);
    (async () => {
      setChargement(true);
      try {
        const [rc, rv, rd] = await Promise.all([
          chauffeurService.obtenirListeChauffeurs().catch(() => null),
          voitureService.obtenirListeVoitures().catch(() => null),
          voitureId ? voitureService.obtenirVoiture(voitureId).catch(() => null) : Promise.resolve(null),
        ]);
        setChauffeurs(Array.isArray(rc?.data) ? (rc as any).data.filter((c: any) => Number(c.chauff_statut) !== 3) : []);
        setVoitures(Array.isArray(rv?.data) ? (rv as any).data : []);
        const v: any = (rd as any)?.data;
        if (v) {
          setMarque(v.voit_marque || '');
          setModele(v.voit_modele || '');
          setMatricule(v.voit_matricule || '');
          setPlaces(Number(v.voit_places) || 16);
          setCategorie((v.voit_categorie as Categorie) || 'classique');
          setChauffId(v.chauff_id ? String(v.chauff_id) : '');
          setStatut(Number(v.voit_statut ?? 1));
        } else if (voitureId) {
          message('Véhicule introuvable', 'Impossible de charger ce véhicule.', 'danger', onClose);
        }
      } finally {
        setChargement(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, voitureId]);

  const chauffeur = chauffeurs.find((c) => String(c.chauff_id) === chauffId);
  const vehiculeDe = (id: any) => voitures.find((v) => String(v.chauff_id) === String(id) && String(v.voit_id) !== String(voitureId ?? ''));

  const enregistrer = async () => {
    if (!marque.trim() || !modele.trim() || !matricule.trim()) return message('Formulaire incomplet', 'Indiquez la marque, le modèle et l’immatriculation.', 'warning');
    if (!chauffId) return message('Formulaire incomplet', 'Choisissez le chauffeur attitré du véhicule.', 'warning');
    const comp_id = await compagnieIdCourante();
    if (!comp_id) return message('Compte incomplet', 'Votre compte n’est rattaché à aucune compagnie.');
    const data: any = {
      voit_marque: marque.trim(),
      voit_modele: modele.trim(),
      voit_matricule: matricule.trim().toUpperCase(),
      voit_places: places,
      voit_statut: statut,
      voit_categorie: categorie,
      chauff_id: Number(chauffId),
      comp_id,
    };
    setEnvoi(true);
    try {
      const r: any = edition ? await voitureService.modifierVoiture(voitureId!, data) : await voitureService.ajouterVoiture(data);
      if (r?.statut === false) {
        message(edition ? 'Modification impossible' : 'Ajout impossible', r.message || 'Une erreur est survenue.');
      } else {
        message(edition ? 'Véhicule modifié' : 'Véhicule ajouté', edition ? 'Les modifications sont enregistrées.' : 'Un plan de sièges standard a été créé pour ce véhicule.', 'success', () => {
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

  const optionsCategorie = CATEGORIES.map((c) => ({
    valeur: c.valeur as Categorie,
    libelle: c.libelle,
    desactive: (c.valeur === 'vip' && !mode_vip) || (c.valeur === 'premium' && !mode_premium),
  }));

  return (
    <EcranFormulaire
      visible={visible}
      titre={edition ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
      onClose={onClose}
      chargement={chargement}
      dialogue={<DialogComponent />}
      pied={<Bouton titre={edition ? 'Enregistrer les modifications' : 'Ajouter le véhicule'} onPress={enregistrer} chargement={envoi} />}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <ChampSaisie libelle="Marque" value={marque} onChangeText={setMarque} placeholder="Mercedes" autoCapitalize="words" />
        </View>
        <View style={{ flex: 1 }}>
          <ChampSaisie libelle="Modèle" value={modele} onChangeText={setModele} placeholder="Sprinter" autoCapitalize="words" />
        </View>
      </View>
      <ChampSaisie libelle="Immatriculation" value={matricule} onChangeText={setMatricule} placeholder="1234 TBA" autoCapitalize="characters" />

      <View style={{ gap: 6 }}>
        <Libelle>Nombre de places passagers</Libelle>
        <Pas valeur={places} onChange={setPlaces} libelle="place" min={1} max={70} />
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>
          {edition ? 'Changer le nombre de places régénère le plan de sièges.' : 'Un plan de sièges standard est créé automatiquement.'}
        </Texte>
      </View>

      <View style={{ gap: 6 }}>
        <Libelle>Catégorie</Libelle>
        <Choix libelle="Catégorie" options={optionsCategorie} valeur={categorie} onChange={setCategorie} />
        {(!mode_vip || !mode_premium) && (
          <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Les catégories VIP et Premium s’activent avec FANDRIO.</Texte>
        )}
      </View>

      <ChampChoix
        libelle="Chauffeur attitré"
        icone="person-outline"
        titre={chauffeur ? `${chauffeur.chauff_prenom} ${chauffeur.chauff_nom}` : undefined}
        detail={chauffeur ? `Permis ${chauffeur.chauff_permis}${vehiculeDe(chauffeur.chauff_id) ? ` · conduit déjà ${vehiculeDe(chauffeur.chauff_id).voit_matricule}` : ' · sans véhicule'}` : undefined}
        placeholder="Choisir un chauffeur"
        onPress={() => setFeuille(true)}
      />

      <FeuilleChoix
        visible={feuille}
        onClose={() => setFeuille(false)}
        titre="Chauffeur attitré"
        recherche="Rechercher un chauffeur"
        valeur={chauffId}
        onChoisir={setChauffId}
        vide="Aucun chauffeur. Ajoutez-en un dans la section Chauffeurs."
        options={chauffeurs
          .filter((c) => Number(c.chauff_statut) === 1 || String(c.chauff_id) === chauffId)
          .map((c) => {
            const v = vehiculeDe(c.chauff_id);
            return {
              id: String(c.chauff_id),
              titre: `${c.chauff_prenom} ${c.chauff_nom}`,
              detail: `Permis ${c.chauff_permis} · ${v ? `conduit ${v.voit_matricule}` : 'sans véhicule'}`,
            };
          })}
      />
    </EcranFormulaire>
  );
}

export default FormulaireVehicule;
