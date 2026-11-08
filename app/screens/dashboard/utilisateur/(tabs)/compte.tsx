import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, ScrollView, RefreshControl, Image, Pressable, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import authService, { UtilisateurMoi } from '@/app/services/auth/authService';
import { profilService } from '@/app/services/profil/profilService';
import { clearPendingReservation } from '@/app/services/reservations/pendingReservation';
import { useUser } from '@/app/hooks/useUser';
import { Skeleton } from '@/app/components/common/Skeleton';
import { useConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { Bouton, Carte, ChampSaisie, FeuilleModale, Texte } from '@/app/components/ui';
import { couleurs } from '@/app/theme/ocean';

type NomIcone = keyof typeof Ionicons.glyphMap;

const ROLES: Record<number, string> = { 1: 'Client', 2: 'Admin compagnie', 3: 'Admin système' };

/** Ligne de menu cliquable (icône, titre, sous-titre, chevron). */
function LigneMenu({ icone, titre, sousTitre, onPress, premiere }: { icone: NomIcone; titre: string; sousTitre?: string; onPress?: () => void; premiere?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icone} size={19} color={couleurs.ocean800} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texte graisse="tresGras" taille={14}>{titre}</Texte>
        {!!sousTitre && <Texte variante="legende" numberOfLines={1}>{sousTitre}</Texte>}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={couleurs.grisClair} />}
    </Pressable>
  );
}

