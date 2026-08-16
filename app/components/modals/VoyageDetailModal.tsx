import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { voyageService } from '../../services/voyages/voyageService';
import { Voyage } from '../../types/voyage';
import { estEnPause, getVoyageStatut } from '../../utils/voyageStatut';
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
  // État pour le sous-modal « Reprogrammer »
  const [reprogrammerOpen, setReprogrammerOpen] = useState(false);
  const [reprogrammerDate, setReprogrammerDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  /**
   * Bascule la visibilité du voyage (pause / reprise des réservations).
   * Disponible uniquement pour les voyages programmés ou en cours (statut 1 ou 2).
   */
  const handleTogglerActivation = () => {
    if (!voyage) return;

    const isActive = voyage.is_active !== false && voyage.voyage_is_active !== false;
    const action = isActive ? 'mettre en pause' : 'rouvrir aux réservations';
    const trajetNom = voyage.trajet?.nom || voyage.trajet?.nom_trajet || voyage.trajet?.trajet_nom || 'Trajet sans nom';

    showDialog({
      title: 'Confirmation',
      message: `Voulez-vous ${action} le voyage : ${trajetNom} ?` + (isActive
        ? '\n\nLe voyage sera caché de la recherche client mais conservera ses réservations existantes.'
        : '\n\nLe voyage redeviendra visible pour les réservations clients.'),
      type: 'info',
      confirmText: isActive ? 'Mettre en pause' : 'Rouvrir',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const voyageId = voyage.id || voyage.id_voyage || voyage.voyage_id;
          const response = await voyageService.togglerActivationVoyage(voyageId);

          if (response.statut === true) {
            showDialog({
              title: 'Succès',
              message: response.message || 'Activation modifiée',
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
            setActionLoading(false);
            showDialog({
              title: 'Erreur',
              message: response.message || 'Une erreur est survenue',
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

  /**
   * Ouvre le sous-modal de reprogrammation (sélection d'une nouvelle date).
   * Crée un NOUVEAU voyage cloné à la date choisie ; le voyage source reste inchangé.
   */
  const openReprogrammerModal = () => {
    // Initialise la date à demain par défaut
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);
    setReprogrammerDate(demain);
    setReprogrammerOpen(true);
  };

  const handleConfirmerReprogrammation = async () => {
    if (!voyage) return;

    const yyyy = reprogrammerDate.getFullYear();
    const mm = String(reprogrammerDate.getMonth() + 1).padStart(2, '0');
    const dd = String(reprogrammerDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    setActionLoading(true);
    try {
      const voyageId = voyage.id || voyage.id_voyage || voyage.voyage_id;
      const response = await voyageService.reprogrammerVoyage(voyageId, {
        voyage_date: dateStr,
      });

      setReprogrammerOpen(false);

      if (response.statut === true) {
        showDialog({
          title: 'Succès',
          message: response.message || 'Voyage reprogrammé avec succès',
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
        setActionLoading(false);
        showDialog({
          title: 'Erreur',
          message: response.message || 'Une erreur est survenue',
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => {},
          onCancel: () => {},
        });
      }
    } catch (error: any) {
      setReprogrammerOpen(false);
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
  };

  const getStatutBadge = (voyageItem: any) => {
    const info = getVoyageStatut(voyageItem);
    const enPause = estEnPause(voyageItem);
    return (
      <View className="flex-row items-center">
        <View className={`${info.bg} rounded-full px-3 py-1`}>
          <Text className={`${info.text} text-xs font-semibold`}>{info.label}</Text>
        </View>
        {enPause && (
          <View className="bg-amber-100 rounded-full px-3 py-1 ml-2">
            <Text className="text-amber-700 text-xs font-semibold">En pause</Text>
          </View>
        )}
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
                      {getStatutBadge(voyage)}
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
                {(() => {
                  const statut = voyage.statut ?? voyage.voyage_statut ?? 0;
                  const isActive = voyage.is_active !== false && voyage.voyage_is_active !== false;
                  const isAnnule = statut === 4;
                  const isTermine = statut === 3;
                  const isProgrammeOuEnCours = statut === 1 || statut === 2;
                  const voyageId = voyage.id || voyage.id_voyage || voyage.voyage_id;

                  return (
                    <View className="flex-row flex-wrap justify-around items-start">
                      {/* Modifier (uniquement si voyage actif) */}
                      {isProgrammeOuEnCours && (
                        <TouchableOpacity
                          className="items-center mb-3"
                          style={{ width: '23%' }}
                          onPress={() => {
                            onClose();
                            onEdit?.(voyageId);
                          }}
                          disabled={actionLoading}
                        >
                          <View className="bg-blue-100 rounded-full w-14 h-14 items-center justify-center mb-2">
                            <Ionicons name="create" size={24} color="#3b82f6" />
                          </View>
                          <Text className="text-gray-700 text-xs font-medium text-center">Modifier</Text>
                        </TouchableOpacity>
                      )}

                      {/* Pause / Reprise (uniquement si voyage programmé ou en cours) */}
                      {isProgrammeOuEnCours && (
                        <TouchableOpacity
                          className="items-center mb-3"
                          style={{ width: '23%' }}
                          onPress={handleTogglerActivation}
                          disabled={actionLoading}
                        >
                          <View className={`${isActive ? 'bg-orange-100' : 'bg-green-100'} rounded-full w-14 h-14 items-center justify-center mb-2`}>
                            {actionLoading ? (
                              <ActivityIndicator color={isActive ? '#f97316' : '#22c55e'} />
                            ) : (
                              <Ionicons
                                name={isActive ? 'pause-circle' : 'play-circle'}
                                size={24}
                                color={isActive ? '#f97316' : '#22c55e'}
                              />
                            )}
                          </View>
                          <Text className="text-gray-700 text-xs font-medium text-center">
                            {isActive ? 'Pause' : 'Rouvrir'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Annuler / Réactiver */}
                      {(isProgrammeOuEnCours || isAnnule) && (
                        <TouchableOpacity
                          className="items-center mb-3"
                          style={{ width: '23%' }}
                          onPress={() => (isAnnule ? handleReactiverVoyage() : handleAnnulerVoyage())}
                          disabled={actionLoading}
                        >
                          <View className={`${isAnnule ? 'bg-yellow-100' : 'bg-red-100'} rounded-full w-14 h-14 items-center justify-center mb-2`}>
                            {actionLoading ? (
                              <ActivityIndicator color={isAnnule ? '#eab308' : '#ef4444'} />
                            ) : (
                              <Ionicons
                                name={isAnnule ? 'refresh' : 'close-circle'}
                                size={24}
                                color={isAnnule ? '#eab308' : '#ef4444'}
                              />
                            )}
                          </View>
                          <Text className="text-gray-700 text-xs font-medium text-center">
                            {isAnnule ? 'Réactiver' : 'Annuler'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Reprogrammer (disponible pour annulé ou terminé — crée un nouveau voyage) */}
                      {(isAnnule || isTermine) && (
                        <TouchableOpacity
                          className="items-center mb-3"
                          style={{ width: '23%' }}
                          onPress={openReprogrammerModal}
                          disabled={actionLoading}
                        >
                          <View className="bg-indigo-100 rounded-full w-14 h-14 items-center justify-center mb-2">
                            <Ionicons name="calendar" size={24} color="#6366f1" />
                          </View>
                          <Text className="text-gray-700 text-xs font-medium text-center">Reprogrammer</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()}
              </View>

              <View className="pb-4" />
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-700 font-medium">Voyage introuvable</Text>
            </View>
          )}
        </View>
      </View>

      {/* Sous-modal : Reprogrammer (crée un nouveau voyage cloné) */}
      <Modal
        visible={reprogrammerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setReprogrammerOpen(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-5">
          <View className="bg-white rounded-2xl w-full max-w-md p-5">
            <View className="flex-row items-center mb-3">
              <View className="bg-indigo-100 rounded-full p-2 mr-3">
                <Ionicons name="calendar" size={22} color="#6366f1" />
              </View>
              <Text className="text-gray-900 font-bold text-lg flex-1">Reprogrammer le voyage</Text>
            </View>
            <Text className="text-gray-600 text-sm mb-4">
              Un NOUVEAU voyage sera créé à la date choisie en réutilisant le trajet, la voiture et l'heure du voyage actuel. Le voyage d'origine restera inchangé.
            </Text>

            <Text className="text-gray-700 text-sm font-semibold mb-2">Nouvelle date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between mb-2"
            >
              <Text className="text-gray-900">
                {reprogrammerDate.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={reprogrammerDate}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setReprogrammerDate(selectedDate);
                }}
              />
            )}

            <View className="flex-row mt-5">
              <TouchableOpacity
                className="flex-1 bg-gray-100 rounded-xl py-3 mr-2 items-center"
                onPress={() => setReprogrammerOpen(false)}
                disabled={actionLoading}
              >
                <Text className="text-gray-700 font-semibold">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-indigo-600 rounded-xl py-3 ml-2 items-center"
                onPress={handleConfirmerReprogrammation}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold">Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};
