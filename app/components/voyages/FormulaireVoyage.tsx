import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../services/api/axiosConfig';
import voitureService from '../../services/voitures/voitureService';
import { voyageService } from '../../services/voyages/voyageService';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, BoutonIcone, ChampSaisie, Segmente, Texte, ModalPleinEcran } from '../ui';
import { couleurs, dateLocaleISO, formatAriary } from '../../theme/ocean';
import { dateCourte, dateVoyage } from '../../utils/voyageStatut';
import { ChampChoix, FeuilleChoix } from './FeuilleChoix';
import { ChampDateHeure } from './ChampDateHeure';

interface Props {
  visible: boolean;
  /** Voyage à modifier ; absent = programmation. */
  voyageId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

type Mode = 'un' | 'plusieurs';
const MAX_DATES = 20;

const CATEGORIES: Record<string, string> = { vip: 'VIP', premium: 'Premium' };

function idVoiture(v: any) {
  return String(v.voit_id ?? v.id_voiture ?? v.id ?? '');
}

/** Programmer un voyage (une date ou plusieurs dates) ou modifier un voyage existant. */
function FormulaireVoyageContenu({ visible, voyageId, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const edition = !!voyageId;

  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [trajets, setTrajets] = useState<any[]>([]);
  const [voitures, setVoitures] = useState<any[]>([]);
  const [feuille, setFeuille] = useState<'trajet' | 'voiture' | null>(null);

  const [mode, setMode] = useState<Mode>('un');
  const [trajId, setTrajId] = useState('');
  const [voitId, setVoitId] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [heure, setHeure] = useState('');
  const [type, setType] = useState<'1' | '2'>('1');
  const [places, setPlaces] = useState('');

  const message = (title: string, msg: string, t: 'success' | 'danger' | 'warning' = 'danger', ensuite?: () => void) =>
    showDialog({ title, message: msg, type: t, confirmText: 'OK', onConfirm: () => ensuite?.(), onCancel: () => ensuite?.() });

  useEffect(() => {
    if (!visible) return;
    setMode('un');
    setTrajId('');
    setVoitId('');
    setDate(null);
    setDates([]);
    setHeure('');
    setType('1');
    setPlaces('');
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, voyageId]);

  const charger = async () => {
    setChargement(true);
    try {
      const [rTrajets, rVoitures, rVoyage] = await Promise.all([
        apiClient.get('/api/adminCompagnie/trajet/recupererListeTrajet', { params: { per_page: 200 } }).catch(() => null),
        voitureService.obtenirListeVoitures().catch(() => null),
        voyageId ? voyageService.obtenirVoyage(voyageId) : Promise.resolve(null),
      ]);
      const t = rTrajets?.data?.data?.trajets ?? rTrajets?.data?.data ?? [];
      setTrajets(Array.isArray(t) ? t : []);
      setVoitures(Array.isArray(rVoitures?.data) ? (rVoitures as any).data : []);

      const v: any = (rVoyage as any)?.data;
      if (voyageId && v) {
        setTrajId(String(v.trajet?.id ?? v.traj_id ?? ''));
        setVoitId(String(v.voiture?.id ?? v.voit_id ?? ''));
        setDate(dateVoyage(v.date || v.voyage_date));
        setHeure(String(v.heure_depart || v.voyage_heure_depart || '').slice(0, 5));
        setType(Number(v.type ?? v.voyage_type) === 2 ? '2' : '1');
        setPlaces(String(v.places_disponibles ?? ''));
      } else if (voyageId) {
        message('Voyage introuvable', 'Impossible de charger ce voyage.', 'danger', onClose);
      }
    } finally {
      setChargement(false);
    }
  };

  const trajet = trajets.find((t) => String(t.id_trajet) === trajId);
  const categorie = (trajet?.categorie || 'classique') as string;
  const voituresCompatibles = useMemo(
    () => voitures.filter((v) => !trajet || (v.voit_categorie || v.categorie || 'classique') === categorie),
    [voitures, trajet, categorie]
  );
  const voiture = voitures.find((v) => idVoiture(v) === voitId);
  const capacite = Number(voiture?.voit_places) || 0;
  const tarif = Number(trajet?.tarif) || 0;
  const nbPlaces = parseInt(places, 10) || 0;
  const nbVoyages = mode === 'plusieurs' ? dates.length : 1;

  const choisirTrajet = (id: string) => {
    const nouveau = trajets.find((t) => String(t.id_trajet) === id);
    // Un véhicule d'une autre catégorie n'est plus valable
    if (voiture && (voiture.voit_categorie || 'classique') !== (nouveau?.categorie || 'classique')) setVoitId('');
    setTrajId(id);
  };

  const choisirVoiture = (id: string) => {
    setVoitId(id);
    const v = voitures.find((x) => idVoiture(x) === id);
    const cap = Number(v?.voit_places) || 0;
    if (cap && (!places || parseInt(places, 10) > cap)) setPlaces(String(cap));
  };

  const ajouterDate = (d: Date) => {
    const iso = dateLocaleISO(d);
    setDates((prev) => (prev.includes(iso) || prev.length >= MAX_DATES ? prev : [...prev, iso].sort()));
  };

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  const valider = (): string | null => {
    if (!trajId) return 'Choisissez un trajet.';
    if (!voitId) return 'Choisissez un véhicule.';
    if (mode === 'un' && !date) return 'Choisissez la date du voyage.';
    if (mode === 'plusieurs' && dates.length === 0) return 'Ajoutez au moins une date.';
    if (!/^\d{2}:\d{2}$/.test(heure)) return "Choisissez l'heure de départ.";
    if (!nbPlaces || nbPlaces < 1) return 'Indiquez le nombre de places mises en vente.';
    if (capacite && nbPlaces > capacite) return `Ce véhicule n'a que ${capacite} places.`;
    const liste = mode === 'un' ? [dateLocaleISO(date!)] : dates;
    const maintenant = new Date();
    for (const iso of liste) {
      const d = dateVoyage(iso)!;
      if (d < aujourdhui) return `La date du ${dateCourte(d)} est déjà passée.`;
      if (iso === dateLocaleISO(maintenant)) {
        const [h, m] = heure.split(':').map(Number);
        if (h * 60 + m <= maintenant.getHours() * 60 + maintenant.getMinutes()) return "L'heure de départ d'aujourd'hui est déjà passée.";
      }
    }
    return null;
  };

  const enregistrer = async () => {
    const erreur = valider();
    if (erreur) {
      message('Formulaire incomplet', erreur, 'warning');
      return;
    }
    const base = {
      voyage_heure_depart: heure,
      traj_id: parseInt(trajId, 10),
      voit_id: parseInt(voitId, 10),
      voyage_type: parseInt(type, 10),
      places_disponibles: nbPlaces,
    };
    setEnvoi(true);
    try {
      if (mode === 'plusieurs') {
        const r = await voyageService.ajouterVoyagesMultiples(dates.map((d) => ({ ...base, voyage_date: d })));
        if (r.statut) {
          const erreurs: string[] = r.data?.erreurs || [];
          message(
            erreurs.length ? 'Programmation partielle' : 'Voyages programmés',
            (r.message || `${dates.length} voyages programmés.`) + (erreurs.length ? `\n\n${erreurs.join('\n')}` : ''),
            erreurs.length ? 'warning' : 'success',
            () => {
              onSuccess?.();
              onClose();
            }
          );
        } else {
          message('Programmation impossible', r.message || 'Une erreur est survenue.');
        }
      } else {
        const data = { ...base, voyage_date: dateLocaleISO(date!) };
        const r = edition ? await voyageService.modifierVoyage(voyageId!, data) : await voyageService.ajouterVoyage(data);
        if (r.statut === true) {
          message(edition ? 'Voyage modifié' : 'Voyage programmé', r.message || (edition ? 'Les modifications sont enregistrées.' : 'Le voyage est ouvert aux réservations.'), 'success', () => {
            onSuccess?.();
            onClose();
          });
        } else {
          message(edition ? 'Modification impossible' : 'Programmation impossible', r.message || 'Une erreur est survenue.');
        }
      }
    } catch (e: any) {
      message('Erreur', e?.message || 'Une erreur est survenue.');
    } finally {
      setEnvoi(false);
    }
  };

  const recette = nbPlaces * tarif * Math.max(nbVoyages, 1);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        {/* En-tête */}
        <View style={{ backgroundColor: couleurs.surface, borderBottomWidth: 1, borderBottomColor: couleurs.ligne, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BoutonIcone icone="close" libelle="Fermer" onPress={onClose} />
          <Texte graisse="tresGras" taille={17} style={{ flex: 1 }}>{edition ? 'Modifier le voyage' : 'Programmer un voyage'}</Texte>
        </View>

        {chargement ? (
          <View style={{ padding: 16, gap: 14 }}>
            <Skeleton height={48} borderRadius={14} />
            <Skeleton height={56} borderRadius={14} />
            <Skeleton height={56} borderRadius={14} />
            <Skeleton height={50} borderRadius={14} />
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {!edition && (
                <Segmente<Mode>
                  libelleAccessible="Mode de programmation"
                  valeur={mode}
                  onChange={setMode}
                  options={[
                    { valeur: 'un', libelle: 'Un voyage' },
                    { valeur: 'plusieurs', libelle: 'Plusieurs dates' },
                  ]}
                />
              )}

              <ChampChoix
                libelle="Trajet"
                icone="git-commit-outline"
                titre={trajet?.nom_trajet}
                detail={
                  trajet
                    ? [trajet.distance_km ? `${trajet.distance_km} km` : null, trajet.duree_formatee || null, tarif ? `${formatAriary(tarif)} Ar` : null, CATEGORIES[categorie]]
                        .filter(Boolean)
                        .join(' · ')
                    : undefined
                }
                placeholder="Choisir un trajet"
                onPress={() => setFeuille('trajet')}
              />

              <ChampChoix
                libelle="Véhicule"
                icone="bus-outline"
                titre={voiture ? [voiture.voit_matricule, [voiture.voit_marque, voiture.voit_modele].filter(Boolean).join(' ')].filter(Boolean).join(' · ') : undefined}
                detail={voiture ? `${capacite} places${CATEGORIES[voiture.voit_categorie] ? ` · ${CATEGORIES[voiture.voit_categorie]}` : ''}` : trajId ? undefined : "Choisissez d'abord le trajet"}
                placeholder="Choisir un véhicule"
                onPress={() => setFeuille('voiture')}
                desactive={!trajId}
              />

              {mode === 'un' ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <ChampDateHeure libelle="Date" mode="date" valeur={date} affichage={date ? dateCourte(date) : undefined} placeholder="Choisir" minimumDate={aujourdhui} onChange={setDate} />
                  <ChampDateHeure
                    libelle="Heure de départ"
                    mode="time"
                    valeur={heure ? new Date(2000, 0, 1, Number(heure.slice(0, 2)), Number(heure.slice(3, 5))) : null}
                    affichage={heure || undefined}
                    placeholder="--:--"
                    onChange={(d) => setHeure(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)}
                  />
                </View>
              ) : (
                <>
                  <View style={{ gap: 6 }}>
                    <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>Dates ({dates.length}/{MAX_DATES})</Texte>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {dates.map((iso) => (
                        <Pressable
                          key={iso}
                          onPress={() => setDates((p) => p.filter((x) => x !== iso))}
                          accessibilityRole="button"
                          accessibilityLabel={`Retirer le ${dateCourte(dateVoyage(iso))}`}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingLeft: 12, paddingRight: 8, borderRadius: 999, backgroundColor: couleurs.ocean800 }}
                        >
                          <Texte graisse="gras" taille={13} couleur="#FFFFFF">{dateCourte(dateVoyage(iso))}</Texte>
                          <Ionicons name="close" size={16} color="#FFFFFF" />
                        </Pressable>
                      ))}
                      {dates.length < MAX_DATES && (
                        <ChampDateHeure
                          libelle="Ajouter une date"
                          mode="date"
                          valeur={null}
                          placeholder=""
                          minimumDate={aujourdhui}
                          onChange={ajouterDate}
                          declencheur={(ouvrir) => (
                            <Pressable
                              onPress={ouvrir}
                              accessibilityRole="button"
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: couleurs.ocean200, borderStyle: 'dashed', backgroundColor: couleurs.surface }}
                            >
                              <Ionicons name="add" size={17} color={couleurs.ocean800} />
                              <Texte graisse="gras" taille={13} couleur={couleurs.ocean800}>Ajouter une date</Texte>
                            </Pressable>
                          )}
                        />
                      )}
                    </View>
                    <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Même trajet, véhicule, heure et places pour chaque date. Touchez une date pour la retirer.</Texte>
                  </View>
                  <ChampDateHeure
                    libelle="Heure de départ"
                    mode="time"
                    valeur={heure ? new Date(2000, 0, 1, Number(heure.slice(0, 2)), Number(heure.slice(3, 5))) : null}
                    affichage={heure || undefined}
                    placeholder="--:--"
                    onChange={(d) => setHeure(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)}
                  />
                </>
              )}

              <View style={{ gap: 6 }}>
                <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>Type de voyage</Texte>
                <Segmente<'1' | '2'>
                  libelleAccessible="Type de voyage"
                  valeur={type}
                  onChange={setType}
                  options={[
                    { valeur: '1', libelle: 'Jour' },
                    { valeur: '2', libelle: 'Nuit' },
                  ]}
                />
              </View>

              <ChampSaisie
                libelle="Places mises en vente"
                value={places}
                onChangeText={(t) => setPlaces(t.replace(/\D/g, '').slice(0, 3))}
                keyboardType="number-pad"
                suffixe={capacite ? `sur ${capacite}` : undefined}
                aide="Réduisez si des places sont gardées pour des clients au guichet."
                erreur={capacite && nbPlaces > capacite ? `Ce véhicule n'a que ${capacite} places.` : undefined}
              />
            </ScrollView>

            {/* Pied */}
            <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8, gap: 8 }}>
              {recette > 0 && (
                <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} centre>
                  Recette maximale{nbVoyages > 1 ? ` pour ${nbVoyages} voyages` : ''} : <Texte graisse="tresGras" taille={12.5}>{formatAriary(recette)} Ar</Texte>
                </Texte>
              )}
              <Bouton
                titre={edition ? 'Enregistrer les modifications' : mode === 'plusieurs' ? `Programmer ${dates.length || ''} voyage${dates.length > 1 ? 's' : ''}`.replace('  ', ' ') : 'Programmer le voyage'}
                onPress={enregistrer}
                chargement={envoi}
              />
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

      <FeuilleChoix
        visible={feuille === 'trajet'}
        onClose={() => setFeuille(null)}
        titre="Choisir un trajet"
        recherche="Rechercher un trajet"
        valeur={trajId}
        onChoisir={choisirTrajet}
        vide="Aucun trajet. Créez d'abord un trajet dans la section Trajets."
        options={trajets.map((t) => ({
          id: String(t.id_trajet),
          titre: t.nom_trajet,
          detail: [t.tarif ? `${formatAriary(Number(t.tarif))} Ar` : null, t.duree_formatee || null].filter(Boolean).join(' · '),
          etiquette: CATEGORIES[t.categorie],
        }))}
      />
      <FeuilleChoix
        visible={feuille === 'voiture'}
        onClose={() => setFeuille(null)}
        titre="Choisir un véhicule"
        recherche="Rechercher un véhicule"
        valeur={voitId}
        onChoisir={choisirVoiture}
        vide={`Aucun véhicule ${CATEGORIES[categorie] ? CATEGORIES[categorie] + ' ' : ''}disponible. Seuls les véhicules de la même catégorie que le trajet sont proposés.`}
        options={voituresCompatibles.map((v) => ({
          id: idVoiture(v),
          titre: v.voit_matricule,
          detail: [[v.voit_marque, v.voit_modele].filter(Boolean).join(' '), `${v.voit_places} places`].filter(Boolean).join(' · '),
          etiquette: CATEGORIES[v.voit_categorie],
        }))}
      />
    </>
  );
}

/** FormulaireVoyage dans sa propre fenêtre, avec les bonnes marges de sécurité. */
export function FormulaireVoyage(props: Props) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <FormulaireVoyageContenu {...props} />
    </ModalPleinEcran>
  );
}

export default FormulaireVoyage;
