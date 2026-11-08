import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs } from '../../theme/ocean';
import { BoutonIcone } from './BoutonIcone';
import { Texte } from './Texte';

/**
 * Barre du haut d'un écran secondaire : retour (ou fermer / menu), titre,
 * sous-titre et actions à droite. Gère la zone de la barre d'état.
 *
 * - clair  : fond blanc, pour les écrans de liste et de formulaire
 * - marine : fond ocean950, pour les écrans de détail avec un bloc marine
 */
export interface EnTeteProps {
  titre: string;
  sousTitre?: string;
  /** 'retour' (défaut), 'fermer' pour un formulaire, 'menu' pour l'admin compagnie, 'aucun'. */
  gauche?: 'retour' | 'fermer' | 'menu' | 'aucun';
  onGauche?: () => void;
  droite?: React.ReactNode;
  variante?: 'clair' | 'marine';
  /** Contenu supplémentaire sous la ligne de titre (étapes, filtres). */
  children?: React.ReactNode;
}

export function EnTete({ titre, sousTitre, gauche = 'retour', onGauche, droite, variante = 'clair', children }: EnTeteProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const marine = variante === 'marine';

  const icone = gauche === 'fermer' ? 'close' : gauche === 'menu' ? 'menu' : 'chevron-back';
  const libelle = gauche === 'fermer' ? 'Fermer' : gauche === 'menu' ? 'Ouvrir le menu' : 'Retour';
  const action = onGauche ?? (() => router.back());

  return (
    <View
      style={{
        backgroundColor: marine ? couleurs.ocean950 : couleurs.surface,
        borderBottomWidth: marine ? 0 : 1,
        borderBottomColor: couleurs.ligne,
        paddingTop: insets.top + 8,
        paddingBottom: 14,
        paddingHorizontal: 16,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {gauche !== 'aucun' && (
          <BoutonIcone icone={icone} libelle={libelle} onPress={action} variante={marine ? 'marine' : 'clair'} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texte variante="sousTitre" couleur={marine ? '#FFFFFF' : couleurs.encre} numberOfLines={1}>
            {titre}
          </Texte>
          {!!sousTitre && (
            <Texte variante="legende" couleur={marine ? couleurs.texteSurMarine : couleurs.gris} numberOfLines={1}>
              {sousTitre}
            </Texte>
          )}
        </View>
        {droite}
      </View>
      {children}
    </View>
  );
}

export default EnTete;