export default function CompteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const { setUser: setContextUser, updateUser: updateContextUser } = useUser();
  const [utilisateur, setUtilisateur] = useState<(UtilisateurMoi & { photo?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Modification des informations
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNom, setEditNom] = useState('');
  const [editPrenom, setEditPrenom] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Mot de passe
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  useEffect(() => {
    chargerProfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chargerProfil = async () => {
    try {
      setLoading(true);
      const response = await authService.getMoi();
      if (response.statut && response.data) {
        setUtilisateur(response.data as any);
        setContextUser(response.data as any);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error('Erreur chargement profil:', e);
    }
    // Repli sur le cache local si l'API est injoignable
    try {
      const cached = await SecureStore.getItemAsync('fandrioUser');
      if (cached) setUtilisateur(JSON.parse(cached));
    } catch (e) {
      console.error('Erreur lecture cache profil:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await chargerProfil();
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Photo de profil ──
  const pickAndUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        message('Autorisation requise', "Autorisez l'accès à vos photos pour changer votre photo de profil.", 'warning');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        message('Photo trop lourde', 'La photo ne doit pas dépasser 5 Mo.', 'warning');
        return;
      }
      setPhotoUploading(true);
      const response = await profilService.uploadPhoto(asset.uri);
      if (response.statut) {
        setUtilisateur((prev) => (prev ? { ...prev, photo: response.data.photo_url } : prev));
        updateContextUser({ photo: response.data.photo_url });
      }
    } catch (e: any) {
      message('Photo non modifiée', e?.message || 'Impossible de mettre à jour la photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeletePhoto = () => {
    showDialog({
      title: 'Supprimer la photo ?',
      message: 'Vos initiales seront affichées à la place.',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          setPhotoUploading(true);
          const response = await profilService.deletePhoto();
          if (response.statut) {
            setUtilisateur((prev) => (prev ? { ...prev, photo: null } : prev));
            updateContextUser({ photo: null });
          }
        } catch (e: any) {
          message('Photo non supprimée', e?.message || 'Impossible de supprimer la photo.');
        } finally {
          setPhotoUploading(false);
        }
      },
      onCancel: () => {},
    });
  };

  // ── Modification des informations ──
  const openEditModal = () => {
    if (!utilisateur) return;
    setEditNom(utilisateur.nom);
    setEditPrenom(utilisateur.prenom);
    setEditEmail(utilisateur.email);
    setEditTelephone(utilisateur.telephone);
    setEditModalVisible(true);
  };

  const handleUpdateProfil = async () => {
    if (!utilisateur) return;
    try {
      setEditLoading(true);
      const data: any = {};
      if (editNom !== utilisateur.nom) data.nom = editNom;
      if (editPrenom !== utilisateur.prenom) data.prenom = editPrenom;
      if (editEmail !== utilisateur.email) data.email = editEmail;
      if (editTelephone !== utilisateur.telephone) data.telephone = editTelephone;

      if (Object.keys(data).length === 0) {
        setEditModalVisible(false);
        return;
      }
      const response = await profilService.updateProfil(data);
      if (response.statut && response.utilisateur) {
        setUtilisateur(response.utilisateur);
        setContextUser(response.utilisateur as any);
        setEditModalVisible(false);
        message('Informations enregistrées', 'Vos informations ont été mises à jour.', 'success');
      } else {
        message('Modification impossible', response.message || 'Erreur de mise à jour.');
      }
    } catch (e: any) {
      const msg = e?.erreurs && Object.keys(e.erreurs).length > 0
        ? Object.values(e.erreurs).flat().join('\n')
        : (e?.message || 'Erreur de mise à jour.');
      message('Modification impossible', msg);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Mot de passe ──
  const openPwdModal = () => {
    setAncienMdp('');
    setNouveauMdp('');
    setConfirmMdp('');
    setPwdModalVisible(true);
  };

  const erreurNouveau = nouveauMdp.length > 0 && nouveauMdp.length < 6 ? 'Au moins 6 caractères.' : undefined;
  const erreurConfirm = confirmMdp.length > 0 && nouveauMdp !== confirmMdp ? 'Les deux mots de passe ne correspondent pas.' : undefined;

  const handleChangerMotDePasse = async () => {
    if (!ancienMdp || !nouveauMdp || !confirmMdp || erreurNouveau || erreurConfirm) return;
    try {
      setPwdLoading(true);
      const response = await profilService.changerMotDePasse({
        ancien_mot_de_passe: ancienMdp,
        nouveau_mot_de_passe: nouveauMdp,
        nouveau_mot_de_passe_confirmation: confirmMdp,
      });
      if (response.statut) {
        setPwdModalVisible(false);
        message('Mot de passe modifié', 'Utilisez-le lors de votre prochaine connexion.', 'success');
      } else {
        message('Modification impossible', response.message || 'Erreur.');
      }
    } catch (e: any) {
      message('Modification impossible', e?.message || 'Ancien mot de passe incorrect.');
    } finally {
      setPwdLoading(false);
    }
  };

  // ── Déconnexion ──
  const handleLogout = () => {
    showDialog({
      title: 'Se déconnecter ?',
      message: 'Vous devrez saisir à nouveau vos identifiants.',
      type: 'danger',
      confirmText: 'Se déconnecter',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setLoadingLogout(true);
        try {
          await authService.deconnexion();
        } catch (e) {
          console.warn('Logout API error', e);
        } finally {
          await SecureStore.deleteItemAsync('fandrioToken');
          await SecureStore.deleteItemAsync('fandrioUser');
          // Une réservation en cours appartient au compte qui se déconnecte
          await clearPendingReservation();
          setLoadingLogout(false);
          router.replace('/screens/authentification/loginScreen');
        }
      },
      onCancel: () => {},
    });
  };

  const initiales = utilisateur ? `${utilisateur.prenom?.[0] || ''}${utilisateur.nom?.[0] || ''}`.toUpperCase() : '';

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.fond} />
      <DialogComponent />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
      >
        <Texte variante="titre">Mon compte</Texte>

        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={100} borderRadius={16} />
            <Skeleton height={190} borderRadius={16} />
            <Skeleton height={130} borderRadius={16} />
          </View>
        ) : !utilisateur ? (
          <Carte style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
            <Ionicons name="alert-circle-outline" size={40} color={couleurs.danger} />
            <Texte graisse="tresGras" taille={15}>Impossible de charger votre profil</Texte>
            <Bouton titre="Réessayer" variante="secondaire" compact icone="refresh" onPress={chargerProfil} />
          </Carte>
        ) : (
          <>
            {/* Profil */}
            <Carte style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Pressable onPress={pickAndUploadPhoto} disabled={photoUploading} accessibilityRole="button" accessibilityLabel="Changer la photo de profil">
                <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: couleurs.ocean950, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {photoUploading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : utilisateur.photo ? (
                    <Image source={{ uri: utilisateur.photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Texte graisse="tresGras" taille={22} couleur="#FFFFFF">{initiales}</Texte>
                  )}
                </View>
                <View style={{ position: 'absolute', right: -3, bottom: -3, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: couleurs.surface, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                </View>
              </Pressable>
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <Texte graisse="tresGras" taille={17} numberOfLines={1}>{utilisateur.prenom} {utilisateur.nom}</Texte>
                <Texte variante="legende" taille={12.5} numberOfLines={1}>{utilisateur.email}</Texte>
                <Texte variante="legende" taille={12.5} numberOfLines={1}>{utilisateur.telephone}</Texte>
                {utilisateur.photo && (
                  <Pressable onPress={handleDeletePhoto} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                    <Texte graisse="gras" taille={12.5} couleur={couleurs.danger}>Supprimer la photo</Texte>
                  </Pressable>
                )}
              </View>
            </Carte>

            {utilisateur.role !== 1 && (
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, height: 24, borderRadius: 12, backgroundColor: couleurs.ocean950, justifyContent: 'center' }}>
                <Texte graisse="gras" taille={11.5} couleur="#FFFFFF">{ROLES[utilisateur.role] || 'Utilisateur'}</Texte>
              </View>
            )}

            <Texte variante="etiquette" style={{ marginLeft: 4 }}>Compte</Texte>
            <Carte padding={0}>
              <LigneMenu premiere icone="person-outline" titre="Informations personnelles" sousTitre="Nom, prénom, email, téléphone" onPress={openEditModal} />
              <LigneMenu icone="lock-closed-outline" titre="Mot de passe" sousTitre="Modifier votre mot de passe" onPress={openPwdModal} />
            </Carte>

            <Texte variante="etiquette" style={{ marginLeft: 4 }}>Mes voyages</Texte>
            <Carte padding={0}>
              <LigneMenu premiere icone="receipt-outline" titre="Factures" onPress={() => router.push('/screens/dashboard/utilisateur/reservations/clientFactures')} />
              <LigneMenu icone="refresh-outline" titre="Remboursements" onPress={() => router.push('/screens/dashboard/utilisateur/reservations/clientRemboursements')} />
              <LigneMenu icone="notifications-outline" titre="Notifications" onPress={() => router.push('/screens/notifications/notificationsScreen')} />
            </Carte>

            <Texte variante="etiquette" style={{ marginLeft: 4 }}>À propos</Texte>
            <Carte padding={0}>
              <LigneMenu premiere icone="information-circle-outline" titre="FANDRIO" sousTitre="Version 1.0.0" />
            </Carte>

            <Bouton titre="Se déconnecter" variante="danger" icone="log-out-outline" onPress={handleLogout} chargement={loadingLogout} />
          </>
        )}
      </ScrollView>

      {/* Modifier mes informations */}
      <FeuilleModale
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        titre="Informations personnelles"
        pied={<Bouton titre="Enregistrer" onPress={handleUpdateProfil} chargement={editLoading} />}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <ChampSaisie libelle="Prénom" value={editPrenom} onChangeText={setEditPrenom} autoCapitalize="words" autoComplete="given-name" />
            </View>
            <View style={{ flex: 1 }}>
              <ChampSaisie libelle="Nom" value={editNom} onChangeText={setEditNom} autoCapitalize="words" autoComplete="family-name" />
            </View>
          </View>
          <ChampSaisie libelle="Email" icone="mail-outline" value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <ChampSaisie libelle="Téléphone" icone="call-outline" value={editTelephone} onChangeText={setEditTelephone} keyboardType="phone-pad" autoComplete="tel" />
        </ScrollView>
      </FeuilleModale>

      {/* Mot de passe */}
      <FeuilleModale
        visible={pwdModalVisible}
        onClose={() => setPwdModalVisible(false)}
        titre="Changer le mot de passe"
        pied={
          <Bouton
            titre="Changer le mot de passe"
            onPress={handleChangerMotDePasse}
            chargement={pwdLoading}
            desactive={!ancienMdp || !nouveauMdp || !confirmMdp || !!erreurNouveau || !!erreurConfirm}
          />
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}>
          <ChampSaisie libelle="Mot de passe actuel" icone="lock-closed-outline" value={ancienMdp} onChangeText={setAncienMdp} motDePasse autoCapitalize="none" autoComplete="password" />
          <ChampSaisie libelle="Nouveau mot de passe" icone="lock-closed-outline" value={nouveauMdp} onChangeText={setNouveauMdp} motDePasse autoCapitalize="none" autoComplete="new-password" erreur={erreurNouveau} aide="Au moins 6 caractères." />
          <ChampSaisie libelle="Confirmer le nouveau mot de passe" icone="lock-closed-outline" value={confirmMdp} onChangeText={setConfirmMdp} motDePasse autoCapitalize="none" autoComplete="new-password" erreur={erreurConfirm} />
        </ScrollView>
      </FeuilleModale>
    </View>
  );
}
