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
import { voyageService } from '../../services/voyages/voyageService';
import { Voyage } from '../../types/voyage';
import { useConfirmDialog } from '../common/ConfirmDialog';

interface Props {
  visible: boolean;
  voyageId: number | null;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onRefresh?: () => void;
}

export const VoyageDetailModal: React.FC<Props> = ({
  visible,
  voyageId,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && voyageId) {
      chargerVoyage();
    }
  }, [visible, voyageId]);

  const chargerVoyage = async () => {
    if (!voyageId) return;

    setLoading(true);
    try {
      const response = await voyageService.obtenirVoyage(voyageId);
      console.log('Réponse chargerVoyage:', response);
      setLoading(false);

      if (response.data) {
        console.log('Voyage chargé avec succès:', response.data);
        setVoyage(response.data as any);
      } else {
        console.log('Pas de données voyage');
        showDialog({
          title: 'Erreur',
          message: 'Impossible de charger les détails du voyage',
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => onClose(),
          onCancel: () => onClose(),
        });
      }
    } catch (error: any) {
      setLoading(false);
      console.error('Erreur chargerVoyage:', error);
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

  const handleAnnulerVoyage = () => {
    if (!voyage) return;

    const trajetNom = voyage.trajet?.nom || voyage.trajet?.nom_trajet || voyage.trajet?.trajet_nom || 'Trajet sans nom';
    const message = `Êtes-vous sûr d'annuler le voyage: ${trajetNom} du ${voyage.date || voyage.voyage_date} à ${voyage.heure_depart || voyage.voyage_heure_depart} ?`;

    showDialog({
      title: 'Confirmation',
      message,
      type: 'warning',
      confirmText: 'Annuler',
      cancelText: 'Fermer',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const voyageId = voyage.id || voyage.id_voyage || voyage.voyage_id;
          const response = await voyageService.annulerVoyage(voyageId);

          if (response.statut === true) {
            showDialog({
              title: 'Succès',
              message: 'Voyage annulé avec succès',
              type: 'success',
              confirmText: 'OK',
              onConfirm: () => {
                setActionLoading(false);
                onRefresh?.();
                onClose();
              },
              onCancel: () => {
                setActionLoading(false);
                onRefresh?.();
                onClose();
              },
            });
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

  const handleReactiverVoyage = () => {
    if (!voyage) return;

    const trajetNom = voyage.trajet?.nom || voyage.trajet?.nom_trajet || voyage.trajet?.trajet_nom || 'Trajet sans nom';
    const message = `Êtes-vous sûr de vouloir réactiver le voyage: ${trajetNom}? Vous devrez le modifier pour le re-programmer à une date ultérieure.`;

    showDialog({
      title: 'Confirmation',
      message,
      type: 'info',
      confirmText: 'Réactiver',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const voyageId = voyage.id || voyage.id_voyage || voyage.voyage_id;
          const response = await voyageService.reactiverVoyage(voyageId);

          if (response.statut === true) {
            showDialog({
              title: 'Succès',
              message: 'Voyage réactivé avec succès. Vous pouvez maintenant le modifier pour le re-programmer.',
              type: 'success',
              confirmText: 'OK',
              onConfirm: () => {
                setActionLoading(false);
                onRefresh?.();
                onClose();
              },
              onCancel: () => {
                setActionLoading(false);
                onRefresh?.();
                onClose();
              },
            });
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
      0: { bg: 'bg-red-100', text: 'text-red-600', label: 'Annulé' },
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
                  <Ionicons name="navigate" size={26} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">Détails Voyage</Text>
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
          ) : voyage ? (
            <ScrollView className="flex-1 p-4">
              {/* Informations principales */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg">
                      {voyage.trajet?.nom || voyage.trajet?.nom_trajet || voyage.trajet?.trajet_nom || 'Trajet sans nom'}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      {voyage.trajet?.province_depart || 'Départ'} → {voyage.trajet?.province_arrivee || 'Arrivée'}
                    </Text>
                    <View className="mt-2">
                      {getStatutBadge(voyage.statut || voyage.voyage_statut || 0)}
                    </View>
                  </View>
                </View>

                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Date: {voyage.date || voyage.voyage_date}</Text>
                  </View>
                  <View className="flex-row items-center mt-3">
                    <Ionicons name="time" size={20} color="#3b82f6" />
                    <Text className="text-gray-700 ml-3">Heure: {voyage.heure_depart || voyage.voyage_heure_depart}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="people" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Places: {voyage.places_disponibles} disponibles</Text>
                  </View>
                </View>
              </View>

              {/* Trajet Détails */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <Text className="text-gray-900 font-bold text-base mb-3">Trajet</Text>
                <View className="space-y-2">
                  <View className="flex-row items-center">
                    <Ionicons name="location" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Tarif: {voyage.trajet?.tarif ? `${parseFloat(voyage.trajet.tarif).toLocaleString('fr-FR')} Ar` : '0 Ar'}</Text>
                  </View>
                </View>
              </View>

              {/* Voiture Détails */}
              {voyage.voiture && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                  <Text className="text-gray-900 font-bold text-base mb-3">Voiture</Text>
                  <View className="space-y-2">
                    <View className="flex-row items-center">
                      <Ionicons name="car" size={20} color="#6b7280" />
                      <Text className="text-gray-700 ml-3">N° Matricule: {voyage.voiture.matricule || voyage.voiture.voit_matricule || '-'}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="information-circle" size={20} color="#6b7280" />
                      <Text className="text-gray-700 ml-3">{voyage.voiture.marque || voyage.voiture.voit_marque || '-'} {voyage.voiture.modele || voyage.voiture.voit_modele || '-'}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="people" size={20} color="#6b7280" />
                      <Text className="text-gray-700 ml-3">Capacité: {voyage.voiture.capacite || voyage.voiture.voit_places || '-'} places</Text>
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
                      onEdit?.(voyage.id || voyage.id_voyage || voyage.voyage_id);
                    }}
                    disabled={actionLoading}
                  >
                    <View className="bg-blue-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                      <Ionicons name="create" size={28} color="#3b82f6" />
                    </View>
                    <Text className="text-gray-700 text-xs font-medium">Modifier</Text>
                  </TouchableOpacity>

                  {/* Annuler / Réactiver */}
                  <TouchableOpacity
                    className="items-center"
                    onPress={() => {
                      if (voyage.statut === 4 || voyage.voyage_statut === 4) {
                        handleReactiverVoyage();
                      } else {
                        handleAnnulerVoyage();
                      }
                    }}
                    disabled={actionLoading}
                  >
                    <View className={`${
                      voyage.statut === 4 || voyage.voyage_statut === 4
                        ? 'bg-yellow-100'
                        : 'bg-red-100'
                    } rounded-full w-16 h-16 items-center justify-center mb-2`}>
                      {actionLoading ? (
                        <ActivityIndicator color={voyage.statut === 4 || voyage.voyage_statut === 4 ? '#eab308' : '#ef4444'} />
                      ) : (
                        <Ionicons 
                          name={voyage.statut === 4 || voyage.voyage_statut === 4 ? 'refresh' : 'close-circle'} 
                          size={28} 
                          color={voyage.statut === 4 || voyage.voyage_statut === 4 ? '#eab308' : '#ef4444'} 
                        />
                      )}
                    </View>
                    <Text className="text-gray-700 text-xs font-medium">
                      {voyage.statut === 4 || voyage.voyage_statut === 4 ? 'Réactiver' : 'Annuler'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="pb-4" />
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Voyage introuvable</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
