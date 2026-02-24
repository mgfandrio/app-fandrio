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
import apiClient from '../../services/api/axiosConfig';
import voitureService from '../../services/voitures/voitureService';
import { voyageService } from '../../services/voyages/voyageService';
import { Trajet } from '../../types/trajet';
import { useConfirmDialog } from '../common/ConfirmDialog';

interface Props {
  visible: boolean;
  voyageId?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Trajet {
  id_trajet: number;
  nom_trajet: string;
}

interface Voiture {
  id_voiture: number;
  immatriculation: string;
}

export const VoyageFormModal: React.FC<Props> = ({
  visible,
  voyageId,
  onClose,
  onSuccess,
}) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [voitures, setVoitures] = useState<Voiture[]>([]);
  const [showTrajetDropdown, setShowTrajetDropdown] = useState(false);
  const [showVoitureDropdown, setShowVoitureDropdown] = useState(false);
  const [searchTrajet, setSearchTrajet] = useState('');
  const [searchVoiture, setSearchVoiture] = useState('');

  const [formData, setFormData] = useState({
    voyage_date: '',
    voyage_heure_depart: '',
    traj_id: '',
    voit_id: '',
    voyage_type: '1',
    places_disponibles: '',
  });

  const isEditMode = !!voyageId;

  useEffect(() => {
    if (visible) {
      chargerTrajets();
      chargerVoitures();
      if (voyageId) {
        chargerVoyage();
      } else {
        resetForm();
      }
    }
  }, [visible, voyageId]);

  const chargerTrajets = async () => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/trajet/recupererListeTrajet');
      console.log('Réponse trajets complète:', response.data);
      
      let trajetsList: Trajet[] = [];
      
      if (response.data?.data?.trajets && Array.isArray(response.data.data.trajets)) {
        trajetsList = response.data.data.trajets;
        console.log('Trajets trouvés (response.data.data.trajets):', trajetsList);
      } else if (Array.isArray(response.data?.data)) {
        trajetsList = response.data.data;
        console.log('Trajets (response.data.data):', trajetsList);
      }
      
