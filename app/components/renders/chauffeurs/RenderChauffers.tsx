import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { chauffeurService } from '../../../services';
import { Chauffeur } from '../../../types/chauffeur';
import { useConfirmDialog } from '../../common/ConfirmDialog';
import { ChauffeurDetailModal } from '../../modals/chauffeurs/ChauffeurDetailModal';
import { ChauffeurFormModal } from '../../modals/chauffeurs/ChauffeurFormModal';

interface RenderChauffeursProps {
  onAddPress?: () => void;
  onEditPress?: (chauffeur: Chauffeur) => void;
}

export function RenderChauffers({ onAddPress, onEditPress }: RenderChauffeursProps) {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChauffeurId, setSelectedChauffeurId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingChauffeurId, setEditingChauffeurId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    chargerChauffeurs();
  }, []);

  const chargerChauffeurs = async () => {
    try {
      setLoading(true);
      const response = await chauffeurService.obtenirListeChauffeurs();
      
      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        setChauffeurs(data);
      } else {
        setChauffeurs([]);
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      showDialog({
        title: 'Erreur',
        message: 'Impossible de charger les chauffeurs',
        type: 'danger',
        confirmText: 'OK',
        onConfirm: () => {},
        onCancel: () => {}
      });
      setChauffeurs([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await chargerChauffeurs();
    setRefreshing(false);
  }, []);

  const handleOpenDetail = (chauffeurId: number) => {
    setSelectedChauffeurId(chauffeurId);
    setShowDetailModal(true);
  };

  const handleOpenForm = (chauffeurId?: number) => {
    setEditingChauffeurId(chauffeurId || null);
    setShowFormModal(true);
  };

  const handleFormSuccess = () => {
    chargerChauffeurs();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient colors={['#1e40af', '#3b82f6']} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
          </LinearGradient>
        </View>
        <Text className="text-slate-500 mt-4 text-sm">Chargement des chauffeurs...</Text>
      </View>
    );
  }

  const chauffeursFiltres = chauffeurs.filter(c =>
    `${c.chauff_nom} ${c.chauff_prenom} ${c.chauff_cin}`
      .toLowerCase()
      .includes(searchText.toLowerCase())
  );

  const getStatutBadge = (statut: number) => {
    if (statut === 1) {
      return { colors: ['#059669', '#10b981'] as const, label: 'Actif', icon: 'checkmark-circle' as const };
    }
    return { colors: ['#dc2626', '#ef4444'] as const, label: 'Inactif', icon: 'close-circle' as const };
  };

  const actifsCount = chauffeurs.filter(c => c.chauff_statut === 1).length;
  const inactifsCount = chauffeurs.length - actifsCount;
  const getInitials = (nom: string, prenom: string) =>
    `${(nom || '')[0] || ''}${(prenom || '')[0] || ''}`.toUpperCase();

  return (
    <View className="flex-1 bg-slate-50">
      <DialogComponent />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View className="mx-4 mt-5 rounded-3xl overflow-hidden" style={{ elevation: 4 }}>
          <LinearGradient colors={['#1e40af', '#3b82f6', '#60a5fa']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <View className="bg-white/20 rounded-2xl p-3 mr-4">
                  <Ionicons name="people" size={28} color="#fff" />
                </View>
                <View>
                  <Text className="text-white text-2xl font-bold">Chauffeurs</Text>
                  <Text className="text-blue-100 text-sm mt-0.5">{chauffeurs.length} chauffeur(s) enregistré(s)</Text>
                </View>
              </View>
              <TouchableOpacity
                className="bg-white rounded-2xl p-3"
                onPress={() => handleOpenForm()}
                activeOpacity={0.8}
                style={{ elevation: 2 }}
              >
                <Ionicons name="add" size={24} color="#1e40af" />
              </TouchableOpacity>
            </View>
            {/* Mini stats */}
            <View className="flex-row mt-1">
              <View className="bg-white/15 rounded-xl px-4 py-2 mr-3 flex-row items-center">
                <View className="bg-emerald-400 rounded-full w-2.5 h-2.5 mr-2" />
                <Text className="text-white text-sm font-medium">{actifsCount} Actifs</Text>
              </View>
              <View className="bg-white/15 rounded-xl px-4 py-2 flex-row items-center">
                <View className="bg-red-400 rounded-full w-2.5 h-2.5 mr-2" />
                <Text className="text-white text-sm font-medium">{inactifsCount} Inactifs</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Barre de recherche */}
        <View className="mx-4 mt-4 bg-white rounded-2xl flex-row items-center px-4 py-1" style={{ elevation: 2 }}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 text-base py-3"
            placeholder="Rechercher par nom, CIN..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#94a3b8"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} className="p-1">
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Liste des chauffeurs */}
        <View className="px-4 mt-4 pb-6">
          {chauffeursFiltres.length === 0 ? (
            <View className="bg-white rounded-3xl p-10 items-center" style={{ elevation: 2 }}>
              <View className="bg-slate-100 rounded-full p-5 mb-4">
                <Ionicons name="person-outline" size={48} color="#94a3b8" />
              </View>
              <Text className="text-slate-800 font-bold text-lg">Aucun chauffeur trouvé</Text>
              <Text className="text-slate-400 text-sm mt-2 text-center leading-5">
                {searchText.length > 0 
                  ? 'Aucun chauffeur ne correspond à votre recherche'
                  : 'Appuyez sur + pour ajouter votre premier chauffeur'}
              </Text>
            </View>
          ) : (
            chauffeursFiltres.map((chauffeur) => {
              const badge = getStatutBadge(chauffeur.chauff_statut);
              const initials = getInitials(chauffeur.chauff_nom, chauffeur.chauff_prenom);
              return (
                <TouchableOpacity
                  key={chauffeur.chauff_id}
                  className="bg-white rounded-2xl p-4 mb-3"
                  onPress={() => handleOpenDetail(chauffeur.chauff_id)}
                  activeOpacity={0.7}
                  style={{ elevation: 2 }}
                >
                  <View className="flex-row items-center">
                    {/* Avatar with gradient initials */}
                    <View className="rounded-2xl w-14 h-14 overflow-hidden mr-4">
                      <LinearGradient
                        colors={['#1e40af', '#3b82f6']}
                        className="w-full h-full items-center justify-center"
                      >
                        <Text className="text-white font-bold text-lg">{initials}</Text>
                      </LinearGradient>
                    </View>
                    
                    <View className="flex-1">
                      <Text className="text-slate-800 font-bold text-base">
                        {chauffeur.chauff_nom} {chauffeur.chauff_prenom}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="id-card-outline" size={14} color="#94a3b8" />
                        <Text className="text-slate-400 text-sm ml-1.5">
                          {chauffeur.chauff_cin}
                        </Text>
                        <Text className="text-slate-300 mx-2">•</Text>
                        <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                        <Text className="text-slate-400 text-sm ml-1">
                          {chauffeur.chauff_age} ans
                        </Text>
                      </View>
                    </View>

                    {/* Status badge with gradient */}
                    <View className="rounded-xl overflow-hidden">
                      <LinearGradient
                        colors={[...badge.colors]}
                        className="px-3 py-1.5 flex-row items-center"
                      >
                        <Ionicons name={badge.icon} size={12} color="#fff" style={{ marginRight: 4 }} />
                        <Text className="text-white text-xs font-bold">{badge.label}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal de détails */}
      <ChauffeurDetailModal
        visible={showDetailModal}
        chauffeurId={selectedChauffeurId}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedChauffeurId(null);
        }}
        onEdit={handleOpenForm}
        onRefresh={chargerChauffeurs}
      />

      {/* Modal de formulaire */}
      <ChauffeurFormModal
        visible={showFormModal}
        chauffeurId={editingChauffeurId}
        onClose={() => {
          setShowFormModal(false);
          setEditingChauffeurId(null);
        }}
        onSuccess={handleFormSuccess}
      />
    </View>
  );
}
