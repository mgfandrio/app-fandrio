import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { UtilisateurMoi } from '@/app/services/auth/authService';
import { profilService } from '@/app/services/profil/profilService';
import { Bouton, ChampSaisie, FeuilleModale } from '@/app/components/ui';

/** Affiche un message (succès ou erreur) via le ConfirmDialog de l'écran parent. */
export type AfficherMessage = (titre: string, message: string, type?: 'success' | 'danger' | 'warning') => void;

interface FeuilleInfosProps {
  visible: boolean;
  onClose: () => void;
  utilisateur: Pick<UtilisateurMoi, 'nom' | 'prenom' | 'email' | 'telephone'> | null;
  /** Appelé avec l'utilisateur renvoyé par l'API après enregistrement. */
  onEnregistre: (utilisateur: UtilisateurMoi) => void;
  message: AfficherMessage;
}

/** Feuille « Informations personnelles » : nom, prénom, email, téléphone. */
export function FeuilleInfosPerso({ visible, onClose, utilisateur, onEnregistre, message }: FeuilleInfosProps) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [chargement, setChargement] = useState(false);

  // Repart des valeurs actuelles à chaque ouverture
  useEffect(() => {
    if (visible && utilisateur) {
      setNom(utilisateur.nom || '');
      setPrenom(utilisateur.prenom || '');
      setEmail(utilisateur.email || '');
      setTelephone(utilisateur.telephone || '');
    }
  }, [visible, utilisateur]);

  const enregistrer = async () => {
    if (!utilisateur) return;
    const data: Record<string, string> = {};
    if (nom !== utilisateur.nom) data.nom = nom;
    if (prenom !== utilisateur.prenom) data.prenom = prenom;
    if (email !== utilisateur.email) data.email = email;
    if (telephone !== utilisateur.telephone) data.telephone = telephone;
    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }
    try {
      setChargement(true);
      const response = await profilService.updateProfil(data);
      if (response.statut && response.utilisateur) {
        onEnregistre(response.utilisateur);
        onClose();
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
      setChargement(false);
    }
  };

  return (
    <FeuilleModale visible={visible} onClose={onClose} titre="Informations personnelles" pied={<Bouton titre="Enregistrer" onPress={enregistrer} chargement={chargement} />}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <ChampSaisie libelle="Prénom" value={prenom} onChangeText={setPrenom} autoCapitalize="words" autoComplete="given-name" />
          </View>
          <View style={{ flex: 1 }}>
            <ChampSaisie libelle="Nom" value={nom} onChangeText={setNom} autoCapitalize="words" autoComplete="family-name" />
          </View>
        </View>
        <ChampSaisie libelle="Email" icone="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <ChampSaisie libelle="Téléphone" icone="call-outline" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" autoComplete="tel" />
      </ScrollView>
    </FeuilleModale>
  );
}

interface FeuilleMdpProps {
  visible: boolean;
  onClose: () => void;
  message: AfficherMessage;
}

/** Feuille « Changer le mot de passe » avec vérification pendant la saisie. */
export function FeuilleMotDePasse({ visible, onClose, message }: FeuilleMdpProps) {
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (visible) {
      setAncien('');
      setNouveau('');
      setConfirmation('');
    }
  }, [visible]);

  const erreurNouveau = nouveau.length > 0 && nouveau.length < 6 ? 'Au moins 6 caractères.' : undefined;
  const erreurConfirm = confirmation.length > 0 && nouveau !== confirmation ? 'Les deux mots de passe ne correspondent pas.' : undefined;
  const incomplet = !ancien || !nouveau || !confirmation || !!erreurNouveau || !!erreurConfirm;

  const changer = async () => {
    if (incomplet) return;
    try {
      setChargement(true);
      const response = await profilService.changerMotDePasse({
        ancien_mot_de_passe: ancien,
        nouveau_mot_de_passe: nouveau,
        nouveau_mot_de_passe_confirmation: confirmation,
      });
      if (response.statut) {
        onClose();
        message('Mot de passe modifié', 'Utilisez-le lors de votre prochaine connexion.', 'success');
      } else {
        message('Modification impossible', response.message || 'Erreur.');
      }
    } catch (e: any) {
      message('Modification impossible', e?.message || 'Ancien mot de passe incorrect.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <FeuilleModale
      visible={visible}
      onClose={onClose}
      titre="Changer le mot de passe"
      pied={<Bouton titre="Changer le mot de passe" onPress={changer} chargement={chargement} desactive={incomplet} />}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}>
        <ChampSaisie libelle="Mot de passe actuel" icone="lock-closed-outline" value={ancien} onChangeText={setAncien} motDePasse autoCapitalize="none" autoComplete="password" />
        <ChampSaisie libelle="Nouveau mot de passe" icone="lock-closed-outline" value={nouveau} onChangeText={setNouveau} motDePasse autoCapitalize="none" autoComplete="new-password" erreur={erreurNouveau} aide="Au moins 6 caractères." />
        <ChampSaisie libelle="Confirmer le nouveau mot de passe" icone="lock-closed-outline" value={confirmation} onChangeText={setConfirmation} motDePasse autoCapitalize="none" autoComplete="new-password" erreur={erreurConfirm} />
      </ScrollView>
    </FeuilleModale>
  );
}
