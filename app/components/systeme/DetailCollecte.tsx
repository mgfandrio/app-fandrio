import React, { useEffect, useState } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import commissionService from '../../services/commissions/commissionService';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, BoutonIcone, Carte, ModalPleinEcran, Pastille, Texte } from '../ui';
import { couleurs, formatAriary } from '../../theme/ocean';
import { depuisJours, donnees, etatCollecte } from './outils';
import { JournalCommission } from '../commission/Commission';

interface Props {
  visible: boolean;
  collecteId: number | null;
  onClose: () => void;
  onChange?: () => void;
}

function Ligne({ libelle, valeur }: { libelle: string; valeur?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris}>{libelle}</Texte>
      <Texte graisse="gras" taille={13.5} style={{ flexShrink: 1, textAlign: 'right' }}>{valeur || '—'}</Texte>
    </View>
  );
}

function Contenu({ collecteId, onClose, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [c, setC] = useState<any>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  const charger = async () => {
    if (!collecteId) return;
    setC(donnees(await commissionService.getDetailCollecte(collecteId).catch(() => null)));
  };

  useEffect(() => {
    charger().finally(() => setChargement(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collecteId]);

  const confirmer = () => {
    showDialog({
      title: 'Confirmer le versement ?',
      message: `Vous confirmez avoir reçu ${formatAriary(c.montant_commission)} Ar de ${nom} (paiement hors ligne). Votre nom sera inscrit dans l'historique. Si la compagnie était suspendue, ses voyages redeviennent visibles.`,
      type: 'warning',
      confirmText: 'Confirmer',
      cancelText: 'Retour',
      onConfirm: async () => {
        setEnvoi(true);
        try {
          const r: any = await commissionService.confirmerCollecte(collecteId!);
          if (r?.statut === false) {
            showDialog({ title: 'Confirmation impossible', message: r.message || 'Une erreur est survenue.', type: 'danger', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
          } else {
            await charger();
            onChange?.();
          }
        } finally {
          setEnvoi(false);
        }
      },
      onCancel: () => {},
    });
  };

  const [relance, setRelance] = useState(false);
  const relancer = () => {
    showDialog({
      title: 'Relancer la compagnie ?',
      message: `Les administrateurs de ${c.compagnie?.nom || c.comp_nom} recevront une notification leur rappelant de verser ${formatAriary(c.montant_commission)} Ar.`,
      type: 'warning',
      confirmText: 'Relancer',
      cancelText: 'Retour',
      onConfirm: async () => {
        setRelance(true);
        try {
          const r: any = await commissionService.relancerCollecte(collecteId!);
          showDialog({
            title: r?.statut ? 'Relance envoyée' : 'Relance impossible',
            message: r?.message || (r?.statut ? 'La compagnie a été prévenue.' : 'Une erreur est survenue.'),
            type: r?.statut ? 'success' : 'danger',
            confirmText: 'OK',
            onConfirm: () => {},
            onCancel: () => {},
          });
        } finally {
          setRelance(false);
        }
      },
      onCancel: () => {},
    });
  };

  const etat = c ? etatCollecte(c) : null;
  const nom = c?.compagnie_detail?.nom || c?.comp_nom || '';

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <View style={{ backgroundColor: couleurs.surface, borderBottomWidth: 1, borderBottomColor: couleurs.ligne, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BoutonIcone icone="chevron-back" libelle="Retour" onPress={onClose} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Texte graisse="tresGras" taille={16} numberOfLines={1}>{c ? `Commission · ${c.nb_voyages} voyage${c.nb_voyages > 1 ? 's' : ''}` : 'Commission'}</Texte>
            <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} numberOfLines={1}>{nom}</Texte>
          </View>
          {etat && <Pastille libelle={etat.libelle} tonalite={etat.tonalite} />}
        </View>

        {chargement ? (
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton height={170} borderRadius={16} />
            <Skeleton height={160} borderRadius={16} />
          </View>
        ) : !c ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 }}>
            <Ionicons name="alert-circle-outline" size={44} color={couleurs.danger} />
            <Texte variante="legende" centre>Impossible de charger cette collecte.</Texte>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
              <Carte style={{ gap: 10 }}>
                <Texte graisse="gras" taille={12} couleur={couleurs.gris}>Commission {etat!.cle === 'payee' ? 'versée' : 'à verser'}</Texte>
                <Texte variante="montant" taille={30} style={{ letterSpacing: -0.5 }}>
                  {formatAriary(c.montant_commission)} <Texte graisse="tresGras" taille={14} couleur={couleurs.gris}>Ar</Texte>
                </Texte>
                <View style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                  <Ligne libelle="Voyages" valeur={`${c.nb_voyages} · du ${c.periode_debut} au ${c.periode_fin}`} />
                  <Ligne libelle="Ventes en ligne" valeur={`${formatAriary(c.montant_brut)} Ar`} />
                  <Ligne libelle="Billets vendus" valeur={String(c.nb_billets ?? '—')} />
                  {etat!.cle === 'payee' ? (
                    <Ligne libelle="Versée le" valeur={c.date_confirmation} />
                  ) : (
                    <>
                      <Ligne libelle="À verser" valeur={`${c.date_prevue} (${depuisJours(c)})`} />
                      <Ligne libelle="Suspension si non versée le" valeur={c.suspension_le} />
                    </>
                  )}
                </View>
              </Carte>

              {c.motif === 'delai' && (
                <Texte graisse="gras" taille={12.5} couleur={couleurs.alerte} style={{ backgroundColor: couleurs.alerteFond, padding: 12, borderRadius: 12, lineHeight: 18 }}>
                  Tranche incomplète : due car 30 jours se sont écoulés depuis son premier voyage.
                </Texte>
              )}
              <Texte variante="etiquette" style={{ marginLeft: 4 }}>Voyages compris</Texte>
              <Carte style={{ paddingVertical: 4 }}>
                {((c.voyages || []) as any[]).map((v, i) => (
                  <View key={v.voyage_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Texte graisse="tresGras" taille={13} numberOfLines={1}>{v.trajet}</Texte>
                      <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{v.date} à {v.heure} · {v.billets} billet{v.billets > 1 ? 's' : ''}</Texte>
                    </View>
                    <Texte variante="montant" taille={13}>{formatAriary(v.commission)} Ar</Texte>
                  </View>
                ))}
              </Carte>

              <Texte variante="etiquette" style={{ marginLeft: 4 }}>Historique</Texte>
              <Carte style={{ paddingVertical: 4 }}>
                <JournalCommission journal={c.journal} />
              </Carte>

              {!!c.compagnie_detail && (
                <>
                  <Texte variante="etiquette" style={{ marginLeft: 4 }}>Compagnie</Texte>
                  <Carte style={{ gap: 8 }}>
                    <Ligne libelle="Téléphone" valeur={c.compagnie_detail.phone} />
                    <Ligne libelle="Email" valeur={c.compagnie_detail.email} />
                    <Ligne libelle="NIF · STAT" valeur={[c.compagnie_detail.nif, c.compagnie_detail.stat].filter(Boolean).join(' · ')} />
                  </Carte>
                </>
              )}

              {etat!.cle !== 'payee' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="information-circle-outline" size={18} color={couleurs.ocean800} />
                  <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} style={{ flex: 1, lineHeight: 18 }}>
                    Confirmer le versement lève la suspension : les voyages de la compagnie redeviennent visibles pour les clients.
                  </Texte>
                </View>
              )}
            </ScrollView>
            {etat!.cle !== 'payee' && (
              <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Bouton titre="Relancer" variante="secondaire" icone="notifications-outline" onPress={relancer} chargement={relance} style={{ flex: 1 }} />
                  <Bouton titre="Confirmer" icone="checkmark-done" onPress={confirmer} chargement={envoi} style={{ flex: 1.4 }} />
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </>
  );
}

/** Détail d'une tranche de commission : voyages compris, historique, relance, confirmation. */
export function DetailCollecte(props: Props) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <Contenu {...props} />
    </ModalPleinEcran>
  );
}

export default DetailCollecte;
