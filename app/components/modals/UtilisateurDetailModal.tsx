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
import { UtilisateurDetaille } from '../../types/utilisateur';
import utilisateurService from '../../services/utilisateurs/utilisateurService';
import { useConfirmDialog } from '../common/ConfirmDialog';

interface Props {
  visible: boolean;
  utilisateurId: number | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export const UtilisateurDetailModal: React.FC<Props> = ({
  visible,
  utilisateurId,
  onClose,
  onRefresh,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [utilisateur, setUtilisateur] = useState<UtilisateurDetaille | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && utilisateurId) {
      chargerUtilisateur();
    }
  }, [visible, utilisateurId]);

  const chargerUtilisateur = async () => {
    if (!utilisateurId) return;

    setLoading(true);
    const response = await utilisateurService.getUtilisateur(utilisateurId);
    setLoading(false);

    if (response.statut && response.data) {
      setUtilisateur(response.data);
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
    if (!utilisateurId) return;

    const messages: Record<number, string> = {
      1: 'Voulez-vous activer cet utilisateur ?',
      2: 'Voulez-vous désactiver cet utilisateur ?',
      3: 'Voulez-vous supprimer cet utilisateur ?',
    };

    const types: Record<number, 'success' | 'warning' | 'danger'> = {
      1: 'success',
      2: 'warning',
      3: 'danger',
    };

    showDialog({
      title: 'Confirmation',
      message: messages[nouveauStatut],
      type: types[nouveauStatut],
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        const response = await utilisateurService.changerStatut(utilisateurId, nouveauStatut);
        
        if (response.statut) {
          // Recharger immédiatement les données avant d'afficher le message
          await chargerUtilisateur();
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

  const getStatutBadge = (statut: number) => {
    const configs = {
      1: { bg: 'bg-green-100', text: 'text-green-600', label: 'Actif' },
      2: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Inactif' },
      3: { bg: 'bg-red-100', text: 'text-red-600', label: 'Supprimé' },
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
          <View className="bg-purple-600">
            <View className="flex-row items-center justify-between px-5 pt-6 pb-5">
              <View className="flex-row items-center flex-1">
                <View className="bg-white/20 rounded-full p-3 mr-3">
                  <Ionicons name="person" size={26} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">Détails Utilisateur</Text>
                  <Text className="text-white/90 text-sm mt-1">Profil et statistiques</Text>
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
          ) : utilisateur ? (
            <ScrollView className="flex-1 p-4">
              {/* Informations principales */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <View className="flex-row items-center mb-4">
                  <View className="bg-blue-500 rounded-full w-16 h-16 items-center justify-center mr-4">
                    <Text className="text-white text-2xl font-bold">
                      {utilisateur.prenom[0]}
                      {utilisateur.nom[0]}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-lg">
                      {utilisateur.prenom} {utilisateur.nom}
                    </Text>
                    {getStatutBadge(utilisateur.statut)}
                  </View>
                </View>

                <View className="space-y-3">
                  <View className="flex-row items-center">
                    <Ionicons name="mail" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">{utilisateur.email}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="call" size={20} color="#6b7280" />
                    <Text className="text-gray-700 ml-3">{utilisateur.telephone}</Text>
                  </View>
                  {utilisateur.date_naissance && (
                    <View className="flex-row items-center">
                      <Ionicons name="calendar" size={20} color="#6b7280" />
                      <Text className="text-gray-700 ml-3">{utilisateur.date_naissance}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Statistiques */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <Text className="text-gray-900 font-bold text-base mb-3">Statistiques</Text>
                <View className="flex-row flex-wrap">
                  <View className="w-1/2 mb-3">
                    <Text className="text-gray-500 text-sm">Total réservations</Text>
                    <Text className="text-gray-900 font-bold text-lg">
                      {utilisateur.statistiques.total_reservations}
                    </Text>
                  </View>
                  <View className="w-1/2 mb-3">
                    <Text className="text-gray-500 text-sm">Confirmées</Text>
                    <Text className="text-green-600 font-bold text-lg">
                      {utilisateur.statistiques.reservations_confirmees}
                    </Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="text-gray-500 text-sm">Annulées</Text>
                    <Text className="text-red-600 font-bold text-lg">
                      {utilisateur.statistiques.reservations_annulees}
                    </Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="text-gray-500 text-sm">Taux confirmation</Text>
                    <Text className="text-blue-600 font-bold text-lg">
                      {utilisateur.statistiques.taux_confirmation}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Voyageurs associés */}
              {utilisateur.voyageurs_associes.length > 0 && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                  <Text className="text-gray-900 font-bold text-base mb-3">
                    Voyageurs associés ({utilisateur.voyageurs_associes.length})
                  </Text>
                  {utilisateur.voyageurs_associes.map((voyageur) => (
                    <View
                      key={voyageur.id}
                      className="flex-row items-center p-3 bg-gray-50 rounded-xl mb-2"
                    >
                      <View className="bg-purple-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                        <Ionicons name="person" size={20} color="#8b5cf6" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 font-semibold">
                          {voyageur.prenom} {voyageur.nom}
                        </Text>
                        <Text className="text-gray-500 text-sm">{voyageur.age} ans</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <Text className="text-gray-900 font-bold text-base mb-3">Actions rapides</Text>
                <View className="flex-row justify-around items-center">
                  {/* Activer */}
                  {utilisateur.statut !== 1 && (
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

                  {/* Désactiver */}
                  {utilisateur.statut === 1 && (
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
                  )}

                  {/* Supprimer */}
                  {utilisateur.statut !== 3 && (
                    <TouchableOpacity
                      className="items-center"
                      onPress={() => handleChangerStatut(3)}
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

