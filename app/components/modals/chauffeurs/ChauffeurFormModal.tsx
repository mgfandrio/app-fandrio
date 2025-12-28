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
import { chauffeurService } from '../../../services';
import { Chauffeur } from '../../../types/chauffeur';
import { useConfirmDialog } from '../../common/ConfirmDialog';

interface Props {
  visible: boolean;
  chauffeurId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChauffeurFormModal: React.FC<Props> = ({
  visible,
  chauffeurId,
  onClose,
  onSuccess,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compagnieId, setCompagnieId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    chauff_nom: '',
    chauff_prenom: '',
    chauff_age: '',
    chauff_cin: '',
    chauff_permis: 'B',
    chauff_phone: '',
    chauff_statut: '1',
  });

  const isEditMode = !!chauffeurId;

  useEffect(() => {
    if (visible) {
      if (chauffeurId) {
        chargerChauffeur();
      } else {
        resetForm();
      }
      loadCompagnieId();
    }
  }, [visible, chauffeurId]);

  const resetForm = () => {
    setFormData({
      chauff_nom: '',
      chauff_prenom: '',
      chauff_age: '',
      chauff_cin: '',
      chauff_permis: 'B',
      chauff_phone: '',
      chauff_statut: '1',
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

  const chargerChauffeur = async () => {
    if (!chauffeurId) return;

    setLoading(true);
    try {
      const response = await chauffeurService.obtenirChauffeur(chauffeurId);
      setLoading(false);

      if (response.data) {
        const chauffeur = response.data as Chauffeur;
        setFormData({
          chauff_nom: chauffeur.chauff_nom,
          chauff_prenom: chauffeur.chauff_prenom,
          chauff_age: chauffeur.chauff_age.toString(),
          chauff_cin: chauffeur.chauff_cin,
          chauff_permis: chauffeur.chauff_permis,
          chauff_phone: chauffeur.chauff_phone,
          chauff_statut: chauffeur.chauff_statut.toString(),
        });
      } else {
        showDialog({
          title: 'Erreur',
          message: 'Impossible de charger le chauffeur',
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
        message: error?.message || 'Impossible de charger le chauffeur',
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
      !formData.chauff_nom ||
      !formData.chauff_prenom ||
      !formData.chauff_age ||
      !formData.chauff_cin ||
      !formData.chauff_phone
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
        chauff_age: Number(formData.chauff_age),
        chauff_statut: Number(formData.chauff_statut),
        comp_id: compagnieId || 1,
      };

      if (isEditMode) {
        const response = await chauffeurService.modifierChauffeur(chauffeurId!, data);
        setSubmitting(false);

        if (response.statut || !('statut' in response)) {
          showDialog({
            title: 'Succès',
            message: response.message || 'Chauffeur modifié avec succès',
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
        const response = await chauffeurService.ajouterChauffeur(data);
        setSubmitting(false);

        if (response.statut || !('statut' in response)) {
          showDialog({
            title: 'Succès',
            message: response.message || 'Chauffeur ajouté avec succès',
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
                    {isEditMode ? 'Modifier Chauffeur' : 'Nouveau Chauffeur'}
                  </Text>
                  <Text className="text-white/90 text-sm mt-1">
                    {isEditMode ? 'Mettre à jour les informations' : 'Ajouter un nouveau chauffeur'}
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
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <ScrollView className="flex-1 px-6 py-4">
              {/* Nom */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">Nom*</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholder="Entrez le nom"
                  value={formData.chauff_nom}
                  onChangeText={(text) =>
                    setFormData({ ...formData, chauff_nom: text })
                  }
                  editable={!submitting}
                />
              </View>

              {/* Prénom */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">Prénom*</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholder="Entrez le prénom"
                  value={formData.chauff_prenom}
                  onChangeText={(text) =>
                    setFormData({ ...formData, chauff_prenom: text })
                  }
                  editable={!submitting}
                />
              </View>

              {/* Âge */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">Âge*</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholder="Entrez l'âge"
                  keyboardType="numeric"
                  value={formData.chauff_age}
                  onChangeText={(text) =>
                    setFormData({ ...formData, chauff_age: text })
                  }
                  editable={!submitting}
                />
              </View>

              {/* CIN */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">CIN*</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholder="Entrez le numéro CIN"
                  value={formData.chauff_cin}
                  onChangeText={(text) =>
                    setFormData({ ...formData, chauff_cin: text })
                  }
                  editable={!submitting}
                />
              </View>

              {/* Permis */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">Permis*</Text>
                <View className="bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
                  <Picker
                    selectedValue={formData.chauff_permis}
                    onValueChange={(value) =>
                      setFormData({ ...formData, chauff_permis: value })
                    }
                    enabled={!submitting}
                  >
                    <Picker.Item label="Catégorie A" value="A" />
                    <Picker.Item label="Catégorie B" value="B" />
                    <Picker.Item label="Catégorie C" value="C" />
                    <Picker.Item label="Catégorie D" value="D" />
                  </Picker>
                </View>
              </View>

              {/* Téléphone */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">
                  Téléphone*
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholder="Entrez le numéro de téléphone"
                  keyboardType="phone-pad"
                  value={formData.chauff_phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, chauff_phone: text })
                  }
                  editable={!submitting}
                />
              </View>

              {/* Statut */}
              <View className="mb-8">
                <Text className="text-gray-700 font-semibold mb-2">Statut*</Text>
                <View className="bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
                  <Picker
                    selectedValue={formData.chauff_statut}
                    onValueChange={(value) =>
                      setFormData({ ...formData, chauff_statut: value })
                    }
                    enabled={!submitting}
                  >
                    <Picker.Item label="Actif" value="1" />
                    <Picker.Item label="Inactif" value="0" />
                  </Picker>
                </View>
              </View>

              {/* Boutons */}
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
