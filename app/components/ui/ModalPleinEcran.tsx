import React from 'react';
import { Modal } from 'react-native';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Fenêtre plein écran qui passe sous la barre d'état.
 *
 * Une Modal est une fenêtre native à part : les marges (encoche, barre d'état,
 * barre de navigation) de l'écran principal ne s'y appliquent pas toujours.
 * Le SafeAreaProvider imbriqué mesure celles de la fenêtre elle-même, donc
 * useSafeAreaInsets() renvoie les bonnes valeurs dans le contenu.
 */
export function ModalPleinEcran({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>{children}</SafeAreaProvider>
    </Modal>
  );
}

export default ModalPleinEcran;
