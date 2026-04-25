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
import { trajetService } from '../../../services/trajets/trajetService';
import { Trajet } from '../../../types/trajet';
import { useConfirmDialog } from '../../common/ConfirmDialog';

interface Props {
  visible: boolean;
  trajetId: number | null;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onRefresh?: () => void;
}

export const TrajetDetailModal: React.FC<Props> = ({
  visible,
  trajetId,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [trajet, setTrajet] = useState<Trajet | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && trajetId) {
      chargerTrajet();
    }
  }, [visible, trajetId]);

  const chargerTrajet = async () => {
    if (!trajetId) return;

    setLoading(true);
    try {
      const response = await trajetService.obtenirTrajet(trajetId);
      setLoading(false);

      if (response.data) {
        setTrajet(response.data as any);
      } else {
        showDialog({
          title: 'Erreur',
          message: 'Impossible de charger les détails du trajet',
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => onClose(),
          onCancel: () => onClose(),
        });
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Erreur chargerTrajet:', error);
      showDialog({
        title: 'Erreur',
        message: error?.message || 'Impossible de charger les détails',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => onClose(),
        onCancel: () => onClose(),
      });
    }
  };

  const handleChangerEtat = () => {
    if (!trajet) return;

    const newStatut = trajet.statut === 1 ? 0 : 1;
    const depart = trajet.province_depart?.nom_province || trajet.trajet_depart || '';
    const arrivee = trajet.province_arrivee?.nom_province || trajet.trajet_destination || '';
    const message =
      newStatut === 1
        ? `Activer le trajet ${depart} → ${arrivee} ?`
        : `Désactiver le trajet ${depart} → ${arrivee} ?`;

    showDialog({
      title: 'Confirmation',
      message,
      type: newStatut === 1 ? 'success' : 'warning',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const trajetId = trajet.id_trajet || trajet.trajet_id;
          const response = await trajetService.changerEtatTrajet(trajetId);

          if (response.statut || !('statut' in response)) {
            await chargerTrajet();
            onRefresh?.();
            setActionLoading(false);
          } else {
            showDialog({
              title: 'Erreur',
              message: response.message || 'Une erreur est survenue',
              type: 'danger',
              confirmText: 'OK',
              onConfirm: () => setActionLoading(false),
              onCancel: () => setActionLoading(false),
            });
          }
        } catch (error: any) {
          setActionLoading(false);
          showDialog({
            title: 'Erreur',
            message: error?.message || 'Une erreur est survenue',
            type: 'danger',
            confirmText: 'OK',
            onConfirm: () => {},
            onCancel: () => {},
          });
        }
      },
      onCancel: () => {},
    });
  };

  const getStatutBadge = (statut: number) => {
    const configs = {
      1: { bg: 'bg-green-100', text: 'text-green-600', label: 'Actif' },
      0: { bg: 'bg-red-100', text: 'text-red-600', label: 'Inactif' },
    };
    const config = configs[statut as keyof typeof configs] || configs[0];
    return (
      <View className={`${config.bg} rounded-full px-3 py-1`}>
        <Text className={`${config.text} text-xs font-semibold`}>{config.label}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
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
                  <Text className="text-white text-xl font-bold">Détails Trajet</Text>
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
          ) : trajet ? (
            <ScrollView className="flex-1 p-4">
              {/* Informations principales */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <View className="flex-row items-center mb-4">
                  <View className="bg-blue-500 rounded-xl w-16 h-16 items-center justify-center mr-4">
                    <Ionicons name="map" size={32} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg">
                      {trajet.nom_trajet || trajet.trajet_nom || 'Sans nom'}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      {trajet.province_depart?.nom_province || trajet.trajet_depart} → {trajet.province_arrivee?.nom_province || trajet.trajet_destination}
                    </Text>
                    <View className="mt-2">
                      {getStatutBadge(trajet.statut || trajet.trajet_statut)}
                    </View>
                  </View>
                </View>

                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <Ionicons name="location" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Distance: {trajet.distance_km || trajet.trajet_distance} km</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="time" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Durée: {trajet.duree || trajet.trajet_duree || '-'}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="pricetag" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Prix: {trajet.tarif || trajet.trajet_prix || '0'} AR</Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <Text className="text-gray-900 font-bold text-base mb-3">Actions rapides</Text>
                <View className="flex-row justify-around items-center">
                  {/* Modifier */}
                  <TouchableOpacity
                    className="items-center"
                    onPress={() => {
                      onClose();
                      onEdit?.(trajet.id_trajet || trajet.trajet_id);
                    }}
                    disabled={actionLoading}
                  >
                    <View className="bg-blue-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                      <Ionicons name="create" size={28} color="#3b82f6" />
                    </View>
                    <Text className="text-gray-700 text-xs font-medium">Modifier</Text>
                  </TouchableOpacity>

                  {/* Actif/Inactif */}
                  {trajet.statut === 1 || trajet.trajet_statut === 1 ? (
                    <TouchableOpacity
                      className="items-center"
                      onPress={handleChangerEtat}
                      disabled={actionLoading}
                    >
                      <View className="bg-orange-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                        {actionLoading ? (
                          <ActivityIndicator color="#f97316" />
                        ) : (
                          <Ionicons name="pause-circle" size={28} color="#f97316" />
                        )}
                      </View>
                      <Text className="text-gray-700 text-xs font-medium">Désactiver</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      className="items-center"
                      onPress={handleChangerEtat}
                      disabled={actionLoading}
                    >
                      <View className="bg-green-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                        {actionLoading ? (
                          <ActivityIndicator color="#10b981" />
                        ) : (
                          <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                        )}
                      </View>
                      <Text className="text-gray-700 text-xs font-medium">Activer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View className="pb-8" />
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Trajet introuvable</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
