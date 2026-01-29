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

    const trajetNom = voyage.trajet?.nom_trajet || voyage.trajet?.trajet_nom || 'Trajet sans nom';
    const message = `Êtes-vous sûr d'annuler le voyage: ${trajetNom} du ${voyage.voyage_date} à ${voyage.voyage_heure_depart} ?`;

    showDialog({
      title: 'Confirmation',
      message,
      type: 'warning',
      confirmText: 'Annuler',
      cancelText: 'Fermer',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const voyageId = voyage.id_voyage || voyage.voyage_id;
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
                      {voyage.trajet?.nom_trajet || voyage.trajet?.trajet_nom || 'Trajet sans nom'}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      {voyage.trajet?.province_depart?.nom_province || voyage.trajet?.province_depart?.pro_nom || 'Départ'} → {voyage.trajet?.province_arrivee?.nom_province || voyage.trajet?.province_arrivee?.pro_nom || 'Arrivée'}
                    </Text>
                    <View className="mt-2">
                      {getStatutBadge(voyage.statut || voyage.voyage_statut || 0)}
                    </View>
                  </View>
                </View>

                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <Ionicons name="calendar" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Date: {voyage.voyage_date}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="time" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">Heure: {voyage.voyage_heure_depart}</Text>
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
                    <Text className="text-gray-700 ml-3">Distance: {voyage.trajet?.distance_km || voyage.trajet?.trajet_distance || '-'} km</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="pricetag" size={20} color="#6b7280" />
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
                      <Text className="text-gray-700 ml-3">{voyage.voiture.voit_matricule || voyage.voiture.immatriculation || voyage.voiture.voit_immatriculation}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="information-circle" size={20} color="#6b7280" />
                      <Text className="text-gray-700 ml-3">{voyage.voiture.voit_marque || voyage.voiture.marque || '-'} {voyage.voiture.voit_modele || voyage.voiture.model || '-'}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="people" size={20} color="#6b7280" />
                      <Text className="text-gray-700 ml-3">Capacité: {voyage.voiture.voit_places || voyage.voiture.capacite || '-'} places</Text>
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
                      onEdit?.(voyage.id_voyage || voyage.voyage_id);
                    }}
                    disabled={actionLoading}
                  >
                    <View className="bg-blue-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                      <Ionicons name="create" size={28} color="#3b82f6" />
                    </View>
                    <Text className="text-gray-700 text-xs font-medium">Modifier</Text>
                  </TouchableOpacity>

                  {/* Annuler */}
                  <TouchableOpacity
                    className="items-center"
                    onPress={handleAnnulerVoyage}
                    disabled={actionLoading}
                  >
                    <View className="bg-red-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                      {actionLoading ? (
                        <ActivityIndicator color="#ef4444" />
                      ) : (
                        <Ionicons name="close-circle" size={28} color="#ef4444" />
                      )}
                    </View>
                    <Text className="text-gray-700 text-xs font-medium">Annuler</Text>
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
