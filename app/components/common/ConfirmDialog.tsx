import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Pressable
} from 'react-native';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  confirmBg?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  type?: 'danger' | 'warning' | 'success' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  icon,
  iconColor,
  iconBg,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmColor,
  confirmBg,
  onConfirm,
  onCancel,
  loading = false,
  type = 'info'
}) => {
  // Configuration par défaut selon le type
  const getTypeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: icon || 'alert-circle',
          iconColor: iconColor || '#ef4444',
          iconBg: iconBg || '#fee2e2',
          confirmColor: confirmColor || '#fff',
          confirmBg: confirmBg || '#ef4444'
        };
      case 'warning':
        return {
          icon: icon || 'warning',
          iconColor: iconColor || '#f97316',
          iconBg: iconBg || '#ffedd5',
          confirmColor: confirmColor || '#fff',
          confirmBg: confirmBg || '#f97316'
        };
      case 'success':
        return {
          icon: icon || 'checkmark-circle',
          iconColor: iconColor || '#10b981',
          iconBg: iconBg || '#d1fae5',
          confirmColor: confirmColor || '#fff',
          confirmBg: confirmBg || '#10b981'
        };
      case 'info':
      default:
        return {
          icon: icon || 'information-circle',
          iconColor: iconColor || '#3b82f6',
          iconBg: iconBg || '#dbeafe',
          confirmColor: confirmColor || '#fff',
          confirmBg: confirmBg || '#3b82f6'
        };
    }
  };

  const config = getTypeConfig();

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
        className="flex-1 bg-black/50 items-center justify-center px-6"
        onPress={onCancel}
      >
        <Pressable 
          className="bg-white rounded-3xl w-full max-w-sm shadow-2xl"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icône */}
          <View className="items-center pt-8 pb-4">
            <View 
              className="rounded-full p-4 shadow-sm"
              style={{ backgroundColor: config.iconBg }}
            >
              <Ionicons 
                name={config.icon} 
                size={48} 
                color={config.iconColor} 
              />
            </View>
          </View>

          {/* Contenu */}
          <View className="px-6 pb-6">
            <Text className="text-gray-900 text-xl font-bold text-center mb-2">
              {title}
            </Text>
            <Text className="text-gray-500 text-center leading-5">
              {message}
            </Text>
          </View>

          {/* Boutons */}
          <View className="flex-row border-t border-gray-100">
            <TouchableOpacity
              className="flex-1 py-4 items-center border-r border-gray-100"
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text className="text-gray-600 font-semibold text-base">
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 py-4 items-center"
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={config.confirmBg} />
              ) : (
                <Text 
                  className="font-bold text-base"
                  style={{ color: config.confirmBg }}
                >
                  {confirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
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

