import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { reservationAdminService } from '../../services/reservations/reservationAdminService';
import { voyageService } from '../../services/voyages/voyageService';
import echo from '../../services/echo/echoConfig';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, Carte, CaseACocher, ChampSaisie, EnTete, Etapes, LegendePlan, PlanSieges, Texte } from '../ui';
import type { GrillePlan, SiegePlan } from '../ui';
import { couleurs, formatAriary } from '../../theme/ocean';
import { dateCourte, dateVoyage, statutValeur, titreJour } from '../../utils/voyageStatut';

import { saisirTelephone } from '../../utils/telephone';
/**
 * Vente au guichet : un voyageur se présente sur place sans billet.
 * L'agent choisit le voyage, les sièges libres, saisit les noms et encaisse
 * en espèces. Billet confirmé immédiatement, sans commission FANDRIO.
 */

type Etape = 'voyage' | 'sieges' | 'voyageurs' | 'fait';
type Fiche = { nom: string; prenom: string; telephone: string };

const ficheVide: Fiche = { nom: '', prenom: '', telephone: '' };

function minuit(d = new Date()) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function dateIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Statut numérique / textuel du plan → libellé attendu par PlanSieges. */
function statutSiege(statut: any) {
  return statut === 1 ? 'reserve' : statut === 3 ? 'selectionne' : statut === 2 ? 'disponible' : null;
}

interface Props {
  /** Ferme l'écran (retour au tableau de bord). */
  onClose: () => void;
}

