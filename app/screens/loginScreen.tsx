import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
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
import { useConfirmDialog } from '../components/common/ConfirmDialog';

const API_URL = 'http://10.175.222.84:8000';

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
      router.replace('./dashboardUser');
    } else if (r === 2) {
      router.replace('./dashboardAdmin');
    } else if (r === 3) {
      router.replace('./dashboardSys');
    } else {
      router.replace('./dashboardUser');
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
        `${API_URL}/api/connexion`,
        {
          identifiant: identifiant,
          motDePasse: motDePasse,
        },
        {
          headers: {
            'X-API-KEY': 'fandrio_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
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
    <View className="flex-1 bg-white">
      <DialogComponent />
      <StatusBar barStyle="light-content" />

      {/* Header avec fond bleu dégradé */}
      <View className="bg-blue-900 pt-12 pb-8 px-6 rounded-b-3xl">
        {/* Logo Badge */}
        <View className="items-center mb-4">
          <View className="bg-white/20 rounded-full px-6 py-2 flex-row items-center">
            <View className="w-6 h-6 bg-white rounded-full mr-2" />
            <Text className="text-yellow-400 font-bold text-lg">FANDRIO</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="flex-1"
        >
          <View className="flex-1 px-6 pt-8">
            {/* Titre */}
            <View className="mb-2">
              <Text className="text-2xl font-bold text-gray-900 text-center">
                Connectez-vous à votre compte
              </Text>
            </View>

            {/* Sous-titre */}
            <Text className="text-gray-500 text-center text-xl mb-6 px-4">
              Réservez facilement le véhicule qu'il vous faut — rapide, pratique et adapté à vos besoins.
            </Text>

            {/* Social Login Section */}
            <View className="mb-6">
              <Text className="text-center text-gray-900 font-medium text-xl mb-4">
                Se connecter avec
              </Text>

              <View className="flex-row justify-center items-center mb-6">
                {/* Google */}
                <TouchableOpacity className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center">
                  <Image
                    source={require("../../assets/images/google.png")}
                    className="w-6 h-6"
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {/* Facebook */}
                <TouchableOpacity className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center mx-6">
                  <Image
                    source={require("../../assets/images/facebook.png")}
                    className="w-6 h-6"
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {/* Apple */}
                <TouchableOpacity className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center">
                  <Image
                    source={require("../../assets/images/apple.png")}
                    className="w-6 h-6"
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View className="flex-row items-center mb-6">
                <View className="flex-1 h-px bg-gray-300" />
                <Text className="mx-4 text-gray-500 text-sm">Ou</Text>
                <View className="flex-1 h-px bg-gray-300" />
              </View>
            </View>

            {/* Form */}
            <View className="mb-6">
              {/* Email/Phone Label */}
              <Text className="text-gray-900 font-medium text-xl mb-2">
                Email ou numéro de téléphone
              </Text>

              {/* Email/Phone Input */}
              <View className="mb-1">
                <View className={`bg-white border ${errors.identifiant ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 flex-row items-center`}>
                  <Ionicons 
                    name="person-outline" 
                    size={20} 
                    color={errors.identifiant ? "#EF4444" : "#6B7280"} 
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    className="flex-1 text-gray-900 text-base"
                    placeholder="Veuillez entrer votre email ou numéro de téléphone"
                    placeholderTextColor="#9CA3AF"
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
              
              {/* Error Message for Identifiant */}
              {errors.identifiant ? (
                <View className="flex-row items-center mb-4 mt-1">
                  <Text className="text-red-500 text-sm ml-1">
                    {errors.identifiant}
                  </Text>
                </View>
              ) : (
                <View className="mb-4" />
              )}

              {/* Password Label */}
              <Text className="text-gray-900 font-medium text-xl mb-2">
                Mot de passe
              </Text>

              {/* Password Input */}
              <View className="mb-1">
                <View className={`bg-white border ${errors.motDePasse ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 flex-row items-center`}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={errors.motDePasse ? "#EF4444" : "#6B7280"} 
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    className="flex-1 text-gray-900 text-base"
                    placeholder="Veuillez entrer votre Mot de passe"
                    placeholderTextColor="#9CA3AF"
                    value={motDePasse}
                    onChangeText={handleMotDePasseChange}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color={errors.motDePasse ? "#EF4444" : "#6B7280"} 
                    />
                  </TouchableOpacity>
                  {errors.motDePasse && (
                    <Ionicons 
                      name="alert-circle" 
                      size={20} 
                      color="#EF4444" 
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </View>
              </View>
              
              {/* Error Message for Password */}
              {errors.motDePasse ? (
                <View className="flex-row items-center mb-6 mt-1">
                  <Text className="text-red-500 text-sm ml-1">
                    {errors.motDePasse}
                  </Text>
                </View>
              ) : (
                <View className="mb-6" />
              )}

              {/* Login Button */}
              <TouchableOpacity
                className={`rounded-full py-4 mb-4 ${loading ? 'bg-blue-400' : 'bg-blue-700'
                  }`}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-center font-semibold text-xl">
                    Connexion
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer Links */}
            <View className="items-center mb-4">
              <View className="flex-row items-center mb-4">
                <Text className="text-gray-600 text-xl">
                  Vous n'avez pas encore de compte ?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('./registerScreen')}>
                  <Text className="text-blue-700 font-semibold text-xl">
                    Créer un compte
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity>
                <Text className="text-blue-700 font-semibold text-xl mb-6">
                  Mot de passe oublié ?
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}