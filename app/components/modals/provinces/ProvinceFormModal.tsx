import { Ionicons } from '@expo/vector-icons';
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
import provinceService from '../../../services/provinces/provinceService';
import { ProvinceFormData, ProvinceUpdateData } from '../../../types/province';
import { useConfirmDialog } from '../../common/ConfirmDialog';

interface Props {
  visible: boolean;
  provinceId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const ORIENTATIONS = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'];

export const ProvinceFormModal: React.FC<Props> = ({
  visible,
  provinceId,
  onClose,
  onSuccess,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ProvinceFormData>>({
    pro_nom: '',
    pro_orientation: 'Centre',
  });

  const isEditMode = !!provinceId;

  useEffect(() => {
    if (visible && provinceId) {
      chargerProvince();
    } else if (visible && !provinceId) {
      resetForm();
    }
  }, [visible, provinceId]);

  const resetForm = () => {
    setFormData({
      pro_nom: '',
      pro_orientation: 'Centre',
    });
  };

  const chargerProvince = async () => {
    if (!provinceId) return;

    setLoading(true);
    const response = await provinceService.getProvince(provinceId);
    setLoading(false);

    if (response.statut && response.data) {
      const province = response.data;
      setFormData({
        pro_nom: province.nom,
        pro_orientation: province.orientation,
      });
    } else {
      showDialog({
        title: 'Erreur',
        message: response.message || 'Impossible de charger la province',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => onClose(),
        onCancel: () => onClose()
      });
    }
  };

  const handleSubmit = async () => {
    // Validation basique
    if (!formData.pro_nom || !formData.pro_orientation) {
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

    setLoading(true);

    if (isEditMode && provinceId) {
      const updateData: ProvinceUpdateData = {
        pro_nom: formData.pro_nom!,
        pro_orientation: formData.pro_orientation!,
      };

      const response = await provinceService.mettreAJourProvince(provinceId, updateData);

      if (response.statut) {
        onSuccess?.();
        setLoading(false);
        
        showDialog({
          title: 'Succès',
          message: 'Province modifiée avec succès',
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
      const response = await provinceService.creerProvince(formData as ProvinceFormData);

      if (response.statut) {
        onSuccess?.();
        setLoading(false);
        
        showDialog({
          title: 'Succès',
          message: 'Province créée avec succès',
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
                    {isEditMode ? 'Modifier Province' : 'Nouvelle Province'}
                  </Text>
                  <Text className="text-white/90 text-sm mt-1">
                    {isEditMode ? 'Mettre à jour les informations' : 'Ajouter une nouvelle province'}
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
            {/* Informations de la province */}
            <View className="mb-4">
              <Text className="text-gray-900 font-bold text-base mb-3">
                Informations de la province
              </Text>

              <Text className="text-gray-700 mb-1">Nom *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3"
                value={formData.pro_nom}
                onChangeText={(text) => setFormData({ ...formData, pro_nom: text })}
                placeholder="Nom de la province"
                editable={!loading}
              />

              <Text className="text-gray-700 mb-1">Orientation *</Text>
              <View className="flex-row flex-wrap mb-3">
                {ORIENTATIONS.map((orientation) => (
                  <TouchableOpacity
                    key={orientation}
                    className={`rounded-full px-4 py-2 mr-2 mb-2 ${
                      formData.pro_orientation === orientation
                        ? 'bg-blue-500'
                        : 'bg-gray-100'
                    }`}
                    onPress={() => setFormData({ ...formData, pro_orientation: orientation })}
                    disabled={loading}
                  >
                    <Text
                      className={`font-semibold ${
                        formData.pro_orientation === orientation
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {orientation}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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

