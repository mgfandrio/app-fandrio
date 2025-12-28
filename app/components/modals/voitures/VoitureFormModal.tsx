import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { chauffeurService, voitureService } from '../../../services';
import { Chauffeur } from '../../../types/chauffeur';
import { Voiture } from '../../../types/voiture';
import { useConfirmDialog } from '../../common/ConfirmDialog';

interface Props {
  visible: boolean;
  voitureId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const VoitureFormModal: React.FC<Props> = ({
  visible,
  voitureId,
  onClose,
  onSuccess,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compagnieId, setCompagnieId] = useState<number | null>(null);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loadingChauffeurs, setLoadingChauffeurs] = useState(false);

  const [formData, setFormData] = useState({
    voit_matricule: '',
    voit_marque: '',
    voit_modele: '',
    voit_places: '',
    voit_statut: '1',
    chauff_id: '',
  });

  const isEditMode = !!voitureId;

  useEffect(() => {
    if (visible) {
      if (voitureId) {
        chargerVoiture();
      } else {
        resetForm();
      }
      loadCompagnieId();
      chargerChauffeurs();
    }
  }, [visible, voitureId]);

  const resetForm = () => {
    setFormData({
      voit_matricule: '',
      voit_marque: '',
      voit_modele: '',
      voit_places: '',
      voit_statut: '1',
      chauff_id: '',
    });
  };

  const loadCompagnieId = async () => {
    try {
      const userJson = await SecureStore.getItemAsync('fandrioUser');
      if (userJson) {
        const user = JSON.parse(userJson);
        const cId = user.compagnie_id || user.comp_id || user.id;
        setCompagnieId(cId);
      }
    } catch (e) {
      console.warn('Error reading compagnie ID:', e);
    }
  };

