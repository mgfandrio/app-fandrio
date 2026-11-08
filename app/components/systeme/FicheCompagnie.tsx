import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StatusBar, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import commissionService from '../../services/commissions/commissionService';
import compagnieService from '../../services/compagnies/compagnieService';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, BoutonIcone, Carte, ModalPleinEcran, Texte } from '../ui';
import { couleurs, formatAriary } from '../../theme/ocean';
import { donnees, etatCollecte, etatCompagnie, initialesNom, moisDePeriode } from './outils';

interface Props {
  visible: boolean;
  compagnieId: number | null;
  suspendu?: boolean;
  onClose: () => void;
  onModifier: (id: number) => void;
  onVoirCollecte: (collecteId: number) => void;
  onChange?: () => void;
}

function Ligne({ libelle, valeur, onPress }: { libelle: string; valeur?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress || !valeur} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Texte graisse="moyen" taille={13} couleur={couleurs.gris}>{libelle}</Texte>
      <Texte graisse="gras" taille={13} couleur={onPress && valeur ? couleurs.ocean800 : couleurs.encre} style={{ flexShrink: 1, textAlign: 'right' }}>{valeur || '—'}</Texte>
    </Pressable>
  );
}

function Option({ titre, detail, valeur, onChange, premiere, desactive }: { titre: string; detail: string; valeur: boolean; onChange: (v: boolean) => void; premiere?: boolean; desactive?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur, opacity: desactive ? 0.5 : 1 }}>
      <View style={{ flex: 1 }}>
        <Texte graisse="tresGras" taille={14}>{titre}</Texte>
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{detail}</Texte>
      </View>
      <Switch value={valeur} onValueChange={onChange} disabled={desactive} trackColor={{ true: couleurs.ocean800, false: couleurs.champ }} thumbColor="#FFFFFF" accessibilityLabel={titre} />
    </View>
  );
}

