import config from '@/app/config/env';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { Bouton, BoutonIcone, CaseACocher, ChampSaisie, Etapes, Texte } from '../../components/ui';
import { couleurs } from '../../theme/ocean';

const ETAPES = ['Identité', 'Sécurité', 'Vérification'];

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      await axios.post(
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
            // Clé lue depuis la configuration (elle était écrite en dur ici)
            'X-API-KEY': config.X_API_KEY,
          },
        }
      );

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
          // Retourner à l'étape qui contient la première erreur
          const erreurEtape1 = newErrors.dateNaissance || newErrors.motDePasse;
          const erreurEtape0 = newErrors.nom || newErrors.prenom || newErrors.email || newErrors.telephone;
          setCurrentTab(erreurEtape0 || !erreurEtape1 ? 0 : 1);
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

  const titres = [
    { titre: 'Créer un compte', sousTitre: 'Ces informations figureront sur vos billets.' },
    { titre: 'Sécurisez votre compte', sousTitre: 'Date de naissance et mot de passe.' },
    { titre: 'Vérifiez vos informations', sousTitre: 'Vous pourrez les modifier ensuite dans votre compte.' },
  ][currentTab];

  const recap: { icone: keyof typeof Ionicons.glyphMap; libelle: string; valeur: string }[] = [
    { icone: 'person-outline', libelle: 'Nom complet', valeur: `${prenom} ${nom}`.trim() },
    { icone: 'mail-outline', libelle: 'Email', valeur: email },
    { icone: 'call-outline', libelle: 'Téléphone', valeur: telephone },
    { icone: 'calendar-outline', libelle: 'Date de naissance', valeur: dateNaissance },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.surface }}>
      <DialogComponent />
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 24, gap: 22 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Retour + progression */}
          <View style={{ gap: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <BoutonIcone
                icone="chevron-back"
                libelle={currentTab === 0 ? 'Retour à la connexion' : 'Étape précédente'}
                onPress={() => (currentTab === 0 ? router.back() : setCurrentTab(currentTab - 1))}
              />
              <Texte graisse="gras" taille={13} couleur={couleurs.gris} style={{ marginLeft: 'auto' }}>
                {currentTab + 1}/{ETAPES.length}
              </Texte>
            </View>
            <Etapes etapes={ETAPES} courante={currentTab} />
          </View>

          <View style={{ gap: 6 }}>
            <Texte variante="titre">{titres.titre}</Texte>
            <Texte graisse="moyen" taille={14} couleur={couleurs.gris}>{titres.sousTitre}</Texte>
          </View>

          {/* Étape 1 : identité */}
          {currentTab === 0 && (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <ChampSaisie
                    libelle="Prénom"
                    placeholder="Votre prénom"
                    value={prenom}
                    onChangeText={(text) => { setPrenom(text); clearFieldError('prenom'); }}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    erreur={errors.prenom}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ChampSaisie
                    libelle="Nom"
                    placeholder="Votre nom"
                    value={nom}
                    onChangeText={(text) => { setNom(text); clearFieldError('nom'); }}
                    autoCapitalize="words"
                    autoComplete="family-name"
                    erreur={errors.nom}
                  />
                </View>
              </View>
              <ChampSaisie
                libelle="Email"
                icone="mail-outline"
                placeholder="exemple@email.com"
                value={email}
                onChangeText={(text) => { setEmail(text); clearFieldError('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                erreur={errors.email}
                aide="Vous recevrez vos factures à cette adresse."
              />
              <ChampSaisie
                libelle="Téléphone"
                icone="call-outline"
                placeholder="03X XX XXX XX"
                value={telephone}
                onChangeText={(text) => { setTelephone(text); clearFieldError('telephone'); }}
                keyboardType="phone-pad"
                autoComplete="tel"
                erreur={errors.telephone}
                aide="Pour la confirmation de paiement mobile money."
              />
            </View>
          )}

          {/* Étape 2 : sécurité */}
          {currentTab === 1 && (
            <View style={{ gap: 14 }}>
              <ChampSaisie
                libelle="Date de naissance"
                icone="calendar-outline"
                placeholder="AAAA-MM-JJ"
                value={dateNaissance}
                onChangeText={(text) => { setDateNaissance(text); clearFieldError('dateNaissance'); }}
                keyboardType="numbers-and-punctuation"
                erreur={errors.dateNaissance}
              />
              <ChampSaisie
                libelle="Mot de passe"
                icone="lock-closed-outline"
                placeholder="Minimum 6 caractères"
                value={motDePasse}
                onChangeText={(text) => { setMotDePasse(text); clearFieldError('motDePasse'); }}
                motDePasse
                autoComplete="new-password"
                erreur={errors.motDePasse}
              />
              <ChampSaisie
                libelle="Confirmer le mot de passe"
                icone="lock-closed-outline"
                placeholder="Retapez votre mot de passe"
                value={confirmMotDePasse}
                onChangeText={(text) => { setConfirmMotDePasse(text); clearFieldError('confirmMotDePasse'); }}
                motDePasse
                autoComplete="new-password"
                erreur={errors.confirmMotDePasse}
              />
            </View>
          )}

          {/* Étape 3 : vérification */}
          {currentTab === 2 && (
            <View style={{ gap: 14 }}>
              <View style={{ backgroundColor: couleurs.fond, borderRadius: 16, padding: 14, gap: 14 }}>
                {recap.map((ligne) => (
                  <View key={ligne.libelle} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={ligne.icone} size={19} color={couleurs.ocean800} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Texte variante="legende">{ligne.libelle}</Texte>
                      <Texte graisse="gras" taille={15} numberOfLines={1}>{ligne.valeur || '—'}</Texte>
                    </View>
                  </View>
                ))}
              </View>
              <CaseACocher
                coche={acceptConditions}
                onChange={setAcceptConditions}
                desactive={loading}
                libelle="J'accepte les conditions d'utilisation et la politique de confidentialité de FANDRIO."
              />
            </View>
          )}

          <View style={{ flex: 1, minHeight: 8 }} />

          {/* Actions */}
          <View style={{ gap: 14 }}>
            {currentTab < 2 ? (
              <Bouton titre="Continuer" onPress={handleNext} />
            ) : (
              <Bouton titre="Créer mon compte" onPress={handleRegister} chargement={loading} />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <Texte graisse="moyen" taille={14} couleur={couleurs.gris}>Déjà inscrit ? </Texte>
              <Pressable
                onPress={() => router.push('/screens/authentification/loginScreen')}
                accessibilityRole="link"
                hitSlop={8}
              >
                <Texte graisse="tresGras" taille={14} couleur={couleurs.ocean800}>Se connecter</Texte>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
