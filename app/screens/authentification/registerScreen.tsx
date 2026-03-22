import config from '@/app/config/env';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
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

  const STEP_LABELS = ['Identité', 'Sécurité', 'Confirmation'];

  return (
    <LinearGradient
      colors={['#1e40af', '#3b82f6', '#93c5fd', '#dbeafe', '#ffffff']}
      locations={[0, 0.12, 0.28, 0.45, 1]}
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
          <View className="items-center pt-12 pb-4">
            <View style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
              <Image
                source={require("../../../assets/images/fandrioLogo.png")}
                className="w-40 h-40"
                resizeMode="contain"
              />
            </View>
            <Text className="text-white text-2xl font-extrabold tracking-[6px] -mt-1">FANDRIO</Text>
          </View>

          {/* Carte formulaire */}
          <View
            className="flex-1 mx-5 mb-6 bg-white rounded-3xl px-7 pt-6 pb-6"
            style={{ shadowColor: '#1e40af', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 12 }}
          >
            <Text className="text-gray-900 text-2xl font-bold text-center mb-1">Créer un compte</Text>
            <Text className="text-gray-400 text-base text-center mb-5">Rejoignez la communauté Fandrio</Text>

            {/* Progress Indicator */}
            <View className="flex-row justify-center items-center mb-6">
              {STEP_LABELS.map((label, step) => (
                <View key={step} className="flex-row items-center">
                  <View className="items-center">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${
                      currentTab > step ? 'bg-green-500' : currentTab === step ? 'bg-blue-700' : 'bg-gray-200'
                    }`}>
                      {currentTab > step ? (
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      ) : (
                        <Text className={`font-bold text-base ${currentTab === step ? 'text-white' : 'text-gray-400'}`}>
                          {step + 1}
                        </Text>
                      )}
                    </View>
                    <Text className={`text-xs mt-1.5 font-medium ${currentTab >= step ? 'text-blue-700' : 'text-gray-400'}`}>
                      {label}
                    </Text>
                  </View>
                  {step < 2 && (
                    <View className={`w-12 h-0.5 mx-2 mb-5 ${currentTab > step ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </View>
              ))}
            </View>

            {/* Tab 1: Informations personnelles */}
            {currentTab === 0 && (
              <View>
                <Text className="text-xl font-bold text-gray-900 mb-1">
                  Informations personnelles
                </Text>
                <Text className="text-gray-400 text-base mb-5">
                  Renseignez vos informations de base
                </Text>

                {/* Nom */}
                <Text className="text-gray-700 font-semibold text-base mb-2 ml-1">Nom</Text>
                <View className="mb-1">
                  <View className={`bg-gray-50 border ${errors.nom ? 'border-red-400' : 'border-gray-200'} rounded-2xl px-5 py-4 flex-row items-center`}>
                    <Ionicons name="person-outline" size={22} color={errors.nom ? "#EF4444" : "#9CA3AF"} style={{ marginRight: 14 }} />
                    <TextInput
                      className="flex-1 text-gray-900 text-lg"
                      placeholder="Votre nom"
                      placeholderTextColor="#C4C4C4"
                      value={nom}
                      onChangeText={(text) => { setNom(text); clearFieldError('nom'); }}
                      autoCapitalize="words"
                    />
                    {errors.nom && <Ionicons name="alert-circle" size={20} color="#EF4444" />}
                  </View>
                </View>
                {errors.nom ? (
                  <Text className="text-red-500 text-sm ml-2 mb-4 mt-1">{errors.nom}</Text>
                ) : <View className="mb-4" />}

                {/* Prénom */}
                <Text className="text-gray-700 font-semibold text-base mb-2 ml-1">Prénom</Text>
                <View className="mb-1">
                  <View className={`bg-gray-50 border ${errors.prenom ? 'border-red-400' : 'border-gray-200'} rounded-2xl px-5 py-4 flex-row items-center`}>
                    <Ionicons name="person-outline" size={22} color={errors.prenom ? "#EF4444" : "#9CA3AF"} style={{ marginRight: 14 }} />
                    <TextInput
                      className="flex-1 text-gray-900 text-lg"
                      placeholder="Votre prénom"
                      placeholderTextColor="#C4C4C4"
                      value={prenom}
                      onChangeText={(text) => { setPrenom(text); clearFieldError('prenom'); }}
                      autoCapitalize="words"
                    />
                    {errors.prenom && <Ionicons name="alert-circle" size={20} color="#EF4444" />}
                  </View>
                </View>
                {errors.prenom ? (
                  <Text className="text-red-500 text-sm ml-2 mb-4 mt-1">{errors.prenom}</Text>
                ) : <View className="mb-4" />}

                {/* Email */}
                <Text className="text-gray-700 font-semibold text-base mb-2 ml-1">Email</Text>
                <View className="mb-1">
                  <View className={`bg-gray-50 border ${errors.email ? 'border-red-400' : 'border-gray-200'} rounded-2xl px-5 py-4 flex-row items-center`}>
                    <Ionicons name="mail-outline" size={22} color={errors.email ? "#EF4444" : "#9CA3AF"} style={{ marginRight: 14 }} />
                    <TextInput
                      className="flex-1 text-gray-900 text-lg"
                      placeholder="exemple@email.com"
                      placeholderTextColor="#C4C4C4"
                      value={email}
                      onChangeText={(text) => { setEmail(text); clearFieldError('email'); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {errors.email && <Ionicons name="alert-circle" size={20} color="#EF4444" />}
                  </View>
                </View>
                {errors.email ? (
                  <Text className="text-red-500 text-sm ml-2 mb-4 mt-1">{errors.email}</Text>
                ) : <View className="mb-4" />}

                {/* Téléphone */}
                <Text className="text-gray-700 font-semibold text-base mb-2 ml-1">Téléphone</Text>
                <View className="mb-1">
                  <View className={`bg-gray-50 border ${errors.telephone ? 'border-red-400' : 'border-gray-200'} rounded-2xl px-5 py-4 flex-row items-center`}>
                    <Ionicons name="call-outline" size={22} color={errors.telephone ? "#EF4444" : "#9CA3AF"} style={{ marginRight: 14 }} />
                    <TextInput
                      className="flex-1 text-gray-900 text-lg"
                      placeholder="03X XX XXX XX"
                      placeholderTextColor="#C4C4C4"
                      value={telephone}
                      onChangeText={(text) => { setTelephone(text); clearFieldError('telephone'); }}
                      keyboardType="phone-pad"
                    />
                    {errors.telephone && <Ionicons name="alert-circle" size={20} color="#EF4444" />}
                  </View>
                </View>
                {errors.telephone ? (
                  <Text className="text-red-500 text-sm ml-2 mb-5 mt-1">{errors.telephone}</Text>
                ) : <View className="mb-5" />}

                <TouchableOpacity
                  onPress={handleNext}
                  activeOpacity={0.85}
                  style={{ overflow: 'hidden', borderRadius: 16 }}
                >
                  <LinearGradient
                    colors={['#2563eb', '#1d4ed8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 18, borderRadius: 16, alignItems: 'center' }}
                  >
                    <Text className="text-white text-center font-bold text-xl">Suivant</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Tab 2: Sécurité */}
            {currentTab === 1 && (
              <View>
                <Text className="text-xl font-bold text-gray-900 mb-1">
                  Sécurité du compte
                </Text>
                <Text className="text-gray-400 text-base mb-5">
                  Date de naissance et mot de passe
                </Text>

                {/* Date de naissance */}
                <Text className="text-gray-700 font-semibold text-base mb-2 ml-1">Date de naissance</Text>
                <View className="mb-1">
                  <View className={`bg-gray-50 border ${errors.dateNaissance ? 'border-red-400' : 'border-gray-200'} rounded-2xl px-5 py-4 flex-row items-center`}>
                    <Ionicons name="calendar-outline" size={22} color={errors.dateNaissance ? "#EF4444" : "#9CA3AF"} style={{ marginRight: 14 }} />
                    <TextInput
                      className="flex-1 text-gray-900 text-lg"
                      placeholder="AAAA-MM-JJ"
                      placeholderTextColor="#C4C4C4"
                      value={dateNaissance}
                      onChangeText={(text) => { setDateNaissance(text); clearFieldError('dateNaissance'); }}
                    />
                    {errors.dateNaissance && <Ionicons name="alert-circle" size={20} color="#EF4444" />}
                  </View>
                </View>
                {errors.dateNaissance ? (
                  <Text className="text-red-500 text-sm ml-2 mb-4 mt-1">{errors.dateNaissance}</Text>
                ) : <View className="mb-4" />}

                {/* Mot de passe */}
                <Text className="text-gray-700 font-semibold text-base mb-2 ml-1">Mot de passe</Text>
                <View className="mb-1">
                  <View className={`bg-gray-50 border ${errors.motDePasse ? 'border-red-400' : 'border-gray-200'} rounded-2xl px-5 py-4 flex-row items-center`}>
                    <Ionicons name="lock-closed-outline" size={22} color={errors.motDePasse ? "#EF4444" : "#9CA3AF"} style={{ marginRight: 14 }} />
                    <TextInput
                      className="flex-1 text-gray-900 text-lg"
                      placeholder="Minimum 6 caractères"
                      placeholderTextColor="#C4C4C4"
                      value={motDePasse}
                      onChangeText={(text) => { setMotDePasse(text); clearFieldError('motDePasse'); }}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                      <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color={errors.motDePasse ? "#EF4444" : "#9CA3AF"} />
                    </TouchableOpacity>
                  </View>
                </View>
                {errors.motDePasse ? (
                  <Text className="text-red-500 text-sm ml-2 mb-4 mt-1">{errors.motDePasse}</Text>
                ) : <View className="mb-4" />}

                {/* Confirmer mot de passe */}
                <Text className="text-gray-700 font-semibold text-base mb-2 ml-1">Confirmer le mot de passe</Text>
                <View className="mb-1">
                  <View className={`bg-gray-50 border ${errors.confirmMotDePasse ? 'border-red-400' : 'border-gray-200'} rounded-2xl px-5 py-4 flex-row items-center`}>
                    <Ionicons name="lock-closed-outline" size={22} color={errors.confirmMotDePasse ? "#EF4444" : "#9CA3AF"} style={{ marginRight: 14 }} />
                    <TextInput
                      className="flex-1 text-gray-900 text-lg"
                      placeholder="Retapez votre mot de passe"
                      placeholderTextColor="#C4C4C4"
                      value={confirmMotDePasse}
                      onChangeText={(text) => { setConfirmMotDePasse(text); clearFieldError('confirmMotDePasse'); }}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
                      <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color={errors.confirmMotDePasse ? "#EF4444" : "#9CA3AF"} />
                    </TouchableOpacity>
                  </View>
                </View>
                {errors.confirmMotDePasse ? (
                  <Text className="text-red-500 text-sm ml-2 mb-5 mt-1">{errors.confirmMotDePasse}</Text>
                ) : <View className="mb-5" />}

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 bg-gray-100 rounded-2xl py-5 border border-gray-200"
                    onPress={() => setCurrentTab(0)}
                  >
                    <Text className="text-gray-600 text-center font-bold text-xl">Retour</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleNext}
                    activeOpacity={0.85}
                    className="flex-1"
                    style={{ overflow: 'hidden', borderRadius: 16 }}
                  >
                    <LinearGradient
                      colors={['#2563eb', '#1d4ed8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 18, borderRadius: 16, alignItems: 'center' }}
                    >
                      <Text className="text-white text-center font-bold text-xl">Suivant</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Tab 3: Confirmation */}
            {currentTab === 2 && (
              <View>
                <Text className="text-xl font-bold text-gray-900 mb-1">
                  Vérification
                </Text>
                <Text className="text-gray-400 text-base mb-5">
                  Vérifiez vos informations avant de finaliser
                </Text>

                {/* Résumé */}
                <View className="bg-gray-50 rounded-2xl p-5 mb-5">
                  <View className="flex-row items-center mb-5">
                    <View className="bg-blue-100 rounded-xl w-11 h-11 items-center justify-center mr-4">
                      <Ionicons name="person" size={22} color="#2563eb" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-sm">Nom complet</Text>
                      <Text className="text-gray-900 font-semibold text-lg">{nom} {prenom}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center mb-5">
                    <View className="bg-blue-100 rounded-xl w-11 h-11 items-center justify-center mr-4">
                      <Ionicons name="mail" size={22} color="#2563eb" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-sm">Email</Text>
                      <Text className="text-gray-900 font-semibold text-lg">{email}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center mb-5">
                    <View className="bg-blue-100 rounded-xl w-11 h-11 items-center justify-center mr-4">
                      <Ionicons name="call" size={22} color="#2563eb" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-sm">Téléphone</Text>
                      <Text className="text-gray-900 font-semibold text-lg">{telephone}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <View className="bg-blue-100 rounded-xl w-11 h-11 items-center justify-center mr-4">
                      <Ionicons name="calendar" size={22} color="#2563eb" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-sm">Date de naissance</Text>
                      <Text className="text-gray-900 font-semibold text-lg">{dateNaissance}</Text>
                    </View>
                  </View>
                </View>

                {/* Checkbox */}
                <TouchableOpacity
                  className="flex-row items-start mb-5 bg-blue-50 rounded-2xl p-4"
                  onPress={() => setAcceptConditions(!acceptConditions)}
                  activeOpacity={0.7}
                >
                  <View className={`w-6 h-6 rounded-lg mr-3 mt-0.5 items-center justify-center ${
                    acceptConditions ? 'bg-blue-700' : 'bg-white border-2 border-gray-300'
                  }`}>
                    {acceptConditions && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text className="text-gray-600 text-base flex-1 leading-6">
                    J'accepte les conditions d'utilisation et la politique de confidentialité de Fandrio.
                  </Text>
                </TouchableOpacity>

                {/* Buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 bg-gray-100 rounded-2xl py-5 border border-gray-200"
                    onPress={() => setCurrentTab(1)}
                    disabled={loading}
                  >
                    <Text className="text-gray-600 text-center font-bold text-xl">Retour</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleRegister}
                    disabled={loading}
                    activeOpacity={0.85}
                    className="flex-1"
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
                        <Text className="text-white text-center font-bold text-xl">S'inscrire</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Divider et Social */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="mx-4 text-gray-400 text-sm font-medium">ou</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

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

            {/* Footer Link */}
            <View className="items-center mb-2">
              <View className="flex-row items-center">
                <Text className="text-gray-500 text-base">
                  Vous avez déjà un compte ?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/screens/authentification/loginScreen')}>
                  <Text className="text-blue-700 font-bold text-base">
                    Se connecter
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