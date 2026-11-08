import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs } from '../../theme/ocean';
import { BoutonIcone } from './BoutonIcone';
import { Texte } from './Texte';

export interface FeuilleModaleProps {
  visible: boolean;
  onClose: () => void;
  titre: string;
  sousTitre?: string;
  /** 'pleine' : occupe presque tout l'écran (listes) ; 'auto' : hauteur du contenu. */
  hauteur?: 'pleine' | 'auto';
  /** Zone fixe en bas (boutons d'action), au-dessus de la barre système. */
  pied?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Feuille qui monte du bas de l'écran (recherche, filtres, formulaires courts).
 * Toucher le fond assombri ou le bouton ✕ la ferme.
 */
export function FeuilleModale({ visible, onClose, titre, sousTitre, hauteur = 'auto', pied, children }: FeuilleModaleProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Fond assombri */}
        <Pressable
          onPress={onClose}
          accessibilityLabel="Fermer"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,20,36,0.55)' }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={hauteur === 'pleine' ? { flex: 1, marginTop: insets.top + 24 } : { maxHeight: '92%' }}
        >
          <View
            accessibilityViewIsModal
            style={{
              flex: hauteur === 'pleine' ? 1 : undefined,
              backgroundColor: couleurs.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              overflow: 'hidden',
            }}
          >
            {/* Poignée + en-tête */}
            <View style={{ paddingTop: 10, paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}>
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: couleurs.champ }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texte variante="sousTitre" taille={20}>{titre}</Texte>
                  {!!sousTitre && <Texte variante="legende">{sousTitre}</Texte>}
                </View>
                <BoutonIcone icone="close" libelle="Fermer" onPress={onClose} />
              </View>
            </View>

            <View style={{ flex: hauteur === 'pleine' ? 1 : undefined, flexShrink: 1 }}>{children}</View>

            {pied && (
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  paddingBottom: Math.max(insets.bottom, 12) + 8,
                  borderTopWidth: 1,
                  borderTopColor: couleurs.separateur,
                  backgroundColor: couleurs.surface,
                }}
              >
                {pied}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default FeuilleModale;
