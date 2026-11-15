import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/app/components/common/Skeleton';
import { useConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { Bouton, BoutonIcone, Carte, EnTete, ModalPleinEcran, Pastille, Segmente, Texte } from '@/app/components/ui';
import { couleurs } from '@/app/theme/ocean';
import type { Tonalite } from '@/app/theme/ocean';
import { dateCourte } from '@/app/utils/voyageStatut';
import { suiviService, CompteursSuivi, VoyageSuivi } from '@/app/services/suivi/suiviService';
import { GestionPartenaires } from './GestionPartenaires';

/**
 * Suivi des voitures en route entre la compagnie de départ et la compagnie de
 * réception (partenaire à destination) :
 * - « Départs » : mes voitures à clôturer, en route, arrivées ;
 * - « Arrivées » : les voitures que mes partenaires m'envoient.
 */

type Onglet = 'departs' | 'arrivees';

const heure = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const jourHeure = (iso?: string | null) => (iso ? `${dateCourte(new Date(iso))} à ${heure(iso)}` : '');
const memeJour = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();
const trajetDe = (v: VoyageSuivi) => `${v.trajet.depart || 'Départ'} → ${v.trajet.arrivee || 'Arrivée'}`;
const nomChauffeur = (v: VoyageSuivi) => (v.chauffeur ? `${v.chauffeur.prenom} ${v.chauffeur.nom}`.trim() : '');
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const appeler = (tel?: string | null) => tel && Linking.openURL(`tel:${tel.replace(/\s+/g, '')}`);

function etat(v: VoyageSuivi): { libelle: string; tonalite: Tonalite } {
  if (v.en_retard) return { libelle: 'En retard', tonalite: 'danger' };
  switch (v.statut_suivi) {
    case 'en_route':
      return { libelle: 'En route', tonalite: 'info' };
    case 'arrive':
      return { libelle: 'Arrivé', tonalite: 'succes' };
    case 'a_cloturer':
      return new Date(v.depart_prevu) <= new Date() ? { libelle: 'À clôturer', tonalite: 'alerte' } : { libelle: 'Départ proche', tonalite: 'neutre' };
    default:
      return { libelle: 'Attendu', tonalite: 'neutre' };
  }
}

/** Ligne d'information de l'état, sous le trajet. */
function sousTitre(v: VoyageSuivi): string {
  if (v.statut_suivi === 'arrive') return `Arrivé le ${jourHeure(v.arrivee_le)}`;
  if (v.statut_suivi === 'en_route') {
    return `Parti à ${heure(v.depart_le)} · arrivée prévue ${memeJour(v.arrivee_prevue, v.depart_le || v.depart_prevu) ? 'vers ' + heure(v.arrivee_prevue) : 'le ' + jourHeure(v.arrivee_prevue)}`;
  }
  return `Départ prévu le ${jourHeure(v.depart_prevu)}`;
}

function LigneSuivi({ v, premiere, onPress }: { v: VoyageSuivi; premiere: boolean; onPress: () => void }) {
  const [presse, setPresse] = useState(false);
  const e = etat(v);
  const autre = v.sens === 'depart' ? v.compagnie_reception : v.compagnie_depart;
  const chauffeur = nomChauffeur(v);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPresse(true)}
      onPressOut={() => setPresse(false)}
      accessibilityRole="button"
      accessibilityLabel={`${trajetDe(v)}, ${e.libelle}, ${sousTitre(v)}, véhicule ${v.voiture?.matricule || 'non renseigné'}. Ouvrir le détail.`}
      style={{ gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur, backgroundColor: presse ? couleurs.ocean50 : 'transparent' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Texte graisse="tresGras" taille={14.5} numberOfLines={1} style={{ flex: 1 }}>{trajetDe(v)}</Texte>
        <Pastille libelle={e.libelle} tonalite={e.tonalite} />
      </View>
      <Texte graisse="gras" taille={12.5} couleur={v.en_retard ? couleurs.danger : couleurs.encreDouce} numberOfLines={1}>{sousTitre(v)}</Texte>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="bus-outline" size={13} color={couleurs.gris} />
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1} style={{ flex: 1 }}>
          {[v.voiture?.matricule, chauffeur].filter(Boolean).join(' · ') || 'Véhicule non renseigné'} · {pluriel(v.nb_voyageurs, 'voyageur')}
        </Texte>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={v.sens === 'depart' ? 'flag-outline' : 'business-outline'} size={13} color={couleurs.gris} />
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1} style={{ flex: 1 }}>
          {v.sens === 'depart' ? (autre ? `Réception : ${autre.nom}` : 'Sans compagnie de réception') : `Envoyé par ${autre?.nom || 'un partenaire'}`}
        </Texte>
      </View>
    </Pressable>
  );
}

