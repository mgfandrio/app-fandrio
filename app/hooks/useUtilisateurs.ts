import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import utilisateurService from '../services/utilisateurs/utilisateurService';
import {
  Utilisateur,
  UtilisateurDetaille,
  StatistiquesUtilisateurs,
  FiltresUtilisateurs,
} from '../types/utilisateur';

/**
 * Hook personnalisé pour la gestion des utilisateurs
 */
export const useUtilisateurs = () => {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [utilisateurDetail, setUtilisateurDetail] = useState<UtilisateurDetaille | null>(null);
  const [statistiques, setStatistiques] = useState<StatistiquesUtilisateurs | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Charge la liste des utilisateurs
   */
  const chargerUtilisateurs = useCallback(async (filtres?: FiltresUtilisateurs) => {
    setLoading(true);
    const response = await utilisateurService.listerUtilisateurs(filtres);
    setLoading(false);

    if (response.statut && response.data) {
      setUtilisateurs(response.data.utilisateurs);
      return response.data;
    } else {
      Alert.alert('Erreur', response.message || 'Impossible de charger les utilisateurs');
      return null;
    }
  }, []);

  /**
   * Charge les statistiques
   */
  const chargerStatistiques = useCallback(async () => {
    const response = await utilisateurService.getStatistiques();
    if (response.statut && response.data) {
      setStatistiques(response.data);
      return response.data;
    }
    return null;
  }, []);

  /**
   * Charge les détails d'un utilisateur
   */
  const chargerUtilisateur = useCallback(async (id: number) => {
    setLoading(true);
    const response = await utilisateurService.getUtilisateur(id);
    setLoading(false);

    if (response.statut && response.data) {
      setUtilisateurDetail(response.data);
      return response.data;
    } else {
      Alert.alert('Erreur', response.message || 'Impossible de charger les détails');
      return null;
    }
  }, []);

  /**
   * Change le statut d'un utilisateur
   */
  const changerStatut = useCallback(async (id: number, statut: number) => {
    const response = await utilisateurService.changerStatut(id, statut);
    if (response.statut) {
      Alert.alert('Succès', response.message || 'Statut modifié avec succès');
      return true;
    } else {
      Alert.alert('Erreur', response.message || 'Une erreur est survenue');
      return false;
    }
  }, []);

  /**
   * Supprime un utilisateur
   */
  const supprimerUtilisateur = useCallback(async (id: number) => {
    const response = await utilisateurService.supprimerUtilisateur(id);
    if (response.statut) {
      Alert.alert('Succès', response.message || 'Utilisateur supprimé avec succès');
      return true;
    } else {
      Alert.alert('Erreur', response.message || 'Une erreur est survenue');
      return false;
    }
  }, []);

  /**
   * Rafraîchit les données
   */
  const rafraichir = useCallback(async (filtres?: FiltresUtilisateurs) => {
    setRefreshing(true);
    await Promise.all([chargerUtilisateurs(filtres), chargerStatistiques()]);
    setRefreshing(false);
  }, [chargerUtilisateurs, chargerStatistiques]);

  return {
    utilisateurs,
    utilisateurDetail,
    statistiques,
    loading,
    refreshing,
    chargerUtilisateurs,
    chargerStatistiques,
    chargerUtilisateur,
    changerStatut,
    supprimerUtilisateur,
    rafraichir,
  };
};

