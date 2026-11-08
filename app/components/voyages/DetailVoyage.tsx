import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reservationAdminService } from '../../services/reservations/reservationAdminService';
import { voyageService } from '../../services/voyages/voyageService';
import echo from '../../services/echo/echoConfig';
import { genererFicheVoyageurs } from '../../utils/ficheVoyageurs';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, BoutonIcone, Carte, FeuilleModale, LegendePlan, Pastille, PlanSieges, Segmente, Texte, ModalPleinEcran } from '../ui';
import { couleurs, formatAriary } from '../../theme/ocean';
import { dateCourte, dateVoyage, estEnPause, infoStatutVoyage, statutValeur } from '../../utils/voyageStatut';
import { ChampDateHeure } from './ChampDateHeure';

type Onglet = 'plan' | 'voyageurs' | 'billets';
type NomIcone = keyof typeof Ionicons.glyphMap;

interface Props {
  visible: boolean;
  voyageId: number | null;
  /** Données déjà connues (liste) pour afficher l'en-tête sans attendre. */
  apercu?: any;
  onClose: () => void;
  /** Ouvre le formulaire de modification. */
  onModifier?: (id: number) => void;
  /** Appelé après une action qui change le voyage (pour recharger les listes). */
  onChange?: () => void;
}

function initiales(prenom?: string, nom?: string) {
  return `${(prenom?.[0] || '').toUpperCase()}${(nom?.[0] || '').toUpperCase()}` || '?';
}

function LigneAction({ icone, titre, detail, onPress, danger, premiere }: { icone: NomIcone; titre: string; detail?: string; onPress: () => void; danger?: boolean; premiere?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: danger ? couleurs.dangerFond : couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icone} size={19} color={danger ? couleurs.danger : couleurs.ocean800} />
      </View>
      <View style={{ flex: 1 }}>
        <Texte graisse="tresGras" taille={14.5} couleur={danger ? couleurs.danger : couleurs.encre}>{titre}</Texte>
        {!!detail && <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{detail}</Texte>}
      </View>
    </Pressable>
  );
}

