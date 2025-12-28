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
import { chauffeurService } from '../../../services';
import { Chauffeur } from '../../../types/chauffeur';
import { useConfirmDialog } from '../../common/ConfirmDialog';

interface Props {
  visible: boolean;
  chauffeurId: number | null;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onRefresh?: () => void;
}

export const ChauffeurDetailModal: React.FC<Props> = ({
  visible,
  chauffeurId,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [chauffeur, setChauffeur] = useState<Chauffeur | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && chauffeurId) {
      chargerChauffeur();
    }
  }, [visible, chauffeurId]);

  const chargerChauffeur = async () => {
    if (!chauffeurId) return;

    setLoading(true);
    try {
      const response = await chauffeurService.obtenirChauffeur(chauffeurId);
      setLoading(false);

      if (response.data) {
        setChauffeur(response.data as Chauffeur);
      } else {
        showDialog({
          title: 'Erreur',
          message: 'Impossible de charger les détails',
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => onClose(),
          onCancel: () => onClose(),
        });
      }
    } catch (error: any) {
      setLoading(false);
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
    if (!chauffeur) return;

    const newStatut = chauffeur.chauff_statut === 1 ? 0 : 1;
    const message =
      newStatut === 1
        ? `Activer le chauffeur ${chauffeur.chauff_nom} ${chauffeur.chauff_prenom} ?`
        : `Désactiver le chauffeur ${chauffeur.chauff_nom} ${chauffeur.chauff_prenom} ?`;

    showDialog({
      title: 'Confirmation',
      message,
      type: newStatut === 1 ? 'success' : 'warning',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const response = await chauffeurService.changerEtatChauffeur(
            chauffeur.chauff_id
          );

          if (response.statut || !('statut' in response)) {
            await chargerChauffeur();
            onRefresh?.();
            setActionLoading(false);

            showDialog({
              title: 'Succès',
              message: response.message || 'État modifié avec succès',
              type: 'success',
              confirmText: 'OK',
              onConfirm: () => {},
              onCancel: () => {},
            });
          } else {
            setActionLoading(false);
            showDialog({
              title: 'Erreur',
              message:
                response.message || 'Une erreur est survenue lors du changement',
              type: 'danger',
              confirmText: 'OK',
              onConfirm: () => {},
              onCancel: () => {},
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

  const handleSupprimer = () => {
    if (!chauffeur) return;

    showDialog({
      title: 'Confirmation',
      message: `Êtes-vous sûr de vouloir supprimer ${chauffeur.chauff_nom} ${chauffeur.chauff_prenom} ?`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const response = await chauffeurService.supprimerChauffeur(
            chauffeur.chauff_id
          );

          if (response.statut || !('statut' in response)) {
            onRefresh?.();
            setActionLoading(false);

            showDialog({
              title: 'Succès',
              message: 'Chauffeur supprimé avec succès',
              type: 'success',
              confirmText: 'OK',
              onConfirm: () => {
                onClose();
              },
              onCancel: () => {},
            });
          } else {
            setActionLoading(false);
            showDialog({
              title: 'Erreur',
              message:
                response.message ||
                'Une erreur est survenue lors de la suppression',
              type: 'danger',
              confirmText: 'OK',
              onConfirm: () => {},
              onCancel: () => {},
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
                  <Ionicons name="person" size={26} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">Détails Chauffeur</Text>
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
          ) : chauffeur ? (
            <ScrollView className="flex-1 p-4">
              {/* Informations principales */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <View className="flex-row items-center mb-4">
                  <View className="bg-blue-500 rounded-xl w-16 h-16 items-center justify-center mr-4">
                    <Ionicons name="person" size={32} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg">
                      {chauffeur.chauff_nom} {chauffeur.chauff_prenom}
                    </Text>
                    {getStatutBadge(chauffeur.chauff_statut)}
                  </View>
                </View>

                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <Ionicons name="card" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">CIN: {chauffeur.chauff_cin}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="calendar" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Âge: {chauffeur.chauff_age} ans</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="call" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">{chauffeur.chauff_phone}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="license" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Permis: Catégorie {chauffeur.chauff_permis}</Text>
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
                      onEdit?.(chauffeur.chauff_id);
                    }}
                    disabled={actionLoading}
                  >
                    <View className="bg-blue-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                      <Ionicons name="create" size={28} color="#3b82f6" />
                    </View>
                    <Text className="text-gray-700 text-xs font-medium">Modifier</Text>
                  </TouchableOpacity>

                  {/* Actif/Inactif */}
                  {chauffeur.chauff_statut === 1 ? (
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

              <View className="pb-4" />
              </View>
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Chauffeur introuvable</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
