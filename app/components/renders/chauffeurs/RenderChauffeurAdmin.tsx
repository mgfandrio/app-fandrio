import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { chauffeurService } from '../../../services';
import { Chauffeur } from '../../../types/chauffeur';
import { useConfirmDialog } from '../../common/ConfirmDialog';

export const RenderChauffeurAdmin = () => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingChauffeurId, setEditingChauffeurId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    chauff_nom: '',
    chauff_prenom: '',
    chauff_age: '',
    chauff_cin: '',
    chauff_permis: 'B',
    chauff_phone: '',
    chauff_statut: '1'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    chargerChauffeurs();
  }, []);

  const chargerChauffeurs = async () => {
    setLoading(true);
    try {
      const response = await chauffeurService.obtenirListeChauffeurs();
      if (response.data) {
        setChauffeurs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de charger les chauffeurs');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await chargerChauffeurs();
    setRefreshing(false);
  };

  const openFormModal = useCallback((chauffeur?: Chauffeur) => {
    if (chauffeur) {
      setFormData({
        chauff_nom: chauffeur.chauff_nom,
        chauff_prenom: chauffeur.chauff_prenom,
        chauff_age: chauffeur.chauff_age.toString(),
        chauff_cin: chauffeur.chauff_cin,
        chauff_permis: chauffeur.chauff_permis,
        chauff_phone: chauffeur.chauff_phone,
        chauff_statut: chauffeur.chauff_statut.toString()
      });
      setEditingChauffeurId(chauffeur.chauff_id);
    } else {
      setFormData({
        chauff_nom: '',
        chauff_prenom: '',
        chauff_age: '',
        chauff_cin: '',
        chauff_permis: 'B',
        chauff_phone: '',
        chauff_statut: '1'
      });
      setEditingChauffeurId(null);
    }
    setShowFormModal(true);
  }, []);

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingChauffeurId(null);
  };

  const handleSubmitForm = async () => {
    if (!formData.chauff_nom || !formData.chauff_prenom || !formData.chauff_age || 
        !formData.chauff_cin || !formData.chauff_phone) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        chauff_age: Number(formData.chauff_age),
        chauff_statut: Number(formData.chauff_statut),
        comp_id: 1 // À adapter selon le contexte
      };

      if (editingChauffeurId) {
        await chauffeurService.modifierChauffeur(editingChauffeurId, data);
        Alert.alert('Succès', 'Chauffeur modifié');
      } else {
        await chauffeurService.ajouterChauffeur(data);
        Alert.alert('Succès', 'Chauffeur ajouté');
      }
      closeFormModal();
      chargerChauffeurs();
    } catch (error: any) {
      Alert.alert('Erreur', error?.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangerEtat = (chauffeur: Chauffeur) => {
    showDialog({
      title: 'Changer l\'état',
      message: `Passer le chauffeur ${chauffeur.chauff_nom} ${chauffeur.chauff_prenom} de ${chauffeur.chauff_statut === 1 ? 'Actif' : 'Inactif'} ?`,
      type: 'warning',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await chauffeurService.changerEtatChauffeur(chauffeur.chauff_id);
          Alert.alert('Succès', 'État changé');
          chargerChauffeurs();
        } catch (error: any) {
          Alert.alert('Erreur', error?.message || 'Erreur lors du changement d\'état');
        }
      }
    });
  };

  const handleSupprimer = (chauffeur: Chauffeur) => {
    showDialog({
      title: 'Supprimer le chauffeur',
      message: `Êtes-vous sûr de vouloir supprimer ${chauffeur.chauff_nom} ${chauffeur.chauff_prenom} ?`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await chauffeurService.supprimerChauffeur(chauffeur.chauff_id);
          Alert.alert('Succès', 'Chauffeur supprimé');
          chargerChauffeurs();
        } catch (error: any) {
          Alert.alert('Erreur', error?.message || 'Erreur lors de la suppression');
        }
      }
    });
  };

  const chauffeursFiltres = chauffeurs.filter(c =>
    `${c.chauff_nom} ${c.chauff_prenom} ${c.chauff_cin}`
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );

  return (
    <View className="flex-1 bg-gray-50">
      <DialogComponent />

      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Chauffeurs</Text>
          <TouchableOpacity
            className="bg-blue-500 rounded-full p-3"
            onPress={() => openFormModal()}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Recherche */}
        <TextInput
          className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-gray-900"
          placeholder="Rechercher..."
          placeholderTextColor="#9ca3af"
          style={{ color: '#111827' }}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          className="flex-1 px-4 py-4"
        >
          {chauffeursFiltres.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="person-outline" size={64} color="#d1d5db" />
              <Text className="text-gray-500 text-lg mt-4">Aucun chauffeur trouvé</Text>
            </View>
          ) : (
            chauffeursFiltres.map(chauffeur => (
              <View key={chauffeur.chauff_id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base">
                      {chauffeur.chauff_nom} {chauffeur.chauff_prenom}
                    </Text>
                    <Text className="text-gray-500 text-sm">CIN: {chauffeur.chauff_cin}</Text>
                  </View>
                  <TouchableOpacity
                    className={`px-3 py-1 rounded-full ${
                      chauffeur.chauff_statut === 1 ? 'bg-green-100' : 'bg-red-100'
                    }`}
                    onPress={() => handleChangerEtat(chauffeur)}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        chauffeur.chauff_statut === 1 ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {chauffeur.chauff_statut === 1 ? 'Actif' : 'Inactif'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="bg-gray-50 rounded-lg p-3 mb-3">
                  <Text className="text-gray-600 text-sm">
                    {chauffeur.chauff_age} ans • Permis {chauffeur.chauff_permis} • {chauffeur.chauff_phone}
                  </Text>
                </View>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 bg-blue-500 rounded-lg py-2 items-center"
                    onPress={() => openFormModal(chauffeur)}
                  >
                    <Text className="text-white font-semibold">Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-red-500 rounded-lg py-2 items-center"
                    onPress={() => handleSupprimer(chauffeur)}
                  >
                    <Text className="text-white font-semibold">Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Form Modal */}
      <Modal
        visible={showFormModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeFormModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        <View className="flex-1 bg-black/50">
          <View className="flex-1 mt-20 bg-white rounded-t-3xl">
            <ScrollView className="flex-1 p-6" keyboardShouldPersistTaps="handled">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-bold text-gray-900">
                  {editingChauffeurId ? 'Modifier' : 'Ajouter'} un chauffeur
                </Text>
                <TouchableOpacity onPress={closeFormModal}>
                  <Ionicons name="close" size={28} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Form fields */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Nom</Text>
                <TextInput
                  className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
                  placeholder="Nom"
                  placeholderTextColor="#9ca3af"
                  style={{ color: '#111827' }}
                  value={formData.chauff_nom}
                  onChangeText={(text) => setFormData({ ...formData, chauff_nom: text })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Prénom</Text>
                <TextInput
                  className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
                  placeholder="Prénom"
                  placeholderTextColor="#9ca3af"
                  style={{ color: '#111827' }}
                  value={formData.chauff_prenom}
                  onChangeText={(text) => setFormData({ ...formData, chauff_prenom: text })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Âge</Text>
                <TextInput
                  className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
                  placeholder="Âge"
                  placeholderTextColor="#9ca3af"
                  style={{ color: '#111827' }}
                  keyboardType="numeric"
                  value={formData.chauff_age}
                  onChangeText={(text) => setFormData({ ...formData, chauff_age: text })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">CIN</Text>
                <TextInput
                  className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
                  placeholder="CIN"
                  placeholderTextColor="#9ca3af"
                  style={{ color: '#111827' }}
                  value={formData.chauff_cin}
                  onChangeText={(text) => setFormData({ ...formData, chauff_cin: text })}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Permis</Text>
                <View className="bg-gray-100 border border-gray-200 rounded-lg">
                  <Picker
                    selectedValue={formData.chauff_permis}
                    onValueChange={(value) => setFormData({ ...formData, chauff_permis: value })}
                    style={{ color: '#111827' }}
                  >
                    <Picker.Item label="Catégorie A" value="A" color="#111827" />
                    <Picker.Item label="Catégorie B" value="B" color="#111827" />
                    <Picker.Item label="Catégorie C" value="C" color="#111827" />
                    <Picker.Item label="Catégorie D" value="D" color="#111827" />
                  </Picker>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Téléphone</Text>
                <TextInput
                  className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
                  placeholder="Téléphone"
                  placeholderTextColor="#9ca3af"
                  style={{ color: '#111827' }}
                  keyboardType="phone-pad"
                  value={formData.chauff_phone}
                  onChangeText={(text) => setFormData({ ...formData, chauff_phone: text })}
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 font-semibold mb-2">Statut</Text>
                <View className="bg-gray-100 border border-gray-200 rounded-lg">
                  <Picker
                    selectedValue={formData.chauff_statut}
                    onValueChange={(value) => setFormData({ ...formData, chauff_statut: value })}
                    style={{ color: '#111827' }}
                  >
                    <Picker.Item label="Actif" value="1" color="#111827" />
                    <Picker.Item label="Inactif" value="0" color="#111827" />
                  </Picker>
                </View>
              </View>

              {/* Buttons */}
              <View className="flex-row gap-3 mb-8">
                <TouchableOpacity
                  className="flex-1 bg-gray-300 rounded-lg py-3 items-center"
                  onPress={closeFormModal}
                  disabled={submitting}
                >
                  <Text className="text-gray-700 font-semibold">Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 rounded-lg py-3 items-center ${
                    submitting ? 'bg-blue-300' : 'bg-blue-500'
                  }`}
                  onPress={handleSubmitForm}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">
                      {editingChauffeurId ? 'Modifier' : 'Ajouter'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
