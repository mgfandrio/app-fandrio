import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { maCompagnieService } from '../../services/compagnies/compagnieService';
import { provinceService } from '../../services/provinces/provinceService';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Skeleton } from '../common/Skeleton';
import { ChampChoix, FeuilleChoix } from '../voyages/FeuilleChoix';
import { Bouton, Carte, ChampSaisie, EnTete, ModalPleinEcran, Puce, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';

/**
 * Admin compagnie : informations publiques de sa compagnie, telles que les
 * clients les voient (fiche compagnie) : description, contacts, adresse,
 * ville principale et provinces desservies.
 * Le nom, le NIF et le STAT restent gérés par FANDRIO.
 */

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Après enregistrement (rafraîchir l'en-tête des paramètres). */
  onEnregistre?: () => void;
}

function InfosCompagnieContenu({ visible, onClose, onEnregistre }: Props) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [adresse, setAdresse] = useState('');
  const [localisation, setLocalisation] = useState<number | null>(null);
  const [desservies, setDesservies] = useState<number[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [choixVille, setChoixVille] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setChargement(true);
    setErreurs({});
    Promise.all([maCompagnieService.obtenir(), provinceService.listerProvinces({ per_page: 200 } as any).catch(() => null)])
      .then(([rc, rp]: any[]) => {
        const p = rp && rp.statut !== false ? rp.data : null;
        setProvinces(p?.provinces || (Array.isArray(p) ? p : []));
        const c = rc?.data;
        if (c) {
          setNom(c.nom || '');
          setDescription(c.description || '');
          setTelephone(c.telephone || '');
          setEmail(c.email || '');
          setAdresse(c.adresse || '');
          setLocalisation(c.localisation?.id ?? null);
          setDesservies((c.provinces_desservies || []).map((x: any) => Number(x.id)));
        }
      })
      .finally(() => setChargement(false));
  }, [visible]);

  const basculer = (id: number) => setDesservies((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const nomProvince = (id: number | null) => provinces.find((p) => Number(p.id) === id)?.nom || '';

  const enregistrer = async () => {
    const e: Record<string, string> = {};
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Adresse e-mail invalide';
    if (desservies.length === 0) e.provinces = 'Choisissez au moins une province';
    setErreurs(e);
    if (Object.keys(e).length) return;

    setEnvoi(true);
    try {
      const r = await maCompagnieService.mettreAJour({
        comp_description: description.trim() || null,
        comp_phone: telephone.trim() || null,
        comp_email: email.trim() || null,
        comp_adresse: adresse.trim() || null,
        comp_localisation: localisation,
        provinces_desservies: desservies,
      });
      if (r?.statut) {
        onEnregistre?.();
        showDialog({ title: 'C’est enregistré', message: 'Les clients voient désormais ces informations sur la fiche de votre compagnie.', type: 'success', confirmText: 'OK', onConfirm: onClose, onCancel: onClose });
      } else {
        showDialog({ title: 'Enregistrement impossible', message: r?.message || 'Une erreur est survenue.', type: 'danger', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
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
        <EnTete titre="Informations publiques" sousTitre={nom || 'Ma compagnie'} gauche="fermer" onGauche={onClose} />

        {chargement ? (
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton height={140} borderRadius={16} />
            <Skeleton height={220} borderRadius={16} />
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Ionicons name="eye-outline" size={18} color={couleurs.ocean800} />
                <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} style={{ flex: 1, lineHeight: 18 }}>
                  Ces informations apparaissent sur la fiche de votre compagnie, côté clients.
                </Texte>
              </View>

              <Carte style={{ gap: 14 }}>
                <ChampSaisie
                  libelle="Présentation"
                  placeholder="Ex. : Liaisons quotidiennes Antananarivo – Toamasina depuis 2010, véhicules climatisés…"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={2000}
                  style={{ minHeight: 96, textAlignVertical: 'top' }}
                />
                <ChampSaisie libelle="Téléphone" icone="call-outline" keyboardType="phone-pad" value={telephone} onChangeText={setTelephone} placeholder="034 00 000 00" />
                <ChampSaisie libelle="E-mail" icone="mail-outline" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} erreur={erreurs.email} placeholder="contact@compagnie.mg" />
                <ChampSaisie libelle="Adresse de la gare / du bureau" icone="location-outline" value={adresse} onChangeText={setAdresse} placeholder="Ex. : Gare routière d’Ampasampito" />
                <ChampChoix libelle="Ville principale" icone="business-outline" titre={nomProvince(localisation) || undefined} placeholder="Choisir une ville" onPress={() => setChoixVille(true)} />
              </Carte>

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Texte variante="etiquette" style={{ marginLeft: 2 }}>Provinces desservies</Texte>
                  <Texte graisse="tresGras" taille={12.5} couleur={couleurs.ocean800}>{desservies.length} choisie{desservies.length > 1 ? 's' : ''}</Texte>
                </View>
                <Carte style={{ gap: 10 }}>
                  <Texte variante="legende">Les clients qui cherchent un voyage depuis ou vers ces provinces voient votre compagnie.</Texte>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {provinces.map((p) => (
                      <Puce key={p.id} libelle={p.nom} active={desservies.includes(Number(p.id))} onPress={() => basculer(Number(p.id))} icone={desservies.includes(Number(p.id)) ? 'checkmark' : undefined} />
                    ))}
                  </View>
                  {!!erreurs.provinces && <Texte graisse="gras" taille={12} couleur={couleurs.danger}>{erreurs.provinces}</Texte>}
                </Carte>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Ionicons name="information-circle-outline" size={18} color={couleurs.ocean800} />
                <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} style={{ flex: 1, lineHeight: 18 }}>
                  Pour changer le nom, le NIF ou le STAT de la compagnie, contactez FANDRIO.
                </Texte>
              </View>
            </ScrollView>

            <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
              <Bouton titre="Enregistrer" onPress={enregistrer} chargement={envoi} />
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

      <FeuilleChoix
        visible={choixVille}
        onClose={() => setChoixVille(false)}
        titre="Ville principale"
        options={provinces.map((p) => ({ id: String(p.id), titre: p.nom, detail: p.orientation }))}
        valeur={localisation != null ? String(localisation) : undefined}
        onChoisir={(id) => {
          setLocalisation(Number(id));
          setChoixVille(false);
        }}
      />
    </>
  );
}

/** Formulaire dans sa propre fenêtre, avec les bonnes marges de sécurité. */
export function InfosCompagnie(props: Props) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <InfosCompagnieContenu {...props} />
    </ModalPleinEcran>
  );
}

export default InfosCompagnie;
