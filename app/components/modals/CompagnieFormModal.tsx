import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import compagnieService from '../../services/compagnies/compagnieService';
import { CompagnieFormData, CompagnieUpdateData } from '../../types/compagnie';
import { useConfirmDialog } from '../common/ConfirmDialog';

interface Props {
  visible: boolean;
  compagnieId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CompagnieFormModal: React.FC<Props> = ({
  visible,
  compagnieId,
  onClose,
  onSuccess,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CompagnieFormData>>({
    comp_nom: '',
    comp_nif: '',
    comp_stat: '',
    comp_description: '',
    comp_phone: '',
    comp_email: '',
    comp_adresse: '',
    admin_nom: '',
    admin_prenom: '',
    admin_email: '',
    admin_telephone: '',
    admin_mot_de_passe: '',
  });

  const isEditMode = !!compagnieId;

  useEffect(() => {
    if (visible && compagnieId) {
      chargerCompagnie();
    } else if (visible && !compagnieId) {
      resetForm();
    }
  }, [visible, compagnieId]);

  const resetForm = () => {
    setFormData({
      comp_nom: '',
      comp_nif: '',
      comp_stat: '',
      comp_description: '',
      comp_phone: '',
      comp_email: '',
      comp_adresse: '',
      admin_nom: '',
      admin_prenom: '',
      admin_email: '',
      admin_telephone: '',
      admin_mot_de_passe: '',
    });
  };

  const chargerCompagnie = async () => {
    if (!compagnieId) return;

    setLoading(true);
    const response = await compagnieService.getCompagnie(compagnieId);
    setLoading(false);

    if (response.statut && response.data) {
      const compagnie = response.data;
      setFormData({
        comp_nom: compagnie.nom,
        comp_nif: compagnie.nif,
        comp_stat: compagnie.stat,
        comp_description: compagnie.description,
        comp_phone: compagnie.telephone,
        comp_email: compagnie.email,
        comp_adresse: compagnie.adresse,
      });
    } else {
      showDialog({
        title: 'Erreur',
        message: response.message || 'Impossible de charger la compagnie',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => onClose(),
        onCancel: () => onClose()
      });
    }
  };

  const handleSubmit = async () => {
    // Validation basique
    if (
      !formData.comp_nom ||
      !formData.comp_nif ||
      !formData.comp_stat ||
      !formData.comp_email ||
      !formData.comp_phone
    ) {
      showDialog({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs obligatoires',
        type: 'warning',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {}
      });
      return;
    }

    if (!isEditMode) {
      if (
        !formData.admin_nom ||
        !formData.admin_prenom ||
        !formData.admin_email ||
        !formData.admin_telephone ||
        !formData.admin_mot_de_passe
      ) {
        showDialog({
          title: 'Erreur',
          message: 'Veuillez remplir toutes les informations de l\'administrateur',
          type: 'warning',
          confirmText: 'OK',
          onConfirm: () => {},
          onCancel: () => {}
        });
        return;
      }
    }

    setLoading(true);

    if (isEditMode && compagnieId) {
      const updateData: CompagnieUpdateData = {
        comp_nom: formData.comp_nom!,
        comp_nif: formData.comp_nif!,
        comp_stat: formData.comp_stat!,
        comp_description: formData.comp_description!,
        comp_phone: formData.comp_phone!,
        comp_email: formData.comp_email!,
        comp_adresse: formData.comp_adresse!,
      };

      const response = await compagnieService.mettreAJourCompagnie(compagnieId, updateData);

      if (response.statut) {
        // Rafraîchir la liste avant d'afficher le message
        onSuccess?.();
        setLoading(false);
        
        showDialog({
          title: 'Succès',
          message: 'Compagnie modifiée avec succès',
          type: 'success',
          confirmText: 'OK',
          onConfirm: () => {
            onClose();
          },
          onCancel: () => {}
        });
      } else {
        setLoading(false);
        showDialog({
          title: 'Erreur',
          message: response.message || 'Une erreur est survenue',
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => {},
          onCancel: () => {}
        });
      }
    } else {
      const response = await compagnieService.creerCompagnie(formData as CompagnieFormData);

      if (response.statut) {
        // Rafraîchir la liste avant d'afficher le message
        onSuccess?.();
        setLoading(false);
        
        showDialog({
          title: 'Succès',
          message: 'Compagnie créée avec succès',
          type: 'success',
          confirmText: 'OK',
          onConfirm: () => {
            onClose();
          },
          onCancel: () => {}
        });
      } else {
        setLoading(false);
        showDialog({
          title: 'Erreur',
          message: response.message || 'Une erreur est survenue',
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => {},
          onCancel: () => {}
        });
      }
    }
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
                  <Ionicons 
                    name={isEditMode ? "create" : "add-circle"} 
                    size={26} 
                    color="#fff" 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">
                    {isEditMode ? 'Modifier Compagnie' : 'Nouvelle Compagnie'}
                  </Text>
                  <Text className="text-white/90 text-sm mt-1">
                    {isEditMode ? 'Mettre à jour les informations' : 'Ajouter une nouvelle compagnie'}
                  </Text>
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

          <ScrollView className="flex-1 p-4">
            {/* Informations de la compagnie */}
            <View className="mb-4">
              <Text className="text-gray-900 font-bold text-base mb-3">
                Informations de la compagnie
              </Text>

              <Text className="text-gray-700 mb-1">Nom *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                value={formData.comp_nom}
                onChangeText={(text) => setFormData({ ...formData, comp_nom: text })}
                placeholder="Nom de la compagnie"
                editable={!loading}
              />

              <Text className="text-gray-700 mb-1">NIF *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                value={formData.comp_nif}
                onChangeText={(text) => setFormData({ ...formData, comp_nif: text })}
                placeholder="Numéro NIF"
                editable={!loading}
              />

              <Text className="text-gray-700 mb-1">STAT *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                value={formData.comp_stat}
                onChangeText={(text) => setFormData({ ...formData, comp_stat: text })}
                placeholder="Numéro STAT"
                editable={!loading}
              />

              <Text className="text-gray-700 mb-1">Email *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                value={formData.comp_email}
                onChangeText={(text) => setFormData({ ...formData, comp_email: text })}
                placeholder="email@exemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />

              <Text className="text-gray-700 mb-1">Téléphone *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                value={formData.comp_phone}
                onChangeText={(text) => setFormData({ ...formData, comp_phone: text })}
                placeholder="+261 XX XX XXX XX"
                keyboardType="phone-pad"
                editable={!loading}
              />

              <Text className="text-gray-700 mb-1">Adresse *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                value={formData.comp_adresse}
                onChangeText={(text) => setFormData({ ...formData, comp_adresse: text })}
                placeholder="Adresse complète"
                multiline
                numberOfLines={2}
                editable={!loading}
              />

              <Text className="text-gray-700 mb-1">Description *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                value={formData.comp_description}
                onChangeText={(text) => setFormData({ ...formData, comp_description: text })}
                placeholder="Description de la compagnie"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            {/* Informations administrateur (création uniquement) */}
            {!isEditMode && (
              <View className="mb-4">
                <Text className="text-gray-900 font-bold text-base mb-3">
                  Informations de l'administrateur
                </Text>

                <Text className="text-gray-700 mb-1">Nom *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  value={formData.admin_nom}
                  onChangeText={(text) => setFormData({ ...formData, admin_nom: text })}
                  placeholder="Nom"
                  editable={!loading}
                />

                <Text className="text-gray-700 mb-1">Prénom *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  value={formData.admin_prenom}
                  onChangeText={(text) => setFormData({ ...formData, admin_prenom: text })}
                  placeholder="Prénom"
                  editable={!loading}
                />

                <Text className="text-gray-700 mb-1">Email *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  value={formData.admin_email}
                  onChangeText={(text) => setFormData({ ...formData, admin_email: text })}
                  placeholder="admin@exemple.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />

                <Text className="text-gray-700 mb-1">Téléphone *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  value={formData.admin_telephone}
                  onChangeText={(text) => setFormData({ ...formData, admin_telephone: text })}
                  placeholder="+261 XX XX XXX XX"
                  keyboardType="phone-pad"
                  editable={!loading}
                />

                <Text className="text-gray-700 mb-1">Mot de passe *</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  value={formData.admin_mot_de_passe}
                  onChangeText={(text) => setFormData({ ...formData, admin_mot_de_passe: text })}
                  placeholder="Minimum 6 caractères"
                  secureTextEntry
                  editable={!loading}
                />
              </View>
            )}

            {/* Actions */}
            <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
              <Text className="text-gray-900 font-bold text-base mb-3">Actions</Text>
              <View className="flex-row justify-around items-center">
                {/* Annuler */}
                <TouchableOpacity
                  className="items-center"
                  onPress={onClose}
                  disabled={loading}
                >
                  <View className="bg-gray-100 rounded-full w-16 h-16 items-center justify-center mb-2">
                    <Ionicons name="close-circle" size={28} color="#6b7280" />
                  </View>
                  <Text className="text-gray-700 text-xs font-medium">Annuler</Text>
                </TouchableOpacity>

                {/* Confirmer (Créer/Modifier) */}
                <TouchableOpacity
                  className="items-center"
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <View className={`rounded-full w-16 h-16 items-center justify-center mb-2 ${
                    isEditMode ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {loading ? (
                      <ActivityIndicator color={isEditMode ? "#3b82f6" : "#10b981"} />
                    ) : (
                      <Ionicons 
                        name={isEditMode ? "checkmark-circle" : "add-circle"} 
                        size={28} 
                        color={isEditMode ? "#3b82f6" : "#10b981"} 
                      />
                    )}
                  </View>
                  <Text className="text-gray-700 text-xs font-medium">
                    {isEditMode ? 'Modifier' : 'Créer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

