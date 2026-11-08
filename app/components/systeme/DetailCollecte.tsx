import React, { useEffect, useState } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import commissionService from '../../services/commissions/commissionService';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { Bouton, BoutonIcone, Carte, ModalPleinEcran, Pastille, Texte } from '../ui';
import { couleurs, formatAriary } from '../../theme/ocean';
import { donnees, etatCollecte, moisDePeriode } from './outils';

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

/** Étape du suivi : faite (verte), en défaut (rouge) ou à venir (grise). */
function Etape({ etat, titre, detail }: { etat: 'fait' | 'alerte' | 'avenir'; titre: string; detail?: string }) {
  const couleur = etat === 'fait' ? couleurs.succesVif : etat === 'alerte' ? couleurs.danger : couleurs.grisClair;
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, marginTop: 1, backgroundColor: etat === 'avenir' ? 'transparent' : couleur, borderWidth: etat === 'avenir' ? 2 : 0, borderColor: couleurs.champ, alignItems: 'center', justifyContent: 'center' }}>
        {etat === 'fait' && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
        {etat === 'alerte' && <Ionicons name="alert" size={12} color="#FFFFFF" />}
      </View>
      <View style={{ flex: 1 }}>
        <Texte graisse="gras" taille={13} couleur={etat === 'alerte' ? couleurs.danger : etat === 'avenir' ? couleurs.grisClair : couleurs.encre}>{titre}</Texte>
        {!!detail && <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{detail}</Texte>}
      </View>
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
      title: 'Confirmer la collecte ?',
      message: `Vous confirmez avoir reçu ${formatAriary(c.montant_commission)} Ar de ${c.compagnie?.nom || c.comp_nom}. Si la compagnie était suspendue, ses voyages redeviennent visibles.`,
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

  const etat = c ? etatCollecte(c) : null;
  const nom = c?.compagnie?.nom || c?.comp_nom || '';

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <View style={{ backgroundColor: couleurs.surface, borderBottomWidth: 1, borderBottomColor: couleurs.ligne, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BoutonIcone icone="chevron-back" libelle="Retour" onPress={onClose} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Texte graisse="tresGras" taille={16} numberOfLines={1}>{c ? `Collecte ${c.periode_debut?.slice(0, 2) === '01' ? `de ${moisDePeriode(c.periode_debut)}` : `du ${c.periode_debut}`}` : 'Collecte'}</Texte>
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
                <Texte graisse="gras" taille={12} couleur={couleurs.gris}>Commission due</Texte>
                <Texte variante="montant" taille={30} style={{ letterSpacing: -0.5 }}>
                  {formatAriary(c.montant_commission)} <Texte graisse="tresGras" taille={14} couleur={couleurs.gris}>Ar</Texte>
                </Texte>
                <View style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                  <Ligne libelle="Période" valeur={`${c.periode_debut} → ${c.periode_fin}`} />
                  <Ligne libelle="Revenu brut" valeur={`${formatAriary(c.montant_brut)} Ar`} />
                  <Ligne libelle="Billets vendus" valeur={String(c.nb_billets ?? '—')} />
                  <Ligne libelle="Taux" valeur={`${String(c.taux).replace('.', ',')} % par billet`} />
                </View>
              </Carte>

              <Texte variante="etiquette" style={{ marginLeft: 4 }}>Suivi</Texte>
              <Carte style={{ gap: 12 }}>
                <Etape etat="fait" titre="Collecte calculée" detail={c.created_at ? `${c.created_at} · automatique` : 'Automatique'} />
                <Etape etat="fait" titre="Compagnie notifiée" detail={`Échéance le ${c.date_prevue}`} />
                {etat!.cle === 'retard' && <Etape etat="alerte" titre="Échéance dépassée" detail={`Prévue le ${c.date_prevue} · compagnie suspendue`} />}
                <Etape
                  etat={etat!.cle === 'payee' ? 'fait' : 'avenir'}
                  titre="Paiement reçu"
                  detail={etat!.cle === 'payee' ? [c.date_confirmation, c.confirme_par ? `par ${c.confirme_par.prenom} ${c.confirme_par.nom}` : null].filter(Boolean).join(' · ') : 'En attente'}
                />
              </Carte>

              {!!c.compagnie && (
                <>
                  <Texte variante="etiquette" style={{ marginLeft: 4 }}>Compagnie</Texte>
                  <Carte style={{ gap: 8 }}>
                    <Ligne libelle="Téléphone" valeur={c.compagnie.phone} />
                    <Ligne libelle="Email" valeur={c.compagnie.email} />
                    <Ligne libelle="NIF · STAT" valeur={[c.compagnie.nif, c.compagnie.stat].filter(Boolean).join(' · ')} />
                  </Carte>
                </>
              )}

              {etat!.cle !== 'payee' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="information-circle-outline" size={18} color={couleurs.ocean800} />
                  <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} style={{ flex: 1, lineHeight: 18 }}>
                    Confirmer la collecte lève la suspension : les voyages de la compagnie redeviennent visibles pour les clients.
                  </Texte>
                </View>
              )}
            </ScrollView>
            {etat!.cle !== 'payee' && (
              <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
                <Bouton titre="Confirmer la collecte" icone="checkmark-done" onPress={confirmer} chargement={envoi} />
              </View>
            )}
          </>
        )}
      </View>
    </>
  );
}

/** Détail d'une collecte de commission (maquette « Détail d'une collecte »). */
export function DetailCollecte(props: Props) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <Contenu {...props} />
    </ModalPleinEcran>
  );
}

export default DetailCollecte;
