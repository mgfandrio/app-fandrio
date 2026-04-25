import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import authService, { UtilisateurMoi } from '@/app/services/auth/authService';
import { profilService } from '@/app/services/profil/profilService';
import { useUser } from '@/app/hooks/useUser';

export default function CompteScreen() {
  const router = useRouter();
  const { setUser: setContextUser, updateUser: updateContextUser } = useUser();
  const [utilisateur, setUtilisateur] = useState<(UtilisateurMoi & { photo?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Modal édition profil
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNom, setEditNom] = useState('');
  const [editPrenom, setEditPrenom] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Modal mot de passe
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showAncien, setShowAncien] = useState(false);
  const [showNouveau, setShowNouveau] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    chargerProfil();
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

    // Fallback : charger depuis le cache local si l'API est injoignable
    try {
      const cached = await SecureStore.getItemAsync('fandrioUser');
      if (cached) {
        setUtilisateur(JSON.parse(cached));
      }
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
  }, []);

  // --- Photo de profil ---
  const pickAndUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire pour changer votre photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Fichier trop volumineux', 'La photo ne doit pas dépasser 5 Mo.');
        return;
      }

      setPhotoUploading(true);
      const response = await profilService.uploadPhoto(asset.uri);

      if (response.statut) {
        setUtilisateur(prev => prev ? { ...prev, photo: response.data.photo_url } : prev);
        updateContextUser({ photo: response.data.photo_url });
        Alert.alert('Succès', 'Photo de profil mise à jour !');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour la photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert('Supprimer la photo', 'Voulez-vous vraiment supprimer votre photo de profil ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            setPhotoUploading(true);
            const response = await profilService.deletePhoto();
            if (response.statut) {
              setUtilisateur(prev => prev ? { ...prev, photo: null } : prev);
              updateContextUser({ photo: null });
            }
          } catch (e: any) {
            Alert.alert('Erreur', e?.message || 'Impossible de supprimer la photo.');
          } finally {
            setPhotoUploading(false);
          }
        }
      },
    ]);
  };

  // --- Édition profil ---
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
        Alert.alert('Succès', 'Informations mises à jour !');
        setEditModalVisible(false);
      } else {
        Alert.alert('Erreur', response.message || 'Erreur de mise à jour');
      }
    } catch (e: any) {
      const msg = e?.erreurs && Object.keys(e.erreurs).length > 0
        ? Object.values(e.erreurs).flat().join('\n')
        : (e?.message || 'Erreur de mise à jour');
      Alert.alert('Erreur', msg);
    } finally {
      setEditLoading(false);
    }
  };

  // --- Changement mot de passe ---
  const openPwdModal = () => {
    setAncienMdp('');
    setNouveauMdp('');
    setConfirmMdp('');
    setShowAncien(false);
    setShowNouveau(false);
    setShowConfirm(false);
    setPwdModalVisible(true);
  };

  const handleChangerMotDePasse = async () => {
    if (!ancienMdp || !nouveauMdp || !confirmMdp) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }
    if (nouveauMdp.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (nouveauMdp !== confirmMdp) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    try {
      setPwdLoading(true);
      const response = await profilService.changerMotDePasse({
        ancien_mot_de_passe: ancienMdp,
        nouveau_mot_de_passe: nouveauMdp,
        nouveau_mot_de_passe_confirmation: confirmMdp,
      });
      if (response.statut) {
        Alert.alert('Succès', 'Mot de passe modifié avec succès !');
        setPwdModalVisible(false);
      } else {
        Alert.alert('Erreur', response.message || 'Erreur');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Ancien mot de passe incorrect');
    } finally {
      setPwdLoading(false);
    }
  };

  // --- Déconnexion ---
  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive', onPress: async () => {
          setLoadingLogout(true);
          try {
            await authService.deconnexion();
          } catch (e) {
            console.warn('Logout API error', e);
          } finally {
            await SecureStore.deleteItemAsync('fandrioToken');
            await SecureStore.deleteItemAsync('fandrioUser');
            setLoadingLogout(false);
            router.replace('/screens/authentification/loginScreen');
          }
        }
      },
    ]);
  };

  const getRoleLabel = (role: number) => {
    switch (role) {
      case 1: return 'Client';
      case 2: return 'Admin Compagnie';
      case 3: return 'Admin Système';
      default: return 'Utilisateur';
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text className="text-gray-500 mt-3">Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!utilisateur) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={56} color="#ef4444" />
          <Text className="text-gray-900 font-bold text-lg mt-4">Impossible de charger le profil</Text>
          <TouchableOpacity className="bg-blue-600 rounded-xl px-6 py-3 mt-4" onPress={chargerProfil}>
            <Text className="text-white font-semibold">Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e3a8a']} />}
      >
        {/* ====== HERO HEADER ====== */}
        <LinearGradient colors={['#1e3a8a', '#2563eb']} className="pb-8 pt-6 px-5" style={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
          <Text className="text-white text-xl font-bold text-center mb-5">Mon Compte</Text>

          {/* Avatar */}
          <View className="items-center">
            <TouchableOpacity onPress={pickAndUploadPhoto} activeOpacity={0.8}>
              <View className="w-28 h-28 rounded-full bg-white/20 items-center justify-center" style={{ borderWidth: 3, borderColor: '#fff' }}>
                {photoUploading ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : utilisateur.photo ? (
                  <Image source={{ uri: utilisateur.photo }} className="w-full h-full rounded-full" resizeMode="cover" />
                ) : (
                  <Text className="text-white text-4xl font-bold">
                    {utilisateur.prenom[0]}{utilisateur.nom[0]}
                  </Text>
                )}
              </View>
              {/* Badge caméra */}
              <View className="absolute bottom-0 right-0 bg-white rounded-full p-1.5" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 }}>
                <Ionicons name="camera" size={18} color="#1e3a8a" />
              </View>
            </TouchableOpacity>

            <Text className="text-white text-2xl font-bold mt-3">
              {utilisateur.prenom} {utilisateur.nom}
            </Text>
            <View className="bg-white/20 rounded-full px-4 py-1 mt-1.5">
              <Text className="text-white/90 text-sm font-medium">{getRoleLabel(utilisateur.role)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ====== PHOTO ACTIONS (si photo existe) ====== */}
        {utilisateur.photo && (
          <View className="flex-row justify-center mt-3 gap-3 px-5">
            <TouchableOpacity
              className="flex-row items-center bg-blue-50 rounded-lg px-4 py-2"
              onPress={pickAndUploadPhoto}
              disabled={photoUploading}
            >
              <Ionicons name="image-outline" size={16} color="#2563eb" />
              <Text className="text-blue-600 font-medium text-sm ml-1.5">Changer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center bg-red-50 rounded-lg px-4 py-2"
              onPress={handleDeletePhoto}
              disabled={photoUploading}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text className="text-red-500 font-medium text-sm ml-1.5">Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ====== INFORMATIONS PERSONNELLES ====== */}
        <View className="bg-white rounded-2xl mx-4 mt-4 p-5" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="bg-blue-50 rounded-full p-2 mr-2.5">
                <Ionicons name="person" size={20} color="#1e3a8a" />
              </View>
              <Text className="text-gray-900 text-base font-bold">Informations personnelles</Text>
            </View>
            <TouchableOpacity onPress={openEditModal} className="bg-blue-50 rounded-lg px-3 py-1.5">
              <Text className="text-blue-600 font-semibold text-xs">Modifier</Text>
            </TouchableOpacity>
          </View>

          {/* Nom */}
          <InfoRow icon="person-outline" iconColor="#6366f1" iconBg="bg-indigo-50" label="Nom" value={utilisateur.nom} />
          {/* Prénom */}
          <InfoRow icon="text-outline" iconColor="#8b5cf6" iconBg="bg-purple-50" label="Prénom" value={utilisateur.prenom} />
          {/* Email */}
          <InfoRow icon="mail-outline" iconColor="#0ea5e9" iconBg="bg-sky-50" label="Email" value={utilisateur.email} />
          {/* Téléphone */}
          <InfoRow icon="call-outline" iconColor="#10b981" iconBg="bg-emerald-50" label="Téléphone" value={utilisateur.telephone} last />
        </View>

        {/* ====== SÉCURITÉ ====== */}
        <View className="bg-white rounded-2xl mx-4 mt-3 p-5" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
          <View className="flex-row items-center mb-4">
            <View className="bg-amber-50 rounded-full p-2 mr-2.5">
              <Ionicons name="shield-checkmark" size={20} color="#f59e0b" />
            </View>
            <Text className="text-gray-900 text-base font-bold">Sécurité</Text>
          </View>

          <TouchableOpacity className="flex-row items-center py-3" onPress={openPwdModal} activeOpacity={0.7}>
            <View className="bg-orange-50 rounded-lg p-2.5 mr-3">
              <Ionicons name="key-outline" size={20} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-medium">Changer le mot de passe</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Modifier votre mot de passe actuel</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* ====== À PROPOS ====== */}
        <View className="bg-white rounded-2xl mx-4 mt-3 p-5" style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}>
          <View className="flex-row items-center mb-4">
            <View className="bg-gray-100 rounded-full p-2 mr-2.5">
              <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
            </View>
            <Text className="text-gray-900 text-base font-bold">À propos</Text>
          </View>

          <InfoRow icon="apps-outline" iconColor="#6366f1" iconBg="bg-indigo-50" label="Application" value="FANDRIO" />
          <InfoRow icon="code-slash-outline" iconColor="#0ea5e9" iconBg="bg-sky-50" label="Version" value="1.0.0" />
          <InfoRow icon="finger-print" iconColor="#6b7280" iconBg="bg-gray-100" label="ID Utilisateur" value={`#${utilisateur.id}`} last />
        </View>

        {/* ====== DÉCONNEXION ====== */}
        <TouchableOpacity
          className="mx-4 mt-4 mb-8 rounded-2xl overflow-hidden"
          onPress={handleLogout}
          disabled={loadingLogout}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#ef4444', '#dc2626']} className="flex-row items-center justify-center py-4 px-6" style={{ borderRadius: 16 }}>
            {loadingLogout ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={22} color="#fff" />
                <Text className="text-white font-bold text-base ml-2">Déconnexion</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ====== MODAL ÉDITION PROFIL ====== */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl px-5 pt-6 pb-10" style={{ maxHeight: '85%' }}>
              {/* Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-gray-900 text-lg font-bold">Modifier mes informations</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)} className="bg-gray-100 rounded-full p-2">
                  <Ionicons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <EditField label="Nom" value={editNom} onChangeText={setEditNom} icon="person-outline" />
                <EditField label="Prénom" value={editPrenom} onChangeText={setEditPrenom} icon="text-outline" />
                <EditField label="Email" value={editEmail} onChangeText={setEditEmail} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
                <EditField label="Téléphone" value={editTelephone} onChangeText={setEditTelephone} icon="call-outline" keyboardType="phone-pad" />

                <TouchableOpacity
                  className={`rounded-xl py-3.5 mt-4 ${editLoading ? 'bg-blue-400' : 'bg-blue-600'}`}
                  onPress={handleUpdateProfil}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold text-center text-base">Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ====== MODAL MOT DE PASSE ====== */}
      <Modal visible={pwdModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl px-5 pt-6 pb-10" style={{ maxHeight: '85%' }}>
              {/* Header */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-gray-900 text-lg font-bold">Changer le mot de passe</Text>
                <TouchableOpacity onPress={() => setPwdModalVisible(false)} className="bg-gray-100 rounded-full p-2">
                  <Ionicons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <PasswordField
                  label="Ancien mot de passe"
                  value={ancienMdp}
                  onChangeText={setAncienMdp}
                  visible={showAncien}
                  toggleVisible={() => setShowAncien(!showAncien)}
                />
                <PasswordField
                  label="Nouveau mot de passe"
                  value={nouveauMdp}
                  onChangeText={setNouveauMdp}
                  visible={showNouveau}
                  toggleVisible={() => setShowNouveau(!showNouveau)}
                />
                <PasswordField
                  label="Confirmer le mot de passe"
                  value={confirmMdp}
                  onChangeText={setConfirmMdp}
                  visible={showConfirm}
                  toggleVisible={() => setShowConfirm(!showConfirm)}
                />

                {nouveauMdp.length > 0 && nouveauMdp.length < 6 && (
                  <Text className="text-orange-500 text-xs mt-1 ml-1">Minimum 6 caractères</Text>
                )}
                {confirmMdp.length > 0 && nouveauMdp !== confirmMdp && (
                  <Text className="text-red-500 text-xs mt-1 ml-1">Les mots de passe ne correspondent pas</Text>
                )}

                <TouchableOpacity
                  className={`rounded-xl py-3.5 mt-5 ${pwdLoading ? 'bg-amber-400' : 'bg-amber-500'}`}
                  onPress={handleChangerMotDePasse}
                  disabled={pwdLoading}
                >
                  {pwdLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold text-center text-base">Changer le mot de passe</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ====== COMPOSANTS RÉUTILISABLES ======

function InfoRow({ icon, iconColor, iconBg, label, value, last }: {
  icon: any; iconColor: string; iconBg: string; label: string; value: string; last?: boolean;
}) {
  return (
    <View className={`flex-row items-center py-3 ${!last ? 'border-b border-gray-100' : ''}`}>
      <View className={`${iconBg} rounded-lg p-2 mr-3`}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-gray-400 text-xs">{label}</Text>
        <Text className="text-gray-900 font-medium text-sm">{value}</Text>
      </View>
    </View>
  );
}

function EditField({ label, value, onChangeText, icon, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (t: string) => void; icon: any;
  keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View className="mb-4">
      <Text className="text-gray-600 text-sm font-medium mb-1.5 ml-1">{label}</Text>
      <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-3">
        <Ionicons name={icon} size={18} color="#9ca3af" />
        <TextInput
          className="flex-1 py-3 px-2.5 text-gray-900"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

function PasswordField({ label, value, onChangeText, visible, toggleVisible }: {
  label: string; value: string; onChangeText: (t: string) => void;
  visible: boolean; toggleVisible: () => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-gray-600 text-sm font-medium mb-1.5 ml-1">{label}</Text>
      <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-3">
        <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
        <TextInput
          className="flex-1 py-3 px-2.5 text-gray-900"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={toggleVisible} className="p-1">
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
