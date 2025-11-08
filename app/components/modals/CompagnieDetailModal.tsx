import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompagnieDetaillee } from '../../types/compagnie';
import compagnieService from '../../services/compagnies/compagnieService';
import { useConfirmDialog } from '../common/ConfirmDialog';

interface Props {
  visible: boolean;
  compagnieId: number | null;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onRefresh?: () => void;
}

export const CompagnieDetailModal: React.FC<Props> = ({
  visible,
  compagnieId,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [compagnie, setCompagnie] = useState<CompagnieDetaillee | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && compagnieId) {
      chargerCompagnie();
    }
  }, [visible, compagnieId]);

  const chargerCompagnie = async () => {
    if (!compagnieId) return;

    setLoading(true);
    const response = await compagnieService.getCompagnie(compagnieId);
    setLoading(false);

    if (response.statut && response.data) {
      setCompagnie(response.data);
    } else {
      showDialog({
        title: 'Erreur',
        message: response.message || 'Impossible de charger les détails',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => onClose(),
        onCancel: () => onClose()
      });
    }
  };

  const handleChangerStatut = async (nouveauStatut: number) => {
    if (!compagnieId) return;

    const message =
      nouveauStatut === 1
        ? 'Voulez-vous activer cette compagnie ?'
        : 'Voulez-vous désactiver cette compagnie ?';

    showDialog({
      title: 'Confirmation',
      message,
      type: nouveauStatut === 1 ? 'success' : 'warning',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        const response = await compagnieService.changerStatut(compagnieId, nouveauStatut);
        
        if (response.statut) {
          // Recharger immédiatement les données avant d'afficher le message
          await chargerCompagnie();
          onRefresh?.();
          setActionLoading(false);
          
          showDialog({
            title: 'Succès',
            message: response.message || 'Statut modifié avec succès',
            type: 'success',
            confirmText: 'OK',
            onConfirm: () => {},
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

  const handleSupprimer = () => {
    if (!compagnieId) return;

    showDialog({
      title: 'Confirmation',
      message: 'Voulez-vous vraiment supprimer cette compagnie ?',
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        const response = await compagnieService.supprimerCompagnie(compagnieId);
        
        if (response.statut) {
          // Recharger la liste avant de fermer
          onRefresh?.();
          setActionLoading(false);
          
          showDialog({
            title: 'Succès',
            message: 'Compagnie supprimée avec succès',
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

  const getStatutBadge = (statut: number) => {
    const configs = {
      1: { bg: 'bg-green-100', text: 'text-green-600', label: 'Actif' },
      2: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Inactif' },
      3: { bg: 'bg-red-100', text: 'text-red-600', label: 'Supprimée' },
    };
    const config = configs[statut as keyof typeof configs] || configs[2];
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
                  <Ionicons name="business" size={26} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">Détails Compagnie</Text>
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
          ) : compagnie ? (
            <ScrollView className="flex-1 p-4">
              {/* Informations principales */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <View className="flex-row items-center mb-4">
                  <View className="bg-blue-500 rounded-xl w-16 h-16 items-center justify-center mr-4">
                    <Ionicons name="business" size={32} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg">{compagnie.nom}</Text>
                    {getStatutBadge(compagnie.statut)}
                  </View>
                </View>

                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <Ionicons name="document-text" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">NIF: {compagnie.nif}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="document" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">STAT: {compagnie.stat}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="mail" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">{compagnie.email}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="call" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">{compagnie.telephone}</Text>
                  </View>
                  <View className="flex-row items-start">
                    <Ionicons name="location" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3 flex-1">{compagnie.adresse}</Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <Text className="text-gray-900 font-bold text-base mb-2">Description</Text>
                <Text className="text-gray-700">{compagnie.description}</Text>
              </View>

              {/* Administrateurs */}
              {compagnie.administrateurs.length > 0 && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                  <Text className="text-gray-900 font-bold text-base mb-3">
                    Administrateurs ({compagnie.administrateurs.length})
                  </Text>
                  {compagnie.administrateurs.map((admin) => (
                    <View
                      key={admin.id}
                      className="flex-row items-center p-3 bg-gray-50 rounded-xl mb-2"
                    >
                      <View className="bg-purple-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                        <Ionicons name="person" size={20} color="#8b5cf6" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 font-semibold">
                          {admin.prenom} {admin.nom}
                        </Text>
                        <Text className="text-gray-500 text-sm">{admin.email}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Provinces desservies */}
              {compagnie.provinces_desservies.length > 0 && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                  <Text className="text-gray-900 font-bold text-base mb-3">
                    Provinces desservies ({compagnie.provinces_desservies.length})
                  </Text>
                  <View className="flex-row flex-wrap">
                    {compagnie.provinces_desservies.map((province) => (
                      <View key={province.id} className="bg-blue-100 rounded-full px-3 py-1 m-1">
                        <Text className="text-blue-600 text-sm">{province.nom}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Modes de paiement */}
              {compagnie.modes_paiement_acceptes.length > 0 && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                  <Text className="text-gray-900 font-bold text-base mb-3">
                    Modes de paiement acceptés ({compagnie.modes_paiement_acceptes.length})
                  </Text>
                  <View className="flex-row flex-wrap">
                    {compagnie.modes_paiement_acceptes.map((mode) => (
                      <View key={mode.id} className="bg-green-100 rounded-full px-3 py-1 m-1">
                        <Text className="text-green-600 text-sm">{mode.nom}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

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
                        onEdit(compagnie.id);
                      }}
                      disabled={actionLoading}
                    >
                      <View className="bg-blue-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                        <Ionicons name="create" size={28} color="#3b82f6" />
                      </View>
                      <Text className="text-gray-700 text-xs font-medium">Modifier</Text>
                    </TouchableOpacity>
                  )}

                  {/* Activer/Désactiver */}
                  {compagnie.statut === 1 ? (
                    <TouchableOpacity
                      className="items-center"
                      onPress={() => handleChangerStatut(2)}
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
                      onPress={() => handleChangerStatut(1)}
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
                  {compagnie.statut !== 3 && (
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
                  )}
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

