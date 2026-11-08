import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import compagnieService from '../../../services/compagnies/compagnieService';
import { couleurs } from '../../../theme/ocean';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import { Skeleton } from '../../common/Skeleton';
import { Bouton, Carte, ChampSaisie, EnTete, Texte } from '../../ui';

const OPERATEURS = [
  { id: 2, nom: 'MVola', initiales: 'MV', prefixes: ['034', '038'] },
  { id: 1, nom: 'Orange Money', initiales: 'OM', prefixes: ['032', '037'] },
  { id: 3, nom: 'Airtel Money', initiales: 'AM', prefixes: ['033'] },
];

type Mode = { actif: boolean; numero: string; titulaire: string };

/** « Modes de paiement » : opérateurs acceptés et numéros qui reçoivent l'argent. */
export const RenderPaiements = ({ onMenu }: { onMenu?: () => void }) => {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [modes, setModes] = useState<Record<number, Mode>>(() =>
    Object.fromEntries(OPERATEURS.map((o) => [o.id, { actif: false, numero: '', titulaire: '' }]))
  );
  const [initial, setInitial] = useState('');

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  useEffect(() => {
    (async () => {
      try {
        const u = JSON.parse((await SecureStore.getItemAsync('fandrioUser')) || '{}');
        const id = u.compagnie_id || u.comp_id;
        if (!id) return;
        const r: any = await compagnieService.getCompagniePublic(id);
        const acceptes: any[] = r?.data?.modes_paiement_acceptes || [];
        const suivant = Object.fromEntries(
          OPERATEURS.map((o) => {
            const m = acceptes.find((a) => Number(a.id) === o.id);
            return [o.id, { actif: !!m, numero: m?.numero || '', titulaire: m?.titulaire || '' }];
          })
        );
        setModes(suivant);
        setInitial(JSON.stringify(suivant));
      } catch {
        message('Chargement impossible', 'Impossible de lire vos modes de paiement.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maj = (id: number, champ: Partial<Mode>) => setModes((m) => ({ ...m, [id]: { ...m[id], ...champ } }));

  const erreurNumero = (o: (typeof OPERATEURS)[number], numero: string) => {
    const n = numero.replace(/\s/g, '');
    if (!n) return undefined;
    if (n.length !== 10) return 'Le numéro doit avoir 10 chiffres.';
    if (!o.prefixes.some((p) => n.startsWith(p))) return `Un numéro ${o.nom} commence par ${o.prefixes.join(' ou ')}.`;
    return undefined;
  };

  const actifs = OPERATEURS.filter((o) => modes[o.id]?.actif);
  const modifie = JSON.stringify(modes) !== initial;

  const enregistrer = async () => {
    for (const o of actifs) {
      const m = modes[o.id];
      if (!m.numero.trim() || !m.titulaire.trim()) return message('Informations manquantes', `Indiquez le numéro et le titulaire du compte ${o.nom}.`, 'warning');
      const e = erreurNumero(o, m.numero);
      if (e) return message('Numéro invalide', e, 'warning');
    }
    setEnvoi(true);
    try {
      const r: any = await compagnieService.updateModesPaiement(
        actifs.map((o) => ({ id: o.id, numero: modes[o.id].numero.replace(/\s/g, ''), titulaire: modes[o.id].titulaire.trim() }))
      );
      if (r?.statut) {
        setInitial(JSON.stringify(modes));
        message('Modes de paiement enregistrés', 'Vos clients voient maintenant ces moyens de paiement.', 'success');
      } else {
        message('Enregistrement impossible', r?.message || 'Une erreur est survenue.');
      }
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <DialogComponent />
      <EnTete titre="Modes de paiement" sousTitre="Ce que vos clients peuvent utiliser" gauche="menu" onGauche={onMenu} />
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={130} borderRadius={16} />)}
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: actifs.length ? couleurs.succesFond : couleurs.alerteFond,
              }}
            >
              <Ionicons name={actifs.length ? 'shield-checkmark-outline' : 'alert-circle-outline'} size={22} color={actifs.length ? couleurs.succes : couleurs.alerte} />
              <Texte graisse="gras" taille={13} couleur={actifs.length ? couleurs.succes : couleurs.alerte} style={{ flex: 1, lineHeight: 18 }}>
                {actifs.length
                  ? 'Paiement en ligne activé. Les billets sont confirmés automatiquement.'
                  : 'Aucun moyen de paiement actif : vos clients ne peuvent pas payer leurs billets.'}
              </Texte>
            </View>

            {OPERATEURS.map((o) => {
              const m = modes[o.id];
              return (
                <Carte key={o.id} style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                      <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean950}>{o.initiales}</Texte>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Texte graisse="tresGras" taille={15}>{o.nom}</Texte>
                      <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>
                        {m.actif ? (m.numero ? m.numero : 'Numéro à renseigner') : 'Non accepté'}
                      </Texte>
                    </View>
                    <Switch
                      value={m.actif}
                      onValueChange={(v) => maj(o.id, { actif: v })}
                      trackColor={{ true: couleurs.ocean800, false: couleurs.champ }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel={`Accepter ${o.nom}`}
                    />
                  </View>
                  {m.actif && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <ChampSaisie
                          libelle="Numéro"
                          value={m.numero}
                          onChangeText={(t) => maj(o.id, { numero: t.replace(/[^\d\s]/g, '').slice(0, 13) })}
                          keyboardType="phone-pad"
                          placeholder={`${o.prefixes[0]} 00 000 00`}
                          erreur={erreurNumero(o, m.numero)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ChampSaisie libelle="Titulaire" value={m.titulaire} onChangeText={(t) => maj(o.id, { titulaire: t })} placeholder="Nom du compte" autoCapitalize="words" />
                      </View>
                    </View>
                  )}
                </Carte>
              );
            })}
          </ScrollView>
          <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) }}>
            <Bouton titre="Enregistrer" onPress={enregistrer} chargement={envoi} desactive={!modifie} />
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};
