import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import compagnieService from '../../services/compagnies/compagnieService';
import provinceService from '../../services/provinces/provinceService';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, BoutonIcone, ChampSaisie, Etapes, ModalPleinEcran, Puce, Segmente, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';
import { ChampChoix, FeuilleChoix } from '../voyages/FeuilleChoix';
import { LigneInterrupteur } from '../flotte/communs';
import { donnees } from './outils';

interface Props {
  visible: boolean;
  /** Compagnie à modifier ; absent = création (avec son administrateur). */
  compagnieId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const VIDE = {
  comp_nom: '',
  comp_description: '',
  comp_phone: '',
  comp_email: '',
  comp_adresse: '',
  comp_nif: '',
  comp_stat: '',
  comp_localisation: '',
  comm_frequence_collecte: 'mensuelle' as 'mensuelle' | 'hebdomadaire',
  papi_actif: false,
  papi_api_key: '',
  papi_webhook_secret: '',
  admin_prenom: '',
  admin_nom: '',
  admin_email: '',
  admin_telephone: '',
  admin_mot_de_passe: '',
};

/** Contenu dans la fenêtre (marges propres). */
function Contenu({ compagnieId, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const edition = !!compagnieId;
  const [etape, setEtape] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [desservies, setDesservies] = useState<number[]>([]);
  const [papiConfigure, setPapiConfigure] = useState(false);
  const [modes, setModes] = useState<any[]>([]);
  const [f, setF] = useState({ ...VIDE });
  const [feuilleSiege, setFeuilleSiege] = useState(false);

  const etapes = edition ? ['Identité', 'Activité'] : ['Identité', 'Activité', 'Administrateur'];
  const maj = (champ: Partial<typeof VIDE>) => setF((x) => ({ ...x, ...champ }));
  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger', ensuite?: () => void) =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => ensuite?.(), onCancel: () => ensuite?.() });

  useEffect(() => {
    (async () => {
      const [rp, rc] = await Promise.all([
        provinceService.listerProvinces({ per_page: 200 } as any).catch(() => null),
        compagnieId ? compagnieService.getCompagnie(compagnieId).catch(() => null) : Promise.resolve(null),
      ]);
      const p: any = donnees(rp);
      setProvinces(p?.provinces || (Array.isArray(p) ? p : []));
      const c: any = donnees(rc);
      if (c) {
        setF({
          ...VIDE,
          comp_nom: c.nom || '',
          comp_description: c.description || '',
          comp_phone: c.telephone || '',
          comp_email: c.email || '',
          comp_adresse: c.adresse || '',
          comp_nif: c.nif || '',
          comp_stat: c.stat || '',
          comp_localisation: c.localisation?.id ? String(c.localisation.id) : '',
          comm_frequence_collecte: c.frequence_collecte === 'hebdomadaire' ? 'hebdomadaire' : 'mensuelle',
          papi_actif: !!c.papi_actif,
        });
        setDesservies((c.provinces_desservies || []).map((x: any) => Number(x.id)));
        setPapiConfigure(!!c.papi_configure);
        setModes((c.modes_paiement_acceptes || []).map((m: any) => ({ id: m.id, numero: m.numero || '', titulaire: m.titulaire || '' })));
      } else if (compagnieId) {
        message('Compagnie introuvable', 'Impossible de charger cette compagnie.', 'danger', onClose);
      }
      setChargement(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compagnieId]);

  const nomProvince = (id: any) => provinces.find((p) => String(p.id) === String(id))?.nom || '';

  const verifier = (n: number): string | null => {
    if (n === 0) {
      if (!f.comp_nom.trim()) return 'Indiquez le nom de la compagnie.';
      if (!f.comp_description.trim()) return 'Ajoutez une courte description.';
      if (!f.comp_phone.trim() || !f.comp_email.trim()) return 'Indiquez le téléphone et l’email de la compagnie.';
      if (!/^\S+@\S+\.\S+$/.test(f.comp_email.trim())) return 'L’email de la compagnie n’est pas valide.';
      if (!f.comp_adresse.trim()) return 'Indiquez l’adresse du siège.';
    }
    if (n === 1) {
      if (!f.comp_localisation) return 'Choisissez la province du siège.';
      if (!f.comp_nif.trim() || !f.comp_stat.trim()) return 'Indiquez le NIF et le numéro STAT.';
      if (f.papi_actif && !papiConfigure && !f.papi_api_key.trim()) return 'Saisissez la clé API PAPI pour activer le paiement en ligne.';
    }
    if (n === 2) {
      if (!f.admin_prenom.trim() || !f.admin_nom.trim()) return 'Indiquez le prénom et le nom de l’administrateur.';
      if (!/^\S+@\S+\.\S+$/.test(f.admin_email.trim())) return 'L’email de l’administrateur n’est pas valide.';
      if (!f.admin_telephone.trim()) return 'Indiquez le téléphone de l’administrateur.';
      if (f.admin_mot_de_passe.length < 6) return 'Le mot de passe doit avoir au moins 6 caractères.';
    }
    return null;
  };

  const suivant = () => {
    const e = verifier(etape);
    if (e) return message('Formulaire incomplet', e, 'warning');
    if (etape < etapes.length - 1) setEtape(etape + 1);
    else enregistrer();
  };

  const enregistrer = async () => {
    const base: any = {
      comp_nom: f.comp_nom.trim(),
      comp_description: f.comp_description.trim(),
      comp_phone: f.comp_phone.trim(),
      comp_email: f.comp_email.trim(),
      comp_adresse: f.comp_adresse.trim(),
      comp_nif: f.comp_nif.trim(),
      comp_stat: f.comp_stat.trim(),
      comp_localisation: Number(f.comp_localisation),
      provinces_desservies: desservies,
      comm_frequence_collecte: f.comm_frequence_collecte,
      papi_actif: f.papi_actif,
      ...(f.papi_api_key.trim() ? { papi_api_key: f.papi_api_key.trim() } : {}),
      ...(f.papi_webhook_secret.trim() ? { papi_webhook_secret: f.papi_webhook_secret.trim() } : {}),
    };
    setEnvoi(true);
    try {
      const r: any = edition
        ? await compagnieService.mettreAJourCompagnie(compagnieId!, { ...base, modes_paiement: modes })
        : await compagnieService.creerCompagnie({
            ...base,
            modes_paiement: [],
            admin_prenom: f.admin_prenom.trim(),
            admin_nom: f.admin_nom.trim(),
            admin_email: f.admin_email.trim(),
            admin_telephone: f.admin_telephone.trim(),
            admin_mot_de_passe: f.admin_mot_de_passe,
          });
      if (r?.statut) {
        message(edition ? 'Compagnie modifiée' : 'Compagnie créée', edition ? 'Les modifications sont enregistrées.' : `${f.admin_prenom} peut maintenant se connecter avec ${f.admin_email}.`, 'success', () => {
          onSuccess?.();
          onClose();
        });
      } else {
        const detail = r?.erreurs ? Object.values(r.erreurs).flat().join('\n') : r?.message;
        message(edition ? 'Modification impossible' : 'Création impossible', detail || 'Une erreur est survenue.');
      }
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <View style={{ backgroundColor: couleurs.surface, borderBottomWidth: 1, borderBottomColor: couleurs.ligne, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <BoutonIcone icone="close" libelle="Fermer" onPress={onClose} />
            <Texte graisse="tresGras" taille={17} style={{ flex: 1 }}>{edition ? 'Modifier la compagnie' : 'Nouvelle compagnie'}</Texte>
          </View>
          <Etapes etapes={etapes} courante={etape} />
        </View>

        {chargement ? (
          <View style={{ padding: 16, gap: 14 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={52} borderRadius={14} />)}
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {etape === 0 && (
                <>
                  <ChampSaisie libelle="Nom de la compagnie" value={f.comp_nom} onChangeText={(t) => maj({ comp_nom: t })} placeholder="Mahery Trans" autoCapitalize="words" />
                  <ChampSaisie libelle="Description" value={f.comp_description} onChangeText={(t) => maj({ comp_description: t })} placeholder="Ce que les voyageurs doivent savoir" multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <ChampSaisie libelle="Téléphone" value={f.comp_phone} onChangeText={(t) => maj({ comp_phone: t })} keyboardType="phone-pad" placeholder="034 00 000 00" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ChampSaisie libelle="Email" value={f.comp_email} onChangeText={(t) => maj({ comp_email: t })} keyboardType="email-address" autoCapitalize="none" placeholder="contact@…" />
                    </View>
                  </View>
                  <ChampSaisie libelle="Adresse du siège" value={f.comp_adresse} onChangeText={(t) => maj({ comp_adresse: t })} placeholder="Lot, quartier, ville" />
                </>
              )}

              {etape === 1 && (
                <>
                  <ChampChoix libelle="Province du siège" icone="location-outline" titre={nomProvince(f.comp_localisation) || undefined} placeholder="Choisir une province" onPress={() => setFeuilleSiege(true)} />
                  <View style={{ gap: 6 }}>
                    <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>Provinces desservies</Texte>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {provinces.map((p) => {
                        const actif = desservies.includes(Number(p.id));
                        return (
                          <Puce
                            key={p.id}
                            libelle={p.nom}
                            active={actif}
                            onPress={() => setDesservies((x) => (actif ? x.filter((i) => i !== Number(p.id)) : [...x, Number(p.id)]))}
                          />
                        );
                      })}
                    </View>
                    <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Les trajets de la compagnie ne pourront arriver que dans ces provinces.</Texte>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <ChampSaisie libelle="NIF" value={f.comp_nif} onChangeText={(t) => maj({ comp_nif: t })} keyboardType="number-pad" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ChampSaisie libelle="STAT" value={f.comp_stat} onChangeText={(t) => maj({ comp_stat: t })} placeholder="N° statistique" />
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>Collecte de la commission</Texte>
                    <Segmente<'hebdomadaire' | 'mensuelle'>
                      libelleAccessible="Fréquence de collecte"
                      valeur={f.comm_frequence_collecte}
                      onChange={(v) => maj({ comm_frequence_collecte: v })}
                      options={[
                        { valeur: 'hebdomadaire', libelle: 'Hebdomadaire' },
                        { valeur: 'mensuelle', libelle: 'Mensuelle' },
                      ]}
                    />
                  </View>
                  <LigneInterrupteur
                    titre="Paiement en ligne"
                    detail={papiConfigure ? 'Clé PAPI déjà configurée' : 'Les clients paient via PAPI'}
                    valeur={f.papi_actif}
                    onChange={(v) => maj({ papi_actif: v })}
                  />
                  {f.papi_actif && (
                    <>
                      <ChampSaisie
                        libelle="Clé API PAPI"
                        value={f.papi_api_key}
                        onChangeText={(t) => maj({ papi_api_key: t })}
                        autoCapitalize="none"
                        motDePasse
                        aide={papiConfigure ? 'Laissez vide pour garder la clé actuelle.' : undefined}
                      />
                      <ChampSaisie libelle="Secret du webhook" value={f.papi_webhook_secret} onChangeText={(t) => maj({ papi_webhook_secret: t })} autoCapitalize="none" motDePasse />
                    </>
                  )}
                </>
              )}

              {etape === 2 && (
                <>
                  <Texte graisse="moyen" taille={13} couleur={couleurs.gris}>Ce compte gérera la compagnie dans l’application (voyages, véhicules, paiements).</Texte>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <ChampSaisie libelle="Prénom" value={f.admin_prenom} onChangeText={(t) => maj({ admin_prenom: t })} autoCapitalize="words" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ChampSaisie libelle="Nom" value={f.admin_nom} onChangeText={(t) => maj({ admin_nom: t })} autoCapitalize="words" />
                    </View>
                  </View>
                  <ChampSaisie libelle="Email de connexion" value={f.admin_email} onChangeText={(t) => maj({ admin_email: t })} keyboardType="email-address" autoCapitalize="none" icone="mail-outline" />
                  <ChampSaisie libelle="Téléphone" value={f.admin_telephone} onChangeText={(t) => maj({ admin_telephone: t })} keyboardType="phone-pad" icone="call-outline" />
                  <ChampSaisie libelle="Mot de passe provisoire" value={f.admin_mot_de_passe} onChangeText={(t) => maj({ admin_mot_de_passe: t })} motDePasse autoCapitalize="none" aide="Au moins 6 caractères. À transmettre à l’administrateur, qui pourra le changer." />
                </>
              )}
            </ScrollView>

            <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8, flexDirection: 'row', gap: 8 }}>
              {etape > 0 && <Bouton titre="Retour" variante="secondaire" onPress={() => setEtape(etape - 1)} style={{ flex: 1 }} />}
              <Bouton
                titre={etape < etapes.length - 1 ? 'Continuer' : edition ? 'Enregistrer' : 'Créer la compagnie'}
                onPress={suivant}
                chargement={envoi}
                style={{ flex: 2 }}
              />
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

      <FeuilleChoix
        visible={feuilleSiege}
        onClose={() => setFeuilleSiege(false)}
        titre="Province du siège"
        recherche="Rechercher une province"
        valeur={f.comp_localisation}
        onChoisir={(id) => {
          maj({ comp_localisation: id });
          setDesservies((x) => (x.includes(Number(id)) ? x : [...x, Number(id)]));
        }}
        options={provinces.map((p) => ({ id: String(p.id), titre: p.nom, detail: p.orientation }))}
      />
    </>
  );
}

/** Créer ou modifier une compagnie (maquette « Nouvelle compagnie »), en 3 étapes à la création. */
export function FormulaireCompagnie(props: Props) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <Contenu {...props} />
    </ModalPleinEcran>
  );
}

export default FormulaireCompagnie;
