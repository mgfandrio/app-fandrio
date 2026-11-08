import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/api/axiosConfig';
import { trajetService } from '../../services/trajets/trajetService';
import { useCompagnieModes } from '../../hooks/useCompagnieModes';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Bouton, ChampSaisie, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';
import { FeuilleChoix } from '../voyages/FeuilleChoix';
import { CATEGORIES, Choix, EcranFormulaire, Libelle, LigneInterrupteur } from './communs';

interface Props {
  visible: boolean;
  /** Trajet à modifier ; absent = création. */
  trajetId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type Categorie = 'classique' | 'vip' | 'premium';

const idProvince = (p: any) => String(p.pro_id ?? p.id ?? p.id_province ?? '');
const nomProvince = (p: any) => p.pro_nom ?? p.nom ?? p.nom_province ?? '';

/** Une ligne de l'itinéraire (départ ou arrivée). */
function Lieu({ depart, libelle, valeur, onPress, verrou, premiere }: { depart?: boolean; libelle: string; valeur?: string; onPress?: () => void; verrou?: boolean; premiere?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${libelle} : ${valeur || 'à choisir'}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur }}
    >
      <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: depart ? 3 : 0, borderColor: couleurs.ocean800, backgroundColor: depart ? 'transparent' : couleurs.ocean800 }} />
      <View style={{ flex: 1 }}>
        <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>{libelle}</Texte>
        <Texte graisse={valeur ? 'tresGras' : 'moyen'} taille={15} couleur={valeur ? couleurs.encre : '#8A99AD'}>{valeur || 'Choisir une province'}</Texte>
      </View>
      {verrou ? <Ionicons name="lock-closed-outline" size={16} color={couleurs.grisClair} /> : onPress ? <Ionicons name="chevron-down" size={18} color={couleurs.grisClair} /> : null}
    </Pressable>
  );
}

