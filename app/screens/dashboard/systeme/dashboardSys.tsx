import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { StatusBar, View } from 'react-native';
import { useConfirmDialog } from '../../../components/common/ConfirmDialog';
import { BarreOngletsAdmin, OngletAdmin } from '../../../components/dashboard/BarreOngletsAdmin';
import { AccueilSys } from '../../../components/systeme/AccueilSys';
import { CommissionsSys } from '../../../components/systeme/CommissionsSys';
import { CompagniesSys } from '../../../components/systeme/CompagniesSys';
import { PlusSys } from '../../../components/systeme/PlusSys';
import { ProvincesSys } from '../../../components/systeme/ProvincesSys';
import { UtilisateursSys } from '../../../components/systeme/UtilisateursSys';
import authService from '../../../services/auth/authService';
import { couleurs } from '../../../theme/ocean';

const ONGLETS: OngletAdmin[] = [
  { key: 'accueil', label: 'Accueil', icon: 'home-outline', activeIcon: 'home' },
  { key: 'utilisateurs', label: 'Utilisateurs', icon: 'people-outline', activeIcon: 'people' },
  { key: 'compagnies', label: 'Compagnies', icon: 'business-outline', activeIcon: 'business' },
  { key: 'commissions', label: 'Commissions', icon: 'pie-chart-outline', activeIcon: 'pie-chart' },
  { key: 'plus', label: 'Plus', icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
];

/** Espace de l'administrateur système (maquettes « Admin système »). */
export default function DashboardSys() {
  const router = useRouter();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [onglet, setOnglet] = useState('accueil');

  const deconnexion = () => {
    showDialog({
      title: 'Se déconnecter ?',
      message: 'Vous devrez saisir à nouveau vos identifiants.',
      type: 'danger',
      confirmText: 'Se déconnecter',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await authService.deconnexion();
        } catch (e) {
          console.warn('Logout API error', e);
        } finally {
          await SecureStore.deleteItemAsync('fandrioToken');
          await SecureStore.deleteItemAsync('fandrioUser');
          router.replace('/screens/authentification/loginScreen');
        }
      },
      onCancel: () => {},
    });
  };

  // Les provinces s'ouvrent depuis « Plus » : l'onglet Plus reste allumé
  const ongletActif = onglet === 'provinces' ? 'plus' : onglet;

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <StatusBar barStyle={onglet === 'accueil' ? 'light-content' : 'dark-content'} backgroundColor={onglet === 'accueil' ? couleurs.ocean950 : onglet === 'provinces' ? couleurs.surface : couleurs.fond} />
      <DialogComponent />
      <View style={{ flex: 1 }}>
        {onglet === 'accueil' && <AccueilSys onNavigate={setOnglet} />}
        {onglet === 'utilisateurs' && <UtilisateursSys />}
        {onglet === 'compagnies' && <CompagniesSys />}
        {onglet === 'commissions' && <CommissionsSys />}
        {onglet === 'plus' && <PlusSys onOuvrir={setOnglet} onDeconnexion={deconnexion} />}
        {onglet === 'provinces' && <ProvincesSys onRetour={() => setOnglet('plus')} />}
      </View>
      <BarreOngletsAdmin onglets={ONGLETS} actif={ongletActif} onPress={setOnglet} />
    </View>
  );
}
