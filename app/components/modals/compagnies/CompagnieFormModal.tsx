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
import compagnieService from '../../../services/compagnies/compagnieService';
import provinceService from '../../../services/provinces/provinceService';
import { CompagnieFormData, CompagnieUpdateData, ModePaiementDetail } from '../../../types/compagnie';
import { Province } from '../../../types/province';
import { SearchableDropdown, useConfirmDialog } from '../../common';

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
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<number[]>([]);
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
    comp_localisation: undefined,
    modes_paiement: [],
  });

  const PAYMENT_METHODS = [
    { id: 2, nom: 'MVola', prefixes: ['034', '038'] },
    { id: 1, nom: 'Orange Money', prefixes: ['032', '037'] },
    { id: 3, nom: 'Airtel Money', prefixes: ['033'] },
  ];

  const isEditMode = !!compagnieId;

  useEffect(() => {
    if (visible) {
      chargerProvinces();
      if (compagnieId) {
        chargerCompagnie();
      } else {
        resetForm();
      }
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
      comp_localisation: undefined,
      modes_paiement: [],
    });
    setSelectedProvinces([]);
  };

  const chargerProvinces = async () => {
    setLoadingProvinces(true);
    const response = await provinceService.listerProvinces();
    setLoadingProvinces(false);

    if (response.statut && 'data' in response && response.data) {
      // Le service retourne ProvincesListeResponse avec une propriété provinces
      const provincesData = (response.data as any).provinces ||
        (Array.isArray(response.data) ? response.data : []);
      setProvinces(provincesData);
    }
  };

  // Fonction pour obtenir la configuration d'orientation (identique à RenderProvinces)
  const getOrientationConfig = (orientation: string) => {
    // Couleurs spécifiques pour Est (bleu foncé) et Ouest (bleu clair)
    const orientationColors: { [key: string]: { bg: string; text: string; hex: string } } = {
      'Est': { bg: 'bg-blue-200', text: 'text-blue-700', hex: '#1e40af' }, // Bleu foncé
      'Ouest': { bg: 'bg-blue-100', text: 'text-blue-600', hex: '#2563eb' }, // Bleu plus clair
    };

    // Si c'est Est ou Ouest, utiliser les couleurs spécifiques
    if (orientationColors[orientation]) {
      const iconMap: { [key: string]: string } = {
        'Nord': 'arrow-up',
        'Sud': 'arrow-down',
        'Est': 'arrow-forward',
        'Ouest': 'arrow-back',
        'Centre': 'location',
      };

      return {
        ...orientationColors[orientation],
        icon: iconMap[orientation] || 'location',
      };
    }

    // Pour les autres orientations, utiliser le système de hash
    const hash = orientation.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const colorPalette = [
      { bg: 'bg-indigo-100', text: 'text-indigo-600', hex: '#4f46e5' },
      { bg: 'bg-purple-100', text: 'text-purple-600', hex: '#7c3aed' },
      { bg: 'bg-pink-100', text: 'text-pink-600', hex: '#db2777' },
      { bg: 'bg-rose-100', text: 'text-rose-600', hex: '#e11d48' },
      { bg: 'bg-cyan-100', text: 'text-cyan-600', hex: '#06b6d4' },
      { bg: 'bg-teal-100', text: 'text-teal-600', hex: '#14b8a6' },
      { bg: 'bg-emerald-100', text: 'text-emerald-600', hex: '#10b981' },
    ];

    const config = colorPalette[hash % colorPalette.length];

    const iconMap: { [key: string]: string } = {
      'Nord': 'arrow-up',
      'Sud': 'arrow-down',
      'Est': 'arrow-forward',
      'Ouest': 'arrow-back',
      'Centre': 'location',
    };

    return {
      ...config,
      icon: iconMap[orientation] || 'location',
    };
  };

  const chargerCompagnie = async () => {
    if (!compagnieId) return;

    setLoading(true);
    const response = await compagnieService.getCompagnie(compagnieId);
    setLoading(false);

    if (response.statut && 'data' in response && response.data) {
      const compagnie = response.data;
      setFormData({
        comp_nom: compagnie.nom,
        comp_nif: compagnie.nif,
        comp_stat: compagnie.stat,
        comp_description: compagnie.description,
        comp_phone: compagnie.telephone,
        comp_email: compagnie.email,
        comp_adresse: compagnie.adresse,
        comp_localisation: compagnie.localisation?.id,
        modes_paiement: [], // Will be updated below
      });
      // Charger les provinces déjà sélectionnées
      if (compagnie.provinces_desservies && compagnie.provinces_desservies.length > 0) {
        setSelectedProvinces(compagnie.provinces_desservies.map(p => p.id));
      } else {
        setSelectedProvinces([]);
      }

      // Charger les modes de paiement déjà sélectionnés
      if (compagnie.modes_paiement_acceptes && compagnie.modes_paiement_acceptes.length > 0) {
        const selectedModes = compagnie.modes_paiement_acceptes.map(m => ({
          id: m.id,
          numero: m.numero || '',
          titulaire: m.titulaire || '',
        }));
        setFormData(prev => ({ ...prev, modes_paiement: selectedModes }));
      }
    } else {
      showDialog({
        title: 'Erreur',
        message: ('message' in response ? response.message : 'Impossible de charger la compagnie') || 'Impossible de charger la compagnie',
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
        onConfirm: () => { },
        onCancel: () => { }
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
          onConfirm: () => { },
          onCancel: () => { }
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
        comp_phone: formData.comp_phone!,
        comp_email: formData.comp_email!,
        comp_adresse: formData.comp_adresse!,
        comp_description: formData.comp_description!,
        comp_localisation: formData.comp_localisation!,
        provinces_desservies: selectedProvinces.length > 0 ? selectedProvinces : undefined,
        modes_paiement: formData.modes_paiement,
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
          onCancel: () => { }
        });
      } else {
        setLoading(false);
        showDialog({
          title: 'Erreur',
          message: response.message || 'Une erreur est survenue',
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => { },
          onCancel: () => { }
        });
      }
    } else {
      const compagnieData: CompagnieFormData = {
        ...formData as CompagnieFormData,
        provinces_desservies: selectedProvinces.length > 0 ? selectedProvinces : undefined,
      };
      const response = await compagnieService.creerCompagnie(compagnieData);

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
          onCancel: () => { }
        });
      } else {
        setLoading(false);
        showDialog({
          title: 'Erreur',
          message: response.message || 'Une erreur est survenue',
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => { },
          onCancel: () => { }
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

              <SearchableDropdown
                label="Localisation *"
                placeholder="Sélectionner la localisation"
                data={provinces}
                selectedId={formData.comp_localisation}
                onSelect={(id) => setFormData({ ...formData, comp_localisation: id })}
                showAllOption={false}
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

              {/* Sélection des provinces desservies */}
              <Text className="text-gray-700 mb-2 mt-2">Provinces desservies</Text>
              {loadingProvinces ? (
                <View className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3 items-center">
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text className="text-gray-500 text-sm mt-2">Chargement des provinces...</Text>
                </View>
              ) : provinces.length === 0 ? (
                <View className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3">
                  <Text className="text-gray-500 text-sm">Aucune province disponible</Text>
                </View>
              ) : (
                <View className="bg-gray-50 border border-gray-300 rounded-xl p-3 mb-3">
                  <View className="flex-row flex-wrap">
                    {provinces.map((province) => {
                      const isSelected = selectedProvinces.includes(province.id);
                      const orientationConfig = getOrientationConfig(province.orientation);
                      return (
                        <TouchableOpacity
                          key={province.id}
                          className={`rounded-full px-3 py-2 mr-2 mb-2 flex-row items-center ${isSelected ? 'bg-blue-500' : 'bg-white border border-gray-300'
                            }`}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedProvinces(selectedProvinces.filter(id => id !== province.id));
                            } else {
                              setSelectedProvinces([...selectedProvinces, province.id]);
                            }
                          }}
                          disabled={loading}
                        >
                          <Ionicons
                            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                            size={16}
                            color={isSelected ? "#fff" : "#6b7280"}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            className={`text-sm font-medium mr-2 ${isSelected ? 'text-white' : 'text-gray-700'
                              }`}
                          >
                            {province.nom}
                          </Text>
                          {!isSelected && (
                            <View className={`${orientationConfig.bg} rounded-full px-2 py-0.5 flex-row items-center`}>
                              <Ionicons
                                name={orientationConfig.icon as any}
                                size={12}
                                color={orientationConfig.hex}
                              />
                              <Text className={`${orientationConfig.text} text-xs font-semibold ml-1`}>
                                {province.orientation}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedProvinces.length > 0 && (
                    <Text className="text-gray-500 text-xs mt-2">
                      {selectedProvinces.length} province(s) sélectionnée(s)
                    </Text>
                  )}
                </View>
              )}

              {/* Modes de Paiement */}
              <Text className="text-gray-900 font-bold text-base mt-2 mb-3">
                Modes de Paiement acceptés
              </Text>
              <View className="bg-gray-50 border border-gray-300 rounded-xl p-3 mb-4">
                <View className="flex-row flex-wrap mb-2">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = (formData.modes_paiement as ModePaiementDetail[])?.some(m => m.id === method.id);
                    return (
                      <TouchableOpacity
                        key={method.id}
                        className={`rounded-full px-4 py-2 mr-2 mb-2 flex-row items-center ${isSelected ? 'bg-orange-500' : 'bg-white border border-gray-300'}`}
                        onPress={() => {
                          const currentModes = (formData.modes_paiement as ModePaiementDetail[]) || [];
                          if (isSelected) {
                            setFormData({ ...formData, modes_paiement: currentModes.filter(m => m.id !== method.id) });
                          } else {
                            setFormData({ ...formData, modes_paiement: [...currentModes, { id: method.id, numero: '', titulaire: '' }] });
                          }
                        }}
                        disabled={loading}
                      >
                        <Ionicons
                          name={isSelected ? "card" : "card-outline"}
                          size={18}
                          color={isSelected ? "#fff" : "#4b5563"}
                          style={{ marginRight: 6 }}
                        />
                        <Text className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                          {method.nom}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Formulaire détaillé pour chaque mode sélectionné */}
                {(formData.modes_paiement as ModePaiementDetail[])?.map((mode) => {
                  const methodConfig = PAYMENT_METHODS.find(m => m.id === mode.id);
                  return (
                    <View key={mode.id} className="bg-white border border-gray-200 rounded-2xl p-4 mb-3 shadow-sm">
                      <View className="flex-row items-center mb-3">
                        <View className="bg-blue-100 rounded-full p-2 mr-2">
                          <Ionicons name="phone-portrait" size={16} color="#3b82f6" />
                        </View>
                        <Text className="font-bold text-gray-800">{methodConfig?.nom}</Text>
                      </View>

                      <View className="mb-2">
                        <Text className="text-xs text-gray-500 mb-1 ml-1">Numéro de téléphone ({methodConfig?.prefixes.join(', ')})</Text>
                        <TextInput
                          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          value={mode.numero}
                          onChangeText={(text) => {
                            const newModes = (formData.modes_paiement as ModePaiementDetail[]).map(m => 
                              m.id === mode.id ? { ...m, numero: text } : m
                            );
                            setFormData({ ...formData, modes_paiement: newModes });
                          }}
                          placeholder="034 XX XXX XX"
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </View>

                      <View>
                        <Text className="text-xs text-gray-500 mb-1 ml-1">Nom du compte / Titulaire</Text>
                        <TextInput
                          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          value={mode.titulaire}
                          onChangeText={(text) => {
                            const newModes = (formData.modes_paiement as ModePaiementDetail[]).map(m => 
                              m.id === mode.id ? { ...m, titulaire: text } : m
                            );
                            setFormData({ ...formData, modes_paiement: newModes });
                          }}
                          placeholder="Nom de la personne"
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
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
                  <View className={`rounded-full w-16 h-16 items-center justify-center mb-2 ${isEditMode ? 'bg-blue-100' : 'bg-green-100'
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