/** Créer ou modifier un trajet (maquette « Nouveau trajet »). */
export function FormulaireTrajet({ visible, trajetId, onClose, onSuccess }: Props) {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const edition = !!trajetId;
  const { mode_vip, mode_premium, localisation, provincesDesservies } = useCompagnieModes(visible);
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [feuille, setFeuille] = useState<'depart' | 'arrivee' | null>(null);

  const [depart, setDepart] = useState('');
  const [arrivee, setArrivee] = useState('');
  const [nom, setNom] = useState('');
  const [nomTouche, setNomTouche] = useState(false);
  const [km, setKm] = useState('');
  const [heures, setHeures] = useState('');
  const [minutes, setMinutes] = useState('');
  const [tarif, setTarif] = useState('');
  const [categorie, setCategorie] = useState<Categorie>('classique');
  const [actif, setActif] = useState(true);
  const [actifInitial, setActifInitial] = useState(true);

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger', ensuite?: () => void) =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => ensuite?.(), onCancel: () => ensuite?.() });

  useEffect(() => {
    if (!visible) return;
    setDepart('');
    setArrivee('');
    setNom('');
    setNomTouche(false);
    setKm('');
    setHeures('');
    setMinutes('');
    setTarif('');
    setCategorie('classique');
    setActif(true);
    setActifInitial(true);
    (async () => {
      setChargement(true);
      try {
        const [rp, rt] = await Promise.all([
          apiClient.get('/api/adminCompagnie/provinces/recuperListeProvince', { params: { per_page: 200 } }).catch(() => null),
          trajetId ? trajetService.obtenirTrajet(trajetId).catch(() => null) : Promise.resolve(null),
        ]);
        const p = rp?.data?.data?.provinces ?? rp?.data?.data ?? [];
        setProvinces(Array.isArray(p) ? p : []);
        const t: any = (rt as any)?.data;
        if (t) {
          setDepart(String(t.province_depart?.id_province ?? t.pro_depart ?? ''));
          setArrivee(String(t.province_arrivee?.id_province ?? t.pro_arrivee ?? ''));
          setNom(t.nom_trajet || '');
          setNomTouche(true);
          setKm(t.distance_km ? String(t.distance_km) : '');
          const [h, m] = String(t.duree || '').split(':');
          setHeures(h ? String(parseInt(h, 10)) : '');
          setMinutes(m ? String(parseInt(m, 10)) : '');
          setTarif(t.tarif ? String(Math.round(Number(t.tarif))) : '');
          setCategorie((t.categorie as Categorie) || 'classique');
          setActif(Number(t.statut) === 1);
          setActifInitial(Number(t.statut) === 1);
        } else if (trajetId) {
          message('Trajet introuvable', 'Impossible de charger ce trajet.', 'danger', onClose);
        }
      } finally {
        setChargement(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, trajetId]);

  // Le départ est toujours la ville de la compagnie quand elle est connue
  useEffect(() => {
    if (visible && localisation?.id && !edition) setDepart(String(localisation.id));
  }, [visible, localisation?.id, edition]);

  const nomDe = (id: string) => nomProvince(provinces.find((p) => idProvince(p) === id) || {}) || (localisation && String(localisation.id) === id ? localisation.nom : '');
  const nomDepart = nomDe(depart);
  const nomArrivee = nomDe(arrivee);

  // Nom proposé automatiquement tant que l'utilisateur ne l'a pas changé
  useEffect(() => {
    if (!nomTouche && nomDepart && nomArrivee) setNom(`${nomDepart} – ${nomArrivee}`);
  }, [nomDepart, nomArrivee, nomTouche]);

  const desservies = provincesDesservies.map((p) => String(p.id));
  const optionsArrivee = provinces.filter((p) => idProvince(p) !== depart && (desservies.length === 0 || desservies.includes(idProvince(p))));

  const enregistrer = async () => {
    if (!depart || !arrivee) return message('Formulaire incomplet', 'Choisissez la province de départ et celle d’arrivée.', 'warning');
    if (depart === arrivee) return message('Itinéraire invalide', 'Le départ et l’arrivée doivent être différents.', 'warning');
    if (!nom.trim()) return message('Formulaire incomplet', 'Donnez un nom au trajet.', 'warning');
    if (!km || !tarif) return message('Formulaire incomplet', 'Indiquez la distance et le tarif par place.', 'warning');
    const h = Math.min(parseInt(heures, 10) || 0, 23);
    const m = Math.min(parseInt(minutes, 10) || 0, 59);
    const data = {
      traj_nom: nom.trim(),
      pro_depart: parseInt(depart, 10),
      pro_arrivee: parseInt(arrivee, 10),
      traj_tarif: parseFloat(tarif),
      traj_km: parseInt(km, 10),
      traj_duree: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      traj_categorie: categorie,
    };
    setEnvoi(true);
    try {
      const r: any = edition ? await trajetService.modifierTrajet(trajetId!, data) : await trajetService.ajouterTrajet(data);
      if (r?.statut !== true) {
        message(edition ? 'Modification impossible' : 'Création impossible', r?.message || 'Une erreur est survenue.');
        return;
      }
      if (edition && actif !== actifInitial) {
        const s: any = await trajetService.changerEtatTrajet(trajetId!, actif ? 1 : 2);
        if (s?.statut !== true) {
          message('Statut non modifié', s?.message || 'Le trajet est enregistré, mais son statut n’a pas pu être changé.', 'warning', () => {
            onSuccess?.();
            onClose();
          });
          return;
        }
      }
      message(edition ? 'Trajet modifié' : 'Trajet créé', edition ? 'Les modifications sont enregistrées.' : 'Vous pouvez maintenant programmer des voyages sur ce trajet.', 'success', () => {
        onSuccess?.();
        onClose();
      });
    } catch (e: any) {
      message('Erreur', e?.message || 'Une erreur est survenue.');
    } finally {
      setEnvoi(false);
    }
  };

  const departVerrouille = !!localisation?.id;

  return (
    <EcranFormulaire
      visible={visible}
      titre={edition ? 'Modifier le trajet' : 'Nouveau trajet'}
      onClose={onClose}
      chargement={chargement}
      dialogue={<DialogComponent />}
      pied={<Bouton titre={edition ? 'Enregistrer les modifications' : 'Créer le trajet'} onPress={enregistrer} chargement={envoi} />}
    >
      <View style={{ gap: 6 }}>
        <Libelle>Itinéraire</Libelle>
        <View style={{ backgroundColor: couleurs.surface, borderWidth: 1.5, borderColor: couleurs.champ, borderRadius: 14, overflow: 'hidden' }}>
          <Lieu premiere depart libelle="Province de départ" valeur={nomDepart} verrou={departVerrouille} onPress={departVerrouille ? undefined : () => setFeuille('depart')} />
          <Lieu libelle="Province d'arrivée" valeur={nomArrivee} onPress={() => setFeuille('arrivee')} />
        </View>
        {departVerrouille && (
          <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>
            Le départ est la ville de votre compagnie.{desservies.length ? ' Seules vos provinces desservies sont proposées à l’arrivée.' : ''}
          </Texte>
        )}
      </View>

      <ChampSaisie
        libelle="Nom affiché aux clients"
        value={nom}
        onChangeText={(t) => {
          setNom(t);
          setNomTouche(true);
        }}
        placeholder="Antananarivo – Toliara (RN7)"
      />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1.2 }}>
          <ChampSaisie libelle="Distance" value={km} onChangeText={(t) => setKm(t.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" suffixe="km" placeholder="930" />
        </View>
        <View style={{ flex: 1 }}>
          <ChampSaisie libelle="Durée" value={heures} onChangeText={(t) => setHeures(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" suffixe="h" placeholder="18" />
        </View>
        <View style={{ flex: 1 }}>
          <ChampSaisie libelle=" " value={minutes} onChangeText={(t) => setMinutes(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" suffixe="min" placeholder="00" accessibilityLabel="Minutes de durée" />
        </View>
      </View>

      <ChampSaisie
        libelle="Tarif par place"
        value={tarif}
        onChangeText={(t) => setTarif(t.replace(/\D/g, '').slice(0, 7))}
        keyboardType="number-pad"
        suffixe="Ar"
        placeholder="85000"
        aide="Prix payé par le voyageur pour une place sur ce trajet."
      />

      <View style={{ gap: 6 }}>
        <Libelle>Catégorie</Libelle>
        <Choix<Categorie>
          libelle="Catégorie"
          options={CATEGORIES.map((c) => ({ valeur: c.valeur as Categorie, libelle: c.libelle, desactive: (c.valeur === 'vip' && !mode_vip) || (c.valeur === 'premium' && !mode_premium) }))}
          valeur={categorie}
          onChange={setCategorie}
        />
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Les voyages de ce trajet demanderont un véhicule de la même catégorie.</Texte>
      </View>

      {edition && <LigneInterrupteur titre="Trajet actif" detail="Proposé lors de la programmation des voyages" valeur={actif} onChange={setActif} />}

      <FeuilleChoix
        visible={feuille !== null}
        onClose={() => setFeuille(null)}
        titre={feuille === 'depart' ? 'Province de départ' : "Province d'arrivée"}
        recherche="Rechercher une province"
        valeur={feuille === 'depart' ? depart : arrivee}
        onChoisir={(id) => (feuille === 'depart' ? setDepart(id) : setArrivee(id))}
        vide="Aucune province disponible."
        options={(feuille === 'depart' ? provinces.filter((p) => idProvince(p) !== arrivee) : optionsArrivee).map((p) => ({ id: idProvince(p), titre: nomProvince(p) }))}
      />
    </EcranFormulaire>
  );
}

export default FormulaireTrajet;
