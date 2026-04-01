import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useConfirmDialog } from '../common/ConfirmDialog';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface VoyageEntry {
  id: string;
  voyage_date: string;
  voyage_heure_depart: string;
  voit_id: string;
  voyage_type: string;
  places_disponibles: string;
}

interface TrajetItem {
  id_trajet: number;
  nom_trajet?: string;
  trajet_nom?: string;
}

interface VoitureItem {
  id_voiture?: number;
  voit_id?: number;
  voit_matricule?: string;
  immatriculation?: string;
  voit_immatriculation?: string;
  voit_marque?: string;
  voit_modele?: string;
  voit_places?: number;
}

let entryCounter = 0;
const generateId = () => `entry_${++entryCounter}_${Date.now()}`;

const createEmptyEntry = (): VoyageEntry => ({
  id: generateId(),
  voyage_date: '',
  voyage_heure_depart: '',
  voit_id: '',
  voyage_type: '1',
  places_disponibles: '',
});

export const VoyageMultipleModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [trajets, setTrajets] = useState<TrajetItem[]>([]);
  const [voitures, setVoitures] = useState<VoitureItem[]>([]);
  const [selectedTrajetId, setSelectedTrajetId] = useState('');
  const [showTrajetDropdown, setShowTrajetDropdown] = useState(false);
  const [searchTrajet, setSearchTrajet] = useState('');
  const [entries, setEntries] = useState<VoyageEntry[]>([createEmptyEntry()]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showVoitureDropdownFor, setShowVoitureDropdownFor] = useState<string | null>(null);
  const [searchVoiture, setSearchVoiture] = useState('');

  useEffect(() => {
    if (visible) {
      entryCounter = 0;
      chargerTrajets();
      chargerVoitures();
      setSelectedTrajetId('');
      setEntries([createEmptyEntry()]);
      setExpandedEntry(null);
    }
  }, [visible]);

  // Ouvrir le premier voyage par défaut
  useEffect(() => {
    if (entries.length === 1 && !expandedEntry) {
      setExpandedEntry(entries[0].id);
    }
  }, [entries]);

  const chargerTrajets = async () => {
    try {
      const response = await apiClient.get('/api/adminCompagnie/trajet/recupererListeTrajet');
      let trajetsList: TrajetItem[] = [];
      if (response.data?.data?.trajets && Array.isArray(response.data.data.trajets)) {
        trajetsList = response.data.data.trajets;
      } else if (Array.isArray(response.data?.data)) {
        trajetsList = response.data.data;
      }
      setTrajets(trajetsList);
    } catch {
      setTrajets([]);
    }
  };

  const chargerVoitures = async () => {
    try {
      const response = await voitureService.obtenirListeVoitures();
      if (response.data && Array.isArray(response.data)) {
        setVoitures(response.data);
      } else {
        setVoitures([]);
      }
    } catch {
      setVoitures([]);
    }
  };

  const getTrajetName = () => {
    if (!selectedTrajetId || !trajets.length) return 'Sélectionner un trajet commun';
    const trajet = trajets.find((t: any) => t.id_trajet?.toString() === selectedTrajetId);
    return trajet?.nom_trajet || trajet?.trajet_nom || 'Sélectionner un trajet commun';
  };

  const getVoitureName = (voitId: string) => {
    if (!voitId || !voitures.length) return 'Sélectionner voiture';
    const voiture = voitures.find((v: any) => (v.id_voiture || v.voit_id)?.toString() === voitId);
    return voiture?.voit_matricule || voiture?.immatriculation || voiture?.voit_immatriculation || 'Sélectionner voiture';
  };

  const getVoitureCapacite = (voitId: string): number => {
    if (!voitId) return 0;
    const voiture = voitures.find((v: any) => (v.id_voiture || v.voit_id)?.toString() === voitId);
    return (voiture as any)?.voit_places || 0;
  };

  const getFilteredTrajets = () => {
    return trajets.filter((t: any) => {
      const name = (t.nom_trajet || t.trajet_nom || '').toLowerCase();
      return name.includes(searchTrajet.toLowerCase());
    });
  };

  const getFilteredVoitures = () => {
    return voitures.filter((v: any) => {
      const name = (v.voit_matricule || v.immatriculation || v.voit_immatriculation || '').toLowerCase();
      return name.includes(searchVoiture.toLowerCase());
    });
  };

  const formatDateInput = (text: string): string => {
    let formatted = text.replace(/\D/g, '');
    if (formatted.length >= 4) formatted = formatted.slice(0, 4) + '-' + formatted.slice(4);
    if (formatted.length >= 7) formatted = formatted.slice(0, 7) + '-' + formatted.slice(7, 9);
    return formatted.slice(0, 10);
  };

  const formatTimeInput = (text: string): string => {
    let formatted = text.replace(/\D/g, '');
    if (formatted.length >= 2) {
      const hours = formatted.slice(0, 2);
      if (parseInt(hours) > 23) formatted = '23' + formatted.slice(2);
      formatted = formatted.slice(0, 2) + ':' + formatted.slice(2, 4);
    }
    if (formatted.length >= 5) {
      const minutes = formatted.slice(3, 5);
      if (parseInt(minutes) > 59) formatted = formatted.slice(0, 3) + '59';
    }
    return formatted.slice(0, 5);
  };

  const updateEntry = (id: string, field: keyof VoyageEntry, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
    if (entries.length >= 20) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas programmer plus de 20 voyages à la fois.');
      return;
    }
    const newEntry = createEmptyEntry();
    setEntries(prev => [...prev, newEntry]);
    setExpandedEntry(newEntry.id);
  };

  const duplicateEntry = (entry: VoyageEntry) => {
    if (entries.length >= 20) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas programmer plus de 20 voyages à la fois.');
      return;
    }
    const newEntry: VoyageEntry = {
      ...entry,
      id: generateId(),
      voyage_date: '', // Date vide pour forcer le choix d'une nouvelle date
    };
    setEntries(prev => [...prev, newEntry]);
    setExpandedEntry(newEntry.id);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) {
      Alert.alert('Minimum requis', 'Il faut au moins un voyage dans la liste.');
      return;
    }
    setEntries(prev => prev.filter(e => e.id !== id));
    if (expandedEntry === id) setExpandedEntry(null);
  };

  const applyToAll = (source: VoyageEntry) => {
    showDialog({
      title: 'Appliquer à tous',
      message: 'Copier la voiture, l\'heure, le type et les places de ce voyage vers tous les autres ? (Seules les dates resteront différentes)',
      type: 'warning',
      confirmText: 'Appliquer',
      cancelText: 'Annuler',
      onConfirm: () => {
        setEntries(prev => prev.map(e => ({
          ...e,
          voyage_heure_depart: source.voyage_heure_depart,
          voit_id: source.voit_id,
          voyage_type: source.voyage_type,
          places_disponibles: source.places_disponibles,
        })));
      },
      onCancel: () => {},
    });
  };

  const handleSubmit = async () => {
    // Validation du trajet commun
    if (!selectedTrajetId) {
      showDialog({
        title: 'Trajet requis',
        message: 'Veuillez sélectionner un trajet commun pour tous les voyages.',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {},
      });
      return;
    }

    // Validation de chaque entrée
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const num = i + 1;

      if (!e.voyage_date || !e.voyage_heure_depart || !e.voit_id || !e.places_disponibles) {
        showDialog({
          title: 'Champs manquants',
          message: `Voyage #${num} : veuillez remplir tous les champs obligatoires.`,
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => setExpandedEntry(e.id),
          onCancel: () => {},
        });
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.voyage_date)) {
        showDialog({
          title: 'Format date',
          message: `Voyage #${num} : la date doit être au format YYYY-MM-DD.`,
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => setExpandedEntry(e.id),
          onCancel: () => {},
        });
        return;
      }

      if (!/^\d{2}:\d{2}$/.test(e.voyage_heure_depart)) {
        showDialog({
          title: 'Format heure',
          message: `Voyage #${num} : l'heure doit être au format HH:mm.`,
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => setExpandedEntry(e.id),
          onCancel: () => {},
        });
        return;
      }

      const dateVoyage = new Date(e.voyage_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dateVoyage <= today) {
        showDialog({
          title: 'Date invalide',
          message: `Voyage #${num} : la date doit être dans le futur.`,
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => setExpandedEntry(e.id),
          onCancel: () => {},
        });
        return;
      }

      const capacite = getVoitureCapacite(e.voit_id);
      const places = parseInt(e.places_disponibles, 10);
      if (capacite > 0 && places > capacite) {
        showDialog({
          title: 'Capacité dépassée',
          message: `Voyage #${num} : ${places} places dépasse la capacité du véhicule (${capacite}).`,
          type: 'danger',
          confirmText: 'OK',
          onConfirm: () => setExpandedEntry(e.id),
          onCancel: () => {},
        });
        return;
      }
    }

    // Construire les données
    const voyages = entries.map(e => ({
      voyage_date: e.voyage_date,
      voyage_heure_depart: e.voyage_heure_depart,
      traj_id: parseInt(selectedTrajetId, 10),
      voit_id: parseInt(e.voit_id, 10),
      voyage_type: parseInt(e.voyage_type, 10),
      places_disponibles: parseInt(e.places_disponibles, 10),
    }));

    setSubmitting(true);
    try {
      const response = await voyageService.ajouterVoyagesMultiples(voyages);
      setSubmitting(false);

      if (response.statut) {
        const data = response.data;
        let message = response.message;
        if (data?.erreurs?.length > 0) {
          message += '\n\nErreurs :\n' + data.erreurs.join('\n');
        }
        showDialog({
          title: 'Succès',
          message,
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

  const renderEntryCard = (entry: VoyageEntry, index: number) => {
    const isExpanded = expandedEntry === entry.id;
    const isComplete = entry.voyage_date && entry.voyage_heure_depart && entry.voit_id && entry.places_disponibles;
    const voitureName = getVoitureName(entry.voit_id);
    const capacite = getVoitureCapacite(entry.voit_id);

    return (
      <View
        key={entry.id}
        className="bg-white rounded-2xl mb-3 overflow-hidden"
        style={{ elevation: 2 }}
      >
        {/* Header de l'entrée */}
        <TouchableOpacity
          className="flex-row items-center justify-between p-4"
          onPress={() => setExpandedEntry(isExpanded ? null : entry.id)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center flex-1">
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isComplete ? '#dcfce7' : '#fef3c7',
              }}
            >
              <Ionicons
                name={isComplete ? 'checkmark-circle' : 'ellipsis-horizontal-circle'}
                size={20}
                color={isComplete ? '#16a34a' : '#d97706'}
              />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-gray-900 font-bold text-sm">Voyage #{index + 1}</Text>
              {isComplete ? (
                <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>
                  {entry.voyage_date} à {entry.voyage_heure_depart} • {voitureName}
                </Text>
              ) : (
                <Text className="text-amber-600 text-xs mt-0.5">À compléter</Text>
              )}
            </View>
          </View>
          <View className="flex-row items-center">
            {entries.length > 1 && (
              <TouchableOpacity
                className="p-2 mr-1"
                onPress={() => removeEntry(entry.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#94a3b8"
            />
          </View>
        </TouchableOpacity>

        {/* Contenu détaillé */}
        {isExpanded && (
          <View className="px-4 pb-4 border-t border-gray-100 pt-3">
            {/* Date */}
            <View className="mb-3">
              <Text className="text-gray-700 font-semibold text-sm mb-1.5">Date de départ *</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                <Ionicons name="calendar" size={18} color="#3b82f6" />
                <TextInput
                  className="flex-1 ml-2 text-gray-900 text-sm"
                  placeholder="YYYY-MM-DD"
                  value={entry.voyage_date}
                  onChangeText={t => updateEntry(entry.id, 'voyage_date', formatDateInput(t))}
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Heure */}
            <View className="mb-3">
              <Text className="text-gray-700 font-semibold text-sm mb-1.5">Heure de départ *</Text>
              <View className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                <Ionicons name="time" size={18} color="#3b82f6" />
                <TextInput
                  className="flex-1 ml-2 text-gray-900 text-sm"
                  placeholder="HH:mm"
                  value={entry.voyage_heure_depart}
                  onChangeText={t => updateEntry(entry.id, 'voyage_heure_depart', formatTimeInput(t))}
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
            </View>

            {/* Voiture */}
            <View className="mb-3">
              <Text className="text-gray-700 font-semibold text-sm mb-1.5">Voiture *</Text>
              <TouchableOpacity
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 flex-row items-center justify-between"
                onPress={() => {
                  setShowVoitureDropdownFor(showVoitureDropdownFor === entry.id ? null : entry.id);
                  setSearchVoiture('');
                }}
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name="car" size={18} color="#3b82f6" />
                  <Text className="text-gray-900 text-sm ml-2" numberOfLines={1}>{voitureName}</Text>
                </View>
                <Ionicons name={showVoitureDropdownFor === entry.id ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
              </TouchableOpacity>

              {showVoitureDropdownFor === entry.id && (
                <View className="bg-white border border-gray-200 rounded-xl mt-1 max-h-40 overflow-hidden">
                  <TextInput
                    className="px-3.5 py-2 border-b border-gray-100 text-gray-900 text-sm"
                    placeholder="Rechercher voiture..."
                    value={searchVoiture}
                    onChangeText={setSearchVoiture}
                    placeholderTextColor="#9ca3af"
                  />
                  <ScrollView nestedScrollEnabled>
                    {getFilteredVoitures().map((v: any) => {
                      const vId = (v.id_voiture || v.voit_id)?.toString();
                      const vName = v.voit_matricule || v.immatriculation || v.voit_immatriculation;
                      const vInfo = v.voit_marque ? `${v.voit_marque} ${v.voit_modele || ''}`.trim() : '';
                      return (
                        <TouchableOpacity
                          key={vId}
                          className={`px-3.5 py-2.5 border-b border-gray-50 ${entry.voit_id === vId ? 'bg-blue-50' : ''}`}
                          onPress={() => {
                            updateEntry(entry.id, 'voit_id', vId);
                            // Auto-fill places
                            if (v.voit_places && !entry.places_disponibles) {
                              updateEntry(entry.id, 'places_disponibles', v.voit_places.toString());
                            }
                            setShowVoitureDropdownFor(null);
                            setSearchVoiture('');
                          }}
                        >
                          <Text className="text-gray-900 text-sm font-medium">{vName}</Text>
                          {vInfo ? <Text className="text-gray-500 text-xs mt-0.5">{vInfo} • {v.voit_places} places</Text> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Type de voyage */}
            <View className="mb-3">
              <Text className="text-gray-700 font-semibold text-sm mb-1.5">Type de voyage</Text>
              <View className="flex-row" style={{ gap: 8 }}>
                <TouchableOpacity
                  className={`flex-1 border-2 rounded-xl py-2.5 items-center ${entry.voyage_type === '1' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                  onPress={() => updateEntry(entry.id, 'voyage_type', '1')}
                >
                  <Ionicons name="sunny" size={16} color={entry.voyage_type === '1' ? '#3b82f6' : '#9ca3af'} />
                  <Text className={`text-xs font-semibold mt-1 ${entry.voyage_type === '1' ? 'text-blue-600' : 'text-gray-500'}`}>Matin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 border-2 rounded-xl py-2.5 items-center ${entry.voyage_type === '2' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                  onPress={() => updateEntry(entry.id, 'voyage_type', '2')}
                >
                  <Ionicons name="moon" size={16} color={entry.voyage_type === '2' ? '#3b82f6' : '#9ca3af'} />
                  <Text className={`text-xs font-semibold mt-1 ${entry.voyage_type === '2' ? 'text-blue-600' : 'text-gray-500'}`}>Soir</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Places */}
            <View className="mb-3">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-gray-700 font-semibold text-sm">Places disponibles *</Text>
                {capacite > 0 && (
                  <Text className="text-gray-400 text-xs">Max: {capacite}</Text>
                )}
              </View>
              <View className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 flex-row items-center">
                <Ionicons name="people" size={18} color="#3b82f6" />
                <TextInput
                  className="flex-1 ml-2 text-gray-900 text-sm"
                  placeholder="Nombre de places"
                  value={entry.places_disponibles}
                  onChangeText={t => updateEntry(entry.id, 'places_disponibles', t.replace(/\D/g, ''))}
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Actions rapides */}
            <View className="flex-row mt-1" style={{ gap: 8 }}>
              <TouchableOpacity
                className="flex-1 bg-indigo-50 rounded-xl py-2.5 flex-row items-center justify-center"
                onPress={() => duplicateEntry(entry)}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={16} color="#6366f1" />
                <Text className="text-indigo-600 text-xs font-semibold ml-1.5">Dupliquer</Text>
              </TouchableOpacity>
              {entries.length > 1 && (
                <TouchableOpacity
                  className="flex-1 bg-amber-50 rounded-xl py-2.5 flex-row items-center justify-center"
                  onPress={() => applyToAll(entry)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="layers-outline" size={16} color="#d97706" />
                  <Text className="text-amber-700 text-xs font-semibold ml-1.5">Appliquer à tous</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const completedCount = entries.filter(
    e => e.voyage_date && e.voyage_heure_depart && e.voit_id && e.places_disponibles
  ).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <DialogComponent />
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-gray-50 rounded-t-3xl" style={{ height: '92%' }}>
          {/* Header */}
          <LinearGradient
            colors={['#7c3aed', '#8b5cf6', '#a78bfa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          >
            <View className="flex-row items-center justify-between px-5 pt-6 pb-5">
              <View className="flex-row items-center flex-1">
                <View className="bg-white/20 rounded-full p-3 mr-3">
                  <Ionicons name="layers" size={24} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold">Programmation multiple</Text>
                  <Text className="text-white/80 text-sm mt-0.5">
                    {entries.length} voyage(s) • {completedCount} complété(s)
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="bg-white/20 rounded-full p-2.5 ml-2"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Trajet commun */}
            <View className="bg-white rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
              <View className="flex-row items-center mb-3">
                <View className="bg-violet-100 rounded-xl p-2 mr-3">
                  <Ionicons name="map" size={20} color="#7c3aed" />
                </View>
                <View>
                  <Text className="text-gray-900 font-bold text-base">Trajet commun *</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">Même trajet pour tous les voyages</Text>
                </View>
              </View>

              <TouchableOpacity
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
                onPress={() => {
                  setShowTrajetDropdown(!showTrajetDropdown);
                  setSearchTrajet('');
                }}
              >
                <Text className={`text-sm flex-1 ${selectedTrajetId ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                  {getTrajetName()}
                </Text>
                <Ionicons name={showTrajetDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
              </TouchableOpacity>

              {showTrajetDropdown && (
                <View className="bg-white border border-gray-200 rounded-xl mt-2 max-h-48 overflow-hidden">
                  <TextInput
                    className="px-4 py-2.5 border-b border-gray-100 text-gray-900 text-sm"
                    placeholder="Rechercher trajet..."
                    value={searchTrajet}
                    onChangeText={setSearchTrajet}
                    placeholderTextColor="#9ca3af"
                  />
                  <ScrollView nestedScrollEnabled>
                    {getFilteredTrajets().map((trajet: any) => (
                      <TouchableOpacity
                        key={trajet.id_trajet}
                        className={`px-4 py-3 border-b border-gray-50 ${selectedTrajetId === trajet.id_trajet?.toString() ? 'bg-violet-50' : ''}`}
                        onPress={() => {
                          setSelectedTrajetId(trajet.id_trajet.toString());
                          setShowTrajetDropdown(false);
                          setSearchTrajet('');
                        }}
                      >
                        <Text className="text-gray-900 text-sm">{trajet.nom_trajet || trajet.trajet_nom}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Liste d'entrées de voyages */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-900 font-bold text-base">Voyages à programmer</Text>
              <TouchableOpacity
                className="bg-violet-100 rounded-xl px-3 py-2 flex-row items-center"
                onPress={addEntry}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={18} color="#7c3aed" />
                <Text className="text-violet-700 text-xs font-bold ml-1.5">Ajouter</Text>
              </TouchableOpacity>
            </View>

            {entries.map((entry, index) => renderEntryCard(entry, index))}

            {/* Espace en bas */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Footer fixe */}
          <View
            className="bg-white px-5 pt-4 pb-6 border-t border-gray-100"
            style={{ elevation: 8 }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-500 text-sm">
                {completedCount}/{entries.length} voyage(s) complétés
              </Text>
              {entries.length > 0 && (
                <View className="bg-violet-100 rounded-full px-3 py-1">
                  <Text className="text-violet-700 text-xs font-bold">{entries.length} voyage(s)</Text>
                </View>
              )}
            </View>
            <View className="flex-row" style={{ gap: 12 }}>
              <TouchableOpacity
                className="flex-1 bg-gray-100 rounded-xl py-3.5 items-center"
                onPress={onClose}
                disabled={submitting}
              >
                <Text className="text-gray-700 font-semibold">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-[2] rounded-xl py-3.5 items-center overflow-hidden"
                onPress={handleSubmit}
                disabled={submitting || completedCount === 0}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={completedCount > 0 ? ['#7c3aed', '#8b5cf6'] : ['#d1d5db', '#d1d5db']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="rocket" size={18} color="#fff" />
                    <Text className="text-white font-bold ml-2">
                      Programmer {completedCount} voyage(s)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
