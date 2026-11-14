import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { voyageService } from '@/app/services/voyages/voyageService';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Recherche } from '@/app/components/flotte/communs';
import { DetailVoyage } from '@/app/components/voyages/DetailVoyage';
import { FormulaireVoyage } from '@/app/components/voyages/FormulaireVoyage';
import { FeuilleChoix } from '@/app/components/voyages/FeuilleChoix';
import { Bouton, BoutonIcone, Carte, EnTete, Pastille, Puce, Segmente, Texte } from '@/app/components/ui';
import { couleurs, dateLocaleISO } from '@/app/theme/ocean';
import type { Tonalite } from '@/app/theme/ocean';
import { dateCourte, dateHeureCourte, dateVoyage, estEnPause, estNonPublie, libelleType, publicationPrevue, remplissage, statutValeur, titreJour } from '@/app/utils/voyageStatut';

/**
 * Planning des voyages de la compagnie, avec le véhicule affecté (matricule)
 * et son chauffeur :
 * - « À venir » : voyages programmés, publiés ou non, pour prévoir les départs
 *   des prochaines semaines et vérifier les affectations avant de publier ;
 * - « Passés » : voyages terminés ou annulés, du plus récent au plus ancien.
 */

type Vue = 'avenir' | 'passes';
type Periode = '7' | '14' | '30' | 'tout';
type FiltrePublication = 'tous' | 'publies' | 'non_publies';
type FiltreIssue = 'tous' | 'termines' | 'annules';
type Choix = 'trajet' | 'vehicule' | 'chauffeur' | null;

const PERIODES: { valeur: Periode; libelle: string }[] = [
  { valeur: '7', libelle: '7 jours' },
  { valeur: '14', libelle: '14 jours' },
  { valeur: '30', libelle: '30 jours' },
  { valeur: 'tout', libelle: 'Tout' },
];

function idVoyage(v: any): number {
  return Number(v.id ?? v.voyage_id);
}

function nomChauffeur(v: any): string {
  const c = v.voiture?.chauffeur;
  return c ? [c.prenom, c.nom].filter(Boolean).join(' ') : '';
}

/** Pastille d'état pour le planning : publication d'abord, puis l'état du voyage. */
function etat(v: any): { libelle: string; tonalite: Tonalite } {
  if (statutValeur(v) === 4) return { libelle: 'Annulé', tonalite: 'danger' };
  if (statutValeur(v) === 3) return { libelle: 'Terminé', tonalite: 'neutre' };
  if (estNonPublie(v)) return { libelle: publicationPrevue(v) ? 'Programmé' : 'Non publié', tonalite: 'neutre' };
  if (estEnPause(v)) return { libelle: 'En pause', tonalite: 'alerte' };
  if (statutValeur(v) === 2) return { libelle: 'En cours', tonalite: 'alerte' };
  if (remplissage(v).complet) return { libelle: 'Complet', tonalite: 'succes' };
  return { libelle: 'Publié', tonalite: 'succes' };
}

function LignePlanning({ v, premiere, onPress }: { v: any; premiere: boolean; onPress: () => void }) {
  const [presse, setPresse] = useState(false);
  const r = remplissage(v);
  const e = etat(v);
  const prevue = publicationPrevue(v);
  const chauffeur = nomChauffeur(v);
  const trajet = `${v.trajet?.province_depart || 'Départ'} → ${v.trajet?.province_arrivee || 'Arrivée'}`;
  const heure = String(v.heure_depart || '').slice(0, 5);
  const vehicule = [v.voiture?.matricule, [v.voiture?.marque, v.voiture?.modele].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPresse(true)}
      onPressOut={() => setPresse(false)}
      accessibilityRole="button"
      accessibilityLabel={`${heure}, ${trajet}, véhicule ${v.voiture?.matricule || 'non renseigné'}, chauffeur ${chauffeur || 'non affecté'}, ${r.pris} places sur ${r.total}, ${e.libelle}`}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur, backgroundColor: presse ? couleurs.ocean50 : 'transparent' }}
    >
      <View style={{ width: 50 }}>
        <Texte variante="montant" taille={16}>{heure}</Texte>
        <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>{libelleType(v.type)}</Texte>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Texte graisse="tresGras" taille={13.5} numberOfLines={1}>{trajet}</Texte>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="bus-outline" size={13} color={couleurs.gris} />
          <Texte graisse="gras" taille={12} couleur={couleurs.encreDouce} numberOfLines={1} style={{ flex: 1 }}>{vehicule || 'Véhicule non renseigné'}</Texte>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="person-outline" size={13} color={chauffeur ? couleurs.gris : couleurs.alerte} />
          <Texte graisse="gras" taille={12} couleur={chauffeur ? couleurs.encreDouce : couleurs.alerte} numberOfLines={1} style={{ flex: 1 }}>
            {chauffeur || 'Aucun chauffeur affecté à ce véhicule'}
          </Texte>
        </View>
        {!!prevue && (
          <Texte graisse="gras" taille={11.5} couleur={couleurs.ocean800} numberOfLines={1}>Publication le {dateHeureCourte(prevue)}</Texte>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Texte variante="montant" taille={13}>{r.pris}/{r.total}</Texte>
        <Pastille libelle={e.libelle} tonalite={e.tonalite} />
      </View>
    </Pressable>
  );
}

