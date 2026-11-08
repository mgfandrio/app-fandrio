import config from '@/app/config/env';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import PostLoginSplash from '../../components/PostLoginSplash';
import { Bouton, CaseACocher, ChampSaisie, Texte } from '../../components/ui';
import { couleurs } from '../../theme/ocean';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const champMotDePasse = useRef<TextInput>(null);
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPostLoginSplash, setShowPostLoginSplash] = useState(false);
  const [pendingRole, setPendingRole] = useState<number | null>(null);
  const [loggedUserName, setLoggedUserName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({
    identifiant: '',
    motDePasse: '',
  });

  const redirectByRole = (role: number | string) => {
    const r = Number(role);
    if (r === 1) {
      router.replace('../dashboard/utilisateur/dashboardUser');
    } else if (r === 2) {
      router.replace('../dashboard/dashboardAdmin');
    } else if (r === 3) {
      router.replace('../dashboard/systeme/dashboardSys');
    } else {
      router.replace('../dashboard/compagnies/dashboardCompagnie');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('fandrioToken');
        const userJson = await SecureStore.getItemAsync('fandrioUser');
        const remember = await SecureStore.getItemAsync('fandrioRememberMe');
        // Auto-login uniquement si l'utilisateur a coché "Se souvenir de moi"
        // (compat rétro : si la clé n'existe pas mais le token oui, on considère actif)
        const shouldAutoLogin = remember === null ? true : remember === 'true';
        if (token && userJson && shouldAutoLogin) {
          const user = JSON.parse(userJson);
          const role = user?.role ?? null;
          if (role != null) {
            setLoggedUserName(user?.prenom || '');
            setPendingRole(Number(role));
            setShowPostLoginSplash(true);
          }
        } else if (token && userJson && !shouldAutoLogin) {
          // L'utilisateur n'avait pas coché "Se souvenir de moi" → nettoyer
          await SecureStore.deleteItemAsync('fandrioToken');
          await SecureStore.deleteItemAsync('fandrioUser');
        }
      } catch (e) {
        console.warn('SecureStore read error', e);
      }
    })();
  }, []);

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      identifiant: '',
      motDePasse: '',
    };

    // Validation identifiant
    if (!identifiant.trim()) {
      newErrors.identifiant = "L'email ou le numéro de téléphone est requis";
      valid = false;
    } else if (identifiant.trim().length < 3) {
      newErrors.identifiant = "L'identifiant doit contenir au moins 3 caractères";
      valid = false;
    }

    // Validation mot de passe
    if (!motDePasse) {
      newErrors.motDePasse = 'Le mot de passe est requis';
      valid = false;
    } else if (motDePasse.length < 6) {
      newErrors.motDePasse = 'Le mot de passe doit contenir au moins 6 caractères';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    // Réinitialiser les erreurs
    setErrors({ identifiant: '', motDePasse: '' });

    // Valider le formulaire
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${config.API_URL}/api/connexion`,
        {
          identifiant: identifiant,
          motDePasse: motDePasse,
        },
        {
          headers: {
            'X-API-KEY': config.X_API_KEY,
          },
        }
      );

      try {
        const token = response.data?.token;
        const utilisateur = response.data?.utilisateur;

        // Vérifie si l'utilisateur avec le rôle 2 (ADMIN_COMPAGNIE) a un compagnie_id
        if (utilisateur?.role === 2 && !utilisateur?.compagnie_id) {
          showDialog({
            title: 'Erreur de configuration',
            message: 'Votre compte administrateur de compagnie n\'est pas associé à une compagnie. Veuillez contacter le support.',
            type: 'danger',
            confirmText: 'OK',
            onConfirm: () => {},
            onCancel: () => {}
          });
          setLoading(false);
          return;
        }

        if (token) {
          await SecureStore.setItemAsync('fandrioToken', token);
        }
        if (utilisateur) {
          await SecureStore.setItemAsync('fandrioUser', JSON.stringify(utilisateur));
        }
        // Mémorise la préférence "Se souvenir de moi"
        await SecureStore.setItemAsync('fandrioRememberMe', rememberMe ? 'true' : 'false');

        const role = utilisateur?.role ?? null;
        if (role != null) {
          setLoggedUserName(utilisateur?.prenom || '');
          setPendingRole(Number(role));
          setShowPostLoginSplash(true);
        }
      } catch (e) {
        console.warn('SecureStore write error', e);
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message || 'Erreur de connexion';

        // Vérifier si c'est une erreur 401 avec un message spécifique
        if (status === 401) {
          const specificMessage = error.response?.data?.message || 'Identifiants incorrects ou compte non autorisé';
          showDialog({
            title: 'Erreur d\'authentification',
            message: specificMessage,
            type: 'danger',
            confirmText: 'OK',
            onConfirm: () => {},
            onCancel: () => {}
          });
        } else {
          // Afficher l'erreur dans le champ approprié
          if (errorMessage.toLowerCase().includes('identifiant')) {
            setErrors(prev => ({ ...prev, identifiant: errorMessage }));
          } else if (errorMessage.toLowerCase().includes('mot de passe')) {
            setErrors(prev => ({ ...prev, motDePasse: errorMessage }));
          } else {
            showDialog({
              title: 'Erreur',
              message: errorMessage,
              type: 'danger',
              confirmText: 'OK',
              onConfirm: () => {},
              onCancel: () => {}
            });
          }
        }
      } else {
        showDialog({
          title: 'Erreur',
          message: 'Une erreur est survenue',
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => {},
          onCancel: () => {}
        });
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIdentifiantChange = (text: string) => {
    setIdentifiant(text);
    // Effacer l'erreur quand l'utilisateur commence à taper
    if (errors.identifiant) {
      setErrors(prev => ({ ...prev, identifiant: '' }));
    }
  };

  const handleMotDePasseChange = (text: string) => {
    setMotDePasse(text);
    // Effacer l'erreur quand l'utilisateur commence à taper
    if (errors.motDePasse) {
      setErrors(prev => ({ ...prev, motDePasse: '' }));
    }
  };

  if (showPostLoginSplash && pendingRole != null) {
    return (
      <PostLoginSplash
        userName={loggedUserName}
        onFinish={() => {
          setShowPostLoginSplash(false);
          redirectByRole(pendingRole);
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.ocean950 }}>
      <DialogComponent />
      <StatusBar barStyle="light-content" backgroundColor={couleurs.ocean950} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* En-tête marine : logo et nom */}
          <View style={{ alignItems: 'center', paddingTop: insets.top + 28, paddingBottom: 56, paddingHorizontal: 24, gap: 6 }}>
            <Image
              source={require('../../../assets/images/fandrioLogo.png')}
              style={{ width: 170, height: 92 }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Texte graisse="tresGras" taille={24} couleur="#FFFFFF" style={{ letterSpacing: 7 }}>
              FANDRIO
            </Texte>
            <Texte graisse="moyen" taille={14} couleur={couleurs.texteSurMarine} centre>
              Vos taxis-brousse, réservés en quelques clics
            </Texte>
          </View>

          {/* Feuille blanche : formulaire */}
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
            <View style={{ gap: 4 }}>
              <Texte variante="titre" taille={24}>Connexion</Texte>
              <Texte graisse="moyen" taille={14} couleur={couleurs.gris}>Content de vous revoir.</Texte>
            </View>

            <ChampSaisie
              libelle="Email ou téléphone"
              icone="person-outline"
              placeholder="Email ou numéro de téléphone"
              value={identifiant}
              onChangeText={handleIdentifiantChange}
              autoCapitalize="none"
              autoComplete="username"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => champMotDePasse.current?.focus()}
              editable={!loading}
              erreur={errors.identifiant}
            />

            <ChampSaisie
              ref={champMotDePasse}
              libelle="Mot de passe"
              icone="lock-closed-outline"
              placeholder="Votre mot de passe"
              value={motDePasse}
              onChangeText={handleMotDePasseChange}
              motDePasse
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              editable={!loading}
              erreur={errors.motDePasse}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <CaseACocher coche={rememberMe} onChange={setRememberMe} libelle="Se souvenir de moi" desactive={loading} />
              {/* TODO : brancher la récupération de mot de passe (aucun écran pour l'instant) */}
              <Pressable disabled={loading} hitSlop={8} accessibilityRole="button">
                <Texte graisse="gras" taille={13.5} couleur={couleurs.ocean800}>Mot de passe oublié ?</Texte>
              </Pressable>
            </View>

            <Bouton titre="Se connecter" onPress={handleLogin} chargement={loading} />

            {/* Connexion par compte externe : pas encore développée (ni dans l'app ni dans l'API).
                Boutons affichés désactivés avec la mention « Bientôt disponible ». */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: couleurs.ligne }} />
              <Texte graisse="moyen" taille={12.5} couleur={couleurs.grisClair}>ou continuer avec</Texte>
              <View style={{ flex: 1, height: 1, backgroundColor: couleurs.ligne }} />
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { nom: 'Google', image: require('../../../assets/images/google.png') },
                  { nom: 'Facebook', image: require('../../../assets/images/facebook.png') },
                ].map((fournisseur) => (
                  <View
                    key={fournisseur.nom}
                    accessible
                    accessibilityRole="button"
                    accessibilityState={{ disabled: true }}
                    accessibilityLabel={`Continuer avec ${fournisseur.nom}, bientôt disponible`}
                    style={{
                      flex: 1,
                      height: 50,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: couleurs.champ,
                      backgroundColor: couleurs.fond,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: 0.6,
                    }}
                  >
                    <Image source={fournisseur.image} style={{ width: 20, height: 20 }} resizeMode="contain" />
                    <Texte graisse="gras" taille={14} couleur={couleurs.encreDouce}>{fournisseur.nom}</Texte>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={14} color={couleurs.gris} />
                <Texte variante="legende">Bientôt disponible</Texte>
              </View>
            </View>

            <View style={{ flex: 1, minHeight: 16 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <Texte graisse="moyen" taille={14} couleur={couleurs.gris}>Pas encore de compte ? </Texte>
              <Pressable
                onPress={() => router.push('/screens/authentification/registerScreen')}
                accessibilityRole="link"
                hitSlop={8}
              >
                <Texte graisse="tresGras" taille={14} couleur={couleurs.ocean800}>Créer un compte</Texte>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
