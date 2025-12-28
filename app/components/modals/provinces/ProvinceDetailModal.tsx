import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import provinceService from '../../../services/provinces/provinceService';
import { ProvinceDetaillee } from '../../../types/province';
import { useConfirmDialog } from '../../common/ConfirmDialog';

interface Props {
  visible: boolean;
  provinceId: number | null;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onRefresh?: () => void;
}

export const ProvinceDetailModal: React.FC<Props> = ({
  visible,
  provinceId,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [province, setProvince] = useState<ProvinceDetaillee | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && provinceId) {
      chargerProvince();
    }
  }, [visible, provinceId]);

  const chargerProvince = async () => {
    if (!provinceId) return;

    setLoading(true);
    const response = await provinceService.getProvince(provinceId);
    setLoading(false);

    if (response.statut && 'data' in response && response.data) {
      setProvince(response.data);
    } else {
      showDialog({
        title: 'Erreur',
        message: ('message' in response ? response.message : 'Impossible de charger les détails') || 'Impossible de charger les détails',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => onClose(),
        onCancel: () => onClose()
      });
    }
  };

  const handleSupprimer = () => {
    if (!provinceId) return;

    showDialog({
      title: 'Confirmation',
      message: 'Voulez-vous vraiment supprimer cette province ?',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        const response = await provinceService.supprimerProvince(provinceId);
        
        if (response.statut) {
          onRefresh?.();
          setActionLoading(false);
          
          showDialog({
            title: 'Succès',
            message: 'Province supprimée avec succès',
            type: 'success',
            confirmText: 'OK',
            onConfirm: () => {
              onClose();
            },
            onCancel: () => {}
          });
        } else {
          setActionLoading(false);
          showDialog({
            title: 'Erreur',
            message: response.message || 'Une erreur est survenue',
            type: 'danger',
            confirmText: 'OK',
            onConfirm: () => {},
            onCancel: () => {}
          });
        }
      },
      onCancel: () => {}
    });
  };

  // Palette de couleurs uniforme pour les orientations (utilise les flèches sauf pour Centre)
  const getOrientationConfig = (orientation: string) => {
    // Couleurs spécifiques pour Est (bleu foncé) et Ouest (bleu clair)
    const orientationColors: { [key: string]: { bg: string; text: string; hex: string } } = {
      'Est': { bg: 'bg-blue-200', text: 'text-blue-700', hex: '#1e40af' }, // Bleu foncé
      'Ouest': { bg: 'bg-blue-100', text: 'text-blue-600', hex: '#2563eb' }, // Bleu plus clair
    };
    
    // Si c'est Est ou Ouest, utiliser les couleurs spécifiques
    if (orientationColors[orientation]) {
      const iconMap: { [key: string]: string } = {
        'Nord': 'arrow-up',
        'Sud': 'arrow-down',
        'Est': 'arrow-forward',
        'Ouest': 'arrow-back',
        'Centre': 'location',
      };
      
      return {
        ...orientationColors[orientation],
        icon: iconMap[orientation] || 'location',
      };
    }
    
    // Pour les autres orientations, utiliser le système de hash
    const hash = orientation.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Palette de couleurs moderne et uniforme
    const colorPalette = [
      { bg: 'bg-indigo-100', text: 'text-indigo-600', hex: '#4f46e5' },
      { bg: 'bg-purple-100', text: 'text-purple-600', hex: '#7c3aed' },
      { bg: 'bg-pink-100', text: 'text-pink-600', hex: '#db2777' },
      { bg: 'bg-rose-100', text: 'text-rose-600', hex: '#e11d48' },
      { bg: 'bg-cyan-100', text: 'text-cyan-600', hex: '#06b6d4' },
      { bg: 'bg-teal-100', text: 'text-teal-600', hex: '#14b8a6' },
      { bg: 'bg-emerald-100', text: 'text-emerald-600', hex: '#10b981' },
    ];
    
    // Assigner une couleur basée sur le hash (toujours la même pour la même orientation)
    const config = colorPalette[hash % colorPalette.length];
    
    // Icônes spécifiques par orientation (flèches sauf pour Centre)
    const iconMap: { [key: string]: string } = {
      'Nord': 'arrow-up',
      'Sud': 'arrow-down',
      'Est': 'arrow-forward',
      'Ouest': 'arrow-back',
      'Centre': 'location',
    };
    
    return {
      ...config,
      icon: iconMap[orientation] || 'location',
    };
  };

  const getOrientationBadge = (orientation: string) => {
    const config = getOrientationConfig(orientation);
    return (
      <View className={`${config.bg} rounded-full px-3 py-1 flex-row items-center`}>
        <Ionicons name={config.icon as any} size={14} color={config.hex} />
        <Text className={`${config.text} text-xs font-semibold ml-1`}>{orientation}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <DialogComponent />
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl h-5/6">
          {/* Header */}
          <View className="bg-blue-600">
            <View className="flex-row items-center justify-between px-5 pt-6 pb-5">
              <View className="flex-row items-center flex-1">
                <View className="bg-white/20 rounded-full p-3 mr-3">
                  <Ionicons name="map" size={26} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">Détails Province</Text>
                  <Text className="text-white/90 text-sm mt-1">Informations complètes</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={onClose} 
                className="bg-white/20 rounded-full p-2.5 ml-2"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : province ? (
            <ScrollView className="flex-1 p-4">
              {/* Informations principales */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <View className="flex-row items-center mb-4">
                  <View className="bg-blue-500 rounded-xl w-16 h-16 items-center justify-center mr-4">
                    <Ionicons name="map" size={32} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg">{province.nom}</Text>
                    {getOrientationBadge(province.orientation)}
                  </View>
                </View>

                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <Ionicons name="location" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Nom: {province.nom}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="compass" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Orientation: {province.orientation}</Text>
                  </View>
                  {province.date_creation && (
                    <View className="flex-row items-center">
                      <Ionicons name="calendar" size={20} color="#6b7280" />
                      <Text className="text-gray-700 ml-3">
                        Créée le: {new Date(province.date_creation).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <Text className="text-gray-900 font-bold text-base mb-3">Actions rapides</Text>
                <View className="flex-row justify-around items-center">
                  {/* Modifier */}
                  {onEdit && (
                    <TouchableOpacity
                      className="items-center"
                      onPress={() => {
                        onClose();
                        onEdit(province.id);
                      }}
                      disabled={actionLoading}
                    >
                      <View className="bg-blue-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                        <Ionicons name="create" size={28} color="#3b82f6" />
                      </View>
                      <Text className="text-gray-700 text-xs font-medium">Modifier</Text>
                    </TouchableOpacity>
                  )}

                  {/* Supprimer */}
                  <TouchableOpacity
                    className="items-center"
                    onPress={handleSupprimer}
                    disabled={actionLoading}
                  >
                    <View className="bg-red-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                      {actionLoading ? (
                        <ActivityIndicator color="#ef4444" />
                      ) : (
                        <Ionicons name="trash" size={28} color="#ef4444" />
                      )}
                    </View>
                    <Text className="text-gray-700 text-xs font-medium">Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Aucune donnée disponible</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

