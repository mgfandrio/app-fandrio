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
import { chauffeurService, voitureService } from '../../../services';
import { Chauffeur } from '../../../types/chauffeur';
import { Voiture } from '../../../types/voiture';
import { useConfirmDialog } from '../../common/ConfirmDialog';

interface Props {
  visible: boolean;
  voitureId: number | null;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onRefresh?: () => void;
}

export const VoitureDetailModal: React.FC<Props> = ({
  visible,
  voitureId,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [voiture, setVoiture] = useState<Voiture | null>(null);
  const [chauffeur, setChauffeur] = useState<Chauffeur | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && voitureId) {
      chargerVoiture();
    }
  }, [visible, voitureId]);

  const chargerVoiture = async () => {
    if (!voitureId) return;

    setLoading(true);
    try {
      const response = await voitureService.obtenirVoiture(voitureId);
      setLoading(false);

      if (response.data) {
        const voitureData = response.data as Voiture;
        setVoiture(voitureData);
        
        // Charger les infos du chauffeur
        if (voitureData.chauff_id) {
          try {
            const chauffeurResponse = await chauffeurService.obtenirChauffeur(
              voitureData.chauff_id
            );
            if (chauffeurResponse.data) {
              setChauffeur(chauffeurResponse.data as Chauffeur);
            }
          } catch (error) {
            console.warn('Error loading chauffeur:', error);
          }
        }
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
    if (!voiture) return;

    const newStatut = voiture.voit_statut === 1 ? 0 : 1;
    const message =
      newStatut === 1
        ? `Rendre disponible ${voiture.voit_marque} ${voiture.voit_modele} (${voiture.voit_matricule}) ?`
        : `Rendre indisponible ${voiture.voit_marque} ${voiture.voit_modele} (${voiture.voit_matricule}) ?`;

    showDialog({
      title: 'Confirmation',
      message,
      type: newStatut === 1 ? 'success' : 'warning',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const response = await voitureService.changerEtatVoiture(
            voiture.voit_id
          );

          if (response.statut || !('statut' in response)) {
            await chargerVoiture();
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
    if (!voiture) return;

    showDialog({
      title: 'Confirmation',
      message: `Êtes-vous sûr de vouloir supprimer ${voiture.voit_marque} ${voiture.voit_modele} (${voiture.voit_matricule}) ?`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const response = await voitureService.supprimerVoiture(voiture.voit_id);

          if (response.statut || !('statut' in response)) {
            onRefresh?.();
            setActionLoading(false);

            showDialog({
              title: 'Succès',
              message: 'Voiture supprimée avec succès',
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
      1: { bg: 'bg-green-100', text: 'text-green-600', label: 'Disponible' },
      0: { bg: 'bg-red-100', text: 'text-red-600', label: 'Indisponible' },
    };
    const config = configs[statut as keyof typeof configs] || configs[0];
    return (
      <View className={`${config.bg} rounded-full px-3 py-1`}>
        <Text className={`${config.text} text-xs font-semibold`}>{config.label}</Text>
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
                  <Ionicons name="car" size={26} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">Détails Voiture</Text>
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
          ) : voiture ? (
            <ScrollView className="flex-1 p-4">
              {/* Informations principales */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <View className="flex-row items-center mb-4">
                  <View className="bg-blue-500 rounded-xl w-16 h-16 items-center justify-center mr-4">
                    <Ionicons name="car" size={32} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg">
                      {voiture.voit_marque} {voiture.voit_modele}
                    </Text>
                    {getStatutBadge(voiture.voit_statut)}
                  </View>
                </View>

                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <Ionicons name="card" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Matricule: {voiture.voit_matricule}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="people" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Places: {voiture.voit_places}</Text>
                  </View>
                </View>
              </View>

              {/* Chauffeur assigné */}
              {chauffeur && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                  <Text className="text-gray-900 font-bold text-base mb-3">Chauffeur assigné</Text>
                  <View className="flex-row items-center p-3 bg-gray-50 rounded-xl">
                    <View className="bg-blue-100 rounded-full w-12 h-12 items-center justify-center mr-3">
                      <Ionicons name="person" size={24} color="#2563eb" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold">
                        {chauffeur.chauff_nom} {chauffeur.chauff_prenom}
                      </Text>
                      <Text className="text-gray-500 text-sm">{chauffeur.chauff_cin}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <Text className="text-gray-900 font-bold text-base mb-3">Actions rapides</Text>
                <View className="flex-row justify-around items-center">
                  {/* Modifier */}
                  <TouchableOpacity
                    className="items-center"
                    onPress={() => {
                      onClose();
                      onEdit?.(voiture.voit_id);
                    }}
                    disabled={actionLoading}
                  >
                    <View className="bg-blue-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                      <Ionicons name="create" size={28} color="#3b82f6" />
                    </View>
                    <Text className="text-gray-700 text-xs font-medium">Modifier</Text>
                  </TouchableOpacity>

                  {/* Disponible/Indisponible */}
                  {voiture.voit_statut === 1 ? (
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
                      <Text className="text-gray-700 text-xs font-medium">Indisponible</Text>
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
                      <Text className="text-gray-700 text-xs font-medium">Disponible</Text>
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
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Voiture introuvable</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
