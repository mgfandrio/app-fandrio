import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../services/api/axiosConfig';
import voitureService from '../../services/voitures/voitureService';
import { voyageService } from '../../services/voyages/voyageService';
import { suiviService, CompagnieSuivi } from '../../services/suivi/suiviService';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, BoutonIcone, ChampSaisie, Segmente, Texte, ModalPleinEcran } from '../ui';
import { couleurs, dateLocaleISO, formatAriary } from '../../theme/ocean';
import { dateCourte, dateHeureCourte, dateVoyage } from '../../utils/voyageStatut';
import { ChampChoix, FeuilleChoix } from './FeuilleChoix';
import { ChampDateHeure } from './ChampDateHeure';
import { CalendrierDates } from './CalendrierDates';

interface Props {
  visible: boolean;
  /** Voyage à modifier ; absent = programmation. */
  voyageId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Publication : tout de suite ; plus tard (voyage planifié sans être publié : prévision,
 * invisible des clients) ; ou automatiquement à une date programmée.
 */
type Publication = 'maintenant' | 'plus_tard' | 'programmee';
const MAX_DATES = 20;

const CATEGORIES: Record<string, string> = { vip: 'VIP', premium: 'Premium' };

function idVoiture(v: any) {
  return String(v.voit_id ?? v.id_voiture ?? v.id ?? '');
}

/** Nom du chauffeur affecté à un véhicule (liste des véhicules de l'API), ou ''. */
function chauffeurDe(v: any): string {
  const c = v?.chauffeur;
  return c ? [c.chauff_prenom, c.chauff_nom].filter(Boolean).join(' ') : '';
}

const HEURE_VALIDE = /^\d{2}:\d{2}$/;
const versHeure = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const depuisHeure = (h: string) => (HEURE_VALIDE.test(h) ? new Date(2000, 0, 1, Number(h.slice(0, 2)), Number(h.slice(3, 5))) : null);

/** Petit bouton « pastille » qui ouvre un sélecteur de date ou d'heure (lignes par date). */
function PastilleChoix({ texte, icone, vide, onPress, libelle }: { texte: string; icone: keyof typeof Ionicons.glyphMap; vide?: boolean; onPress: () => void; libelle: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1.5, borderColor: vide ? couleurs.alerteVif : couleurs.champ, backgroundColor: couleurs.surface }}
    >
      <Ionicons name={icone} size={15} color={vide ? couleurs.alerte : couleurs.ocean800} />
      <Texte graisse="tresGras" taille={13} couleur={vide ? couleurs.alerte : couleurs.encre} style={{ fontVariant: ['tabular-nums'] }}>{texte}</Texte>
    </Pressable>
  );
}

