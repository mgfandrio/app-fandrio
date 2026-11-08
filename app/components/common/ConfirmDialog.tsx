import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, View } from 'react-native';
import { couleurs, ombres } from '../../theme/ocean';
import { Bouton, VarianteBouton } from '../ui/Bouton';
import { Texte } from '../ui/Texte';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  confirmText?: string;
  /**
   * Libellé du bouton d'annulation. Sans `cancelText`, une popup dont le
   * bouton est « OK » est un simple message : un seul bouton est affiché.
   */
  cancelText?: string;
  confirmColor?: string;
  confirmBg?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  type?: 'danger' | 'warning' | 'success' | 'info';
}

// Apparence par type, aux couleurs du thème Océan
const APPARENCES: Record<
  NonNullable<ConfirmDialogProps['type']>,
  { icone: keyof typeof Ionicons.glyphMap; couleur: string; fond: string; halo: string; bouton: VarianteBouton }
> = {
  success: { icone: 'checkmark', couleur: '#FFFFFF', fond: couleurs.succesVif, halo: couleurs.succesFond, bouton: 'principal' },
  danger: { icone: 'close', couleur: '#FFFFFF', fond: '#C2413A', halo: couleurs.dangerFond, bouton: 'dangerPlein' },
  warning: { icone: 'alert', couleur: '#FFFFFF', fond: couleurs.alerteVif, halo: couleurs.alerteFond, bouton: 'principal' },
  info: { icone: 'information', couleur: '#FFFFFF', fond: couleurs.ocean800, halo: couleurs.ocean50, bouton: 'principal' },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  icon,
  iconColor,
  iconBg,
  confirmText = 'Confirmer',
  cancelText,
  confirmBg,
  onConfirm,
  onCancel,
  loading = false,
  type = 'info'
}) => {
  const a = APPARENCES[type] ?? APPARENCES.info;

  // Simple message (« OK ») : un seul bouton. Confirmation : Annuler + action.
  const estMessage = !cancelText && confirmText === 'OK';
  const libelleAnnuler = cancelText ?? 'Annuler';

  // Une popup d'erreur qui n'est qu'un message se ferme avec un bouton neutre :
  // le rouge plein est réservé à la confirmation d'une action destructive.
  const varianteConfirmer: VarianteBouton = estMessage && type === 'danger' ? 'principal' : a.bouton;

  // Entrée de la carte : léger zoom + montée
  const apparition = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      apparition.setValue(0);
      Animated.timing(apparition, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, apparition]);

  const handleConfirm = async () => {
    if (!loading) {
      await onConfirm();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable
        onPress={loading ? undefined : onCancel}
        accessibilityLabel="Fermer"
        style={{ flex: 1, backgroundColor: 'rgba(6,20,36,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
      >
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 380,
            opacity: apparition,
            transform: [
              { scale: apparition.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              { translateY: apparition.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          }}
        >
          {/* Pressable intérieur : un appui sur la carte ne ferme pas la popup */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
            accessibilityRole="alert"
            style={{
              backgroundColor: couleurs.surface,
              borderRadius: 24,
              paddingHorizontal: 22,
              paddingTop: 28,
              paddingBottom: 20,
              alignItems: 'center',
              gap: 16,
              ...ombres.carte,
            }}
          >
            {/* Icône dans un halo */}
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: iconBg || a.halo, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: iconBg ? 'transparent' : a.fond, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon || a.icone} size={icon ? 34 : 28} color={iconColor || (icon ? a.fond : a.couleur)} />
              </View>
            </View>

            <View style={{ gap: 6, alignSelf: 'stretch' }}>
              <Texte variante="sousTitre" taille={19} centre>
                {title}
              </Texte>
              {!!message && (
                <Texte graisse="moyen" taille={14.5} couleur={couleurs.gris} centre style={{ lineHeight: 21 }}>
                  {message}
                </Texte>
              )}
            </View>

            {/* Boutons */}
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 4 }}>
              {!estMessage && (
                <Bouton
                  titre={libelleAnnuler}
                  variante="secondaire"
                  onPress={onCancel}
                  desactive={loading}
                  compact
                  style={{ flex: 1 }}
                />
              )}
              <Bouton
                titre={confirmText}
                variante={varianteConfirmer}
                onPress={handleConfirm}
                chargement={loading}
                compact
                style={[{ flex: 1 }, confirmBg && !estMessage ? { backgroundColor: confirmBg } : null]}
              />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// Hook personnalisé pour faciliter l'utilisation
export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = React.useState<{
    visible: boolean;
    config: Omit<ConfirmDialogProps, 'visible'>;
  }>({
    visible: false,
    config: {
      title: '',
      message: '',
      onConfirm: () => {},
      onCancel: () => {}
    }
  });

  // Compteur de "génération" : incrémenté à chaque ouverture de dialog.
  // Permet de détecter si un callback (onConfirm/onCancel) a ouvert un NOUVEAU
  // dialog (ex. message de succès) — auquel cas on ne doit pas le masquer.
  const genRef = React.useRef(0);

  const showDialog = (config: Omit<ConfirmDialogProps, 'visible'>) => {
    genRef.current += 1;
    setDialogState({
      visible: true,
      config
    });
  };

  const hideDialog = () => {
    setDialogState((prev) => ({
      ...prev,
      visible: false
    }));
  };

  const DialogComponent = () => (
    <ConfirmDialog
      visible={dialogState.visible}
      {...dialogState.config}
      onCancel={async () => {
        const gen = genRef.current;
        await dialogState.config.onCancel?.();
        // Ne pas masquer si le callback a ouvert un nouveau dialog
        if (genRef.current === gen) hideDialog();
      }}
      onConfirm={async () => {
        const gen = genRef.current;
        await dialogState.config.onConfirm?.();
        // Ne pas masquer si le callback a ouvert un nouveau dialog
        if (genRef.current === gen) hideDialog();
      }}
    />
  );

  return {
    showDialog,
    hideDialog,
    DialogComponent
  };
};