function Section({ titre, items, onOuvrir }: { titre: string; items: VoyageSuivi[]; onOuvrir: (v: VoyageSuivi) => void }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 2 }}>
        <Texte variante="etiquette">{titre}</Texte>
        <Texte graisse="gras" taille={11.5} couleur={couleurs.gris}>{pluriel(items.length, 'voyage')}</Texte>
      </View>
      <Carte padding={0}>
        {items.map((v, i) => <LigneSuivi key={v.id} v={v} premiere={i === 0} onPress={() => onOuvrir(v)} />)}
      </Carte>
    </View>
  );
}

export const RenderSuivi = ({ onMenu, onCompteurs }: { onMenu?: () => void; onCompteurs?: (total: number) => void }) => {
  const insets = useSafeAreaInsets();
  const [onglet, setOnglet] = useState<Onglet>('departs');
  const [voyages, setVoyages] = useState<VoyageSuivi[]>([]);
  const [compteurs, setCompteurs] = useState<CompteursSuivi>({ a_cloturer: 0, en_retard: 0, en_route_vers_moi: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [detail, setDetail] = useState<VoyageSuivi | null>(null);
  const [partenairesOuvert, setPartenairesOuvert] = useState(false);

  const charger = useCallback(
    async (o: Onglet) => {
      const r = await suiviService.liste(o);
      if (r.statut) {
        setVoyages(r.voyages);
        setCompteurs(r.compteurs);
        onCompteurs?.(r.compteurs.total);
        setErreur(null);
      } else {
        setErreur(r.message || 'Impossible de charger le suivi.');
      }
    },
    [onCompteurs]
  );

  useEffect(() => {
    setLoading(true);
    setVoyages([]);
    charger(onglet).finally(() => setLoading(false));
    // Rafraîchi chaque minute : retards, arrivées confirmées par le partenaire
    const minuterie = setInterval(() => charger(onglet), 60000);
    return () => clearInterval(minuterie);
  }, [onglet, charger]);

  const actualiser = async () => {
    setRefreshing(true);
    await charger(onglet);
    setRefreshing(false);
  };

  const groupes = useMemo(() => {
    const par = (s: string) => voyages.filter((v) => v.statut_suivi === s);
    const enRoute = par('en_route').sort((a, b) => Number(b.en_retard) - Number(a.en_retard));
    return onglet === 'departs'
      ? [
          { titre: 'À clôturer', items: par('a_cloturer') },
          { titre: 'En route', items: enRoute },
          { titre: 'Arrivés (30 derniers jours)', items: par('arrive') },
        ]
      : [
          { titre: 'En route vers vous', items: enRoute },
          { titre: "Attendus aujourd'hui et demain", items: par('attendu') },
          { titre: 'Arrivés (30 derniers jours)', items: par('arrive') },
        ];
  }, [voyages, onglet]);

  const aCloturerMaintenant = voyages.filter((v) => v.statut_suivi === 'a_cloturer' && new Date(v.depart_prevu) <= new Date()).length;
  const retards = voyages.filter((v) => v.en_retard).length;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <EnTete
        titre="Suivi des voyages"
        sousTitre="Voitures en route et arrivées"
        gauche="menu"
        onGauche={onMenu}
        droite={<BoutonIcone icone="people-outline" libelle="Compagnies partenaires" onPress={() => setPartenairesOuvert(true)} />}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={actualiser} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
      >
        <Segmente<Onglet>
          libelleAccessible="Départs ou arrivées"
          valeur={onglet}
          onChange={setOnglet}
          options={[
            { valeur: 'departs', libelle: compteurs.a_cloturer ? `Départs (${compteurs.a_cloturer})` : 'Départs' },
            { valeur: 'arrivees', libelle: compteurs.en_route_vers_moi ? `Arrivées (${compteurs.en_route_vers_moi})` : 'Arrivées' },
          ]}
        />

        {/* Alertes */}
        {!loading && retards > 0 && (
          <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: couleurs.dangerFond, borderWidth: 1, borderColor: couleurs.dangerBord }}>
            <Ionicons name="warning-outline" size={20} color={couleurs.danger} />
            <Texte graisse="gras" taille={13} couleur={couleurs.danger} style={{ flex: 1, lineHeight: 19 }}>
              {pluriel(retards, 'voiture')} en retard : l'heure d'arrivée prévue est dépassée depuis plus d'une heure. Appelez le chauffeur depuis la fiche du voyage.
            </Texte>
          </View>
        )}
        {!loading && onglet === 'departs' && aCloturerMaintenant > 0 && (
          <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: couleurs.alerteFond, borderWidth: 1, borderColor: 'rgba(228,161,58,0.5)' }}>
            <Ionicons name="notifications-outline" size={20} color={couleurs.alerte} />
            <Texte graisse="gras" taille={13} couleur={couleurs.alerte} style={{ flex: 1, lineHeight: 19 }}>
              L'heure de départ est passée pour {pluriel(aCloturerMaintenant, 'voyage')}. Clôturez l'embarquement pour prévenir la compagnie de réception. Sans clôture, la voiture passera « En route » automatiquement une heure après le départ.
            </Texte>
          </View>
        )}

        {loading ? (
          <View style={{ gap: 10 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} height={110} borderRadius={16} />)}
          </View>
        ) : erreur ? (
          <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
            <Ionicons name="cloud-offline-outline" size={32} color={couleurs.danger} />
            <Texte graisse="moyen" taille={14} couleur={couleurs.gris} centre>{erreur}</Texte>
            <Bouton titre="Réessayer" variante="secondaire" compact icone="refresh" onPress={actualiser} />
          </Carte>
        ) : voyages.length === 0 ? (
          <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 26, paddingHorizontal: 18 }}>
            <Ionicons name={onglet === 'departs' ? 'bus-outline' : 'flag-outline'} size={30} color={couleurs.grisClair} />
            <Texte graisse="tresGras" taille={15} centre>{onglet === 'departs' ? 'Aucun départ à suivre' : 'Aucune voiture attendue'}</Texte>
            <Texte variante="legende" centre>
              {onglet === 'departs'
                ? "Vos voyages apparaissent ici 3 h avant le départ. Clôturez l'embarquement quand tout le monde est à bord : la compagnie de réception est prévenue."
                : 'Les voitures que vos partenaires vous envoient apparaissent ici, avec la liste des voyageurs, dès leur départ.'}
            </Texte>
          </Carte>
        ) : (
          groupes.map((g) => <Section key={g.titre} titre={g.titre} items={g.items} onOuvrir={setDetail} />)
        )}
      </ScrollView>

      <DetailSuivi
        voyage={detail}
        onClose={() => setDetail(null)}
        onChange={() => charger(onglet)}
      />
      <GestionPartenaires visible={partenairesOuvert} onClose={() => setPartenairesOuvert(false)} />
    </View>
  );
};

