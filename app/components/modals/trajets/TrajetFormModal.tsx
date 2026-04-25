import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import apiClient from '../../../services/api/axiosConfig';
import { trajetService } from '../../../services/trajets/trajetService';
import { useConfirmDialog } from '../../common/ConfirmDialog';

interface Props {
  visible: boolean;
  trajetId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Province {
  pro_id: number;
  pro_nom: string;
}

export const TrajetFormModal: React.FC<Props> = ({
  visible,
  trajetId,
  onClose,
  onSuccess,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [showDepartDropdown, setShowDepartDropdown] = useState(false);
  const [showArriveeDropdown, setShowArriveeDropdown] = useState(false);
  const [searchDepart, setSearchDepart] = useState('');
  const [searchArrivee, setSearchArrivee] = useState('');

  const [formData, setFormData] = useState({
    traj_nom: '',
    pro_depart: '',
    pro_arrivee: '',
    traj_tarif: '',
    traj_km: '',
    traj_duree: '',
  });

  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);

  const isEditMode = !!trajetId;

  useEffect(() => {
    if (visible) {
      chargerProvinces();
      if (trajetId) {
        chargerTrajet();
      } else {
        resetForm();
      }
    }
  }, [visible, trajetId]);

  const parseDuration = (durationString: string) => {
    if (!durationString) {
      setDurationHours(0);
      setDurationMinutes(0);
      return;
    }

    // Format HH:mm
    if (durationString.includes(':')) {
      const [hours, minutes] = durationString.split(':');
      setDurationHours(parseInt(hours) || 0);
      setDurationMinutes(parseInt(minutes) || 0);
    }
    // Format "Xh30" or "Xh"
    else if (durationString.toLowerCase().includes('h')) {
      const parts = durationString.toLowerCase().split('h');
      setDurationHours(parseInt(parts[0]) || 0);
      const mins = parseInt(parts[1]) || 0;
      setDurationMinutes(mins);
    }
    // Format minutes only
    else {
      const mins = parseInt(durationString) || 0;
      setDurationHours(Math.floor(mins / 60));
      setDurationMinutes(mins % 60);
    }
  };

  const chargerProvinces = async () => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/provinces/recuperListeProvince');
      
      let provincesList: Province[] = [];
      
      if (response.data?.data?.provinces && Array.isArray(response.data.data.provinces)) {
        provincesList = response.data.data.provinces;
      } else if (Array.isArray(response.data)) {
        provincesList = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        provincesList = response.data.data;

      }
      
      setProvinces(provincesList);
    } catch (error) {
      console.error('Erreur chargement provinces:', error);
      setProvinces([]);
    }
  };

  const chargerTrajet = async () => {
    if (!trajetId) return;

    setLoading(true);
    try {
      const response = await trajetService.obtenirTrajet(trajetId);
      setLoading(false);

      if (response.data) {
        const trajet = response.data as any;
        
        // Extraire les IDs des provinces (nouvelles propriétés)
        const proDepartId = trajet.province_depart?.id_province || trajet.province_depart?.pro_id || trajet.pro_depart;
        const proArriveeId = trajet.province_arrivee?.id_province || trajet.province_arrivee?.pro_id || trajet.pro_arrivee;
        
        // Extraire le nom du trajet
        const trajetNom = trajet.nom_trajet || trajet.trajet_nom || 'Sans nom';
        
        // Extraire les tarifs et distances
        const tarif = trajet.tarif || trajet.trajet_prix || 0;
        const km = trajet.distance_km || trajet.trajet_distance || 0;
        const duree = trajet.duree || trajet.trajet_duree || '';
    
        
        setFormData({
          traj_nom: trajetNom,
          pro_depart: proDepartId?.toString() || '',
          pro_arrivee: proArriveeId?.toString() || '',
          traj_tarif: tarif.toString(),
          traj_km: km.toString(),
          traj_duree: duree,
        });
        parseDuration(duree);
      } else {
        showDialog({
          title: 'Erreur',
          message: 'Impossible de charger le trajet',
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
        message: error?.message || 'Impossible de charger le trajet',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => onClose(),
        onCancel: () => onClose(),
      });
    }
  };

  const resetForm = () => {
    setFormData({
      traj_nom: '',
      pro_depart: '',
      pro_arrivee: '',
      traj_tarif: '',
      traj_km: '',
      traj_duree: '',
    });
    setDurationHours(0);
    setDurationMinutes(0);
  };

  const getDepartName = () => {
    if (!provinces.length) return 'Sélectionner départ';
    
    const province = provinces.find((p: any) => {
      const pId = (p.pro_id || p.id)?.toString();
      return pId === formData.pro_depart;
    });
    
    const name = province?.pro_nom || province?.nom || province?.name;
    
    return name || 'Sélectionner départ';
  };

  const getArriveeName = () => {
    if (!provinces.length) return 'Sélectionner arrivée';
    
    const province = provinces.find((p: any) => {
      const pId = (p.pro_id || p.id)?.toString();
      return pId === formData.pro_arrivee;
    });
    
    const name = province?.pro_nom || province?.nom || province?.name;
    
    return name || 'Sélectionner arrivée';
  };

  const getFilteredProvinces = (searchText: string, excludeId?: string) => {
    return provinces.filter((province: any) => {
      const pId = (province.pro_id || province.id)?.toString();
      const pNom = (province.pro_nom || province.nom || province.name || '').toLowerCase();
      const matchesSearch = pNom.includes(searchText.toLowerCase());
      const notExcluded = excludeId ? pId !== excludeId : true;
      return matchesSearch && notExcluded;
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (
      !formData.traj_nom ||
      !formData.pro_depart ||
      !formData.pro_arrivee ||
      !formData.traj_tarif ||
      !formData.traj_km
    ) {
      showDialog({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs obligatoires',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {},
      });
      return;
    }

    if (formData.pro_depart === formData.pro_arrivee) {
      showDialog({
        title: 'Erreur',
        message: 'La province de départ et d\'arrivée doivent être différentes',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {},
      });
      return;
    }

    setSubmitting(true);
    try {
      // Formater la durée en HH:mm
      const formattedDuration = `${durationHours.toString().padStart(2, '0')}:${durationMinutes.toString().padStart(2, '0')}`;

      const data = {
        traj_nom: formData.traj_nom,
        pro_depart: parseInt(formData.pro_depart, 10),
        pro_arrivee: parseInt(formData.pro_arrivee, 10),
        traj_tarif: parseFloat(formData.traj_tarif),
        traj_km: parseInt(formData.traj_km, 10),
        traj_duree: formattedDuration,
      };

      if (isEditMode) {
        const response = await trajetService.modifierTrajet(trajetId!, data);
        setSubmitting(false);

        if (response.statut === true) {
          showDialog({
            title: 'Succès',
            message: response.message || 'Trajet modifié avec succès',
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
        const response = await trajetService.ajouterTrajet(data);
        setSubmitting(false);

        if (response.statut === true) {
          showDialog({
            title: 'Succès',
            message: response.message || 'Trajet ajouté avec succès',
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
      console.error('Erreur lors de la soumission:', error);
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

  const renderProvinceDropdown = (
    show: boolean,
    searchText: string,
    onSearchChange: (text: string) => void,
    onSelect: (provinceId: string) => void,
    onClose: () => void,
    excludeId?: string
  ) => {
    if (!show) return null;

    const filteredProvinces = getFilteredProvinces(searchText, excludeId);

    return (
      <View className="bg-white border-2 border-blue-200 rounded-xl mt-2 shadow-lg overflow-hidden">
        {/* Barre de recherche */}
        <View className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center bg-white rounded-lg px-3 py-2 border border-gray-300">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-gray-900"
              placeholder="Rechercher une province..."
              placeholderTextColor="#9ca3af"
              style={{ color: '#111827' }}
              value={searchText}
              onChangeText={onSearchChange}
              autoFocus
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Liste des provinces avec ScrollView corrigé */}
        <View style={{ maxHeight: 240 }}>
          <ScrollView 
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {filteredProvinces.length === 0 ? (
              <View className="py-8 items-center">
                <Ionicons name="location-outline" size={40} color="#d1d5db" />
                <Text className="text-gray-400 mt-2">Aucune province trouvée</Text>
              </View>
            ) : (
              filteredProvinces.map((province: any, index) => {
                const pId = (province.pro_id || province.id)?.toString();
                const pNom = province.pro_nom || province.nom || province.name || 'Province inconnue';
                const isLast = index === filteredProvinces.length - 1;

                return (
                  <TouchableOpacity
                    key={pId}
                    className={`px-4 py-4 flex-row items-center justify-between ${!isLast ? 'border-b border-gray-100' : ''}`}
                    onPress={() => {
                      onSelect(pId);
                      onClose();
                      onSearchChange('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="bg-blue-100 rounded-full p-2 mr-3">
                        <Ionicons name="location" size={18} color="#3b82f6" />
                      </View>
                      <Text className="text-gray-900 text-base flex-1">{pNom}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Footer avec compteur */}
        {filteredProvinces.length > 0 && (
          <View className="bg-gray-50 px-4 py-2 border-t border-gray-200">
            <Text className="text-gray-500 text-xs text-center">
              {filteredProvinces.length} province{filteredProvinces.length > 1 ? 's' : ''} disponible{filteredProvinces.length > 1 ? 's' : ''}
            </Text>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
                    {isEditMode ? 'Modifier Trajet' : 'Nouveau Trajet'}
                  </Text>
                  <Text className="text-white/90 text-sm mt-1">
                    {isEditMode ? 'Mettre à jour les informations' : 'Ajouter un nouveau trajet'}
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
            <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
              {/* Nom du trajet */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">
                  Nom du trajet <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-gray-900"
                  placeholder="Ex: Kinshasa-Lumumbashi"
                  placeholderTextColor="#9ca3af"
                  style={{ color: '#111827' }}
                  value={formData.traj_nom}
                  onChangeText={(text) =>
                    setFormData({ ...formData, traj_nom: text })
                  }
                  editable={!submitting}
                />
              </View>

              {/* Province Départ */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">
                  Province de Départ <Text className="text-red-500">*</Text>
                </Text>
                <TouchableOpacity
                  className={`bg-gray-50 border-2 rounded-xl px-4 py-3.5 flex-row justify-between items-center ${
                    showDepartDropdown ? 'border-blue-500' : 'border-gray-300'
                  }`}
                  onPress={() => {
                    setShowDepartDropdown(!showDepartDropdown);
                    setShowArriveeDropdown(false);
                    setSearchDepart('');
                  }}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1">
                    <Ionicons 
                      name="location" 
                      size={22} 
                      color={formData.pro_depart ? '#3b82f6' : '#9ca3af'} 
                    />
                    <Text className={`ml-3 text-base ${formData.pro_depart ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {getDepartName()}
                    </Text>
                  </View>
                  <Ionicons 
                    name={showDepartDropdown ? 'chevron-up' : 'chevron-down'} 
                    size={22} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
                {renderProvinceDropdown(
                  showDepartDropdown,
                  searchDepart,
                  setSearchDepart,
                  (id) => {
                    setFormData({ ...formData, pro_depart: id });
                  },
                  () => setShowDepartDropdown(false),
                  formData.pro_arrivee
                )}
              </View>

              {/* Province Arrivée */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">
                  Province d'Arrivée <Text className="text-red-500">*</Text>
                </Text>
                <TouchableOpacity
                  className={`bg-gray-50 border-2 rounded-xl px-4 py-3.5 flex-row justify-between items-center ${
                    showArriveeDropdown ? 'border-blue-500' : 'border-gray-300'
                  }`}
                  onPress={() => {
                    setShowArriveeDropdown(!showArriveeDropdown);
                    setShowDepartDropdown(false);
                    setSearchArrivee('');
                  }}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1">
                    <Ionicons 
                      name="flag" 
                      size={22} 
                      color={formData.pro_arrivee ? '#3b82f6' : '#9ca3af'} 
                    />
                    <Text className={`ml-3 text-base ${formData.pro_arrivee ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {getArriveeName()}
                    </Text>
                  </View>
                  <Ionicons 
                    name={showArriveeDropdown ? 'chevron-up' : 'chevron-down'} 
                    size={22} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
                {renderProvinceDropdown(
                  showArriveeDropdown,
                  searchArrivee,
                  setSearchArrivee,
                  (id) => {
                    setFormData({ ...formData, pro_arrivee: id });
                  },
                  () => setShowArriveeDropdown(false),
                  formData.pro_depart
                )}
              </View>

              {/* Distance */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">
                  Distance (km) <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5">
                  <Ionicons name="map-outline" size={22} color="#6b7280" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Entrez la distance"
                    placeholderTextColor="#9ca3af"
                    style={{ color: '#111827' }}
                    keyboardType="numeric"
                    value={formData.traj_km}
                    onChangeText={(text) =>
                      setFormData({ ...formData, traj_km: text })
                    }
                    editable={!submitting}
                  />
                </View>
              </View>

              {/* Durée */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-2">
                  Durée (format HH:mm)
                </Text>
                <View className="bg-gray-50 border border-gray-300 rounded-xl p-4">
                  {/* Affichage de la durée sélectionnée */}
                  <View className="bg-blue-100 rounded-lg p-4 mb-4 flex-row items-center justify-center">
                    <Ionicons name="time" size={28} color="#3b82f6" />
                    <Text className="text-2xl font-bold text-blue-600 ml-3">
                      {durationHours.toString().padStart(2, '0')}:{durationMinutes.toString().padStart(2, '0')}
                    </Text>
                  </View>

                  {/* Sélecteur Heures */}
                  <View className="mb-4">
                    <Text className="text-gray-600 text-sm mb-3 text-center font-medium">Heures</Text>
                    <View className="flex-row items-center justify-center gap-2">
                      <TouchableOpacity
                        className="bg-red-500 rounded-lg p-3"
                        onPress={() => setDurationHours(Math.max(0, durationHours - 1))}
                        disabled={submitting}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={24} color="#fff" />
                      </TouchableOpacity>

                      <View className="bg-white border border-gray-300 rounded-lg px-8 py-4 min-w-[100px] items-center">
                        <Text className="text-2xl font-bold text-gray-900">
                          {durationHours.toString().padStart(2, '0')}
                        </Text>
                      </View>

                      <TouchableOpacity
                        className="bg-green-500 rounded-lg p-3"
                        onPress={() => setDurationHours(Math.min(23, durationHours + 1))}
                        disabled={submitting}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Sélecteur Minutes */}
                  <View>
                    <Text className="text-gray-600 text-sm mb-3 text-center font-medium">Minutes</Text>
                    <View className="flex-row items-center justify-center gap-2">
                      <TouchableOpacity
                        className="bg-red-500 rounded-lg p-3"
                        onPress={() => setDurationMinutes(Math.max(0, durationMinutes - 5))}
                        disabled={submitting}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={24} color="#fff" />
                      </TouchableOpacity>

                      <View className="bg-white border border-gray-300 rounded-lg px-8 py-4 min-w-[100px] items-center">
                        <Text className="text-2xl font-bold text-gray-900">
                          {durationMinutes.toString().padStart(2, '0')}
                        </Text>
                      </View>

                      <TouchableOpacity
                        className="bg-green-500 rounded-lg p-3"
                        onPress={() => setDurationMinutes(Math.min(59, durationMinutes + 5))}
                        disabled={submitting}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text className="text-gray-500 text-xs text-center mt-3">
                    (- : décrémente de 1h | + : incrémente de 1h)
                    {'\n'}(- : décrémente de 5min | + : incrémente de 5min)
                  </Text>
                </View>
              </View>

              {/* Tarif */}
              <View className="mb-8">
                <Text className="text-gray-700 font-semibold mb-2">
                  Tarif (AR) <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5">
                  <Ionicons name="cash-outline" size={22} color="#6b7280" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Entrez le tarif"
                    placeholderTextColor="#9ca3af"
                    style={{ color: '#111827' }}
                    keyboardType="numeric"
                    value={formData.traj_tarif}
                    onChangeText={(text) =>
                      setFormData({ ...formData, traj_tarif: text })
                    }
                    editable={!submitting}
                  />
                </View>
              </View>

              {/* Boutons */}
              <View className="flex-row gap-3 mb-8">
                <TouchableOpacity
                  className="flex-1 items-center py-4 rounded-xl bg-gray-100 border border-gray-300"
                  onPress={onClose}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-700 font-semibold text-base">Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 items-center py-4 rounded-xl bg-blue-600 shadow-md"
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      {isEditMode ? 'Modifier' : 'Ajouter'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};