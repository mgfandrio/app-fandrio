import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import compagnieService from '../services/compagnies/compagnieService';

export type Categorie = 'classique' | 'vip' | 'premium';

export interface CompagnieLocalisation {
  id: number;
  nom: string;
}

export interface CompagnieModes {
  mode_vip: boolean;
  mode_premium: boolean;
  localisation: CompagnieLocalisation | null;
  provincesDesservies: CompagnieLocalisation[];
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * Récupère les modes VIP / Premium activés pour la compagnie de l'utilisateur courant.
 * Renvoie false/false par défaut si l'utilisateur n'est pas lié à une compagnie.
 */
export function useCompagnieModes(visible: boolean = true): CompagnieModes {
  const [modeVip, setModeVip] = useState(false);
  const [modePremium, setModePremium] = useState(false);
  const [localisation, setLocalisation] = useState<CompagnieLocalisation | null>(null);
  const [provincesDesservies, setProvincesDesservies] = useState<CompagnieLocalisation[]>([]);
  const [loading, setLoading] = useState(false);

  const charger = async () => {
    setLoading(true);
    try {
      const userJson = await SecureStore.getItemAsync('fandrioUser');
      if (!userJson) {
        setLoading(false);
        return;
      }
      const user = JSON.parse(userJson);
      const compId = user.compagnie_id || user.comp_id;
      if (!compId) {
        setLoading(false);
        return;
      }

      const response = await compagnieService.getCompagniePublic(compId);
      if ('data' in response && response.data) {
        setModeVip(!!response.data.mode_vip);
        setModePremium(!!response.data.mode_premium);
        const loc = (response.data as any).localisation;
        setLocalisation(loc && loc.id ? { id: loc.id, nom: loc.nom } : null);
        const desservies = (response.data as any).provinces_desservies;
        setProvincesDesservies(
          Array.isArray(desservies)
            ? desservies.filter((p: any) => p && p.id).map((p: any) => ({ id: p.id, nom: p.nom }))
            : []
        );
      }
    } catch (e) {
      // silencieux : on retombe sur classique
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      charger();
    }
  }, [visible]);

  return {
    mode_vip: modeVip,
    mode_premium: modePremium,
    localisation,
    provincesDesservies,
    loading,
    reload: charger,
  };
}
