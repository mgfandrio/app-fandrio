import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import compagnieService from '../services/compagnies/compagnieService';

export type Categorie = 'classique' | 'vip' | 'premium';

export interface CompagnieModes {
  mode_vip: boolean;
  mode_premium: boolean;
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
    loading,
    reload: charger,
  };
}