/** Une ligne de rappel : voyage en attente de publication. */
function LigneRappel({ v, detail, premiere, onPress }: { v: any; detail: string; premiere: boolean; onPress: () => void }) {
  const trajet = `${v.trajet?.province_depart || 'Départ'} → ${v.trajet?.province_arrivee || 'Arrivée'}`;
  const quand = [dateCourte(dateVoyage(v.date)), String(v.heure_depart || '').slice(0, 5)].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${trajet}, ${quand}, ${detail}. Ouvrir le voyage.`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: premiere ? 0 : 1, borderTopColor: 'rgba(143,79,5,0.15)' }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texte graisse="tresGras" taille={13.5} numberOfLines={1}>{trajet} · {quand}</Texte>
        <Texte graisse="gras" taille={12} couleur={couleurs.alerte} numberOfLines={1}>{detail}</Texte>
      </View>
      <Ionicons name="chevron-forward" size={17} color={couleurs.alerte} />
    </Pressable>
  );
}

export const RenderPlanning = ({ onMenu, onRappels }: { onMenu?: () => void; onRappels?: (total: number) => void }) => {
  const insets = useSafeAreaInsets();
  const [voyages, setVoyages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Rappels : voyages planifiés en attente de publication (dans les 3 jours)
  const [rappels, setRappels] = useState<{ jours: number; bientotPublies: any[]; aPublier: any[] }>({ jours: 3, bientotPublies: [], aPublier: [] });

  const [vue, setVue] = useState<Vue>('avenir');
  const [periode, setPeriode] = useState<Periode>('14');
  const [publication, setPublication] = useState<FiltrePublication>('tous');
  const [issue, setIssue] = useState<FiltreIssue>('tous');
  const [recherche, setRecherche] = useState('');
  const [trajet, setTrajet] = useState('');
  const [vehicule, setVehicule] = useState('');
  const [chauffeur, setChauffeur] = useState('');
  const [choix, setChoix] = useState<Choix>(null);

  const [detail, setDetail] = useState<any | null>(null);
  const [formulaire, setFormulaire] = useState<{ visible: boolean; id: number | null }>({ visible: false, id: null });

  const charger = useCallback(async (vueDemandee: Vue, p: Periode) => {
    const aujourdhui = new Date();
    const borne = new Date();
    if (p !== 'tout') borne.setDate(borne.getDate() + (vueDemandee === 'avenir' ? 1 : -1) * (Number(p) - 1));
    const r = await voyageService.obtenirVoyagesPage(
      vueDemandee === 'avenir'
        ? {
            a_venir: 1,
            date_debut: dateLocaleISO(aujourdhui),
            ...(p !== 'tout' ? { date_fin: dateLocaleISO(borne) } : {}),
            per_page: 200,
            sort_field: 'voyage_date',
            sort_direction: 'asc',
          }
        : {
            // Passés : terminés ou annulés, du plus récent au plus ancien
            passes: 1,
            date_fin: dateLocaleISO(aujourdhui),
            ...(p !== 'tout' ? { date_debut: dateLocaleISO(borne) } : {}),
            per_page: 200,
            sort_field: 'voyage_date',
            sort_direction: 'desc',
          }
    );
    if (r.statut) {
      setVoyages(r.voyages);
      setErreur(null);
    } else {
      setErreur(r.message || 'Impossible de charger le planning.');
    }
  }, []);

  const chargerRappels = useCallback(async () => {
    const r = await voyageService.obtenirRappelsPublication();
    if (r.statut) {
      setRappels({ jours: r.jours, bientotPublies: r.bientotPublies, aPublier: r.aPublier });
      onRappels?.(r.total);
    }
  }, [onRappels]);

  useEffect(() => {
    setLoading(true);
    setVoyages([]);
    charger(vue, periode).finally(() => setLoading(false));
  }, [vue, periode, charger]);

  useEffect(() => {
    chargerRappels();
  }, [chargerRappels]);

  const actualiser = async () => {
    setRefreshing(true);
    await Promise.all([charger(vue, periode), chargerRappels()]);
    setRefreshing(false);
  };

  const changerVue = (v: Vue) => {
    setVue(v);
    // Les filtres propres à l'autre vue n'ont plus de sens
    setPublication('tous');
    setIssue('tous');
    setTrajet('');
    setVehicule('');
    setChauffeur('');
  };

  // Valeurs proposées dans les filtres : celles des voyages de la période
  const options = useMemo(() => {
    const t = new Map<string, string>();
    const ve = new Map<string, string>();
    const ch = new Map<string, string>();
    for (const v of voyages) {
      if (v.trajet?.id != null) t.set(String(v.trajet.id), `${v.trajet.province_depart || ''} → ${v.trajet.province_arrivee || ''}`);
      if (v.voiture?.id != null) ve.set(String(v.voiture.id), [v.voiture.matricule, [v.voiture.marque, v.voiture.modele].filter(Boolean).join(' ')].filter(Boolean).join(' · '));
      if (v.voiture?.chauffeur?.id != null) ch.set(String(v.voiture.chauffeur.id), nomChauffeur(v));
    }
    const liste = (m: Map<string, string>, tous: string) => [{ id: '', titre: tous }, ...[...m.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, titre]) => ({ id, titre }))];
    return { trajet: liste(t, 'Tous les trajets'), vehicule: liste(ve, 'Tous les véhicules'), chauffeur: liste(ch, 'Tous les chauffeurs'), noms: { t, ve, ch } };
  }, [voyages]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return voyages.filter((v) => {
      if (vue === 'avenir') {
        if (publication === 'publies' && estNonPublie(v)) return false;
        if (publication === 'non_publies' && !estNonPublie(v)) return false;
      } else {
        if (issue === 'termines' && statutValeur(v) !== 3) return false;
        if (issue === 'annules' && statutValeur(v) !== 4) return false;
      }
      if (trajet && String(v.trajet?.id) !== trajet) return false;
      if (vehicule && String(v.voiture?.id) !== vehicule) return false;
      if (chauffeur && String(v.voiture?.chauffeur?.id) !== chauffeur) return false;
      if (q) {
        const texte = [v.trajet?.province_depart, v.trajet?.province_arrivee, v.voiture?.matricule, v.voiture?.marque, v.voiture?.modele, nomChauffeur(v)].filter(Boolean).join(' ').toLowerCase();
        if (!texte.includes(q)) return false;
      }
      return true;
    });
  }, [voyages, vue, publication, issue, trajet, vehicule, chauffeur, recherche]);

  // Regroupement par jour
  const jours = useMemo(() => {
    const g: { titre: string; items: any[] }[] = [];
    for (const v of filtres) {
      const d = dateVoyage(v.date);
      const titre = d ? titreJour(d) : 'Date inconnue';
      const dernier = g[g.length - 1];
      if (dernier && dernier.titre === titre) dernier.items.push(v);
      else g.push({ titre, items: [v] });
    }
    return g;
  }, [filtres]);

  const nbNonPublies = filtres.filter(estNonPublie).length;
  const sansChauffeur = filtres.filter((v) => !v.voiture?.chauffeur).length;
  const passes = vue === 'passes';
  const nbAnnules = filtres.filter((v) => statutValeur(v) === 4).length;
  const billetsVendus = filtres.reduce((t, v) => t + (statutValeur(v) === 3 ? Number(v.places_reservees) || 0 : 0), 0);
  const filtreActif = !!(trajet || vehicule || chauffeur || recherche.trim() || publication !== 'tous' || issue !== 'tous');
  const effacer = () => {
    setTrajet('');
    setVehicule('');
    setChauffeur('');
    setRecherche('');
    setPublication('tous');
    setIssue('tous');
  };
  const resume = passes
    ? [
        { v: filtres.length, l: 'Voyages', c: couleurs.encre },
        { v: filtres.length - nbAnnules, l: 'Terminés', c: couleurs.encre },
        { v: nbAnnules, l: 'Annulés', c: nbAnnules ? couleurs.danger : couleurs.encre },
        { v: billetsVendus, l: 'Billets vendus', c: couleurs.succes },
      ]
    : [
        { v: filtres.length, l: 'Voyages', c: couleurs.encre },
        { v: filtres.length - nbNonPublies, l: 'Publiés', c: couleurs.succes },
        { v: nbNonPublies, l: 'Non publiés', c: couleurs.encre },
        { v: sansChauffeur, l: 'Sans chauffeur', c: sansChauffeur ? couleurs.alerte : couleurs.encre },
      ];

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete
        titre="Planning des voyages"
        sousTitre={passes ? 'Voyages terminés ou annulés' : 'Voyages programmés, publiés ou non'}
        gauche="menu"
        onGauche={onMenu}
        droite={<BoutonIcone icone="add" libelle="Planifier des voyages" onPress={() => setFormulaire({ visible: true, id: null })} />}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={actualiser} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
      >
        {/* À venir / Passés */}
        <Segmente<Vue>
          libelleAccessible="Voyages à venir ou passés"
          valeur={vue}
          onChange={changerVue}
          options={[
            { valeur: 'avenir', libelle: 'À venir' },
            { valeur: 'passes', libelle: 'Passés' },
          ]}
        />

        {/* Rappels : voyages en attente de publication */}
        {!passes && rappels.bientotPublies.length + rappels.aPublier.length > 0 && (
          <View accessibilityRole="alert" style={{ gap: 10, padding: 14, borderRadius: 16, backgroundColor: couleurs.alerteFond, borderWidth: 1, borderColor: 'rgba(228,161,58,0.5)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="notifications-outline" size={20} color={couleurs.alerte} />
              <Texte graisse="tresGras" taille={14.5} couleur={couleurs.alerte} style={{ flex: 1 }}>
                {rappels.bientotPublies.length + rappels.aPublier.length} voyage{rappels.bientotPublies.length + rappels.aPublier.length > 1 ? 's' : ''} en attente de publication
              </Texte>
            </View>

            {rappels.bientotPublies.length > 0 && (
              <View>
                <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce} style={{ lineHeight: 18 }}>
                  Publication automatique dans les {rappels.jours} prochains jours. Vérifiez la date, l’heure, le véhicule et le chauffeur :
                </Texte>
                {rappels.bientotPublies.map((v, i) => (
                  <LigneRappel
                    key={idVoyage(v)}
                    v={v}
                    premiere={i === 0}
                    detail={v.publication_prevue ? `Sera publié le ${dateHeureCourte(new Date(v.publication_prevue))}` : 'Publication programmée'}
                    onPress={() => setDetail(v)}
                  />
                ))}
              </View>
            )}

            {rappels.aPublier.length > 0 && (
              <View>
                <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce} style={{ lineHeight: 18 }}>
                  Départ dans les {rappels.jours} prochains jours, sans date de publication. Publiez-les pour que les clients puissent réserver :
                </Texte>
                {rappels.aPublier.map((v, i) => (
                  <LigneRappel key={idVoyage(v)} v={v} premiere={i === 0} detail="Pas encore publié : à publier" onPress={() => setDetail(v)} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Résumé */}
        <Carte padding={0} style={{ flexDirection: 'row' }}>
          {resume.map((s, i) => (
            <View key={s.l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: couleurs.separateur }}>
              <Texte variante="montant" taille={18} couleur={s.c}>{loading ? '–' : s.v}</Texte>
              <Texte graisse="moyen" taille={11} couleur={couleurs.gris} numberOfLines={1}>{s.l}</Texte>
            </View>
          ))}
        </Carte>

        {/* Filtres */}
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="Trajet, matricule, chauffeur…" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PERIODES.map((p) => (
            <Puce
              key={p.valeur}
              libelle={p.valeur === 'tout' ? 'Tout' : passes ? `${p.valeur} derniers jours` : `${p.valeur} prochains jours`}
              active={periode === p.valeur}
              onPress={() => setPeriode(p.valeur)}
            />
          ))}
        </ScrollView>

        {passes ? (
          <Segmente<FiltreIssue>
            libelleAccessible="Issue du voyage"
            valeur={issue}
            onChange={setIssue}
            options={[
              { valeur: 'tous', libelle: 'Tous' },
              { valeur: 'termines', libelle: 'Terminés' },
              { valeur: 'annules', libelle: 'Annulés' },
            ]}
          />
        ) : (
          <Segmente<FiltrePublication>
            libelleAccessible="Publication"
            valeur={publication}
            onChange={setPublication}
            options={[
              { valeur: 'tous', libelle: 'Tous' },
              { valeur: 'publies', libelle: 'Publiés' },
              { valeur: 'non_publies', libelle: 'Non publiés' },
            ]}
          />
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Puce icone="git-commit-outline" libelle={trajet ? options.noms.t.get(trajet) || 'Trajet' : 'Trajet'} active={!!trajet} onPress={() => setChoix('trajet')} />
          <Puce icone="bus-outline" libelle={vehicule ? options.noms.ve.get(vehicule) || 'Véhicule' : 'Véhicule'} active={!!vehicule} onPress={() => setChoix('vehicule')} />
          <Puce icone="person-outline" libelle={chauffeur ? options.noms.ch.get(chauffeur) || 'Chauffeur' : 'Chauffeur'} active={!!chauffeur} onPress={() => setChoix('chauffeur')} />
          {filtreActif && <Puce icone="close" libelle="Effacer" active={false} onPress={effacer} />}
        </ScrollView>

        {/* Liste */}
        {loading ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} height={96} borderRadius={16} />)}
          </View>
        ) : erreur ? (
          <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
            <Ionicons name="cloud-offline-outline" size={32} color={couleurs.danger} />
            <Texte graisse="moyen" taille={14} couleur={couleurs.gris} centre>{erreur}</Texte>
            <Bouton titre="Réessayer" variante="secondaire" compact icone="refresh" onPress={actualiser} />
          </Carte>
        ) : jours.length === 0 ? (
          <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 26 }}>
            <Ionicons name="calendar-outline" size={30} color={couleurs.grisClair} />
            <Texte graisse="tresGras" taille={15} centre>
              {filtreActif ? 'Aucun voyage ne correspond' : passes ? 'Aucun voyage passé sur cette période' : 'Aucun voyage programmé sur cette période'}
            </Texte>
            <Texte variante="legende" centre>
              {filtreActif ? 'Modifiez ou effacez les filtres.' : passes ? 'Essayez une période plus longue.' : 'Planifiez vos prochains départs, même sans les publier tout de suite.'}
            </Texte>
            {filtreActif ? (
              <Bouton titre="Effacer les filtres" variante="secondaire" compact onPress={effacer} style={{ marginTop: 4 }} />
            ) : passes ? null : (
              <Bouton titre="Planifier des voyages" compact icone="add" onPress={() => setFormulaire({ visible: true, id: null })} style={{ marginTop: 4 }} />
            )}
          </Carte>
        ) : (
          jours.map((j) => (
            <View key={j.titre} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 2 }}>
                <Texte variante="etiquette">{j.titre}</Texte>
                <Texte graisse="gras" taille={11.5} couleur={couleurs.gris}>{j.items.length} voyage{j.items.length > 1 ? 's' : ''}</Texte>
              </View>
              <Carte padding={0}>
                {j.items.map((v, i) => (
                  <LignePlanning key={idVoyage(v)} v={v} premiere={i === 0} onPress={() => setDetail(v)} />
                ))}
              </Carte>
            </View>
          ))
        )}
        {!loading && voyages.length >= 200 && (
          <Texte variante="legende" centre>Seuls les 200 {passes ? 'voyages les plus récents' : 'prochains voyages'} sont affichés. Réduisez la période pour voir le détail.</Texte>
        )}
      </ScrollView>

      {/* Filtres : trajet, véhicule, chauffeur */}
      <FeuilleChoix
        visible={choix !== null}
        onClose={() => setChoix(null)}
        titre={choix === 'trajet' ? 'Filtrer par trajet' : choix === 'vehicule' ? 'Filtrer par véhicule' : 'Filtrer par chauffeur'}
        options={choix ? options[choix] : []}
        valeur={choix === 'trajet' ? trajet : choix === 'vehicule' ? vehicule : chauffeur}
        onChoisir={(id) => {
          if (choix === 'trajet') setTrajet(id);
          else if (choix === 'vehicule') setVehicule(id);
          else setChauffeur(id);
          setChoix(null);
        }}
      />

      <DetailVoyage
        visible={!!detail}
        voyageId={detail ? idVoyage(detail) : null}
        apercu={detail}
        onClose={() => setDetail(null)}
        onModifier={(id) => setFormulaire({ visible: true, id })}
        onChange={actualiser}
      />
      <FormulaireVoyage visible={formulaire.visible} voyageId={formulaire.id} onClose={() => setFormulaire({ visible: false, id: null })} onSuccess={actualiser} />
    </View>
  );
};

export default RenderPlanning;