/** Programmer un ou plusieurs voyages (dates choisies sur un calendrier) ou modifier un voyage existant. */
function FormulaireVoyageContenu({ visible, voyageId, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const edition = !!voyageId;

  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [trajets, setTrajets] = useState<any[]>([]);
  const [voitures, setVoitures] = useState<any[]>([]);
  const [feuille, setFeuille] = useState<'trajet' | 'voiture' | 'reception' | null>(null);
  // Compagnie de réception : partenaire située dans la province d'arrivée ('' = aucune)
  const [receptionId, setReceptionId] = useState('');
  const [receptions, setReceptions] = useState<CompagnieSuivi[]>([]);
  const [receptionsChargees, setReceptionsChargees] = useState(false);

  const [trajId, setTrajId] = useState('');
  const [voitId, setVoitId] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  // Publication (à la création, ou tant que le voyage modifié n'est pas publié)
  const [publication, setPublication] = useState<Publication>('maintenant');
  const [pubDate, setPubDate] = useState<Date | null>(null);
  const [pubHeure, setPubHeure] = useState('');
  const [nonPublieExistant, setNonPublieExistant] = useState(false);
  const [heure, setHeure] = useState('');
  // Plusieurs dates : la même heure pour toutes, ou une heure par date
  const [heureParDate, setHeureParDate] = useState(false);
  const [heures, setHeures] = useState<Record<string, string>>({});
  // Publication programmée de plusieurs voyages : en une fois, ou une date par voyage
  const [pubParVoyage, setPubParVoyage] = useState(false);
  const [pubs, setPubs] = useState<Record<string, { date: Date | null; heure: string }>>({});
  const [type, setType] = useState<'1' | '2'>('1');
  const [places, setPlaces] = useState('');

  const message = (title: string, msg: string, t: 'success' | 'danger' | 'warning' = 'danger', ensuite?: () => void) =>
    showDialog({ title, message: msg, type: t, confirmText: 'OK', onConfirm: () => ensuite?.(), onCancel: () => ensuite?.() });

  useEffect(() => {
    if (!visible) return;
    setTrajId('');
    setVoitId('');
    setDates([]);
    setPublication('maintenant');
    setPubDate(null);
    setPubHeure('');
    setNonPublieExistant(false);
    setHeure('');
    setHeureParDate(false);
    setHeures({});
    setPubParVoyage(false);
    setPubs({});
    setType('1');
    setPlaces('');
    setReceptionId('');
    setReceptions([]);
    setReceptionsChargees(false);
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
        const d = dateVoyage(v.date || v.voyage_date);
        setDates(d ? [dateLocaleISO(d)] : []);
        // Voyage pas encore publié : sa publication reste réglable
        if (v.publie === false) {
          setNonPublieExistant(true);
          const prevue = v.publication_prevue ? new Date(v.publication_prevue) : null;
          if (prevue && !isNaN(prevue.getTime())) {
            setPublication('programmee');
            setPubDate(new Date(prevue.getFullYear(), prevue.getMonth(), prevue.getDate()));
            setPubHeure(`${String(prevue.getHours()).padStart(2, '0')}:${String(prevue.getMinutes()).padStart(2, '0')}`);
          } else {
            setPublication('plus_tard');
          }
        }
        setHeure(String(v.heure_depart || v.voyage_heure_depart || '').slice(0, 5));
        setType(Number(v.type ?? v.voyage_type) === 2 ? '2' : '1');
        setPlaces(String(v.places_disponibles ?? ''));
        setReceptionId(v.reception?.id ? String(v.reception.id) : '');
      } else if (voyageId) {
        message('Voyage introuvable', 'Impossible de charger ce voyage.', 'danger', onClose);
      }
    } finally {
      setChargement(false);
    }
  };

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  const trajet = trajets.find((t) => String(t.id_trajet) === trajId);
  const categorie = (trajet?.categorie || 'classique') as string;
  const provinceArrivee: number | null = Number(trajet?.province_arrivee?.id_province) || null;
  const nomArrivee: string = trajet?.province_arrivee?.nom_province || "la province d'arrivée";

  // Compagnies de réception possibles pour la destination du trajet
  useEffect(() => {
    if (!provinceArrivee) {
      setReceptions([]);
      setReceptionsChargees(false);
      return;
    }
    let actif = true;
    setReceptionsChargees(false);
    suiviService.receptionsPourProvince(provinceArrivee).then((r) => {
      if (!actif) return;
      const liste = r.statut ? r.data : [];
      setReceptions(liste);
      setReceptionsChargees(true);
      // Garde le choix s'il convient encore ; sinon, une seule possibilité est choisie d'office
      // (à la création seulement : en modification, « aucune » reste un choix)
      setReceptionId((actuel) =>
        liste.some((c) => String(c.id) === actuel) ? actuel : !edition && liste.length === 1 ? String(liste[0].id) : ''
      );
    });
    return () => {
      actif = false;
    };
  }, [provinceArrivee, edition]);
  const reception = receptions.find((c) => String(c.id) === receptionId);
  const voituresCompatibles = useMemo(
    () => voitures.filter((v) => !trajet || (v.voit_categorie || v.categorie || 'classique') === categorie),
    [voitures, trajet, categorie]
  );
  const voiture = voitures.find((v) => idVoiture(v) === voitId);
  const capacite = Number(voiture?.voit_places) || 0;
  const tarif = Number(trajet?.tarif) || 0;
  const nbPlaces = parseInt(places, 10) || 0;
  const nbVoyages = Math.max(dates.length, 1);
  const plusieurs = dates.length > 1;
  const reglerPublication = !edition || nonPublieExistant;

  const heuresDistinctes = plusieurs && heureParDate;
  const publicationsDistinctes = plusieurs && pubParVoyage && publication === 'programmee';

  /** Heure de départ d'une date : la sienne si « une heure par date », sinon l'heure commune. */
  const heureDe = (iso: string) => (heuresDistinctes ? heures[iso] || heure : heure);

  /** Départ d'une date (heure du téléphone), ou null si l'heure manque. */
  const departDe = (iso: string): Date | null => {
    const h = heureDe(iso);
    const d = dateVoyage(iso);
    return d && HEURE_VALIDE.test(h) ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(h.slice(0, 2)), Number(h.slice(3, 5))) : null;
  };

  const instantDe = (date: Date | null, h: string): Date | null =>
    date && HEURE_VALIDE.test(h) ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(h.slice(0, 2)), Number(h.slice(3, 5))) : null;

  /** Instant de publication commun (heure du téléphone), ou null. */
  const instantPublication = (): Date | null => instantDe(pubDate, pubHeure);

  /** Instant de publication d'un voyage quand chacun a la sienne. */
  const instantPublicationDe = (iso: string): Date | null => instantDe(pubs[iso]?.date ?? null, pubs[iso]?.heure ?? '');

  /** Passe à « une heure par date » en reprenant l'heure commune comme point de départ. */
  const basculerHeureParDate = (parDate: boolean) => {
    if (parDate) setHeures((h) => Object.fromEntries(dates.map((d) => [d, h[d] || heure])));
    setHeureParDate(parDate);
  };

  /** Remplit la publication de chaque voyage : N jours avant son départ, à 08:00. */
  const remplirPublications = (joursAvant: number) =>
    setPubs(
      Object.fromEntries(
        dates.map((iso) => {
          const d = dateVoyage(iso)!;
          const pub = new Date(d.getFullYear(), d.getMonth(), d.getDate() - joursAvant);
          return [iso, { date: pub.getTime() < aujourdhui.getTime() ? aujourdhui : pub, heure: '08:00' }];
        })
      )
    );

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

  const valider = (): string | null => {
    if (!trajId) return 'Choisissez un trajet.';
    if (!voitId) return 'Choisissez un véhicule.';
    if (dates.length === 0) return edition ? 'Choisissez la date du voyage sur le calendrier.' : 'Choisissez au moins une date sur le calendrier.';
    const sansHeure = dates.find((iso) => !HEURE_VALIDE.test(heureDe(iso)));
    if (sansHeure) return heuresDistinctes ? `Choisissez l'heure de départ du ${dateCourte(dateVoyage(sansHeure))}.` : "Choisissez l'heure de départ.";
    if (!nbPlaces || nbPlaces < 1) return 'Indiquez le nombre de places mises en vente.';
    if (capacite && nbPlaces > capacite) return `Ce véhicule n'a que ${capacite} places.`;
    const maintenant = new Date();
    for (const iso of dates) {
      const d = dateVoyage(iso)!;
      if (d < aujourdhui) return `La date du ${dateCourte(d)} est déjà passée.`;
      if (departDe(iso)!.getTime() <= maintenant.getTime()) return "L'heure de départ d'aujourd'hui est déjà passée.";
    }
    if (reglerPublication && publication === 'programmee') {
      if (publicationsDistinctes) {
        for (const iso of dates) {
          const jour = dateCourte(dateVoyage(iso));
          const instant = instantPublicationDe(iso);
          if (!instant) return `Choisissez la date et l’heure de publication du voyage du ${jour}.`;
          if (instant.getTime() <= maintenant.getTime()) return `La publication du voyage du ${jour} doit être dans le futur.`;
          if (instant.getTime() >= departDe(iso)!.getTime()) return `Le voyage du ${jour} doit être publié avant son départ (${heureDe(iso)}).`;
        }
      } else {
        const instant = instantPublication();
        if (!instant) return 'Choisissez la date et l’heure de publication.';
        if (instant.getTime() <= maintenant.getTime()) return 'La date de publication doit être dans le futur.';
        const premier = [...dates].sort()[0];
        if (instant.getTime() >= departDe(premier)!.getTime()) return `La publication doit avoir lieu avant le départ du ${dateCourte(dateVoyage(premier))} à ${heureDe(premier)}.`;
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
      traj_id: parseInt(trajId, 10),
      voit_id: parseInt(voitId, 10),
      voyage_type: parseInt(type, 10),
      places_disponibles: nbPlaces,
      // Compagnie partenaire qui accueille la voiture à destination (null = suivi interne)
      comp_reception: receptionId ? parseInt(receptionId, 10) : null,
    };
    // Publication : envoyée à la création, et à la modification d'un voyage non publié
    const instant = instantPublication();
    // Une publication par voyage : envoyée avec chaque voyage, pas avec le lot
    const champsPublication = reglerPublication && !publicationsDistinctes
      ? { publication, ...(publication === 'programmee' && instant ? { publication_date: instant.toISOString() } : {}) }
      : {};
    const apres = () => {
      onSuccess?.();
      onClose();
    };
    const titreSucces =
      publication === 'plus_tard' && reglerPublication
        ? plusieurs ? 'Voyages planifiés' : 'Voyage planifié'
        : publication === 'programmee' && reglerPublication
          ? 'Publication programmée'
          : edition ? 'Voyage modifié' : plusieurs ? 'Voyages publiés' : 'Voyage publié';

    setEnvoi(true);
    try {
      if (plusieurs) {
        const r = await voyageService.ajouterVoyagesMultiples(
          dates.map((d) => ({
            ...base,
            voyage_date: d,
            voyage_heure_depart: heureDe(d),
            ...(publicationsDistinctes ? { publication: 'programmee', publication_date: instantPublicationDe(d)!.toISOString() } : {}),
          })),
          champsPublication
        );
        if (r.statut) {
          const erreurs: string[] = r.data?.erreurs || [];
          message(
            erreurs.length ? 'Programmation partielle' : titreSucces,
            (publicationsDistinctes && !erreurs.length
              ? `${dates.length} voyages planifiés : chacun sera publié automatiquement à la date que vous avez choisie.`
              : r.message || `${dates.length} voyages enregistrés.`) + (erreurs.length ? `\n\n${erreurs.join('\n')}` : ''),
            erreurs.length ? 'warning' : 'success',
            apres
          );
        } else {
          message('Programmation impossible', r.message || 'Une erreur est survenue.');
        }
      } else {
        const data = { ...base, voyage_date: dates[0], voyage_heure_depart: heure, ...champsPublication };
        const r = edition ? await voyageService.modifierVoyage(voyageId!, data) : await voyageService.ajouterVoyage(data);
        if (r.statut === true) {
          const detail =
            publication === 'plus_tard' && reglerPublication
              ? 'Ce voyage est planifié mais pas encore publié : les clients ne le voient pas. Publiez-le au moment voulu.'
              : publication === 'programmee' && reglerPublication && instant
                ? `Ce voyage sera publié automatiquement le ${dateHeureCourte(instant)}.`
                : edition ? 'Les modifications sont enregistrées.' : 'Le voyage est ouvert aux réservations.';
          message(titreSucces, detail, 'success', apres);
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
          <Texte graisse="tresGras" taille={17} style={{ flex: 1 }}>{edition ? 'Modifier le voyage' : 'Planifier des voyages'}</Texte>
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
                detail={
                  voiture
                    ? [`${capacite} places`, CATEGORIES[voiture.voit_categorie], chauffeurDe(voiture) ? `Chauffeur : ${chauffeurDe(voiture)}` : 'Aucun chauffeur affecté'].filter(Boolean).join(' · ')
                    : trajId ? undefined : "Choisissez d'abord le trajet"
                }
                placeholder="Choisir un véhicule"
                onPress={() => setFeuille('voiture')}
                desactive={!trajId}
              />

              {/* Compagnie de réception : partenaire à destination, prévenue au départ de la voiture */}
              {!!trajId && receptionsChargees && receptions.length === 0 ? (
                <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: couleurs.ocean50 }}>
                  <Ionicons name="information-circle-outline" size={19} color={couleurs.ocean800} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texte graisse="tresGras" taille={13}>Compagnie de réception : aucune</Texte>
                    <Texte graisse="moyen" taille={12.5} couleur={couleurs.encreDouce} style={{ lineHeight: 18 }}>
                      Aucune de vos compagnies partenaires n'est à {nomArrivee}. Vous suivrez ce voyage vous-même et confirmerez son arrivée. Pour ajouter un partenaire : Paramètres › Compagnies partenaires.
                    </Texte>
                  </View>
                </View>
              ) : (
                <ChampChoix
                  libelle="Compagnie de réception"
                  icone="flag-outline"
                  titre={reception ? reception.nom : trajId && receptionsChargees ? 'Aucune (suivi par votre compagnie)' : undefined}
                  detail={
                    reception
                      ? `À ${reception.province?.nom || nomArrivee} · reçoit la liste des voyageurs au départ et confirme l'arrivée`
                      : trajId
                        ? receptionsChargees
                          ? `${receptions.length} partenaire${receptions.length > 1 ? 's' : ''} à ${nomArrivee}`
                          : 'Recherche de vos partenaires…'
                        : "Choisissez d'abord le trajet"
                  }
                  placeholder="Choisir la compagnie de réception"
                  onPress={() => setFeuille('reception')}
                  desactive={!trajId || !receptionsChargees}
                />
              )}

              {/* Dates : calendrier (une ou plusieurs dates à la création, une seule en modification) */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>{edition ? 'Date du voyage' : 'Dates des voyages'}</Texte>
                  {!edition && (
                    <Texte graisse="tresGras" taille={12.5} couleur={couleurs.ocean800}>
                      {dates.length} / {MAX_DATES}
                    </Texte>
                  )}
                </View>
                <CalendrierDates selection={dates} onChange={setDates} multiple={!edition} max={MAX_DATES} minimum={aujourdhui} />
                {dates.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {dates.map((iso) => (
                      <Pressable
                        key={iso}
                        onPress={() => setDates((p) => p.filter((x) => x !== iso))}
                        disabled={edition}
                        accessibilityRole="button"
                        accessibilityLabel={`Retirer le ${dateCourte(dateVoyage(iso))}`}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 12, paddingRight: edition ? 12 : 8, borderRadius: 999, backgroundColor: couleurs.ocean50 }}
                      >
                        <Texte graisse="gras" taille={13} couleur={couleurs.ocean950}>{dateCourte(dateVoyage(iso))}</Texte>
                        {!edition && <Ionicons name="close" size={15} color={couleurs.ocean800} />}
                      </Pressable>
                    ))}
                  </View>
                )}
                {plusieurs && (
                  <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Même trajet, même véhicule et mêmes places pour chaque date.</Texte>
                )}
              </View>

              {/* Heure de départ : commune, ou une par date quand il y a plusieurs dates */}
              <View style={{ gap: 8 }}>
                {plusieurs && (
                  <>
                    <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>Heure de départ</Texte>
                    <Segmente<'meme' | 'par_date'>
                      libelleAccessible="Heure de départ identique ou différente selon la date"
                      valeur={heureParDate ? 'par_date' : 'meme'}
                      onChange={(v) => basculerHeureParDate(v === 'par_date')}
                      options={[
                        { valeur: 'meme', libelle: 'La même pour toutes' },
                        { valeur: 'par_date', libelle: 'Une par date' },
                      ]}
                    />
                  </>
                )}
                {heuresDistinctes ? (
                  <View style={{ borderWidth: 1, borderColor: couleurs.ligne, borderRadius: 14, backgroundColor: couleurs.surface, overflow: 'hidden' }}>
                    {dates.map((iso, i) => (
                      <View key={iso} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
                        <Texte graisse="tresGras" taille={13.5} style={{ flex: 1 }} numberOfLines={1}>{dateCourte(dateVoyage(iso))}</Texte>
                        <ChampDateHeure
                          libelle={`Heure de départ du ${dateCourte(dateVoyage(iso))}`}
                          mode="time"
                          valeur={depuisHeure(heureDe(iso))}
                          placeholder=""
                          onChange={(d) => setHeures((h) => ({ ...h, [iso]: versHeure(d) }))}
                          declencheur={(ouvrir) => (
                            <PastilleChoix texte={heureDe(iso) || '--:--'} icone="time-outline" vide={!heureDe(iso)} onPress={ouvrir} libelle={`Heure de départ du ${dateCourte(dateVoyage(iso))} : ${heureDe(iso) || 'à choisir'}`} />
                          )}
                        />
                      </View>
                    ))}
                  </View>
                ) : (
                  <ChampDateHeure
                    libelle={plusieurs ? 'Heure de départ de chaque voyage' : 'Heure de départ'}
                    mode="time"
                    valeur={depuisHeure(heure)}
                    affichage={heure || undefined}
                    placeholder="--:--"
                    onChange={(d) => setHeure(versHeure(d))}
                  />
                )}
              </View>

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

              {/* Publication */}
              {reglerPublication && (
                <View style={{ gap: 8 }}>
                  <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>Publication</Texte>
                  <Segmente<Publication>
                    libelleAccessible="Publication"
                    valeur={publication}
                    onChange={setPublication}
                    options={[
                      { valeur: 'maintenant', libelle: 'Maintenant' },
                      { valeur: 'plus_tard', libelle: 'Plus tard' },
                      { valeur: 'programmee', libelle: 'Programmée' },
                    ]}
                  />
                  {publication === 'programmee' && plusieurs && (
                    <Segmente<'une_fois' | 'par_voyage'>
                      libelleAccessible="Publier tous les voyages en une fois ou chacun à sa date"
                      valeur={pubParVoyage ? 'par_voyage' : 'une_fois'}
                      onChange={(v) => setPubParVoyage(v === 'par_voyage')}
                      options={[
                        { valeur: 'une_fois', libelle: 'Tous en une fois' },
                        { valeur: 'par_voyage', libelle: 'Une date par voyage' },
                      ]}
                    />
                  )}
                  {publication === 'programmee' && !publicationsDistinctes && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <ChampDateHeure libelle="Publier le" mode="date" valeur={pubDate} affichage={pubDate ? dateCourte(pubDate) : undefined} placeholder="Choisir" minimumDate={aujourdhui} onChange={setPubDate} />
                      <ChampDateHeure libelle="À" mode="time" valeur={depuisHeure(pubHeure)} affichage={pubHeure || undefined} placeholder="--:--" onChange={(d) => setPubHeure(versHeure(d))} />
                    </View>
                  )}
                  {publicationsDistinctes && (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Remplir d’un coup :</Texte>
                        {[3, 7, 14].map((n) => (
                          <Pressable
                            key={n}
                            onPress={() => remplirPublications(n)}
                            accessibilityRole="button"
                            accessibilityLabel={`Publier chaque voyage ${n} jours avant son départ`}
                            style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: couleurs.ocean50, justifyContent: 'center' }}
                          >
                            <Texte graisse="tresGras" taille={12.5} couleur={couleurs.ocean800}>{n} j avant</Texte>
                          </Pressable>
                        ))}
                      </View>
                      <View style={{ borderWidth: 1, borderColor: couleurs.ligne, borderRadius: 14, backgroundColor: couleurs.surface, overflow: 'hidden' }}>
                        {dates.map((iso, i) => {
                          const pub = pubs[iso] || { date: null, heure: '' };
                          const jour = dateCourte(dateVoyage(iso));
                          return (
                            <View key={iso} style={{ gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
                              <Texte graisse="tresGras" taille={13.5} numberOfLines={1}>
                                Voyage du {jour}{heureDe(iso) ? ` · ${heureDe(iso)}` : ''}
                              </Texte>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris}>Publier le</Texte>
                                <ChampDateHeure
                                  libelle={`Date de publication du voyage du ${jour}`}
                                  mode="date"
                                  valeur={pub.date}
                                  placeholder=""
                                  minimumDate={aujourdhui}
                                  onChange={(d) => setPubs((x) => ({ ...x, [iso]: { ...pub, date: d } }))}
                                  declencheur={(ouvrir) => (
                                    <PastilleChoix texte={pub.date ? dateCourte(pub.date) : 'Date'} icone="calendar-outline" vide={!pub.date} onPress={ouvrir} libelle={`Date de publication du voyage du ${jour} : ${pub.date ? dateCourte(pub.date) : 'à choisir'}`} />
                                  )}
                                />
                                <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris}>à</Texte>
                                <ChampDateHeure
                                  libelle={`Heure de publication du voyage du ${jour}`}
                                  mode="time"
                                  valeur={depuisHeure(pub.heure)}
                                  placeholder=""
                                  onChange={(d) => setPubs((x) => ({ ...x, [iso]: { ...pub, heure: versHeure(d) } }))}
                                  declencheur={(ouvrir) => (
                                    <PastilleChoix texte={pub.heure || '--:--'} icone="time-outline" vide={!pub.heure} onPress={ouvrir} libelle={`Heure de publication du voyage du ${jour} : ${pub.heure || 'à choisir'}`} />
                                  )}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: couleurs.ocean50 }}>
                    <Ionicons name={publication === 'maintenant' ? 'eye-outline' : publication === 'plus_tard' ? 'eye-off-outline' : 'time-outline'} size={18} color={couleurs.ocean800} />
                    <Texte graisse="moyen" taille={12.5} couleur={couleurs.ocean800} style={{ flex: 1, lineHeight: 18 }}>
                      {publication === 'maintenant'
                        ? `Les clients ${plusieurs ? 'voient ces voyages' : 'voient ce voyage'} et peuvent réserver dès l’enregistrement.`
                        : publication === 'plus_tard'
                          ? `${plusieurs ? 'Ces voyages sont planifiés sans être publiés : ils servent' : 'Ce voyage est planifié sans être publié : il sert'} de prévision et les clients ne ${plusieurs ? 'les' : 'le'} voient pas. Vous pourrez changer la date, l’heure ou le véhicule, puis publier au moment voulu.`
                          : publicationsDistinctes
                            ? 'Chaque voyage reste invisible pour les clients jusqu’à sa propre date de publication, puis est publié automatiquement.'
                            : `${plusieurs ? 'Ces voyages restent invisibles' : 'Ce voyage reste invisible'} pour les clients jusqu’à la date choisie, puis ${plusieurs ? 'sont publiés tous ensemble' : 'est publié'} automatiquement.`}
                    </Texte>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Pied */}
            <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8, gap: 8 }}>
              {recette > 0 && (
                <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} centre>
                  Recette maximale{nbVoyages > 1 ? ` pour ${nbVoyages} voyages` : ''} : <Texte graisse="tresGras" taille={12.5}>{formatAriary(recette)} Ar</Texte>
                </Texte>
              )}
              <Bouton
                titre={
                  edition && !nonPublieExistant
                    ? 'Enregistrer les modifications'
                    : publication === 'plus_tard'
                      ? plusieurs ? `Planifier ${dates.length} voyages` : 'Planifier le voyage'
                      : publication === 'programmee'
                        ? plusieurs ? `Programmer ${dates.length} publications` : 'Programmer la publication'
                        : plusieurs ? `Publier ${dates.length} voyages` : 'Publier le voyage'
                }
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
          detail: [[v.voit_marque, v.voit_modele].filter(Boolean).join(' '), `${v.voit_places} places`, chauffeurDe(v) ? `Chauffeur : ${chauffeurDe(v)}` : 'Aucun chauffeur'].filter(Boolean).join(' · '),
          etiquette: CATEGORIES[v.voit_categorie],
        }))}
      />
      <FeuilleChoix
        visible={feuille === 'reception'}
        onClose={() => setFeuille(null)}
        titre="Compagnie de réception"
        recherche="Rechercher une compagnie"
        valeur={receptionId || '0'}
        onChoisir={(id) => {
          setReceptionId(id === '0' ? '' : id);
          setFeuille(null);
        }}
        vide={`Aucune compagnie partenaire à ${nomArrivee}.`}
        options={[
          ...receptions.map((c) => ({ id: String(c.id), titre: c.nom, detail: `${c.province?.nom || nomArrivee} · prévenue au départ, confirme l'arrivée` })),
          { id: '0', titre: 'Aucune', detail: 'Vous suivez le voyage et confirmez son arrivée vous-même' },
        ]}
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
