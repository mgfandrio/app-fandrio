import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { Skeleton } from '../../components/common/Skeleton';
import { FeuilleMotDePasse } from '../../components/profil/FeuillesProfil';
import { Bouton, BoutonIcone, ChampSaisie, FeuilleModale, Texte } from '../../components/ui';
import authService from '../../services/auth/authService';
import { profilService } from '../../services/profil/profilService';
import { couleurs } from '../../theme/ocean';

/** Profil d'un administrateur (compagnie ou système) : photo, identité, téléphone, mot de passe. */
export default function MonProfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [utilisateur, setUtilisateur] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);
  const [photoChargement, setPhotoChargement] = useState(false);
  const [feuillePhoto, setFeuillePhoto] = useState(false);
  const [mdpVisible, setMdpVisible] = useState(false);

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  const appliquer = (u: any) => {
    setUtilisateur(u);
    setPrenom(u?.prenom || '');
    setNom(u?.nom || '');
    setTelephone(u?.telephone || '');
  };

  /** Enregistre l'utilisateur dans le cache local en gardant les champs absents de la réponse (compagnie...). */
  const memoriser = async (u: any) => {
    try {
      const ancien = JSON.parse((await SecureStore.getItemAsync('fandrioUser')) || '{}');
      await SecureStore.setItemAsync('fandrioUser', JSON.stringify({ ...ancien, ...u }));
    } catch (e) {
      console.warn('SecureStore write error', e);
    }
  };

  useEffect(() => {
    chargerProfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chargerProfil = async () => {
    setLoading(true);
    try {
      const response = await authService.getMoi();
      if (response.statut && response.data) {
        appliquer(response.data);
        await memoriser(response.data);
        return;
      }
    } catch (e) {
      console.warn('Erreur chargement profil', e);
    } finally {
      setLoading(false);
    }
    // Repli sur le cache local si l'API est injoignable
    try {
      const cache = await SecureStore.getItemAsync('fandrioUser');
      if (cache) appliquer(JSON.parse(cache));
    } catch {}
  };

  const modifie = !!utilisateur && (prenom !== (utilisateur.prenom || '') || nom !== (utilisateur.nom || '') || telephone !== (utilisateur.telephone || ''));

  const enregistrer = async () => {
    if (!utilisateur || !modifie) return;
    const data: Record<string, string> = {};
    if (prenom !== utilisateur.prenom) data.prenom = prenom.trim();
    if (nom !== utilisateur.nom) data.nom = nom.trim();
    if (telephone !== utilisateur.telephone) data.telephone = telephone.trim();
    try {
      setEnregistrement(true);
      const response = await profilService.updateProfil(data);
      if (response.statut && response.utilisateur) {
        const u = { ...utilisateur, ...response.utilisateur };
        appliquer(u);
        await memoriser(u);
        message('Profil enregistré', 'Vos informations ont été mises à jour.', 'success');
      } else {
        message('Modification impossible', response.message || 'Erreur de mise à jour.');
      }
    } catch (e: any) {
      const msg = e?.erreurs && Object.keys(e.erreurs).length > 0 ? Object.values(e.erreurs).flat().join('\n') : e?.message || 'Erreur de mise à jour.';
      message('Modification impossible', msg);
    } finally {
      setEnregistrement(false);
    }
  };

  const choisirPhoto = async () => {
    setFeuillePhoto(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        message('Autorisation requise', "Autorisez l'accès à vos photos pour changer votre photo.", 'warning');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const image = result.assets[0];
      if (image.fileSize && image.fileSize > 5 * 1024 * 1024) {
        message('Photo trop lourde', 'La photo ne doit pas dépasser 5 Mo.', 'warning');
        return;
      }
      setPhotoChargement(true);
      const response = await profilService.uploadPhoto(image.uri);
      if (response.statut) {
        const u = { ...utilisateur, photo: response.data.photo_url };
        setUtilisateur(u);
        await memoriser({ photo: response.data.photo_url });
      } else {
        message('Photo non modifiée', response.message || 'Échec de la mise à jour.');
      }
    } catch (e: any) {
      message('Photo non modifiée', e?.message || "Erreur lors de l'envoi.");
    } finally {
      setPhotoChargement(false);
    }
  };

  const supprimerPhoto = () => {
    setFeuillePhoto(false);
    showDialog({
      title: 'Supprimer la photo ?',
      message: 'Vos initiales seront affichées à la place.',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          setPhotoChargement(true);
          const response = await profilService.deletePhoto();
          if (response.statut) {
            setUtilisateur((u: any) => ({ ...u, photo: null }));
            await memoriser({ photo: null });
          }
        } catch {
          message('Photo non supprimée', 'Erreur lors de la suppression.');
        } finally {
          setPhotoChargement(false);
        }
      },
      onCancel: () => {},
    });
  };

  const role =
    utilisateur?.role === 2
      ? `Admin compagnie${utilisateur?.compagnie?.nom ? ` · ${utilisateur.compagnie.nom}` : ''}`
      : utilisateur?.role === 3
        ? 'Admin système'
        : 'Client';
  const initiales = `${utilisateur?.prenom?.[0] || ''}${utilisateur?.nom?.[0] || ''}`.toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <StatusBar barStyle="light-content" backgroundColor={couleurs.ocean950} />
      <DialogComponent />

      {/* En-tête marine */}
      <View style={{ backgroundColor: couleurs.ocean950, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BoutonIcone icone="chevron-back" libelle="Retour" variante="marine" onPress={() => router.back()} />
        <Texte graisse="tresGras" taille={17} couleur="#FFFFFF" style={{ flex: 1 }}>Mon profil</Texte>
      </View>

      {loading ? (
        <View style={{ marginTop: -40, paddingHorizontal: 16, gap: 14, alignItems: 'center' }}>
          <Skeleton width={84} height={84} borderRadius={42} />
          <Skeleton width={180} height={20} borderRadius={8} />
          <Skeleton height={50} borderRadius={14} />
          <Skeleton height={50} borderRadius={14} />
          <Skeleton height={50} borderRadius={14} />
        </View>
      ) : !utilisateur ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
          <Ionicons name="alert-circle-outline" size={48} color={couleurs.danger} />
          <Texte graisse="tresGras" taille={16} centre>Impossible de charger votre profil</Texte>
          <Bouton titre="Réessayer" variante="secondaire" compact icone="refresh" onPress={chargerProfil} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ marginTop: -40 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Photo et identité */}
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={() => (utilisateur.photo ? setFeuillePhoto(true) : choisirPhoto())}
                disabled={photoChargement}
                accessibilityRole="button"
                accessibilityLabel="Changer la photo"
              >
                <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: couleurs.fond, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {photoChargement ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : utilisateur.photo ? (
                    <Image source={{ uri: utilisateur.photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Texte graisse="tresGras" taille={28} couleur="#FFFFFF">{initiales}</Texte>
                  )}
                </View>
                <View style={{ position: 'absolute', right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: couleurs.fond, backgroundColor: couleurs.ocean950, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </Pressable>
              <Texte graisse="tresGras" taille={18} centre>{utilisateur.prenom} {utilisateur.nom}</Texte>
              <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: couleurs.ocean950, justifyContent: 'center' }}>
                <Texte graisse="gras" taille={11.5} couleur="#FFFFFF" numberOfLines={1}>{role}</Texte>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <ChampSaisie libelle="Prénom" value={prenom} onChangeText={setPrenom} autoCapitalize="words" autoComplete="given-name" />
              </View>
              <View style={{ flex: 1 }}>
                <ChampSaisie libelle="Nom" value={nom} onChangeText={setNom} autoCapitalize="words" autoComplete="family-name" />
              </View>
            </View>
            <ChampSaisie libelle="Téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" autoComplete="tel" />
            <ChampSaisie
              libelle="Email"
              value={utilisateur.email || ''}
              editable={false}
              icone="lock-closed-outline"
              aide="Pour changer d'email, contactez FANDRIO."
              style={{ color: couleurs.gris }}
            />

            <Pressable
              onPress={() => setMdpVisible(true)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.ligne }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed-outline" size={19} color={couleurs.ocean800} />
              </View>
              <View style={{ flex: 1 }}>
                <Texte graisse="tresGras" taille={14}>Changer le mot de passe</Texte>
                <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Ancien et nouveau mot de passe</Texte>
              </View>
              <Ionicons name="chevron-forward" size={18} color={couleurs.grisClair} />
            </Pressable>
          </ScrollView>

          {/* Pied fixe */}
          <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
            <Bouton titre="Enregistrer" onPress={enregistrer} chargement={enregistrement} desactive={!modifie} />
          </View>
        </KeyboardAvoidingView>
      )}

      <FeuilleModale visible={feuillePhoto} onClose={() => setFeuillePhoto(false)} titre="Photo de profil">
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 10 }}>
          <Bouton titre="Choisir une autre photo" icone="image-outline" onPress={choisirPhoto} />
          <Bouton titre="Supprimer la photo" variante="danger" icone="trash-outline" onPress={supprimerPhoto} />
        </View>
      </FeuilleModale>
      <FeuilleMotDePasse visible={mdpVisible} onClose={() => setMdpVisible(false)} message={message} />
    </View>
  );
}