      console.log('Trajets finaux chargés count:', trajetsList.length);
      if (trajetsList.length > 0) {
        console.log('Premier trajet:', trajetsList[0]);
      }
      setTrajets(trajetsList);
    } catch (error) {
      console.error('Erreur chargement trajets:', error);
      setTrajets([]);
    }
  };

  const chargerVoitures = async () => {
    try {
      console.log('Début chargement voitures via service...');
      const response = await voitureService.obtenirListeVoitures();
      console.log('Réponse voitures service:', response);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✓ Voitures chargées count:', response.data.length);
        if (response.data.length > 0) {
          console.log('Première voiture:', response.data[0]);
        }
        setVoitures(response.data);
      } else {
        console.log('✗ Pas de voitures trouvées');
        setVoitures([]);
      }
    } catch (error: any) {
      console.error('✗ Erreur chargement voitures:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setVoitures([]);
    }
  };

  const chargerVoyage = async () => {
    if (!voyageId) return;

    setLoading(true);
    try {
      const response = await voyageService.obtenirVoyage(voyageId);
      console.log('Voyage chargé pour édition:', response.data);
      setLoading(false);

      if (response.data) {
        const voyage = response.data as any;
        
        const trajetId = voyage.traj_id || voyage.trajet?.id || voyage.trajet?.id_trajet || voyage.trajet?.traj_id;
        const voitureId = voyage.voit_id || voyage.voiture?.id || voyage.voiture?.voit_id || voyage.voiture?.id_voiture;
        
        console.log('Données extraites pour édition:', {
          trajetId,
          voitureId,
          voyage_date: voyage.date || voyage.voyage_date,
          voyage_heure_depart: voyage.heure_depart || voyage.voyage_heure_depart,
        });
        
        setFormData({
          voyage_date: (voyage.date || voyage.voyage_date || '') as string,
          voyage_heure_depart: (voyage.heure_depart || voyage.voyage_heure_depart || '') as string,
          traj_id: trajetId?.toString() || '',
          voit_id: voitureId?.toString() || '',
          voyage_type: voyage.type?.toString() || voyage.voyage_type?.toString() || '1',
          places_disponibles: voyage.places_disponibles?.toString() || '',
        });
      } else {
        showDialog({
          title: 'Erreur',
          message: 'Impossible de charger le voyage',
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
        message: error?.message || 'Impossible de charger le voyage',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => onClose(),
        onCancel: () => onClose(),
      });
    }
  };

  const resetForm = () => {
    setFormData({
      voyage_date: '',
      voyage_heure_depart: '',
      traj_id: '',
      voit_id: '',
      voyage_type: '1',
      places_disponibles: '',
    });
    setSearchTrajet('');
    setSearchVoiture('');
  };

  const getTrajetName = () => {
    if (!trajets.length) return 'Sélectionner trajet';
    
    const trajet = trajets.find((t: any) => {
      const tId = (t.id_trajet)?.toString();
      return tId === formData.traj_id;
    });
    
    const name = trajet?.nom_trajet || trajet?.trajet_nom;
    console.log('getTrajetName - formData.traj_id:', formData.traj_id, 'trajet trouvé:', trajet, 'name:', name);
    
    return name || 'Sélectionner trajet';
  };

  const getVoitureName = () => {
    if (!voitures.length) return 'Sélectionner voiture';
    
    const voiture = voitures.find((v: any) => {
      const vId = (v.id_voiture || v.voit_id)?.toString();
      return vId === formData.voit_id;
    });
    
    const name = voiture?.voit_matricule || voiture?.immatriculation || voiture?.voit_immatriculation;
    console.log('getVoitureName - formData.voit_id:', formData.voit_id, 'voiture trouvée:', voiture, 'name:', name);
    
    return name || 'Sélectionner voiture';
  };

  const getFilteredTrajets = (searchText: string) => {
    return trajets.filter((trajet: any) => {
      const tNom = (trajet.nom_trajet || trajet.trajet_nom || '').toLowerCase();
      const matchesSearch = tNom.includes(searchText.toLowerCase());
      return matchesSearch;
    });
  };

  const getFilteredVoitures = (searchText: string) => {
    return voitures.filter((voiture: any) => {
      const vNom = (voiture.voit_matricule || voiture.immatriculation || voiture.voit_immatriculation || '').toLowerCase();
      const matchesSearch = vNom.includes(searchText.toLowerCase());
      return matchesSearch;
    });
  };

  // Valider et formater la date en YYYY-MM-DD
  const handleDateChange = (text: string) => {
    // Permettre la saisie libre mais valider le format
    let formatted = text.replace(/\D/g, ''); // Garder seulement les chiffres
    
    if (formatted.length >= 4) {
      formatted = formatted.slice(0, 4) + '-' + formatted.slice(4);
    }
    if (formatted.length >= 7) {
      formatted = formatted.slice(0, 7) + '-' + formatted.slice(7, 9);
    }
    
    setFormData({ ...formData, voyage_date: formatted.slice(0, 10) });
  };

  // Valider et formater l'heure en HH:mm
  const handleTimeChange = (text: string) => {
    let formatted = text.replace(/\D/g, ''); // Garder seulement les chiffres
    
    if (formatted.length >= 2) {
      const hours = formatted.slice(0, 2);
      if (parseInt(hours) > 23) {
        formatted = '23' + formatted.slice(2);
      }
      formatted = formatted.slice(0, 2) + ':' + formatted.slice(2, 4);
    }
    
    if (formatted.length >= 5) {
      const minutes = formatted.slice(3, 5);
      if (parseInt(minutes) > 59) {
        formatted = formatted.slice(0, 3) + '59';
      }
    }
    
    setFormData({ ...formData, voyage_heure_depart: formatted.slice(0, 5) });
  };

  const handleSubmit = async () => {
    // Validation
    if (
      !formData.voyage_date ||
      !formData.voyage_heure_depart ||
      !formData.traj_id ||
      !formData.voit_id ||
      !formData.places_disponibles
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

    // Valider le format de la date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.voyage_date)) {
      showDialog({
        title: 'Erreur',
        message: 'La date doit être au format YYYY-MM-DD (ex: 2026-02-28)',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {},
      });
      return;
    }

    // Valider le format de l'heure
    if (!/^\d{2}:\d{2}$/.test(formData.voyage_heure_depart)) {
      showDialog({
        title: 'Erreur',
        message: 'L\'heure doit être au format HH:mm (ex: 14:30)',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {},
      });
      return;
    }

    // Vérifier que la date est dans le futur
    const dateVoyage = new Date(formData.voyage_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateVoyage <= today) {
      showDialog({
        title: 'Erreur',
        message: 'La date de départ doit être dans le futur',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {},
      });
      return;
    }

    // Vérifier que le nombre de places disponibles ne dépasse pas la capacité de la voiture
    const voiture = voitures.find((v: any) => {
      const vId = (v.id_voiture || v.voit_id)?.toString();
      return vId === formData.voit_id;
    });

    if (voiture) {
      const capacite = voiture.voit_places || 0;
      const places = parseInt(formData.places_disponibles, 10);
      
      if (places > capacite) {
        showDialog({
          title: 'Erreur',
          message: `Le nombre de places disponibles (${places}) ne peut pas dépasser la capacité de la voiture (${capacite})`,
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => {},
          onCancel: () => {},
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const data = {
        voyage_date: formData.voyage_date,
        voyage_heure_depart: formData.voyage_heure_depart,
        traj_id: parseInt(formData.traj_id, 10),
        voit_id: parseInt(formData.voit_id, 10),
        voyage_type: parseInt(formData.voyage_type, 10),
        places_disponibles: parseInt(formData.places_disponibles, 10),
      };

      console.log('Envoi données voyage:', data);

      if (isEditMode) {
        const response = await voyageService.modifierVoyage(voyageId!, data);
        console.log('Réponse modification voyage:', response);
        setSubmitting(false);

        if (response.statut === true) {
          showDialog({
            title: 'Succès',
            message: response.message || 'Voyage modifié avec succès',
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
        const response = await voyageService.ajouterVoyage(data);
        console.log('Réponse création voyage:', response);
        setSubmitting(false);

        if (response.statut === true) {
          showDialog({
            title: 'Succès',
            message: response.message || 'Voyage programmé avec succès',
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
                  <Ionicons name="navigate" size={26} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">
                    {isEditMode ? 'Modifier Voyage' : 'Programmer Voyage'}
                  </Text>
                  <Text className="text-white/90 text-sm mt-1">
                    {isEditMode ? 'Mise à jour du voyage' : 'Créer un nouveau voyage'}
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

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <ScrollView className="flex-1 p-4">
              {/* Trajet Dropdown */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Trajet *</Text>
                <TouchableOpacity
                  className="bg-white border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  onPress={() => setShowTrajetDropdown(!showTrajetDropdown)}
                >
                  <Text className="text-gray-900">{getTrajetName()}</Text>
                  <Ionicons name={showTrajetDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#6b7280" />
                </TouchableOpacity>

                {showTrajetDropdown && (
                  <View className="bg-white border border-gray-300 border-t-0 rounded-b-xl max-h-48">
                    <TextInput
                      className="px-4 py-2 border-b border-gray-200 text-gray-900"
                      placeholder="Rechercher trajet..."
                      value={searchTrajet}
                      onChangeText={setSearchTrajet}
                      placeholderTextColor="#9ca3af"
                    />
                    <ScrollView>
                      {getFilteredTrajets(searchTrajet).map((trajet: any) => (
                        <TouchableOpacity
                          key={trajet.id_trajet}
                          className="px-4 py-3 border-b border-gray-100"
                          onPress={() => {
                            setFormData({ ...formData, traj_id: trajet.id_trajet.toString() });
                            setShowTrajetDropdown(false);
                            setSearchTrajet('');
                          }}
                        >
                          <Text className="text-gray-900">{trajet.nom_trajet || trajet.trajet_nom}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Voiture Dropdown */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Voiture *</Text>
                <TouchableOpacity
                  className="bg-white border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between"
                  onPress={() => setShowVoitureDropdown(!showVoitureDropdown)}
                >
                  <Text className="text-gray-900">{getVoitureName()}</Text>
                  <Ionicons name={showVoitureDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#6b7280" />
                </TouchableOpacity>

                {showVoitureDropdown && (
                  <View className="bg-white border border-gray-300 border-t-0 rounded-b-xl max-h-48">
                    <TextInput
                      className="px-4 py-2 border-b border-gray-200 text-gray-900"
                      placeholder="Rechercher voiture..."
                      value={searchVoiture}
                      onChangeText={setSearchVoiture}
                      placeholderTextColor="#9ca3af"
                    />
                    <ScrollView>
                      {getFilteredVoitures(searchVoiture).map((voiture: any) => {
                        const vId = voiture.id_voiture || voiture.voit_id;
                        return (
                          <TouchableOpacity
                            key={vId}
                            className="px-4 py-3 border-b border-gray-100"
                            onPress={() => {
                              setFormData({ ...formData, voit_id: vId.toString() });
                              setShowVoitureDropdown(false);
                              setSearchVoiture('');
                            }}
                          >
                            <Text className="text-gray-900">{voiture.voit_matricule || voiture.immatriculation || voiture.voit_immatriculation}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Date Input */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Date de départ *</Text>
                <View className="bg-white border border-gray-300 rounded-xl px-4 py-3 flex-row items-center">
                  <Ionicons name="calendar" size={20} color="#3b82f6" />
                  <TextInput
                    className="flex-1 ml-2 text-gray-900"
                    placeholder="YYYY-MM-DD"
                    value={formData.voyage_date}
                    onChangeText={handleDateChange}
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
                <Text className="text-xs text-gray-500 mt-1">Ex: 2026-02-28</Text>
                {formData.voyage_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.voyage_date) && (
                  <Text className="text-xs text-red-500 mt-1">Format invalide (YYYY-MM-DD)</Text>
                )}
              </View>

              {/* Heure Input */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Heure de départ *</Text>
                <View className="bg-white border border-gray-300 rounded-xl px-4 py-3 flex-row items-center">
                  <Ionicons name="time" size={20} color="#3b82f6" />
                  <TextInput
                    className="flex-1 ml-2 text-gray-900"
                    placeholder="HH:mm"
                    value={formData.voyage_heure_depart}
                    onChangeText={handleTimeChange}
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <Text className="text-xs text-gray-500 mt-1">Ex: 14:30</Text>
                {formData.voyage_heure_depart && !/^\d{2}:\d{2}$/.test(formData.voyage_heure_depart) && (
                  <Text className="text-xs text-red-500 mt-1">Format invalide (HH:mm)</Text>
                )}
              </View>

              {/* Type de voyage (Matin/Soir) */}
              <View className="mb-4">
                <Text className="text-gray-900 font-semibold mb-2">Type de voyage *</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className={`flex-1 border-2 rounded-xl py-3 items-center justify-center ${
                      formData.voyage_type === '1'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 bg-white'
                    }`}
                    onPress={() => setFormData({ ...formData, voyage_type: '1' })}
                  >
                    <Text className={`font-semibold ${formData.voyage_type === '1' ? 'text-blue-600' : 'text-gray-900'}`}>
                      Matin
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 border-2 rounded-xl py-3 items-center justify-center ${
                      formData.voyage_type === '2'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 bg-white'
                    }`}
                    onPress={() => setFormData({ ...formData, voyage_type: '2' })}
                  >
                    <Text className={`font-semibold ${formData.voyage_type === '2' ? 'text-blue-600' : 'text-gray-900'}`}>
                      Soir
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Places Input */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-900 font-semibold">Places disponibles *</Text>
                  {voitures.find((v: any) => (v.id_voiture || v.voit_id)?.toString() === formData.voit_id) && (
                    <Text className="text-sm text-gray-600">
                      Capacité: {voitures.find((v: any) => (v.id_voiture || v.voit_id)?.toString() === formData.voit_id)?.voit_places || 0} places
                    </Text>
                  )}
                </View>
                <TextInput
                  className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                  placeholder="Nombre de places"
                  value={formData.places_disponibles}
                  onChangeText={(text) => setFormData({ ...formData, places_disponibles: text })}
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              {/* Buttons */}
              <View className="flex-row gap-3 mt-6 pb-4">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-3 items-center justify-center"
                  onPress={onClose}
                  disabled={submitting}
                >
                  <Text className="text-gray-900 font-semibold">Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-blue-600 rounded-xl py-3 items-center justify-center"
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">
                      {isEditMode ? 'Modifier' : 'Programmer'}
                    </Text>
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
