import config from '@/app/config/env';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function RegisterScreen() {
  const router = useRouter();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [currentTab, setCurrentTab] = useState(0);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmMotDePasse, setConfirmMotDePasse] = useState('');
  const [acceptConditions, setAcceptConditions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // États pour les erreurs
  const [errors, setErrors] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    dateNaissance: '',
    motDePasse: '',
    confirmMotDePasse: '',
  });

  const clearFieldError = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = (step: number) => {
    const isEmpty = (s?: string) => !s || s.trim() === '';
    const newErrors = { ...errors };
    let isValid = true;

    if (step === 0) {
      // Validation Nom
      if (isEmpty(nom)) {
        newErrors.nom = 'Le nom est requis';
        isValid = false;
      } else if (nom.trim().length < 2) {
        newErrors.nom = 'Le nom doit contenir au moins 2 caractères';
        isValid = false;
      } else {
        newErrors.nom = '';
      }

      // Validation Prénom
      if (isEmpty(prenom)) {
        newErrors.prenom = 'Le prénom est requis';
        isValid = false;
      } else if (prenom.trim().length < 2) {
        newErrors.prenom = 'Le prénom doit contenir au moins 2 caractères';
        isValid = false;
      } else {
        newErrors.prenom = '';
      }

      // Validation Email
      if (isEmpty(email)) {
        newErrors.email = "L'email est requis";
        isValid = false;
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          newErrors.email = "L'email n'est pas valide";
          isValid = false;
        } else {
          newErrors.email = '';
        }
      }

      // Validation Téléphone
      if (isEmpty(telephone)) {
        newErrors.telephone = 'Le numéro de téléphone est requis';
        isValid = false;
      } else if (telephone.trim().length < 10) {
        newErrors.telephone = 'Le numéro de téléphone doit contenir au moins 10 chiffres';
        isValid = false;
      } else {
        newErrors.telephone = '';
      }

    } else if (step === 1) {
      // Validation Date de naissance
      if (isEmpty(dateNaissance)) {
        newErrors.dateNaissance = 'La date de naissance est requise';
        isValid = false;
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateNaissance)) {
          newErrors.dateNaissance = 'Le format doit être AAAA-MM-JJ';
          isValid = false;
        } else {
          newErrors.dateNaissance = '';
        }
      }

      // Validation Mot de passe
      if (isEmpty(motDePasse)) {
        newErrors.motDePasse = 'Le mot de passe est requis';
        isValid = false;
      } else if (motDePasse.length < 6) {
        newErrors.motDePasse = 'Le mot de passe doit contenir au moins 6 caractères';
        isValid = false;
      } else {
        newErrors.motDePasse = '';
      }

      // Validation Confirmation mot de passe
      if (isEmpty(confirmMotDePasse)) {
        newErrors.confirmMotDePasse = 'La confirmation du mot de passe est requise';
        isValid = false;
      } else if (motDePasse !== confirmMotDePasse) {
        newErrors.confirmMotDePasse = 'Les mots de passe ne correspondent pas';
        isValid = false;
      } else {
        newErrors.confirmMotDePasse = '';
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentTab)) {
      setCurrentTab(currentTab + 1);
    }
  };

  const handleRegister = async () => {
    if (!acceptConditions) {
      showDialog({
        title: 'Erreur',
        message: 'Veuillez accepter les conditions d\'utilisation',
        type: 'warning',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {}
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${config.API_URL}/api/inscription`,
        {
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: email.trim(),
          telephone: telephone.trim(),
          motDePasse,
          dateNaissance: dateNaissance.trim(),
        },
        {
          headers: {
            'X-API-KEY': 'fandrio_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
          },
        }
      );

      console.log('Response:', response.data);
      
      showDialog({
        title: 'Succès',
        message: 'Inscription réussie ! Vous allez être redirigé vers la page de connexion.',
        type: 'success',
        confirmText: 'OK',
        onConfirm: () => router.push('/screens/authentification/loginScreen'),
        onCancel: () => router.push('/screens/authentification/loginScreen')
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const resp = error.response;
        if (resp?.status === 422 && resp.data?.erreurs) {
          const errs = resp.data.erreurs;
          const newErrors = { ...errors };
          
          // Mapper les erreurs du serveur aux champs
          for (const key of Object.keys(errs)) {
            const arr = errs[key];
            const errorMsg = Array.isArray(arr) ? arr[0] : arr;
            
            if (key === 'nom') newErrors.nom = errorMsg;
            else if (key === 'prenom') newErrors.prenom = errorMsg;
            else if (key === 'email') newErrors.email = errorMsg;
            else if (key === 'telephone') newErrors.telephone = errorMsg;
            else if (key === 'dateNaissance') newErrors.dateNaissance = errorMsg;
            else if (key === 'motDePasse') newErrors.motDePasse = errorMsg;
          }
          
          setErrors(newErrors);
          setCurrentTab(0); // Retourner au premier onglet pour voir les erreurs
        } else {
          showDialog({
            title: 'Erreur',
            message: resp?.data?.message || 'Erreur lors de l\'inscription',
            type: 'danger',
            confirmText: 'OK',
            onConfirm: () => {},
            onCancel: () => {}
          });
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
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <DialogComponent />
      <StatusBar barStyle="light-content" />

      {/* Header avec fond bleu dégradé */}
      <View className="bg-blue-900 pt-12 pb-6 px-6 rounded-b-3xl">
        <View className="items-center mb-4">
          <View className="bg-white/20 rounded-full px-6 py-2 flex-row items-center">
            <View className="w-6 h-6 bg-white rounded-full mr-2" />
            <Text className="text-yellow-400 font-bold text-lg">FANDRIO</Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View className="flex-row justify-center items-center mt-4">
          {[0, 1, 2].map((step) => (
            <View key={step} className="flex-row items-center">
              <View className={`w-8 h-8 rounded-full items-center justify-center ${currentTab >= step ? 'bg-yellow-400' : 'bg-white/30'
                }`}>
                <Text className={`font-bold ${currentTab >= step ? 'text-blue-900' : 'text-white'
                  }`}>
                  {step + 1}
                </Text>
              </View>
              {step < 2 && (
                <View className={`w-12 h-1 mx-1 ${currentTab > step ? 'bg-yellow-400' : 'bg-white/30'
                  }`} />
              )}
            </View>
          ))}
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
          <View className="flex-1 px-6 pt-6">
            {/* Tab 1: Informations personnelles */}
            {currentTab === 0 && (
              <>
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                  Informations personnelles
                </Text>
                <Text className="text-gray-500 text-xl mb-6">
                  Commencez par renseigner vos informations de base
                </Text>

                {/* Nom */}
                <View className="mb-1">
                  <View className={`bg-white border ${errors.nom ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 flex-row items-center`}>
                    <Ionicons 
                      name="person-outline" 
                      size={20} 
                      color={errors.nom ? "#EF4444" : "#6B7280"} 
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-gray-900 text-base"
                      placeholder="Nom"
                      placeholderTextColor="#9CA3AF"
                      value={nom}
                      onChangeText={(text) => {
                        setNom(text);
                        clearFieldError('nom');
                      }}
                      autoCapitalize="words"
                    />
                    {errors.nom && (
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    )}
                  </View>
                </View>
                {errors.nom ? (
                  <Text className="text-red-500 text-sm ml-1 mb-4">{errors.nom}</Text>
                ) : (
                  <View className="mb-4" />
                )}

                {/* Prénom */}
                <View className="mb-1">
                  <View className={`bg-white border ${errors.prenom ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 flex-row items-center`}>
                    <Ionicons 
                      name="person-outline" 
                      size={20} 
                      color={errors.prenom ? "#EF4444" : "#6B7280"} 
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-gray-900 text-base"
                      placeholder="Prénom"
                      placeholderTextColor="#9CA3AF"
                      value={prenom}
                      onChangeText={(text) => {
                        setPrenom(text);
                        clearFieldError('prenom');
                      }}
                      autoCapitalize="words"
                    />
                    {errors.prenom && (
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    )}
                  </View>
                </View>
                {errors.prenom ? (
                  <Text className="text-red-500 text-sm ml-1 mb-4">{errors.prenom}</Text>
                ) : (
                  <View className="mb-4" />
                )}

                {/* Email */}
                <View className="mb-1">
                  <View className={`bg-white border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 flex-row items-center`}>
                    <Ionicons 
                      name="mail-outline" 
                      size={20} 
                      color={errors.email ? "#EF4444" : "#6B7280"} 
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-gray-900 text-base"
                      placeholder="Email"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        clearFieldError('email');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {errors.email && (
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    )}
                  </View>
                </View>
                {errors.email ? (
                  <Text className="text-red-500 text-sm ml-1 mb-4">{errors.email}</Text>
                ) : (
                  <View className="mb-4" />
                )}

                {/* Téléphone */}
                <View className="mb-1">
                  <View className={`bg-white border ${errors.telephone ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 flex-row items-center`}>
                    <Ionicons 
                      name="call-outline" 
                      size={20} 
                      color={errors.telephone ? "#EF4444" : "#6B7280"} 
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-gray-900 text-base"
                      placeholder="Numéro de téléphone"
                      placeholderTextColor="#9CA3AF"
                      value={telephone}
                      onChangeText={(text) => {
                        setTelephone(text);
                        clearFieldError('telephone');
                      }}
                      keyboardType="phone-pad"
                    />
                    {errors.telephone && (
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    )}
                  </View>
                </View>
                {errors.telephone ? (
                  <Text className="text-red-500 text-sm ml-1 mb-4">{errors.telephone}</Text>
                ) : (
                  <View className="mb-4" />
                )}

                <TouchableOpacity
                  className="bg-blue-700 rounded-full py-4 mb-2"
                  onPress={handleNext}
                >
                  <Text className="text-white text-center font-semibold text-xl">
                    Suivant
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Tab 2: Sécurité */}
            {currentTab === 1 && (
              <>
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                  Sécurité
                </Text>
                <Text className="text-gray-500 text-xl mb-6">
                  Sécurisez votre compte avec un mot de passe
                </Text>

                {/* Date de naissance */}
                <View className="mb-1">
                  <View className={`bg-white border ${errors.dateNaissance ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 flex-row items-center`}>
                    <Ionicons 
                      name="calendar-outline" 
                      size={20} 
                      color={errors.dateNaissance ? "#EF4444" : "#6B7280"} 
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-gray-900 text-base"
                      placeholder="Date de naissance (AAAA-MM-JJ)"
                      placeholderTextColor="#9CA3AF"
                      value={dateNaissance}
                      onChangeText={(text) => {
                        setDateNaissance(text);
                        clearFieldError('dateNaissance');
                      }}
                    />
                    {errors.dateNaissance && (
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    )}
                  </View>
                </View>
                {errors.dateNaissance ? (
                  <Text className="text-red-500 text-sm ml-1 mb-4">{errors.dateNaissance}</Text>
                ) : (
                  <View className="mb-4" />
                )}

                {/* Mot de passe */}
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
                      placeholder="Mot de passe"
                      placeholderTextColor="#9CA3AF"
                      value={motDePasse}
                      onChangeText={(text) => {
                        setMotDePasse(text);
                        clearFieldError('motDePasse');
                      }}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
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
                {errors.motDePasse ? (
                  <Text className="text-red-500 text-sm ml-1 mb-4">{errors.motDePasse}</Text>
                ) : (
                  <View className="mb-4" />
                )}

                {/* Confirmer mot de passe */}
                <View className="mb-1">
                  <View className={`bg-white border ${errors.confirmMotDePasse ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3 flex-row items-center`}>
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={20} 
                      color={errors.confirmMotDePasse ? "#EF4444" : "#6B7280"} 
                      style={{ marginRight: 10 }}
                    />
                    <TextInput
                      className="flex-1 text-gray-900 text-base"
                      placeholder="Confirmer le mot de passe"
                      placeholderTextColor="#9CA3AF"
                      value={confirmMotDePasse}
                      onChangeText={(text) => {
                        setConfirmMotDePasse(text);
                        clearFieldError('confirmMotDePasse');
                      }}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons 
                        name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                        size={20} 
                        color={errors.confirmMotDePasse ? "#EF4444" : "#6B7280"} 
                      />
                    </TouchableOpacity>
                    {errors.confirmMotDePasse && (
                      <Ionicons 
                        name="alert-circle" 
                        size={20} 
                        color="#EF4444" 
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </View>
                </View>
                {errors.confirmMotDePasse ? (
                  <Text className="text-red-500 text-sm ml-1 mb-4">{errors.confirmMotDePasse}</Text>
                ) : (
                  <View className="mb-4" />
                )}

                <View className="flex-row space-x-3 mb-2">
                  <TouchableOpacity
                    className="flex-1 bg-gray-200 rounded-full py-4"
                    onPress={() => setCurrentTab(0)}
                  >
                    <Text className="text-gray-700 text-center font-semibold text-xl">
                      Retour
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-blue-700 rounded-full py-4"
                    onPress={handleNext}
                  >
                    <Text className="text-white text-center font-semibold text-xl">
                      Suivant
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Tab 3: Confirmation */}
            {currentTab === 2 && (
              <>
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                  Confirmation
                </Text>
                <Text className="text-gray-500 text-xl mb-6">
                  Vérifiez vos informations avant de finaliser
                </Text>

                {/* Résumé */}
                <View className="bg-gray-50 rounded-xl p-4 mb-6">
                  <View className="mb-3">
                    <Text className="text-gray-500 text-sm mb-1">Nom complet</Text>
                    <Text className="text-gray-900 font-medium text-base">{nom} {prenom}</Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-gray-500 text-sm mb-1">Email</Text>
                    <Text className="text-gray-900 font-medium text-base">{email}</Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-gray-500 text-sm mb-1">Téléphone</Text>
                    <Text className="text-gray-900 font-medium text-base">{telephone}</Text>
                  </View>
                  <View>
                    <Text className="text-gray-500 text-sm mb-1">Date de naissance</Text>
                    <Text className="text-gray-900 font-medium text-base">{dateNaissance}</Text>
                  </View>
                </View>

                {/* Checkbox */}
                <TouchableOpacity
                  className="flex-row items-start mb-4"
                  onPress={() => setAcceptConditions(!acceptConditions)}
                >
                  <View className={`w-5 h-5 rounded mr-3 mt-0.5 items-center justify-center ${acceptConditions ? 'bg-blue-700' : 'bg-white border-2 border-gray-300'
                    }`}>
                    {acceptConditions && (
                      <Text className="text-white text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="text-gray-700 text-xl flex-1">
                    J'accepte les conditions d'utilisation et la politique de confidentialité de Reserva.
                  </Text>
                </TouchableOpacity>

                {/* Buttons */}
                <View className="flex-row space-x-3 mb-6">
                  <TouchableOpacity
                    className="flex-1 bg-gray-200 rounded-full py-4"
                    onPress={() => setCurrentTab(1)}
                    disabled={loading}
                  >
                    <Text className="text-gray-700 text-center font-semibold text-base">
                      Retour
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 rounded-full py-4 ${loading ? 'bg-blue-400' : 'bg-blue-700'
                      }`}
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-white text-center font-semibold text-xl">
                        S'inscrire
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Social Register Section - À l'intérieur du ScrollView */}
            <View className="mt-6 mb-6">
              {/* Divider */}
              <View className="flex-row items-center mb-6">
                <View className="flex-1 h-px bg-gray-300" />
                <Text className="mx-4 text-gray-500 text-sm">Ou</Text>
                <View className="flex-1 h-px bg-gray-300" />
              </View>
              <Text className="text-center text-gray-900 font-medium text-xl mb-4">
                S'inscrire avec
              </Text>

              <View className="flex-row justify-center items-center mb-6">
                {/* Google */}
                <TouchableOpacity className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center">
                  <Image
                    source={require("../../../assets/images/google.png")}
                    className="w-6 h-6"
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {/* Facebook */}
                <TouchableOpacity className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center mx-6">
                  <Image
                    source={require("../../../assets/images/facebook.png")}
                    className="w-6 h-6"
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {/* Apple */}
                <TouchableOpacity className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center">
                  <Image
                    source={require("../../../assets/images/apple.png")}
                    className="w-6 h-6"
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer Link */}
            <View className="items-center mb-4">
              <View className="flex-row items-center">
                <Text className="text-gray-600 text-xl">
                  Vous avez déjà un compte ?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/screens/authentification/loginScreen')}>
                  <Text className="text-blue-700 font-semibold text-xl">
                    Se connecter
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}