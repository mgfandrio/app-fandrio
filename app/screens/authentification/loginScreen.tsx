import config from '@/app/config/env';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';

export default function LoginScreen() {
  const router = useRouter();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        if (token && userJson) {
          const user = JSON.parse(userJson);
          const role = user?.role ?? null;
          if (role != null) {
            redirectByRole(role);
          }
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

      console.log('Response:', response.data);

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

        const role = utilisateur?.role ?? null;
        if (role != null) {
          redirectByRole(role);
        }
      } catch (e) {
        console.warn('SecureStore write error', e);
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message || 'Erreur de connexion';
        
        console.error('Login error details:', {
          status,
          message: errorMessage,
          data: error.response?.data,
          utilisateur: error.response?.data?.utilisateur
        });
        
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

  return (
    <LinearGradient
      colors={['#1e40af', '#3b82f6', '#93c5fd', '#dbeafe', '#ffffff']}
      locations={[0, 0.15, 0.35, 0.55, 1]}
      style={{ flex: 1 }}
    >
      <DialogComponent />
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="flex-1"
        >
          {/* Logo zone (dans la partie bleue) */}
          <View className="items-center pt-16 pb-6">
            <View style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
              <Image
                source={require("../../../assets/images/fandrioLogo.png")}
                className="w-52 h-52"
                resizeMode="contain"
              />
            </View>
            <Text className="text-white text-3xl font-extrabold tracking-[6px] -mt-1">FANDRIO</Text>
            <Text className="text-blue-100 text-base mt-1 font-medium">
              Réservez votre voyage en quelques clics
            </Text>
          </View>

          {/* Carte formulaire */}
          <View
            className="flex-1 mx-5 mb-6 bg-white rounded-3xl px-7 pt-8 pb-6"
            style={{ shadowColor: '#1e40af', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 12 }}
          >
            <Text className="text-gray-900 text-2xl font-bold mb-1">Connexion</Text>
            <Text className="text-gray-400 text-base mb-7">
              Accédez à votre espace personnel
            </Text>

            {/* Email/Phone Input */}
            <Text className="text-gray-700 font-semibold text-base mb-2 ml-1">
              Email ou téléphone
            </Text>
            <View className="mb-1">
              <View className={`bg-gray-50 border ${errors.identifiant ? 'border-red-400' : 'border-gray-200'} rounded-2xl px-5 py-4 flex-row items-center`}>
                <Ionicons 
                  name="person-outline" 
                  size={22} 
                  color={errors.identifiant ? "#EF4444" : "#9CA3AF"} 
                  style={{ marginRight: 14 }}
                />
                <TextInput
                  className="flex-1 text-gray-900 text-lg"
                  placeholder="Email ou numéro de téléphone"
                  placeholderTextColor="#C4C4C4"
                  value={identifiant}
                  onChangeText={handleIdentifiantChange}
                  autoCapitalize="none"
                  editable={!loading}
                />
                {errors.identifiant && (
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                )}
              </View>
            </View>
            {errors.identifiant ? (
              <Text className="text-red-500 text-sm ml-2 mb-5 mt-1">{errors.identifiant}</Text>
            ) : (
              <View className="mb-5" />
            )}

            {/* Password Input */}
            <Text className="text-gray-700 font-semibold text-base mb-2 ml-1">
              Mot de passe
            </Text>
            <View className="mb-1">
              <View className={`bg-gray-50 border ${errors.motDePasse ? 'border-red-400' : 'border-gray-200'} rounded-2xl px-5 py-4 flex-row items-center`}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={22} 
                  color={errors.motDePasse ? "#EF4444" : "#9CA3AF"} 
                  style={{ marginRight: 14 }}
                />
                <TextInput
                  className="flex-1 text-gray-900 text-lg"
                  placeholder="Votre mot de passe"
                  placeholderTextColor="#C4C4C4"
                  value={motDePasse}
                  onChangeText={handleMotDePasseChange}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="p-1"
                >
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={22} 
                    color={errors.motDePasse ? "#EF4444" : "#9CA3AF"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            {errors.motDePasse ? (
              <Text className="text-red-500 text-sm ml-2 mb-2 mt-1">{errors.motDePasse}</Text>
            ) : (
              <View className="mb-2" />
            )}

            {/* Mot de passe oublié */}
            <TouchableOpacity className="self-end mb-7">
              <Text className="text-blue-600 font-semibold text-base">
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={{ overflow: 'hidden', borderRadius: 16 }}
            >
              <LinearGradient
                colors={loading ? ['#93c5fd', '#60a5fa'] : ['#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, borderRadius: 16, alignItems: 'center' }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-center font-bold text-xl">
                    Se connecter
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="mx-4 text-gray-400 text-sm font-medium">ou</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Social Login */}
            <View className="flex-row justify-center items-center mb-6">
              <TouchableOpacity
                className="w-16 h-16 bg-white rounded-2xl items-center justify-center border border-gray-200"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
              >
                <Image
                  source={require("../../../assets/images/google.png")}
                  className="w-7 h-7"
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <TouchableOpacity
                className="w-16 h-16 bg-white rounded-2xl items-center justify-center border border-gray-200 mx-5"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
              >
                <Image
                  source={require("../../../assets/images/facebook.png")}
                  className="w-7 h-7"
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <TouchableOpacity
                className="w-16 h-16 bg-white rounded-2xl items-center justify-center border border-gray-200"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
              >
                <Image
                  source={require("../../../assets/images/apple.png")}
                  className="w-7 h-7"
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="items-center mb-2">
              <View className="flex-row items-center">
                <Text className="text-gray-500 text-base">
                  Pas encore de compte ?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/screens/authentification/registerScreen')}>
                  <Text className="text-blue-700 font-bold text-base">
                    Créer un compte
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}