// ------------------------------------------------------------------ détail

function Ligne({ icone, libelle, valeur, action }: { icone: keyof typeof Ionicons.glyphMap; libelle: string; valeur: string; action?: { icone: keyof typeof Ionicons.glyphMap; libelle: string; onPress: () => void } }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icone} size={17} color={couleurs.ocean800} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>{libelle}</Texte>
        <Texte graisse="tresGras" taille={14}>{valeur}</Texte>
      </View>
      {action && <BoutonIcone icone={action.icone} libelle={action.libelle} onPress={action.onPress} />}
    </View>
  );
}

export function DetailSuivi({ voyage, onClose, onChange }: { voyage: VoyageSuivi | null; onClose: () => void; onChange: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [v, setV] = useState<VoyageSuivi | null>(voyage);
  const [chargement, setChargement] = useState(false);
  const [action, setAction] = useState(false);

  useEffect(() => {
    setV(voyage);
    if (!voyage) return;
    setChargement(true);
    suiviService.detail(voyage.id).then((r) => {
      if (r.statut && r.data) setV(r.data);
      setChargement(false);
    });
  }, [voyage]);

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  if (!v) return null;
  const e = etat(v);
  const estDepart = v.sens === 'depart';
  const reception = v.compagnie_reception;
  const absents = Math.max(0, v.confirmes - v.embarques);

  const cloturer = () => {
    const dest = reception ? reception.nom : null;
    showDialog({
      title: "Clôturer l'embarquement ?",
      message:
        `${v.embarques} voyageur${v.embarques > 1 ? 's' : ''} embarqué${v.embarques > 1 ? 's' : ''} sur ${v.confirmes} billet${v.confirmes > 1 ? 's' : ''} confirmé${v.confirmes > 1 ? 's' : ''}.` +
        (absents > 0 ? ` Les ${absents} non embarqué${absents > 1 ? 's' : ''} ne figureront pas sur la liste.` : '') +
        (dest ? ` ${dest} recevra le détail du voyage et la liste des voyageurs.` : ' Aucune compagnie de réception : vous confirmerez vous-même l’arrivée.') +
        ' La voiture passera « En route » et la vente sera fermée.',
      type: absents > 0 ? 'warning' : 'info',
      confirmText: 'Clôturer et partir',
      cancelText: 'Pas encore',
      onConfirm: async () => {
        setAction(true);
        const r = await suiviService.cloturer(v.id);
        setAction(false);
        if (r.statut && r.data) {
          setV(r.data);
          onChange();
          message('Voiture en route', dest ? `${dest} a été prévenue.` : 'Le voyage est maintenant « En route ».', 'success');
        } else {
          message('Embarquement non clôturé', r.message);
        }
      },
      onCancel: () => {},
    });
  };

  const arrive = () => {
    showDialog({
      title: 'Confirmer l’arrivée ?',
      message: estDepart
        ? `Le voyage ${trajetDe(v)} sera marqué « Arrivé »${reception ? ` et ${reception.nom} sera prévenue` : ''}.`
        : `${v.compagnie_depart?.nom || 'La compagnie de départ'} sera prévenue que la voiture ${v.voiture?.matricule || ''} est bien arrivée.`,
      type: 'success',
      confirmText: 'Arrivée confirmée',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setAction(true);
        const r = await suiviService.marquerArrive(v.id);
        setAction(false);
        if (r.statut && r.data) {
          setV(r.data);
          onChange();
        } else {
          message('Arrivée non confirmée', r.message);
        }
      },
      onCancel: () => {},
    });
  };

  const arriveeTexte =
    v.statut_suivi === 'arrive'
      ? `${jourHeure(v.arrivee_le)}${v.arrivee_confirmee_par === 'depart' ? ' (confirmé par la compagnie de départ)' : ''}`
      : `${jourHeure(v.arrivee_prevue)}${v.duree_connue ? '' : ' (durée du trajet non renseignée)'}`;

  return (
    <ModalPleinEcran visible={!!voyage} onClose={onClose}>
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <DialogComponent />
        <EnTete titre={trajetDe(v)} sousTitre={`Départ du ${jourHeure(v.depart_prevu)}`} gauche="fermer" onGauche={onClose} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }} showsVerticalScrollIndicator={false}>
          {/* État */}
          <Carte style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pastille libelle={e.libelle} tonalite={e.tonalite} />
              {v.depart_auto && <Pastille libelle="Embarquement non clôturé" tonalite="alerte" point={false} />}
            </View>
            <Texte graisse="gras" taille={13.5} couleur={v.en_retard ? couleurs.danger : couleurs.encreDouce} style={{ lineHeight: 19 }}>
              {v.en_retard
                ? `Arrivée prévue vers ${heure(v.arrivee_prevue)} dépassée. Appelez le chauffeur pour savoir où en est la voiture.`
                : v.statut_suivi === 'a_cloturer'
                  ? v.peut_cloturer
                    ? 'Scannez les billets puis clôturez l’embarquement quand la voiture part.'
                    : `L'embarquement pourra être clôturé à partir de ${heure(new Date(new Date(v.depart_prevu).getTime() - 3 * 3600 * 1000).toISOString())} (3 h avant le départ).`
                  : v.statut_suivi === 'attendu'
                    ? 'La voiture n’est pas encore partie. Vous recevrez une notification et la liste des voyageurs à son départ.'
                    : v.statut_suivi === 'en_route'
                      ? estDepart && !v.peut_marquer_arrive && reception
                        ? `${reception.nom} confirmera l'arrivée. Sans confirmation de sa part, vous pourrez le faire à partir du ${jourHeure(v.arrivee_possible_des)}.`
                        : 'Confirmez l’arrivée dès que la voiture est à destination.'
                      : 'Voyage terminé.'}
            </Texte>
          </Carte>

          {/* Actions */}
          {estDepart && v.statut_suivi === 'a_cloturer' && (
            <View style={{ gap: 8 }}>
              <Bouton titre="Clôturer l'embarquement" icone="checkmark-done" onPress={cloturer} desactive={!v.peut_cloturer} chargement={action} />
              <Bouton titre="Scanner les billets" variante="secondaire" icone="qr-code-outline" onPress={() => { onClose(); router.push('/screens/scanner/scannerScreen'); }} />
            </View>
          )}
          {v.peut_marquer_arrive && <Bouton titre="Marquer comme arrivé" variante="succes" icone="flag" onPress={arrive} chargement={action} />}

          {/* Voyage */}
          <Carte padding={0} style={{ paddingHorizontal: 14 }}>
            <Ligne icone="time-outline" libelle={v.statut_suivi === 'en_route' || v.statut_suivi === 'arrive' ? 'Départ' : 'Départ prévu'} valeur={v.depart_le ? jourHeure(v.depart_le) : jourHeure(v.depart_prevu)} />
            <Ligne icone="flag-outline" libelle={v.statut_suivi === 'arrive' ? 'Arrivée' : 'Arrivée prévue'} valeur={arriveeTexte} />
            <Ligne
              icone="bus-outline"
              libelle="Véhicule"
              valeur={v.voiture ? [v.voiture.matricule, [v.voiture.marque, v.voiture.modele].filter(Boolean).join(' ')].filter(Boolean).join(' · ') : 'Non renseigné'}
            />
            <Ligne
              icone="person-outline"
              libelle="Chauffeur"
              valeur={v.chauffeur ? `${nomChauffeur(v)} · ${v.chauffeur.telephone}` : 'Aucun chauffeur affecté'}
              action={v.chauffeur ? { icone: 'call-outline', libelle: `Appeler ${nomChauffeur(v)}`, onPress: () => appeler(v.chauffeur?.telephone) } : undefined}
            />
          </Carte>

          {/* Compagnies */}
          <Carte padding={0} style={{ paddingHorizontal: 14 }}>
            <Ligne
              icone="business-outline"
              libelle="Compagnie de départ"
              valeur={v.compagnie_depart?.nom || '—'}
              action={!estDepart && v.compagnie_depart?.telephone ? { icone: 'call-outline', libelle: `Appeler ${v.compagnie_depart.nom}`, onPress: () => appeler(v.compagnie_depart?.telephone) } : undefined}
            />
            <Ligne
              icone="home-outline"
              libelle="Compagnie de réception"
              valeur={reception ? `${reception.nom}${reception.province ? ' · ' + reception.province.nom : ''}` : 'Aucune (suivi par la compagnie de départ)'}
              action={estDepart && reception?.telephone ? { icone: 'call-outline', libelle: `Appeler ${reception.nom}`, onPress: () => appeler(reception.telephone) } : undefined}
            />
          </Carte>

          {/* Voyageurs */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 2, marginTop: 4 }}>
            <Texte variante="etiquette">Voyageurs</Texte>
            <Texte graisse="gras" taille={11.5} couleur={couleurs.gris}>
              {v.statut_suivi === 'a_cloturer' ? `${v.embarques} embarqué${v.embarques > 1 ? 's' : ''} / ${v.confirmes}` : pluriel(v.nb_voyageurs, 'voyageur')}
            </Texte>
          </View>
          {chargement ? (
            <Skeleton height={120} borderRadius={16} />
          ) : v.liste_visible === false ? (
            <Carte style={{ flexDirection: 'row', gap: 10 }}>
              <Ionicons name="lock-closed-outline" size={18} color={couleurs.gris} />
              <Texte graisse="moyen" taille={13} couleur={couleurs.gris} style={{ flex: 1, lineHeight: 19 }}>
                {v.statut_suivi === 'attendu'
                  ? 'La liste des voyageurs sera visible au départ de la voiture.'
                  : 'Pour protéger les voyageurs, la liste n’est plus affichée 7 jours après l’arrivée.'}
              </Texte>
            </Carte>
          ) : (v.voyageurs || []).length === 0 ? (
            <Carte>
              <Texte graisse="moyen" taille={13} couleur={couleurs.gris}>Aucun voyageur.</Texte>
            </Carte>
          ) : (
            <Carte padding={0}>
              {v.depart_auto && (
                <Texte graisse="gras" taille={12} couleur={couleurs.alerte} style={{ padding: 12, paddingBottom: 0, lineHeight: 17 }}>
                  L'embarquement n'a pas été clôturé : cette liste reprend tous les billets confirmés.
                </Texte>
              )}
              {(v.voyageurs || []).map((p, i) => (
                <View key={`${p.siege}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: i === 0 && !v.depart_auto ? 0 : 1, borderTopColor: couleurs.separateur }}>
                  <View style={{ width: 34, height: 28, borderRadius: 8, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                    <Texte graisse="tresGras" taille={12} couleur={couleurs.ocean800}>{p.siege}</Texte>
                  </View>
                  <Texte graisse="gras" taille={14} numberOfLines={1} style={{ flex: 1 }}>{[p.prenom, p.nom].filter(Boolean).join(' ')}</Texte>
                  {v.statut_suivi === 'a_cloturer' && (
                    <Pastille libelle={p.embarque ? 'À bord' : 'Pas encore'} tonalite={p.embarque ? 'succes' : 'neutre'} />
                  )}
                </View>
              ))}
            </Carte>
          )}
        </ScrollView>
      </View>
    </ModalPleinEcran>
  );
}

export default RenderSuivi;
