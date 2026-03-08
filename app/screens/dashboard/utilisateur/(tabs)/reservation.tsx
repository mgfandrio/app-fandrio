import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Platform, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DashboardHeader } from '@/app/components/dashboard/DashboardHeader';
import { SideMenu } from '@/app/components/dashboard/SideMenu';
import { reservationService } from '@/app/services/reservations/reservationService';

const MENU_ITEMS = [
  { label: 'Voyages', icon: 'map-outline' },
  { label: 'Trajet', icon: 'trail-sign-outline' },
  { label: 'Facture', icon: 'document-text-outline' },
  { label: 'Paramètre', icon: 'settings-outline' },
];

export default function ReservationScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const insets = useSafeAreaInsets();

  const fetchData = async () => {
    try {
      const [userJson, dashResp] = await Promise.all([
        SecureStore.getItemAsync('fandrioUser'),
        reservationService.obtenirDashboard()
      ]);

      if (userJson) {
        setUser(JSON.parse(userJson));
      }

      if (dashResp.statut) {
        setDashboardData(dashResp.data);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);

    if (selectedDate) {
      // Format date: DD-MM-YYYY
      const day = String(currentDate.getDate()).padStart(2, '0');
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const year = currentDate.getFullYear();
      setSearchValue(`${day}-${month}-${year}`);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator color="#1e3a8a" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <DashboardHeader
        user={user}
        insets={insets}
        onMenuPress={() => setMenuVisible(true)}
        onFilterPress={() => { }} // Static for now
        searchPlaceholder="Sélectionner une date"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchPress={() => setShowDatePicker(true)}
        onResetPress={() => {
          setSearchValue('');
          setDate(new Date());
        }}
        searchIcon="calendar-outline"
      />

      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onChange}
        />
      )}

      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        items={MENU_ITEMS}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 40
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }} />
        }
      >
        <View className="px-6 pt-6">
          <View className="mb-6">
            <Text style={{ color: '#1e3a8a' }} className="text-2xl font-bold">Mes Réservations</Text>
            <Text className="text-gray-500 mt-1">Gérez vos réservations de voyage</Text>
          </View>

          {/* Section 1: Mini Dashboard */}
          <View className="flex-row justify-between mb-8">
            <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 items-center justify-center flex-1 mr-2">
              <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mb-2">
                <Ionicons name="receipt-outline" size={20} color="#1e3a8a" />
              </View>
              <Text className="text-gray-900 font-bold text-lg">{dashboardData?.stats?.total_reservations || 0}</Text>
              <Text className="text-gray-400 text-[10px] uppercase font-bold text-center">Total Réservé</Text>
            </View>

            <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 items-center justify-center flex-1 mx-2">
              <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center mb-2">
                <Ionicons name="time-outline" size={20} color="#f97316" />
              </View>
              <Text className="text-gray-900 font-bold text-lg">{dashboardData?.stats?.voyages_en_cours || 0}</Text>
              <Text className="text-gray-400 text-[10px] uppercase font-bold text-center">En cours</Text>
            </View>

            <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 items-center justify-center flex-1 ml-2">
              <View className="w-10 h-10 bg-red-50 rounded-full items-center justify-center mb-2">
                <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
              </View>
              <Text className="text-gray-900 font-bold text-lg">{dashboardData?.stats?.voyages_annules || 0}</Text>
              <Text className="text-gray-400 text-[10px] uppercase font-bold text-center">Annulés</Text>
            </View>
          </View>

          {/* Section 2: Historique Recent */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-900 font-bold text-lg">Dernières réservations</Text>
              <TouchableOpacity>
                <Text style={{ color: '#1e3a8a' }} className="font-bold text-sm">Voir tout</Text>
              </TouchableOpacity>
            </View>

            {(!dashboardData?.historique || dashboardData.historique.length === 0) ? (
              <View className="bg-white rounded-3xl p-8 items-center justify-center border border-dashed border-gray-200">
                <Text className="text-gray-400 text-sm">Aucune réservation récente</Text>
              </View>
            ) : (
              dashboardData.historique.map((res: any) => (
                <View key={res.id} className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-bold text-base">{res.trajet}</Text>
                      <Text className="text-gray-500 text-xs mt-0.5">{res.date} • {res.heure}</Text>
                      <Text className="text-gray-400 text-[10px] mt-1 italic">N° {res.numero}</Text>
                    </View>
                    <View className={`px-2.5 py-1 rounded-full ${res.statut === 2 ? 'bg-green-100' :
                      res.statut === 1 ? 'bg-yellow-100' :
                        res.statut === 4 ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                      <Text className={`text-[10px] font-bold uppercase ${res.statut === 2 ? 'text-green-700' :
                        res.statut === 1 ? 'text-yellow-700' :
                          res.statut === 4 ? 'text-red-700' : 'text-gray-700'
                        }`}>
                        {res.statut === 1 ? 'En attente' :
                          res.statut === 2 ? 'Confirmé' :
                            res.statut === 3 ? 'Terminé' : 'Annulé'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center pt-3 border-t border-gray-50">
                    <Text style={{ color: '#1e3a8a' }} className="font-bold text-base">
                      {new Intl.NumberFormat('fr-FR').format(res.montant)} Ar
                    </Text>
                    <TouchableOpacity
                      className="bg-blue-50 px-4 py-2 rounded-xl"
                    >
                      <Text style={{ color: '#1e3a8a' }} className="text-xs font-bold">Voir détail</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Section 3: Faire une réservation */}
          <View className="bg-[#1e3a8a] rounded-[40px] p-8 shadow-xl items-center mb-10 overflow-hidden relative">
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
            <View className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/5 rounded-full" />

            <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="add-circle-outline" size={40} color="#ffffff" />
            </View>

            <Text className="text-white font-bold text-2xl text-center mb-2">Prêt pour votre prochain voyage ?</Text>
            <Text className="text-blue-100 text-center mb-6 opacity-80">Réservez votre place en quelques clics</Text>

            <TouchableOpacity
              className="bg-white px-8 py-4 rounded-2xl shadow-lg"
              onPress={() => router.push('/screens/dashboard/utilisateur/(tabs)/accueil')}
            >
              <Text style={{ color: '#1e3a8a' }} className="font-extrabold text-lg">Faire une réservation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
