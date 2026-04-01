import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Platform, TouchableOpacity, RefreshControl, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { DashboardHeader } from '@/app/components/dashboard/DashboardHeader';
import { SideMenu } from '@/app/components/dashboard/SideMenu';
import { reservationService } from '@/app/services/reservations/reservationService';
import { useNotifications } from '@/app/hooks/useNotifications';
import { useUser } from '@/app/hooks/useUser';

export default function ReservationScreen() {
  const router = useRouter();

  const MENU_ITEMS = [
    { label: 'Voyages', icon: 'map-outline', onPress: () => router.push('/screens/dashboard/utilisateur/reservations/history') },
    { label: 'Trajet', icon: 'trail-sign-outline' },
    { label: 'Facture', icon: 'document-text-outline', onPress: () => router.push('/screens/dashboard/utilisateur/reservations/clientFactures') },
    { label: 'Paramètre', icon: 'settings-outline' },
  ];

  const { user } = useUser();
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'exact' | 'debut' | 'fin'>('exact');
  const [dateMode, setDateMode] = useState<'exact' | 'range'>('exact');
  const [dateExacte, setDateExacte] = useState<Date | null>(null);
  const [dateDebut, setDateDebut] = useState<Date | null>(null);
  const [dateFin, setDateFin] = useState<Date | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrString, setQrString] = useState('');
  const [qrNumero, setQrNumero] = useState('');
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();

  const fetchData = useCallback(async () => {
    try {
      const dashResp = await reservationService.obtenirDashboard();

      if (dashResp && dashResp.statut) {
        setDashboardData(dashResp.data);
      }
    } catch (e) {
      console.warn('Error loading reservation data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateSelect = useCallback(() => {
    setShowDateModal(true);
  }, []);

  const openQrModal = async (resId: number) => {
    setQrModalVisible(true);
    setQrLoading(true);
    setQrString('');
    try {
      const response = await reservationService.obtenirFacture(resId);
      if (response.statut && response.data?.reservation?.qr_data) {
        const qrData = response.data.reservation.qr_data;
        try {
          setQrString(atob(qrData));
        } catch {
          setQrString(qrData);
        }
        setQrNumero(response.data.reservation.numero || '');
      }
    } catch (e) {
      console.error('Error loading QR:', e);
    } finally {
      setQrLoading(false);
    }
  };

  const formatDateDisplay = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleNativeDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowNativePicker(false);
    if (!selectedDate) return;

    if (pickerTarget === 'exact') {
      setDateExacte(selectedDate);
    } else if (pickerTarget === 'debut') {
      setDateDebut(selectedDate);
      // Si la date fin est avant la date début, la corriger
      if (dateFin && selectedDate > dateFin) setDateFin(null);
    } else if (pickerTarget === 'fin') {
      setDateFin(selectedDate);
      // Si la date début est après la date fin, la corriger
      if (dateDebut && selectedDate < dateDebut) setDateDebut(null);
    }
  }, [pickerTarget, dateDebut, dateFin]);

  const openNativePicker = (target: 'exact' | 'debut' | 'fin') => {
    setPickerTarget(target);
    setShowNativePicker(true);
  };

  const applyDateFilter = () => {
    if (dateMode === 'exact' && dateExacte) {
      setSearchValue(formatDateDisplay(dateExacte));
    } else if (dateMode === 'range' && dateDebut && dateFin) {
      setSearchValue(`${formatDateDisplay(dateDebut)} → ${formatDateDisplay(dateFin)}`);
    } else if (dateMode === 'range' && dateDebut) {
      setSearchValue(`À partir du ${formatDateDisplay(dateDebut)}`);
    } else if (dateMode === 'range' && dateFin) {
      setSearchValue(`Jusqu'au ${formatDateDisplay(dateFin)}`);
    }
    setShowDateModal(false);
  };

  const clearDateFilter = () => {
    setSearchValue('');
    setDateExacte(null);
    setDateDebut(null);
    setDateFin(null);
    setDateMode('exact');
    setShowDateModal(false);
  };

  const formatMontant = (montant: any) => {
    try {
      if (montant === null || montant === undefined) return '0';
      return new Intl.NumberFormat('fr-FR').format(Number(montant));
    } catch {
      return String(montant || 0);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator color="#1e3a8a" size="large" />
      </View>
    );
  }

  const stats = dashboardData?.stats || {};
  const historique = Array.isArray(dashboardData?.historique) ? dashboardData.historique : [];

  // Filtrer l'historique par date sélectionnée (exacte ou plage)
  const filteredHistorique = (() => {
    if (!searchValue.trim()) return historique;

    // Parser une date DD/MM/YYYY en objet comparable
    const parseDate = (str: string) => {
      const parts = str.split('/');
      if (parts.length !== 3) return null;
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    };

    if (dateMode === 'exact' && dateExacte) {
      const target = formatDateDisplay(dateExacte);
      return historique.filter((res: any) => res?.date === target);
    }

    if (dateMode === 'range') {
      return historique.filter((res: any) => {
        if (!res?.date) return false;
        const resDate = parseDate(res.date);
        if (!resDate) return false;
        if (dateDebut && resDate < new Date(dateDebut.getFullYear(), dateDebut.getMonth(), dateDebut.getDate())) return false;
        if (dateFin && resDate > new Date(dateFin.getFullYear(), dateFin.getMonth(), dateFin.getDate())) return false;
        return true;
      });
    }

    return historique;
  })();

  return (
    <View className="flex-1 bg-gray-50">
      <DashboardHeader
        user={user}
        insets={insets}
        onMenuPress={() => setMenuVisible(true)}
        onFilterPress={handleDateSelect}
        searchPlaceholder="Filtrer par date..."
        searchValue={searchValue}
        onSearchPress={handleDateSelect}
        onResetPress={searchValue ? () => clearDateFilter() : undefined}
        searchIcon="calendar-outline"
        notificationCount={unreadCount}
      />

      {showNativePicker && (() => {
        try {
          const DateTimePicker = require('@react-native-community/datetimepicker').default;
          const currentValue = pickerTarget === 'exact'
            ? (dateExacte || new Date())
            : pickerTarget === 'debut'
              ? (dateDebut || new Date())
              : (dateFin || new Date());
          return (
            <DateTimePicker
              testID="dateTimePicker"
              value={currentValue}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={handleNativeDateChange}
            />
          );
        } catch (e) {
          console.warn('DateTimePicker error:', e);
          return null;
        }
      })()}

      {/* Modal de sélection de date */}
      <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 20, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-5">
              <Text style={{ color: '#1e3a8a', fontSize: 20, fontWeight: 'bold' }}>Filtrer par date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)} style={{ backgroundColor: '#f3f4f6', padding: 8, borderRadius: 20 }}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Mode switcher */}
            <View className="flex-row bg-slate-100 rounded-2xl p-1 mb-6">
              <TouchableOpacity
                onPress={() => setDateMode('exact')}
                className="flex-1 items-center rounded-xl py-3"
                style={{ backgroundColor: dateMode === 'exact' ? '#ffffff' : 'transparent', elevation: dateMode === 'exact' ? 2 : 0 }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={16} color={dateMode === 'exact' ? '#1e3a8a' : '#94a3b8'} />
                  <Text className="ml-1.5 font-semibold text-sm" style={{ color: dateMode === 'exact' ? '#1e3a8a' : '#94a3b8' }}>Date précise</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDateMode('range')}
                className="flex-1 items-center rounded-xl py-3"
                style={{ backgroundColor: dateMode === 'range' ? '#ffffff' : 'transparent', elevation: dateMode === 'range' ? 2 : 0 }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={16} color={dateMode === 'range' ? '#1e3a8a' : '#94a3b8'} />
                  <Text className="ml-1.5 font-semibold text-sm" style={{ color: dateMode === 'range' ? '#1e3a8a' : '#94a3b8' }}>Plage de dates</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Contenu selon le mode */}
            {dateMode === 'exact' ? (
              <View className="mb-6">
                <Text className="text-slate-600 font-semibold text-sm mb-3 ml-1">Sélectionner la date</Text>
                <TouchableOpacity
                  onPress={() => openNativePicker('exact')}
                  className="flex-row items-center bg-slate-50 rounded-2xl px-4 py-4"
                  style={{ borderWidth: 1, borderColor: dateExacte ? '#3b82f6' : '#e2e8f0' }}
                  activeOpacity={0.7}
                >
                  <View className="bg-blue-100 rounded-full p-2 mr-3">
                    <Ionicons name="calendar" size={20} color="#2563eb" />
                  </View>
                  <Text className={`flex-1 text-base ${dateExacte ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                    {dateExacte ? formatDateDisplay(dateExacte) : 'Choisir une date'}
                  </Text>
                  {dateExacte && (
                    <TouchableOpacity onPress={() => setDateExacte(null)} className="p-1">
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mb-6">
                <Text className="text-slate-600 font-semibold text-sm mb-3 ml-1">Date de début</Text>
                <TouchableOpacity
                  onPress={() => openNativePicker('debut')}
                  className="flex-row items-center bg-slate-50 rounded-2xl px-4 py-4 mb-4"
                  style={{ borderWidth: 1, borderColor: dateDebut ? '#3b82f6' : '#e2e8f0' }}
                  activeOpacity={0.7}
                >
                  <View className="bg-blue-100 rounded-full p-2 mr-3">
                    <Ionicons name="arrow-forward-circle" size={20} color="#2563eb" />
                  </View>
                  <Text className={`flex-1 text-base ${dateDebut ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                    {dateDebut ? formatDateDisplay(dateDebut) : 'Date de début'}
                  </Text>
                  {dateDebut && (
                    <TouchableOpacity onPress={() => setDateDebut(null)} className="p-1">
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {/* Séparateur visuel */}
                <View className="flex-row items-center justify-center mb-4">
                  <View className="bg-slate-200 h-px flex-1" />
                  <View className="bg-slate-100 rounded-full px-3 py-1 mx-3">
                    <Ionicons name="arrow-down" size={14} color="#94a3b8" />
                  </View>
                  <View className="bg-slate-200 h-px flex-1" />
                </View>

                <Text className="text-slate-600 font-semibold text-sm mb-3 ml-1">Date de fin</Text>
                <TouchableOpacity
                  onPress={() => openNativePicker('fin')}
                  className="flex-row items-center bg-slate-50 rounded-2xl px-4 py-4"
                  style={{ borderWidth: 1, borderColor: dateFin ? '#10b981' : '#e2e8f0' }}
                  activeOpacity={0.7}
                >
                  <View className="bg-emerald-100 rounded-full p-2 mr-3">
                    <Ionicons name="flag" size={20} color="#10b981" />
                  </View>
                  <Text className={`flex-1 text-base ${dateFin ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                    {dateFin ? formatDateDisplay(dateFin) : 'Date de fin'}
                  </Text>
                  {dateFin && (
                    <TouchableOpacity onPress={() => setDateFin(null)} className="p-1">
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Boutons */}
            <View className="flex-row">
              <TouchableOpacity
                onPress={clearDateFilter}
                className="flex-1 items-center py-4 bg-slate-100 rounded-2xl mr-3"
              >
                <Text className="text-slate-500 font-bold">Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyDateFilter}
                disabled={dateMode === 'exact' ? !dateExacte : (!dateDebut && !dateFin)}
                className="flex-[2] rounded-2xl overflow-hidden"
                style={{ opacity: (dateMode === 'exact' ? !!dateExacte : (!!dateDebut || !!dateFin)) ? 1 : 0.5 }}
              >
                <LinearGradient
                  colors={['#1e40af', '#3b82f6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="py-4 items-center flex-row justify-center"
                >
                  <Ionicons name="search" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text className="text-white font-bold text-base">Appliquer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <Text className="text-gray-900 font-bold text-lg">{stats.total_reservations || 0}</Text>
              <Text className="text-gray-400 text-[10px] uppercase font-bold text-center">Total Réservé</Text>
            </View>

            <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 items-center justify-center flex-1 mx-2">
              <View className="w-10 h-10 bg-orange-50 rounded-full items-center justify-center mb-2">
                <Ionicons name="time-outline" size={20} color="#f97316" />
              </View>
              <Text className="text-gray-900 font-bold text-lg">{stats.voyages_en_cours || 0}</Text>
              <Text className="text-gray-400 text-[10px] uppercase font-bold text-center">Validé</Text>
            </View>

            <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 items-center justify-center flex-1 ml-2">
              <View className="w-10 h-10 bg-red-50 rounded-full items-center justify-center mb-2">
                <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
              </View>
              <Text className="text-gray-900 font-bold text-lg">{stats.voyages_annules || 0}</Text>
              <Text className="text-gray-400 text-[10px] uppercase font-bold text-center">Annulés</Text>
            </View>
          </View>

          {/* Section 2: Historique Recent */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-900 font-bold text-lg">Dernières réservations</Text>
              <TouchableOpacity onPress={() => router.push('/screens/dashboard/utilisateur/reservations/history')}>
                <Text style={{ color: '#1e3a8a' }} className="font-bold text-sm">Voir tout</Text>
              </TouchableOpacity>
            </View>

            {filteredHistorique.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center justify-center border border-dashed border-gray-200">
                <Text className="text-gray-400 text-sm">{searchValue ? 'Aucune réservation pour cette date' : 'Aucune réservation récente'}</Text>
              </View>
            ) : (
              filteredHistorique.map((res: any, index: number) => (
                <View key={res?.id || index} className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-bold text-base">{res?.trajet || 'Trajet inconnu'}</Text>
                      <Text className="text-gray-500 text-xs mt-0.5">{res?.date || 'N/A'} • {res?.heure || 'N/A'}</Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-gray-400 text-[10px] italic">N° {res?.numero || 'N/A'}</Text>
                      </View>
                    </View>
                    <View className={`px-2.5 py-1 rounded-full ${res?.statut === 2 ? 'bg-green-100' : res?.statut === 1 ? 'bg-orange-100' : res?.statut === 3 ? 'bg-gray-200' : 'bg-red-100'}`}>
                      <Text className={`text-[10px] font-bold uppercase ${res?.statut === 2 ? 'text-green-700' : res?.statut === 1 ? 'text-orange-700' : res?.statut === 3 ? 'text-gray-700' : 'text-red-700'}`}>
                        {res?.statut === 2 ? 'Confirmée' : res?.statut === 1 ? 'En attente' : res?.statut === 3 ? 'Terminée' : 'Annulée'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center pt-3 border-t border-gray-50">
                    <Text style={{ color: '#1e3a8a' }} className="font-bold text-base">
                      {formatMontant(res?.montant)} Ar
                    </Text>
                    <View className="flex-row items-center">
                      {res?.statut === 2 && (
                        <TouchableOpacity
                          onPress={() => openQrModal(res.id)}
                          className="w-10 h-10 bg-green-100 rounded-xl items-center justify-center mr-2"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="qr-code" size={22} color="#22c55e" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        className="bg-blue-50 px-4 py-2 rounded-xl"
                        onPress={() => router.push({ pathname: '/screens/dashboard/utilisateur/reservations/reservationDetail', params: { id: String(res?.id) } })}
                      >
                        <Text style={{ color: '#1e3a8a' }} className="text-xs font-bold">Voir détail</Text>
                      </TouchableOpacity>
                    </View>
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
              onPress={() => router.push('/screens/dashboard/utilisateur/reservations/reserver')}
            >
              <Text style={{ color: '#1e3a8a' }} className="font-extrabold text-lg">Faire une réservation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View className="bg-white rounded-[32px] p-8 mx-8 items-center" style={{ minWidth: 300 }}>
            {qrLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text className="text-gray-400 mt-4 text-sm">Chargement du QR...</Text>
              </View>
            ) : qrString ? (
              <>
                <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="qr-code" size={28} color="#22c55e" />
                </View>
                <Text className="text-gray-900 font-bold text-lg mb-1">QR Code</Text>
                <Text className="text-gray-400 text-xs mb-5">Ticket N° {qrNumero}</Text>
                <View className="bg-white p-4 rounded-2xl border border-gray-100">
                  <QRCode value={qrString} size={220} backgroundColor="#ffffff" />
                </View>
                <Text className="text-gray-400 text-[10px] text-center mt-4">Présentez ce code lors de l'embarquement</Text>
              </>
            ) : (
              <View className="py-10 items-center">
                <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                <Text className="text-gray-500 mt-3 text-sm">QR code indisponible</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setQrModalVisible(false)}
              className="mt-6 bg-gray-100 px-8 py-3 rounded-2xl"
            >
              <Text className="text-gray-700 font-bold">Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