  const chargerChauffeurs = async () => {
    setLoadingChauffeurs(true);
    try {
      const response = await chauffeurService.obtenirListeChauffeurs();
      if (response.data) {
        setChauffeurs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.warn('Error loading chauffeurs:', error);
    } finally {
      setLoadingChauffeurs(false);
    }
  };

  const chargerVoiture = async () => {
    if (!voitureId) return;

    setLoading(true);
    try {
      const response = await voitureService.obtenirVoiture(voitureId);
      setLoading(false);

      if (response.data) {
        const voiture = response.data as Voiture;
        setFormData({
          voit_matricule: voiture.voit_matricule,
          voit_marque: voiture.voit_marque,
          voit_modele: voiture.voit_modele,
          voit_places: voiture.voit_places.toString(),
          voit_statut: voiture.voit_statut.toString(),
          chauff_id: voiture.chauff_id.toString(),
        });
      } else {
        showDialog({
          title: 'Erreur',
          message: 'Impossible de charger la voiture',
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
        message: error?.message || 'Impossible de charger la voiture',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => onClose(),
        onCancel: () => onClose(),
      });
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (
      !formData.voit_matricule ||
      !formData.voit_marque ||
      !formData.voit_modele ||
      !formData.voit_places ||
      !formData.chauff_id
    ) {
      showDialog({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs obligatoires',
        type: 'warning',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {},
      });
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        voit_places: Number(formData.voit_places),
        voit_statut: Number(formData.voit_statut),
        chauff_id: Number(formData.chauff_id),
        comp_id: compagnieId || 1,
      };

      if (isEditMode) {
        const response = await voitureService.modifierVoiture(voitureId!, data);
        setSubmitting(false);

        if (response.statut || !('statut' in response)) {
          showDialog({
            title: 'Succès',
            message: response.message || 'Voiture modifiée avec succès',
            type: 'success',
            confirmText: 'OK',
            onConfirm: () => {
              onSuccess?.();
              onClose();
            },
            onCancel: () => {
              onSuccess?.();
              onClose();
            },
          });
        } else {
          showDialog({
            title: 'Erreur',
            message: response.message || 'Une erreur est survenue',
            type: 'danger',
            confirmText: 'OK',
            onConfirm: () => {},
            onCancel: () => {},
          });
        }
      } else {
        const response = await voitureService.ajouterVoiture(data);
        setSubmitting(false);

        if (response.statut || !('statut' in response)) {
          showDialog({
            title: 'Succès',
            message: response.message || 'Voiture ajoutée avec succès',
            type: 'success',
            confirmText: 'OK',
            onConfirm: () => {
              onSuccess?.();
              onClose();
            },
            onCancel: () => {
              onSuccess?.();
              onClose();
            },
          });
        } else {
          showDialog({
            title: 'Erreur',
            message: response.message || 'Une erreur est survenue',
            type: 'danger',
            confirmText: 'OK',
            onConfirm: () => {},
            onCancel: () => {},
          });
        }
      }
    } catch (error: any) {
      setSubmitting(false);
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
                  <Ionicons 
                    name={isEditMode ? "create" : "add-circle"} 
                    size={26} 
                    color="#fff" 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">
                    {isEditMode ? 'Modifier Voiture' : 'Nouvelle Voiture'}
                  </Text>
                  <Text className="text-white/90 text-sm mt-1">
                    {isEditMode ? 'Mettre à jour les informations' : 'Ajouter une nouvelle voiture'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={onClose} 
                className="bg-white/20 rounded-full p-2.5 ml-2"
                activeOpacity={0.7}
                disabled={submitting}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <ScrollView className="flex-1 p-4">
              {/* Informations du véhicule */}
              <View className="mb-4">
                <Text className="text-gray-900 font-bold text-base mb-3">
                  Informations du véhicule
                </Text>

                <Text className="text-gray-700 mb-1">Matricule *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  value={formData.voit_matricule}
                  onChangeText={(text) => setFormData({ ...formData, voit_matricule: text })}
                  placeholder="Entrez la matricule"
                  editable={!submitting}
                />

                <Text className="text-gray-700 mb-1">Marque *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  value={formData.voit_marque}
                  onChangeText={(text) => setFormData({ ...formData, voit_marque: text })}
                  placeholder="Entrez la marque"
                  editable={!submitting}
                />

                <Text className="text-gray-700 mb-1">Modèle *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  value={formData.voit_modele}
                  onChangeText={(text) => setFormData({ ...formData, voit_modele: text })}
                  placeholder="Entrez le modèle"
                  editable={!submitting}
                />

                <Text className="text-gray-700 mb-1">Nombre de places *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  value={formData.voit_places}
                  onChangeText={(text) => setFormData({ ...formData, voit_places: text })}
                  placeholder="Entrez le nombre de places"
                  keyboardType="numeric"
                  editable={!submitting}
                />
              </View>

              {/* Chauffeur assigné */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-1">Chauffeur assigné *</Text>
                <View className="bg-gray-50 border border-gray-300 rounded-xl overflow-hidden">
                  {loadingChauffeurs ? (
                    <View className="py-3 items-center">
                      <ActivityIndicator color="#3b82f6" />
                    </View>
                  ) : (
                    <Picker
                      selectedValue={formData.chauff_id}
                      onValueChange={(value) => setFormData({ ...formData, chauff_id: value })}
                      enabled={!submitting && !loadingChauffeurs}
                    >
                      <Picker.Item label="Sélectionner un chauffeur" value="" />
                      {chauffeurs.map((chauffeur) => (
                        <Picker.Item
                          key={chauffeur.chauff_id}
                          label={`${chauffeur.chauff_nom} ${chauffeur.chauff_prenom}`}
                          value={chauffeur.chauff_id.toString()}
                        />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>

              {/* Statut */}
              <View className="mb-6">
                <Text className="text-gray-700 mb-1">Statut *</Text>
                <View className="bg-gray-50 border border-gray-300 rounded-xl overflow-hidden">
                  <Picker
                    selectedValue={formData.voit_statut}
                    onValueChange={(value) => setFormData({ ...formData, voit_statut: value })}
                    enabled={!submitting}
                  >
                    <Picker.Item label="Disponible" value="1" />
                    <Picker.Item label="Indisponible" value="0" />
                  </Picker>
                </View>
              </View>

              {/* Boutons d'action */}
              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity
                  className="flex-1 items-center py-3 rounded-xl bg-gray-100"
                  onPress={onClose}
                  disabled={submitting}
                >
                  <Text className="text-gray-700 font-semibold">Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 items-center py-3 rounded-xl bg-blue-600"
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text className="text-white font-semibold">
                        {isEditMode ? 'Modifier' : 'Ajouter'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};