export function VenteGuichet({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [etape, setEtape] = useState<Etape>('voyage');

  // Voyages ouverts à la vente
  const [voyages, setVoyages] = useState<any[]>([]);
  const [chargementVoyages, setChargementVoyages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voyage, setVoyage] = useState<any>(null);

  // Plan et vente
  const [sieges, setSieges] = useState<SiegePlan[]>([]);
  const [grille, setGrille] = useState<GrillePlan | null>(null);
  const [chargementPlan, setChargementPlan] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [fiches, setFiches] = useState<Record<string, Fiche>>({});
  const [embarquer, setEmbarquer] = useState(false);
  const [erreurs, setErreurs] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [vente, setVente] = useState<any>(null);

  const alerte = (title: string, message: string) =>
    showDialog({ title, message, type: 'danger', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  // ── Voyages : aujourd'hui et à venir, programmés ou en cours, actifs, avec des places ──
  const chargerVoyages = useCallback(async () => {
    const r = await voyageService.obtenirVoyagesPage({ date_debut: dateIso(minuit()), per_page: 100, sort_field: 'voyage_date', sort_direction: 'asc' });
    const ouverts = (r.voyages || [])
      .filter((v: any) => [1, 2].includes(statutValeur(v)) && v.is_active !== false && Number(v.places_libres ?? 1) > 0)
      .sort((a: any, b: any) => {
        const da = dateVoyage(a.date)?.getTime() || 0;
        const db = dateVoyage(b.date)?.getTime() || 0;
        return da - db || String(a.heure_depart || '').localeCompare(String(b.heure_depart || ''));
      });
    setVoyages(ouverts);
  }, []);

  useEffect(() => {
    chargerVoyages().finally(() => setChargementVoyages(false));
  }, [chargerVoyages]);

  const actualiser = async () => {
    setRefreshing(true);
    await chargerVoyages();
    setRefreshing(false);
  };

  // ── Plan du voyage choisi, en temps réel ──
  const chargerPlan = useCallback(async (id: number) => {
    const r = await reservationAdminService.obtenirPlanSieges(id).catch(() => null);
    if (r?.statut && r.data?.plan) {
      setSieges(r.data.plan);
      setGrille(r.data.grille || null);
    }
  }, []);

  useEffect(() => {
    const id = voyage?.id;
    if (!id) return;
    const canal = `sieges.voyage.${id}`;
    echo.channel(canal).listen('.siege.updated', (event: any) => {
      const statut = statutSiege(event.data?.statut);
      if (!statut) return;
      setSieges((prev) => prev.map((s) => (s.code === event.siege_numero ? { ...s, statut } : s)));
    });
    return () => {
      echo.leaveChannel(canal);
    };
  }, [voyage?.id]);

  // Un siège choisi vendu entre-temps (en ligne) sort de la sélection
  useEffect(() => {
    if (etape === 'fait' || etape === 'voyage') return;
    const libres = new Set(sieges.filter((s) => s.statut === 'disponible').map((s) => s.code));
    setSelection((sel) => (sel.every((c) => libres.has(c)) ? sel : sel.filter((c) => libres.has(c))));
  }, [sieges, etape]);

  const choisirVoyage = async (v: any) => {
    setVoyage(v);
    setSelection([]);
    setFiches({});
    setErreurs(false);
    setVente(null);
    setEmbarquer(dateVoyage(v.date)?.getTime() === minuit().getTime());
    setSieges([]);
    setGrille(null);
    setEtape('sieges');
    setChargementPlan(true);
    await chargerPlan(v.id);
    setChargementPlan(false);
  };

  const tarif = Number(voyage?.trajet?.tarif) || 0;
  const trajet = voyage ? `${voyage.trajet?.province_depart || ''} → ${voyage.trajet?.province_arrivee || ''}` : '';
  const quand = voyage ? [dateCourte(dateVoyage(voyage.date)), String(voyage.heure_depart || '').slice(0, 5)].filter(Boolean).join(' · ') : '';
  const tries = useMemo(() => [...selection].sort((a, b) => Number(a) - Number(b)), [selection]);
  const total = tarif * selection.length;
  const libres = sieges.filter((s) => s.statut === 'disponible').length;

  const basculer = (code: string) => setSelection((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
  const majFiche = (code: string, champ: keyof Fiche, valeur: string) =>
    setFiches((f) => ({ ...f, [code]: { ...(f[code] || ficheVide), [champ]: valeur } }));

  const retour = () => {
    if (etape === 'voyageurs') setEtape('sieges');
    else if (etape === 'sieges') {
      setEtape('voyage');
      setVoyage(null);
    } else onClose();
  };

  const encaisser = () => {
    if (tries.some((c) => !(fiches[c]?.nom || '').trim())) {
      setErreurs(true);
      return;
    }
    showDialog({
      title: `Encaisser ${formatAriary(total)} Ar ?`,
      message: `${selection.length} place${selection.length > 1 ? 's' : ''} (n° ${tries.join(', ')}) pour ${trajet}, ${quand}, payée${selection.length > 1 ? 's' : ''} en espèces. Le billet sera confirmé immédiatement.`,
      type: 'warning',
      confirmText: 'Encaisser',
      cancelText: 'Retour',
      onConfirm: vendre,
      onCancel: () => {},
    });
  };

  const vendre = async () => {
    setEnvoi(true);
    try {
      const r = await reservationAdminService.vendreAuGuichet({
        voyage_id: voyage.id,
        embarquer,
        voyageurs: tries.map((code) => ({
          siege: code,
          nom: fiches[code].nom.trim(),
          prenom: fiches[code].prenom.trim() || undefined,
          telephone: fiches[code].telephone.trim() || undefined,
        })),
      });
      if (r?.statut) {
        setVente(r.data);
        setEtape('fait');
        chargerPlan(voyage.id);
      } else {
        // Siège pris entre-temps : retour au plan rechargé
        if (/siège/i.test(r?.message || '')) {
          setEtape('sieges');
          chargerPlan(voyage.id);
        }
        alerte('Vente non enregistrée', r?.message || 'Une erreur est survenue. Aucun paiement n’a été enregistré.');
      }
    } finally {
      setEnvoi(false);
    }
  };

  /** Nouvelle vente sur le même voyage. */
  const autreVente = () => {
    setSelection([]);
    setFiches({});
    setErreurs(false);
    setVente(null);
    setEtape(libres > 0 ? 'sieges' : 'voyage');
    if (libres === 0) {
      setVoyage(null);
      chargerVoyages();
    }
  };

  const qr = (() => {
    if (!vente?.qr_data) return '';
    try {
      return atob(vente.qr_data);
    } catch {
      return vente.qr_data;
    }
  })();

  // ─────────────────────────── Étapes ───────────────────────────

  const renderVoyages = () => {
    if (chargementVoyages) {
      return (
        <View style={{ gap: 10 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={84} borderRadius={16} />)}
        </View>
      );
    }
    if (voyages.length === 0) {
      return (
        <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 26 }}>
          <Ionicons name="bus-outline" size={30} color={couleurs.grisClair} />
          <Texte graisse="tresGras" taille={15}>Aucun départ ouvert à la vente</Texte>
          <Texte variante="legende" centre>Les voyages d’aujourd’hui et à venir ayant des places libres apparaissent ici.</Texte>
        </Carte>
      );
    }
    // Regroupement par jour
    const groupes: { titre: string; items: any[] }[] = [];
    for (const v of voyages) {
      const d = dateVoyage(v.date);
      const titre = d ? titreJour(d) : 'Date inconnue';
      const g = groupes[groupes.length - 1];
      if (g && g.titre === titre) g.items.push(v);
      else groupes.push({ titre, items: [v] });
    }
    return (
      <View style={{ gap: 14 }}>
        {groupes.map((g) => (
          <View key={g.titre} style={{ gap: 8 }}>
            <Texte variante="etiquette" style={{ marginLeft: 2 }}>{g.titre}</Texte>
            {g.items.map((v) => {
              const restantes = Number(v.places_libres ?? 0);
              return (
                <Carte key={v.id} onPress={() => choisirVoyage(v)} accessibilityLabel={`${v.trajet?.province_depart} vers ${v.trajet?.province_arrivee}, ${String(v.heure_depart || '').slice(0, 5)}, ${restantes} places libres`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 54, alignItems: 'center', paddingVertical: 6, borderRadius: 12, backgroundColor: couleurs.ocean50 }}>
                    <Texte variante="montant" taille={16} couleur={couleurs.ocean950}>{String(v.heure_depart || '').slice(0, 5)}</Texte>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Texte graisse="tresGras" taille={15} numberOfLines={1}>{v.trajet?.province_depart} → {v.trajet?.province_arrivee}</Texte>
                    <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} numberOfLines={1}>
                      {[v.voiture?.matricule, v.trajet?.tarif ? `${formatAriary(Number(v.trajet.tarif))} Ar la place` : null].filter(Boolean).join(' · ')}
                    </Texte>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Texte variante="montant" taille={16} couleur={restantes <= 3 ? couleurs.alerte : couleurs.succes}>{restantes}</Texte>
                    <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>libre{restantes > 1 ? 's' : ''}</Texte>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={couleurs.grisClair} />
                </Carte>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderSieges = () =>
    chargementPlan ? (
      <View style={{ paddingVertical: 60, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator color={couleurs.ocean800} />
        <Texte variante="legende">Chargement du plan…</Texte>
      </View>
    ) : sieges.length === 0 ? (
      <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
        <Ionicons name="grid-outline" size={30} color={couleurs.grisClair} />
        <Texte variante="legende" centre>Plan des sièges indisponible pour ce voyage.</Texte>
      </Carte>
    ) : (
      <View style={{ gap: 14, alignItems: 'center' }}>
        <Texte variante="legende" centre>
          {libres > 0 ? 'Touchez les sièges libres à vendre.' : 'Plus aucun siège libre sur ce voyage.'}
        </Texte>
        <LegendePlan mode="client" />
        <PlanSieges sieges={sieges} grille={grille} selection={selection} onToggle={basculer} mode="client" taille={52} />
      </View>
    );

  const renderVoyageurs = () => (
    <View style={{ gap: 12 }}>
      {tries.map((code, i) => {
        const f = fiches[code] || ficheVide;
        const manque = erreurs && !f.nom.trim();
        return (
          <Carte key={code} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }}>
                <Texte graisse="tresGras" taille={14} couleur="#FFFFFF">{code}</Texte>
              </View>
              <Texte graisse="tresGras" taille={15} style={{ flex: 1 }}>Voyageur {i + 1}</Texte>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <ChampSaisie libelle="Nom" obligatoire value={f.nom} onChangeText={(t) => majFiche(code, 'nom', t)} autoCapitalize="words" erreur={manque ? 'Obligatoire' : undefined} />
              </View>
              <View style={{ flex: 1 }}>
                <ChampSaisie libelle="Prénom" value={f.prenom} onChangeText={(t) => majFiche(code, 'prenom', t)} autoCapitalize="words" />
              </View>
            </View>
            <ChampSaisie libelle="Téléphone" placeholder="Facultatif" maxLength={10} keyboardType="number-pad" value={f.telephone} onChangeText={(t) => majFiche(code, 'telephone', saisirTelephone(t))} />
          </Carte>
        );
      })}

      <Carte style={{ gap: 12 }}>
        <CaseACocher coche={embarquer} onChange={setEmbarquer} libelle="Les voyageurs montent à bord maintenant" />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: couleurs.ocean50 }}>
          <Ionicons name="cash-outline" size={18} color={couleurs.ocean800} style={{ marginTop: 1 }} />
          <Texte graisse="moyen" taille={12.5} couleur={couleurs.ocean800} style={{ flex: 1, lineHeight: 18 }}>
            Paiement en espèces au guichet. Aucune commission FANDRIO n’est prélevée sur cette vente.
          </Texte>
        </View>
      </Carte>
    </View>
  );

  const renderFait = () => (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 6 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: couleurs.succesVif, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={34} color="#FFFFFF" />
        </View>
        <Texte variante="titre" taille={22} centre>Vente enregistrée</Texte>
        <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris} centre>
          {formatAriary(Number(vente?.montant_total) || 0)} Ar encaissés en espèces
        </Texte>
      </View>

      <Carte style={{ alignItems: 'center', gap: 10 }}>
        <Texte variante="etiquette">Numéro du billet</Texte>
        <Texte graisse="tresGras" taille={22} couleur={couleurs.ocean950} selectable>{vente?.res_numero}</Texte>
        {!!qr && (
          <View style={{ padding: 10, borderRadius: 14, borderWidth: 1, borderColor: couleurs.ligne }}>
            <QRCode value={qr} size={170} color={couleurs.ocean950} backgroundColor="#FFFFFF" />
          </View>
        )}
        <Texte variante="legende" centre>
          {embarquer
            ? 'Les voyageurs sont enregistrés à bord.'
            : 'Le voyageur peut photographier ce QR code : il sera scanné à l’embarquement.'}
        </Texte>
      </Carte>

      <Carte padding={0}>
        {(vente?.voyageurs || []).map((v: any, i: number) => (
          <View key={v.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }}>
              <Texte graisse="tresGras" taille={14} couleur="#FFFFFF">{v.siege}</Texte>
            </View>
            <Texte graisse="tresGras" taille={14} style={{ flex: 1 }} numberOfLines={1}>{v.nom}</Texte>
            {v.embarque && <Ionicons name="checkmark-circle" size={22} color={couleurs.succesVif} accessibilityLabel="À bord" />}
          </View>
        ))}
      </Carte>
    </View>
  );

  const indexEtape = etape === 'voyage' ? 0 : etape === 'sieges' ? 1 : 2;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <EnTete
          titre="Vente au guichet"
          sousTitre={voyage ? `${trajet} · ${quand}` : 'Billets payés en espèces sur place'}
          gauche={etape === 'fait' || etape === 'voyage' ? 'fermer' : 'retour'}
          onGauche={etape === 'fait' ? onClose : retour}
        >
          {etape !== 'fait' && <Etapes etapes={['Voyage', 'Sièges', 'Voyageurs']} courante={indexEtape} />}
        </EnTete>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={etape === 'voyage' ? <RefreshControl refreshing={refreshing} onRefresh={actualiser} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} /> : undefined}
          >
            {etape === 'voyage' && renderVoyages()}
            {etape === 'sieges' && renderSieges()}
            {etape === 'voyageurs' && renderVoyageurs()}
            {etape === 'fait' && renderFait()}
          </ScrollView>

          {/* Pied (pas à l'étape du choix du voyage) */}
          {etape !== 'voyage' && (
            <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {etape === 'fait' ? (
                <>
                  <Bouton titre="Nouvelle vente" variante="secondaire" icone="add" onPress={autreVente} style={{ flex: 1 }} />
                  <Bouton titre="Terminer" onPress={onClose} style={{ flex: 1 }} />
                </>
              ) : (
                <>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} numberOfLines={1}>
                      {selection.length ? `${selection.length} siège${selection.length > 1 ? 's' : ''} · n° ${tries.join(', ')}` : 'Aucun siège choisi'}
                    </Texte>
                    <Texte variante="montant" taille={20}>{formatAriary(total)} <Texte graisse="gras" taille={13} couleur={couleurs.gris}>Ar</Texte></Texte>
                  </View>
                  {etape === 'sieges' ? (
                    <Bouton titre="Continuer" onPress={() => setEtape('voyageurs')} desactive={selection.length === 0} />
                  ) : (
                    <Bouton titre="Encaisser" variante="succes" icone="cash-outline" onPress={encaisser} chargement={envoi} />
                  )}
                </>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

export default VenteGuichet;