/** Détail d'un voyage côté compagnie : revenu, plan des sièges en direct, voyageurs, billets et actions. */
function DetailVoyageContenu({ visible, voyageId, apercu, onClose, onModifier, onChange }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [onglet, setOnglet] = useState<Onglet>('plan');
  const [voyage, setVoyage] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [voyageurs, setVoyageurs] = useState<any[]>([]);
  const [billets, setBillets] = useState<any[]>([]);
  const [resumeBillets, setResumeBillets] = useState<any>({});
  const [chargement, setChargement] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actions, setActions] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [pdf, setPdf] = useState(false);

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  const tout = useCallback(async () => {
    if (!voyageId) return;
    const [rV, rP, rVoy, rB] = await Promise.all([
      voyageService.obtenirVoyage(voyageId).catch(() => null),
      reservationAdminService.obtenirPlanSieges(voyageId).catch(() => null),
      reservationAdminService.obtenirVoyageurs(voyageId).catch(() => null),
      reservationAdminService.obtenirBillets(voyageId).catch(() => null),
    ]);
    if ((rV as any)?.data) setVoyage((rV as any).data);
    if (rP?.statut && rP.data) setPlan(rP.data);
    if (rVoy?.statut && rVoy.data) setVoyageurs(rVoy.data.voyageurs || []);
    if (rB?.statut && rB.data) {
      setBillets(rB.data.billets || []);
      setResumeBillets(rB.data.resume || {});
    }
  }, [voyageId]);

  useEffect(() => {
    if (!visible || !voyageId) return;
    setOnglet('plan');
    setVoyage(null);
    setPlan(null);
    setVoyageurs([]);
    setBillets([]);
    setResumeBillets({});
    setChargement(true);
    tout().finally(() => setChargement(false));

    // Plan des sièges en temps réel
    const canal = `sieges.voyage.${voyageId}`;
    echo.channel(canal).listen('.siege.updated', (event: any) => {
      setPlan((prev: any) => {
        if (!prev?.plan) return prev;
        const statut = event.data?.statut === 1 ? 'reserve' : event.data?.statut === 3 ? 'selectionne' : event.data?.statut === 2 ? 'disponible' : null;
        if (!statut) return prev;
        const nouveauPlan = prev.plan.map((s: any) => (s.code === event.siege_numero ? { ...s, statut } : s));
        return {
          ...prev,
          plan: nouveauPlan,
          sieges_reserves: nouveauPlan.filter((s: any) => s.statut === 'reserve').length,
          sieges_temporaires: nouveauPlan.filter((s: any) => s.statut === 'selectionne').length,
          sieges_disponibles: nouveauPlan.filter((s: any) => s.statut === 'disponible').length,
        };
      });
    });
    return () => {
      echo.leaveChannel(canal);
    };
  }, [visible, voyageId, tout]);

  const onRefresh = async () => {
    setRefreshing(true);
    await tout();
    setRefreshing(false);
  };

  const v = voyage || apercu || {};
  const id = voyageId!;
  const statut = statutValeur(v);
  const actif = statut === 1 || statut === 2;
  const pause = estEnPause(v);
  const info = infoStatutVoyage(v);
  const depart = v.trajet?.province_depart || '';
  const arrivee = v.trajet?.province_arrivee || '';
  const date = dateVoyage(v.date || v.voyage_date || v.date_raw);
  const heure = String(v.heure_depart || v.voyage_heure_depart || '').slice(0, 5);
  const matricule = v.voiture?.matricule || plan?.voiture?.matricule || '';

  /** Exécute une action du voyage puis recharge. */
  const executer = async (appel: () => Promise<any>, succes: string) => {
    setOccupe(true);
    try {
      const r = await appel();
      if (r?.statut === true) {
        message('C’est fait', r.message || succes, 'success');
        onChange?.();
        await tout();
      } else {
        message('Action impossible', r?.message || 'Une erreur est survenue.');
      }
    } catch (e: any) {
      message('Action impossible', e?.message || 'Une erreur est survenue.');
    } finally {
      setOccupe(false);
    }
  };

  const confirmer = (titre: string, texte: string, bouton: string, danger: boolean, action: () => void) => {
    setActions(false);
    showDialog({ title: titre, message: texte, type: danger ? 'danger' : 'warning', confirmText: bouton, cancelText: 'Retour', onConfirm: action, onCancel: () => {} });
  };

  const reprogrammer = (d: Date) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    confirmer(
      'Reprogrammer le voyage ?',
      `Un nouveau voyage sera créé le ${dateCourte(d)} à ${heure}, avec le même trajet et le même véhicule. Ce voyage-ci ne change pas.`,
      'Créer le voyage',
      false,
      () => executer(() => voyageService.reprogrammerVoyage(id, { voyage_date: iso }), 'Le nouveau voyage est programmé.')
    );
  };

  const fiche = async () => {
    setPdf(true);
    try {
      await genererFicheVoyageurs({ voyage_id: id, date: v.date, heure_depart: heure, trajet: v.trajet, voiture: { matricule } });
    } finally {
      setPdf(false);
    }
  };

  const demain = new Date();
  demain.setDate(demain.getDate() + 1);
  demain.setHours(0, 0, 0, 0);

  const renderPlan = () =>
    !plan?.plan ? (
      <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
        <Ionicons name="grid-outline" size={30} color={couleurs.grisClair} />
        <Texte variante="legende" centre>Plan des sièges indisponible.</Texte>
      </Carte>
    ) : (
      <View style={{ gap: 12, alignItems: 'center' }}>
        <LegendePlan mode="compagnie" />
        <PlanSieges sieges={plan.plan} mode="compagnie" taille={46} />
        {!!plan.voiture && (
          <Texte variante="legende" centre>
            {[plan.voiture.marque, plan.voiture.modele].filter(Boolean).join(' ')} · {plan.plan.length} places{plan.voiture.chauffeur ? ` · ${plan.voiture.chauffeur}` : ''}
          </Texte>
        )}
      </View>
    );

  const renderVoyageurs = () =>
    voyageurs.length === 0 ? (
      <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
        <Ionicons name="people-outline" size={30} color={couleurs.grisClair} />
        <Texte variante="legende" centre>Aucun voyageur pour le moment.</Texte>
      </Carte>
    ) : (
      <Carte padding={0}>
        {voyageurs.map((p, i) => (
          <View key={`${p.reservation_id}-${p.voyageur_id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }}>
              <Texte graisse="tresGras" taille={14} couleur="#FFFFFF">{p.siege}</Texte>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Texte graisse="tresGras" taille={14} numberOfLines={1}>{p.prenom} {p.nom}</Texte>
              <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>
                {[p.reservation_numero, p.cin ? `CIN ${p.cin}` : null, p.age ? `${p.age} ans` : null].filter(Boolean).join(' · ')}
              </Texte>
            </View>
            {!!p.phone && <BoutonIcone icone="call-outline" libelle={`Appeler ${p.prenom}`} onPress={() => Linking.openURL(`tel:${p.phone}`)} />}
          </View>
        ))}
      </Carte>
    );

  const renderBillets = () =>
    billets.length === 0 ? (
      <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
        <Ionicons name="receipt-outline" size={30} color={couleurs.grisClair} />
        <Texte variante="legende" centre>Aucun billet vendu pour le moment.</Texte>
      </Carte>
    ) : (
      <View style={{ gap: 10 }}>
        {(resumeBillets.repartition_paiement || []).length > 0 && (
          <Carte style={{ gap: 8 }}>
            {resumeBillets.repartition_paiement.map((r: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Texte graisse="gras" taille={13.5}>{r.type} <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>· {r.count} billet{r.count > 1 ? 's' : ''}</Texte></Texte>
                <Texte variante="montant" taille={13.5}>{formatAriary(r.montant)} Ar</Texte>
              </View>
            ))}
          </Carte>
        )}
        <Carte padding={0}>
          {billets.map((b, i) => (
            <View key={b.res_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean800}>{initiales(b.client?.prenom, b.client?.nom)}</Texte>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Texte graisse="tresGras" taille={14} numberOfLines={1}>{b.client ? `${b.client.prenom} ${b.client.nom}` : b.res_numero}</Texte>
                <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>
                  {[b.res_numero, b.sieges?.length ? `siège${b.sieges.length > 1 ? 's' : ''} ${b.sieges.join(', ')}` : null, b.type_paiement?.nom].filter(Boolean).join(' · ')}
                </Texte>
              </View>
              <Texte variante="montant" taille={13.5}>{formatAriary(Number(b.montant_total) || 0)} Ar</Texte>
            </View>
          ))}
        </Carte>
      </View>
    );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={couleurs.ocean950} />
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        {/* En-tête marine */}
        <View style={{ backgroundColor: couleurs.ocean950, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <BoutonIcone icone="chevron-back" libelle="Retour" variante="marine" onPress={onClose} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Texte graisse="tresGras" taille={16} couleur="#FFFFFF" numberOfLines={1}>{depart} → {arrivee}</Texte>
              <Texte graisse="moyen" taille={12.5} couleur={couleurs.texteSurMarine} numberOfLines={1}>
                {[dateCourte(date), heure, matricule].filter(Boolean).join(' · ')}
              </Texte>
            </View>
            <BoutonIcone icone="ellipsis-vertical" libelle="Actions du voyage" variante="marine" onPress={() => setActions(true)} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
            <View>
              <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>Revenu encaissé</Texte>
              <Texte variante="montant" taille={24} couleur="#FFFFFF">{formatAriary(Number(resumeBillets.revenu_total ?? v.revenu_total) || 0)} Ar</Texte>
            </View>
            {actif && !pause ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3DD68C' }} />
                <Texte graisse="gras" taille={12} couleur="#8BE8B7">En direct</Texte>
              </View>
            ) : (
              <Pastille libelle={info.libelle} tonalite={info.tonalite} />
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 14, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
          showsVerticalScrollIndicator={false}
        >
          {chargement && !plan ? (
            <>
              <Skeleton height={64} borderRadius={16} />
              <Skeleton height={46} borderRadius={14} />
              <Skeleton height={320} borderRadius={20} />
            </>
          ) : (
            <>
              <Carte padding={0} style={{ flexDirection: 'row' }}>
                {[
                  { v: plan?.sieges_reserves ?? 0, l: 'Payés', c: couleurs.encre },
                  { v: plan?.sieges_temporaires ?? 0, l: 'En attente', c: couleurs.alerte },
                  { v: plan?.sieges_disponibles ?? 0, l: 'Libres', c: couleurs.encre },
                ].map((s, i) => (
                  <View key={s.l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: couleurs.separateur }}>
                    <Texte variante="montant" taille={18} couleur={s.c}>{s.v}</Texte>
                    <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>{s.l}</Texte>
                  </View>
                ))}
              </Carte>

              <Segmente<Onglet>
                libelleAccessible="Vue"
                valeur={onglet}
                onChange={setOnglet}
                options={[
                  { valeur: 'plan', libelle: 'Plan' },
                  { valeur: 'voyageurs', libelle: 'Voyageurs', compteur: voyageurs.length || undefined },
                  { valeur: 'billets', libelle: 'Billets', compteur: billets.length || undefined },
                ]}
              />

              {onglet === 'plan' && renderPlan()}
              {onglet === 'voyageurs' && renderVoyageurs()}
              {onglet === 'billets' && renderBillets()}
            </>
          )}
        </ScrollView>

        {/* Pied */}
        <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8, flexDirection: 'row', gap: 8 }}>
          <Bouton titre="Fiche voyageurs" variante="secondaire" icone="document-text-outline" onPress={fiche} chargement={pdf} style={{ flex: 1 }} compact />
          <Bouton
            titre="Embarquement"
            icone="qr-code-outline"
            onPress={() => {
              onClose();
              router.push('/screens/scanner/scannerScreen');
            }}
            desactive={!actif}
            style={{ flex: 1 }}
            compact
          />
        </View>
      </View>

      {/* Actions */}
      <FeuilleModale visible={actions} onClose={() => setActions(false)} titre="Actions du voyage" sousTitre={`${depart} → ${arrivee} · ${dateCourte(date)} ${heure}`}>
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
          {actif && (
            <LigneAction
              premiere
              icone="create-outline"
              titre="Modifier"
              detail="Date, heure, véhicule, places"
              onPress={() => {
                setActions(false);
                onClose();
                onModifier?.(id);
              }}
            />
          )}
          {actif && (
            <LigneAction
              icone={pause ? 'play-circle-outline' : 'pause-circle-outline'}
              titre={pause ? 'Rouvrir aux réservations' : 'Mettre en pause'}
              detail={pause ? 'Le voyage redevient visible pour les clients' : 'Caché de la recherche, les billets vendus restent valables'}
              onPress={() =>
                confirmer(
                  pause ? 'Rouvrir le voyage ?' : 'Mettre en pause ?',
                  pause ? 'Le voyage redeviendra visible pour les réservations.' : 'Le voyage sera caché de la recherche client. Les réservations existantes sont conservées.',
                  pause ? 'Rouvrir' : 'Mettre en pause',
                  false,
                  () => executer(() => voyageService.togglerActivationVoyage(id), pause ? 'Le voyage est rouvert.' : 'Le voyage est en pause.')
                )
              }
            />
          )}
          {(statut === 3 || statut === 4) && (
            <ChampDateHeure
              libelle="Nouvelle date"
              mode="date"
              valeur={null}
              placeholder=""
              minimumDate={demain}
              onChange={reprogrammer}
              declencheur={(ouvrir) => (
                <LigneAction premiere={!actif} icone="calendar-outline" titre="Reprogrammer" detail="Crée un nouveau voyage à une autre date" onPress={ouvrir} />
              )}
            />
          )}
          {statut === 4 && (
            <LigneAction
              icone="refresh-outline"
              titre="Réactiver"
              detail="Remet ce voyage en programmé"
              onPress={() => confirmer('Réactiver le voyage ?', 'Vous devrez ensuite le modifier pour lui donner une date à venir.', 'Réactiver', false, () => executer(() => voyageService.reactiverVoyage(id), 'Le voyage est réactivé.'))}
            />
          )}
          {actif && (
            <LigneAction
              danger
              icone="close-circle-outline"
              titre="Annuler le voyage"
              detail="Les clients ayant payé seront remboursés"
              onPress={() =>
                confirmer(
                  'Annuler ce voyage ?',
                  `${depart} → ${arrivee}, ${dateCourte(date)} à ${heure}. Les voyageurs seront prévenus et les billets payés passeront en remboursement.`,
                  'Annuler le voyage',
                  true,
                  () => executer(() => voyageService.annulerVoyage(id), 'Le voyage est annulé.')
                )
              }
            />
          )}
          {occupe && <Texte variante="legende" centre style={{ marginTop: 8 }}>Traitement en cours…</Texte>}
        </View>
      </FeuilleModale>
    </>
  );
}

/** DetailVoyage dans sa propre fenêtre, avec les bonnes marges de sécurité. */
export function DetailVoyage(props: Props) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <DetailVoyageContenu {...props} />
    </ModalPleinEcran>
  );
}

export default DetailVoyage;
