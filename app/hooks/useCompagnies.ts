import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import compagnieService from '../services/compagnies/compagnieService';
import {
  Compagnie,
  CompagnieDetaillee,
  CompagnieFormData,
  CompagnieUpdateData,
  FiltresCompagnies,
  StatistiquesCompagnies,
} from '../types/compagnie';

/**
 * Hook personnalisé pour la gestion des compagnies
 */
export const useCompagnies = () => {
  const [compagnies, setCompagnies] = useState<Compagnie[]>([]);
  const [compagnieDetail, setCompagnieDetail] = useState<CompagnieDetaillee | null>(null);
  const [statistiques, setStatistiques] = useState<StatistiquesCompagnies | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Charge la liste des compagnies
   */
  const chargerCompagnies = useCallback(async (filtres?: FiltresCompagnies) => {
    setLoading(true);
    const response = await compagnieService.listerCompagnies(filtres);
    setLoading(false);

    if (response.statut && response.data) {
      setCompagnies(response.data.compagnies);
      return response.data;
    } else {
      Alert.alert('Erreur', response.message || 'Impossible de charger les compagnies');
      return null;
    }
  }, []);

  /**
   * Charge les statistiques
   */
  const chargerStatistiques = useCallback(async () => {
    const response = await compagnieService.getStatistiques();
    if (response.statut && response.data) {
      setStatistiques(response.data);
      return response.data;
    }
    return null;
  }, []);

  /**
   * Charge les détails d'une compagnie
   */
  const chargerCompagnie = useCallback(async (id: number) => {
    setLoading(true);
    const response = await compagnieService.getCompagnie(id);
    setLoading(false);

    if (response.statut && response.data) {
      setCompagnieDetail(response.data);
      return response.data;
    } else {
      Alert.alert('Erreur', response.message || 'Impossible de charger les détails');
      return null;
    }
  }, []);

  /**
   * Crée une nouvelle compagnie
   */
  const creerCompagnie = useCallback(async (data: CompagnieFormData) => {
    setLoading(true);
    const response = await compagnieService.creerCompagnie(data);
    setLoading(false);

    if (response.statut) {
      Alert.alert('Succès', 'Compagnie créée avec succès');
      return response.data;
    } else {
      Alert.alert('Erreur', response.message || 'Une erreur est survenue');
      return null;
    }
  }, []);

  /**
   * Met à jour une compagnie
   */
  const mettreAJourCompagnie = useCallback(async (id: number, data: CompagnieUpdateData) => {
    setLoading(true);
    const response = await compagnieService.mettreAJourCompagnie(id, data);
    setLoading(false);

    if (response.statut) {
      Alert.alert('Succès', 'Compagnie modifiée avec succès');
      return response.data;
    } else {
      Alert.alert('Erreur', response.message || 'Une erreur est survenue');
      return null;
    }
  }, []);

  /**
   * Change le statut d'une compagnie
   */
  const changerStatut = useCallback(async (id: number, statut: number) => {
    const response = await compagnieService.changerStatut(id, statut);
    if (response.statut) {
      Alert.alert('Succès', response.message || 'Statut modifié avec succès');
      return true;
    } else {
      Alert.alert('Erreur', response.message || 'Une erreur est survenue');
      return false;
    }
  }, []);

  /**
   * Supprime une compagnie
   */
  const supprimerCompagnie = useCallback(async (id: number) => {
    const response = await compagnieService.supprimerCompagnie(id);
    if (response.statut) {
      Alert.alert('Succès', 'Compagnie supprimée avec succès');
      return true;
    } else {
      Alert.alert('Erreur', response.message || 'Une erreur est survenue');
      return false;
    }
  }, []);

  /**
   * Rafraîchit les données
   */
  const rafraichir = useCallback(async (filtres?: FiltresCompagnies) => {
    setRefreshing(true);
    await Promise.all([chargerCompagnies(filtres), chargerStatistiques()]);
    setRefreshing(false);
  }, [chargerCompagnies, chargerStatistiques]);

  return {
    compagnies,
    compagnieDetail,
    statistiques,
    loading,
    refreshing,
    chargerCompagnies,
    chargerStatistiques,
    chargerCompagnie,
    creerCompagnie,
    mettreAJourCompagnie,
    changerStatut,
    supprimerCompagnie,
    rafraichir,
  };
};

