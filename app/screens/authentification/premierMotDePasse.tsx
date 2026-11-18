import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bouton, ChampSaisie, Texte } from '../../components/ui';
import { profilService } from '../../services/profil/profilService';
import { couleurs } from '../../theme/ocean';

/**
 * Premier mot de passe : la personne s'est connectée avec un mot de passe
 * provisoire (donné par l'admin principal de sa compagnie ou par FANDRIO).
 * Elle choisit son mot de passe personnel avant d'accéder à l'application ;
 * l'API refuse toute autre action en attendant.
 */
export default function PremierMotDePasse() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [prenom, setPrenom] = useState('');
  const [role, setRole] = useState<number | null>(null);
  const [provisoire, setProvisoire] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('fandrioUser')
      .then((json) => {
        const u = json ? JSON.parse(json) : null;
        setPrenom(u?.prenom || '');
        setRole(u?.role != null ? Number(u.role) : null);
      })
      .catch(() => {});
  }, []);

  const erreurNouveau = nouveau.length > 0 && nouveau.length < 6 ? 'Au moins 6 caractères.' : undefined;
  const erreurConfirm = confirmation.length > 0 && confirmation !== nouveau ? 'Les deux mots de passe ne sont pas identiques.' : undefined;
  const incomplet = !provisoire.trim() || nouveau.length < 6 || confirmation !== nouveau;

  const allerAccueil = () => {
    if (role === 1) router.replace('/screens/dashboard/utilisateur/dashboardUser');
    else if (role === 3) router.replace('/screens/dashboard/systeme/dashboardSys');
    else router.replace('/screens/dashboard/compagnies/dashboardCompagnie');
  };

  const enregistrer = async () => {
    if (incomplet) return;
    setChargement(true);
    setErreur('');
    try {
      const r: any = await profilService.changerMotDePasse({
        ancien_mot_de_passe: provisoire.trim().toUpperCase(),
        nouveau_mot_de_passe: nouveau,
        nouveau_mot_de_passe_confirmation: confirmation,
      });
      if (r?.statut === false) {
        setErreur(r?.message || 'Impossible d’enregistrer le mot de passe.');
        return;
      }
      // Mot de passe personnel choisi : on lève l'indicateur dans la session locale
      const json = await SecureStore.getItemAsync('fandrioUser');
      if (json) {
        const u = JSON.parse(json);
        await SecureStore.setItemAsync('fandrioUser', JSON.stringify({ ...u, mdp_provisoire: false }));
      }
      allerAccueil();
    } catch (e: any) {
      setErreur(e?.message || 'Le mot de passe provisoire est incorrect.');
    } finally {
      setChargement(false);
    }
  };

  const seDeconnecter = async () => {
    await SecureStore.deleteItemAsync('fandrioToken');
    await SecureStore.deleteItemAsync('fandrioUser');
    router.replace('/screens/authentification/loginScreen');
  };

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.ocean950 }}>
      <StatusBar barStyle="light-content" backgroundColor={couleurs.ocean950} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
          <View style={{ alignItems: 'center', paddingTop: insets.top + 28, paddingBottom: 48, paddingHorizontal: 24, gap: 10 }}>
            <Image source={require('../../../assets/images/fandrioLogo.png')} style={{ width: 120, height: 66 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="key-outline" size={26} color="#FFFFFF" />
            </View>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: couleurs.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 24,
              paddingTop: 28,
              paddingBottom: insets.bottom + 24,
              gap: 16,
            }}
          >
            <View style={{ gap: 6 }}>
              <Texte variante="titre" taille={24}>Choisissez votre mot de passe</Texte>
              <Texte graisse="moyen" taille={14} couleur={couleurs.gris}>
                {prenom ? `Bonjour ${prenom}, vous` : 'Vous'} vous êtes connecté avec un mot de passe provisoire. Choisissez maintenant votre mot de passe personnel : vous seul le connaîtrez.
              </Texte>
            </View>

            {!!erreur && (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: couleurs.dangerFond, borderRadius: 12, padding: 12 }}>
                <Ionicons name="alert-circle-outline" size={20} color={couleurs.danger} />
                <Texte graisse="gras" taille={13.5} couleur={couleurs.danger} style={{ flex: 1 }}>{erreur}</Texte>
              </View>
            )}

            <ChampSaisie libelle="Mot de passe provisoire" icone="key-outline" placeholder="Ex. : K7M4-Q9TP" value={provisoire} onChangeText={setProvisoire} autoCapitalize="characters" autoCorrect={false} />
            <ChampSaisie libelle="Nouveau mot de passe" icone="lock-closed-outline" value={nouveau} onChangeText={setNouveau} motDePasse autoCapitalize="none" autoComplete="new-password" erreur={erreurNouveau} aide="Au moins 6 caractères." />
            <ChampSaisie libelle="Confirmer le nouveau mot de passe" icone="lock-closed-outline" value={confirmation} onChangeText={setConfirmation} motDePasse autoCapitalize="none" autoComplete="new-password" erreur={erreurConfirm} />

            <Bouton titre="Enregistrer et continuer" onPress={enregistrer} chargement={chargement} desactive={incomplet} />
            <Bouton titre="Se déconnecter" variante="lien" onPress={seDeconnecter} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