function Contenu({ compagnieId, suspendu, onClose, onModifier, onVoirCollecte, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [c, setC] = useState<any>(null);
  const [totaux, setTotaux] = useState<any>(null);
  const [collecte, setCollecte] = useState<any>(null);
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState(false);

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  const charger = async () => {
    if (!compagnieId) return;
    const [rc, rt, rcol] = await Promise.all([
      compagnieService.getCompagnie(compagnieId).catch(() => null),
      commissionService.getDetailCompagnie(compagnieId).catch(() => null),
      commissionService.getCollectes({ comp_id: compagnieId, statut: 1, per_page: 5 }).catch(() => null),
    ]);
    setC(donnees(rc));
    setTotaux(donnees<any>(rt)?.totaux || null);
    setCollecte((donnees<any>(rcol)?.collectes || [])[0] || null);
  };

  useEffect(() => {
    charger().finally(() => setChargement(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compagnieId]);

  /** Exécute une action, recharge la fiche et la liste. */
  const agir = async (appel: () => Promise<any>) => {
    setOccupe(true);
    try {
      const r = await appel();
      if (r?.statut === false) message('Action impossible', r.message || 'Une erreur est survenue.');
      await charger();
      onChange?.();
    } finally {
      setOccupe(false);
    }
  };

  const basculerPapi = (v: boolean) => {
    if (v && !c.papi_configure) return message('Clé PAPI manquante', 'Ajoutez la clé API PAPI depuis « Modifier » avant d’activer le paiement en ligne.', 'warning');
    agir(() =>
      compagnieService.mettreAJourCompagnie(compagnieId!, {
        comp_nom: c.nom,
        comp_nif: c.nif,
        comp_stat: c.stat,
        comp_description: c.description,
        comp_phone: c.telephone,
        comp_email: c.email,
        comp_adresse: c.adresse,
        comp_localisation: c.localisation?.id,
        papi_actif: v,
      } as any)
    );
  };

  const basculerStatut = () => {
    const active = Number(c.statut) === 1;
    showDialog({
      title: active ? 'Désactiver la compagnie ?' : 'Réactiver la compagnie ?',
      message: active ? 'Ses voyages ne seront plus proposés aux clients et son administrateur ne pourra plus se connecter.' : 'La compagnie retrouvera l’accès à FANDRIO et ses voyages redeviendront visibles.',
      type: active ? 'danger' : 'warning',
      confirmText: active ? 'Désactiver' : 'Réactiver',
      cancelText: 'Retour',
      onConfirm: () => agir(() => compagnieService.changerStatut(compagnieId!, active ? 2 : 1)),
      onCancel: () => {},
    });
  };

  const etat = c ? etatCompagnie(c.statut, suspendu) : null;
  const admin = c?.administrateurs?.[0];
  const retard = collecte ? etatCollecte(collecte).cle === 'retard' : false;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={couleurs.ocean950} />
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <View style={{ backgroundColor: couleurs.ocean950, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <BoutonIcone icone="chevron-back" libelle="Retour" variante="marine" onPress={onClose} />
            <View style={{ flex: 1 }} />
            {!!c && (
              <Pressable onPress={() => onModifier(compagnieId!)} accessibilityRole="button" style={{ height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center' }}>
                <Texte graisse="tresGras" taille={13} couleur="#FFFFFF">Modifier</Texte>
              </Pressable>
            )}
          </View>
          {c ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {c.logo ? <Image source={{ uri: c.logo }} style={{ width: '100%', height: '100%' }} /> : <Texte graisse="tresGras" taille={20} couleur={couleurs.ocean950}>{initialesNom(c.nom)}</Texte>}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Texte graisse="tresGras" taille={21} couleur="#FFFFFF" numberOfLines={2}>{c.nom}</Texte>
                <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: etat!.tonalite === 'succes' ? 'rgba(61,214,140,0.16)' : etat!.tonalite === 'danger' ? 'rgba(255,120,110,0.18)' : 'rgba(255,255,255,0.12)' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: etat!.tonalite === 'succes' ? '#8BE8B7' : etat!.tonalite === 'danger' ? '#FFB4AE' : '#D5E2F0' }} />
                  <Texte graisse="gras" taille={11} couleur={etat!.tonalite === 'succes' ? '#8BE8B7' : etat!.tonalite === 'danger' ? '#FFB4AE' : '#D5E2F0'}>{etat!.libelle}</Texte>
                </View>
              </View>
            </View>
          ) : (
            <Skeleton height={60} borderRadius={18} color="rgba(255,255,255,0.12)" />
          )}
        </View>

        {chargement ? (
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton height={64} borderRadius={16} />
            <Skeleton height={190} borderRadius={16} />
          </View>
        ) : !c ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 }}>
            <Ionicons name="alert-circle-outline" size={44} color={couleurs.danger} />
            <Texte variante="legende" centre>Impossible de charger cette compagnie.</Texte>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
            {collecte && (suspendu || retard) && (
              <View style={{ gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: couleurs.dangerFond }}>
                <Texte graisse="gras" taille={13} couleur="#8A1A14" style={{ lineHeight: 19 }}>
                  Commission impayée de <Texte graisse="tresGras" taille={13} couleur="#8A1A14">{formatAriary(collecte.montant_commission)} Ar</Texte> depuis le {collecte.date_prevue} (collecte de {moisDePeriode(collecte.periode_debut)}).
                  {suspendu ? ' Les clients ne voient plus ses voyages.' : ''}
                </Texte>
                <Bouton titre="Voir la collecte" variante="dangerPlein" compact onPress={() => onVoirCollecte(collecte.coll_id)} />
              </View>
            )}

            {totaux && (
              <Carte padding={0} style={{ flexDirection: 'row' }}>
                {[
                  [formatAriary(totaux.total_billets || 0), 'Billets vendus'],
                  [formatAriary(totaux.commission || 0), 'Commission (Ar)'],
                  [formatAriary(totaux.nb_reservations || 0), 'Réservations'],
                ].map(([v, l], i) => (
                  <View key={l} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: couleurs.separateur }}>
                    <Texte variante="montant" taille={17}>{v}</Texte>
                    <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>{l}</Texte>
                  </View>
                ))}
              </Carte>
            )}

            <Texte variante="etiquette" style={{ marginLeft: 4 }}>Informations</Texte>
            <Carte style={{ gap: 9 }}>
              <Ligne libelle="Responsable" valeur={admin ? `${admin.prenom} ${admin.nom}` : undefined} />
              <Ligne libelle="Téléphone" valeur={c.telephone} onPress={() => Linking.openURL(`tel:${c.telephone}`)} />
              <Ligne libelle="Email" valeur={c.email} onPress={() => Linking.openURL(`mailto:${c.email}`)} />
              <Ligne libelle="Siège" valeur={c.localisation?.nom} />
              <Ligne libelle="NIF · STAT" valeur={[c.nif, c.stat].filter(Boolean).join(' · ')} />
              <Ligne libelle="Collecte" valeur={c.frequence_collecte === 'hebdomadaire' ? 'Hebdomadaire' : 'Mensuelle'} />
              <Ligne libelle="Provinces desservies" valeur={(c.provinces_desservies || []).map((p: any) => p.nom).join(', ')} />
            </Carte>

            <Texte variante="etiquette" style={{ marginLeft: 4 }}>Options</Texte>
            <Carte style={{ paddingVertical: 4 }}>
              <Option premiere titre="Paiement en ligne" detail={c.papi_configure ? 'Clé PAPI configurée' : 'Clé PAPI à ajouter'} valeur={!!c.papi_actif} onChange={basculerPapi} desactive={occupe} />
              <Option titre="Offres VIP" detail="Véhicules et trajets VIP" valeur={!!c.mode_vip} onChange={(v) => agir(() => compagnieService.mettreAJourModes(compagnieId!, { mode_vip: v } as any))} desactive={occupe} />
              <Option titre="Offres Premium" detail="Véhicules et trajets Premium" valeur={!!c.mode_premium} onChange={(v) => agir(() => compagnieService.mettreAJourModes(compagnieId!, { mode_premium: v } as any))} desactive={occupe} />
              <Option titre="Commission active" detail="Prélever la commission FANDRIO" valeur={c.commission_active !== false} onChange={(v) => agir(() => commissionService.toggleCommission(compagnieId!, v))} desactive={occupe} />
            </Carte>

            {Number(c.statut) !== 3 && (
              <Bouton
                titre={Number(c.statut) === 1 ? 'Désactiver la compagnie' : 'Réactiver la compagnie'}
                variante={Number(c.statut) === 1 ? 'danger' : 'principal'}
                icone={Number(c.statut) === 1 ? 'ban-outline' : 'checkmark-circle-outline'}
                onPress={basculerStatut}
                chargement={occupe}
              />
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

/** Fiche d'une compagnie pour l'admin système (maquette « Fiche compagnie »). */
export function FicheCompagnie(props: Props) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <Contenu {...props} />
    </ModalPleinEcran>
  );
}

export default FicheCompagnie;
