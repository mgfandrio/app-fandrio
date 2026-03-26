import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DashboardStats } from '../../../components/dashboard/DashboardStats';
import { RenderChauffers } from '../../../components/renders/chauffeurs/RenderChauffers';
import { RenderTrajets } from '../../../components/renders/trajets/RenderTrajets';
import { RenderVoitures } from '../../../components/renders/voitures/RenderVoitures';
import { RenderPaiements } from '../../../components/renders/paiements/RenderPaiements';
import { RenderReservations } from '../../../components/renders/reservations/RenderReservations';
import { RenderFactures } from '../../../components/renders/factures/RenderFactures';
import { RenderVoyages } from '../../../components/RenderVoyages';
import { useNotifications } from '../../../hooks/useNotifications';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.78;

export default function DashboardCompagnie() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(tab || 'dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const { unreadCount: notificationCount } = useNotifications();

  // Appliquer le param tab si fourni (ex: depuis une notification)
  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    (async () => {
      try {
        const userJson = await SecureStore.getItemAsync('fandrioUser');
        if (userJson) setUser(JSON.parse(userJson));
      } catch (e) {
        console.warn('SecureStore read error', e);
      }
    })();
  }, []);

  const handleLogout = () => {
    showDialog({
      title: 'Déconnexion',
      message: 'Voulez-vous vraiment vous déconnecter ?',
      type: 'danger',
      confirmText: 'Déconnecter',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setLoading(true);
        try {
          await SecureStore.deleteItemAsync('fandrioToken');
          await SecureStore.deleteItemAsync('fandrioUser');
          router.replace('/screens/authentification/loginScreen');
        } catch (e) {
          console.warn('Logout error', e);
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => { }
    });
  };

  const toggleDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: drawerOpen ? -DRAWER_WIDTH : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setDrawerOpen(!drawerOpen);
  };

  const selectMenuItem = (tab: string) => {
    setActiveTab(tab);
    toggleDrawer();
  };

  const MENU_SECTIONS = [
    {
      title: 'PRINCIPAL',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: 'grid', activeIcon: 'grid' },
        { key: 'voyages', label: 'Voyages', icon: 'navigate-outline', activeIcon: 'navigate' },
        { key: 'reservations', label: 'Réservations', icon: 'ticket-outline', activeIcon: 'ticket' },
        { key: 'factures', label: 'Factures', icon: 'receipt-outline', activeIcon: 'receipt' },
      ],
    },
    {
      title: 'GESTION',
      items: [
        { key: 'chauffeurs', label: 'Chauffeurs', icon: 'people-outline', activeIcon: 'people' },
        { key: 'voitures', label: 'Voitures', icon: 'car-outline', activeIcon: 'car' },
        { key: 'trajets', label: 'Trajets', icon: 'map-outline', activeIcon: 'map' },
        { key: 'paiements', label: 'Paiements', icon: 'card-outline', activeIcon: 'card' },
      ],
    },
    {
      title: 'COMPTE',
      items: [
        { key: 'settings', label: 'Paramètres', icon: 'settings-outline', activeIcon: 'settings' },
      ],
    },
  ];

  const renderDrawer = () => (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1" edges={['top', 'left']}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* En-tête du drawer avec profil */}
          <View className="px-5 pt-6 pb-5">
            {/* Bouton fermer */}
            <TouchableOpacity
              onPress={toggleDrawer}
              className="self-end mb-4 p-1"
            >
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>

            {/* Avatar + infos */}
            <View className="flex-row items-center">
              <LinearGradient
                colors={['#3b82f6', '#1d4ed8']}
                style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text className="text-white text-xl font-bold">
                  {user?.prenom?.[0]?.toUpperCase() || ''}{user?.nom?.[0]?.toUpperCase() || 'C'}
                </Text>
              </LinearGradient>
              <View className="ml-4 flex-1">
                <Text className="text-white font-bold text-lg" numberOfLines={1}>
                  {user ? `${user.prenom} ${user.nom}` : 'Compagnie'}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                  <Text className="text-slate-400 text-sm">Admin Compagnie</Text>
                </View>
              </View>
            </View>

            {/* Nom compagnie */}
            {user?.compagnie && (
              <View className="mt-4 bg-white/5 rounded-xl px-4 py-3 flex-row items-center">
                <Ionicons name="business-outline" size={18} color="#60a5fa" />
                <Text className="text-blue-300 text-sm font-medium ml-3 flex-1" numberOfLines={1}>
                  {user.compagnie.nom}
                </Text>
              </View>
            )}
          </View>

          {/* Séparateur */}
          <View className="h-px bg-white/10 mx-5" />

          {/* Sections du menu */}
          <View className="py-4 px-3">
            {MENU_SECTIONS.map((section, sectionIndex) => (
              <View key={section.title} className={sectionIndex > 0 ? 'mt-5' : ''}>
                {/* Titre de section */}
                <Text className="text-slate-500 text-xs font-bold tracking-wider px-3 mb-2">
                  {section.title}
                </Text>

                {section.items.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      className={`flex-row items-center px-4 py-3.5 rounded-xl mb-1 ${isActive ? '' : ''}`}
                      onPress={() => selectMenuItem(item.key)}
                      activeOpacity={0.7}
                      style={isActive ? {
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      } : undefined}
                    >
                      <View
                        style={isActive ? {
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#3b82f6',
                        } : {
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <Ionicons
                          name={(isActive ? item.activeIcon : item.icon) as any}
                          size={20}
                          color={isActive ? '#ffffff' : '#94a3b8'}
                        />
                      </View>
                      <Text
                        className={`ml-4 text-base font-medium ${isActive ? 'text-blue-400' : 'text-slate-300'}`}
                      >
                        {item.label}
                      </Text>
                      {isActive && (
                        <View className="ml-auto w-1.5 h-5 rounded-full bg-blue-400" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <View className="flex-1" />
        </ScrollView>

        {/* Bouton déconnexion en bas */}
        <View className="px-5 pb-6 pt-2">
          <View className="h-px bg-white/10 mb-4" />
          <TouchableOpacity
            className="flex-row items-center px-4 py-3.5 rounded-xl"
            onPress={() => {
              toggleDrawer();
              handleLogout();
            }}
            disabled={loading}
            activeOpacity={0.7}
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          >
            <View style={{
              width: 38, height: 38, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
            }}>
              <Ionicons name="log-out-outline" size={20} color="#f87171" />
            </View>
            <Text className="text-red-400 text-base font-medium ml-4">Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const renderDashboard = () => (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      {/* Hero card avec dégradé */}
      <LinearGradient
        colors={['#1e40af', '#3b82f6', '#60a5fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 24 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-blue-200 text-sm font-medium">Bienvenue</Text>
            <Text className="text-white text-2xl font-bold mt-1">
              {user ? `${user.prenom} ${user.nom}` : 'Compagnie'}
            </Text>
            {user?.compagnie && (
              <View className="flex-row items-center mt-2 bg-white/15 self-start rounded-full px-3 py-1.5">
                <Ionicons name="business" size={14} color="#bfdbfe" />
                <Text className="text-blue-100 text-xs font-medium ml-2">{user.compagnie.nom}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="business" size={30} color="#ffffff" />
          </View>
        </View>
      </LinearGradient>

      {/* Accès rapide */}
      <View className="px-4 mt-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">Accès rapide</Text>
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {[
            { key: 'voyages', label: 'Voyages', icon: 'navigate', color: '#8b5cf6', bg: '#ede9fe' },
            { key: 'reservations', label: 'Réservations', icon: 'ticket', color: '#3b82f6', bg: '#dbeafe' },
            { key: 'factures', label: 'Factures', icon: 'receipt', color: '#10b981', bg: '#d1fae5' },
            { key: 'scanner', label: 'Scanner QR', icon: 'qr-code', color: '#f59e0b', bg: '#fef3c7' },
            { key: 'chauffeurs', label: 'Chauffeurs', icon: 'people', color: '#6366f1', bg: '#e0e7ff' },
            { key: 'voitures', label: 'Voitures', icon: 'car', color: '#ec4899', bg: '#fce7f3' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              className="bg-white rounded-2xl p-4 items-center"
              style={{ width: '30%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
              onPress={() => item.key === 'scanner' ? router.push('/screens/scanner/scannerScreen') : setActiveTab(item.key)}
              activeOpacity={0.7}
            >
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text className="text-gray-700 text-xs font-semibold mt-2 text-center">{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Statistiques du tableau de bord */}
      <View className="px-4 mt-6 mb-8">
        <DashboardStats refreshTrigger={0} onNavigate={setActiveTab} />
      </View>
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-6" showsVerticalScrollIndicator={false}>
      {/* Profil card */}
      <View
        className="bg-white rounded-2xl p-5 mb-5"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
      >
        <View className="flex-row items-center">
          <LinearGradient
            colors={['#3b82f6', '#1d4ed8']}
            style={{ width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text className="text-white text-2xl font-bold">
              {user?.prenom?.[0]?.toUpperCase() || 'C'}
            </Text>
          </LinearGradient>
          <View className="ml-4 flex-1">
            <Text className="text-gray-900 font-bold text-lg">
              {user ? `${user.prenom} ${user.nom}` : 'Compagnie'}
            </Text>
            <Text className="text-gray-400 text-sm mt-0.5">Admin Compagnie</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </View>

      {/* Options */}
      <View
        className="bg-white rounded-2xl mb-5"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
      >
        {[
          { icon: 'person', bg: '#dbeafe', color: '#3b82f6', label: 'Mon profil', onPress: () => router.push('/screens/profils/monProfil') },
          { icon: 'notifications', bg: '#ede9fe', color: '#8b5cf6', label: 'Notifications' },
          { icon: 'shield-checkmark', bg: '#d1fae5', color: '#10b981', label: 'Sécurité' },
          { icon: 'help-circle', bg: '#ffedd5', color: '#f97316', label: 'Aide & Support' },
        ].map((item, index, arr) => (
          <TouchableOpacity
            key={item.label}
            className={`flex-row items-center p-4 ${index < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <Text className="flex-1 text-gray-900 font-medium ml-4">{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Version */}
      <View className="items-center py-6">
        <Text className="text-gray-300 text-sm">Fandrio v1.0.0</Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <DialogComponent />

      {/* Header premium */}
      <View
        className="bg-white px-5 py-3 flex-row items-center justify-between"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 }}
      >
        <TouchableOpacity
          onPress={toggleDrawer}
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: '#f1f5f9' }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={drawerOpen ? "close" : "menu"}
            size={22}
            color="#1e293b"
          />
        </TouchableOpacity>

        <View className="flex-1 mx-4 items-center">
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            {activeTab === 'dashboard' ? 'Tableau de bord' :
             activeTab === 'chauffeurs' ? 'Chauffeurs' :
             activeTab === 'voitures' ? 'Voitures' :
             activeTab === 'trajets' ? 'Trajets' :
             activeTab === 'voyages' ? 'Voyages' :
             activeTab === 'reservations' ? 'Réservations' :
             activeTab === 'factures' ? 'Factures' :
             activeTab === 'paiements' ? 'Paiements' :
             activeTab === 'settings' ? 'Paramètres' : ''}
          </Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="relative w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: '#f1f5f9' }}
            onPress={() => router.push('/screens/notifications/notificationsScreen')}
          >
            <Ionicons name="notifications-outline" size={20} color="#1e293b" />
            {notificationCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-[9px] font-bold">{notificationCount > 99 ? '99+' : notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="relative w-10 h-10 rounded-xl items-center justify-center ml-2"
            style={{ backgroundColor: '#f1f5f9' }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#1e293b" />
            {messageCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-blue-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-[9px] font-bold">{messageCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <View className="flex-1 relative">
        {/* Content - reste fixe */}
        <View className="flex-1">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'chauffeurs' && <RenderChauffers />}
          {activeTab === 'voitures' && <RenderVoitures />}
          {activeTab === 'trajets' && <RenderTrajets />}
          {activeTab === 'voyages' && <RenderVoyages />}
          {activeTab === 'reservations' && <RenderReservations />}
          {activeTab === 'factures' && <RenderFactures />}
          {activeTab === 'paiements' && <RenderPaiements />}
          {activeTab === 'settings' && renderSettings()}
        </View>

        {/* Drawer - overlay absolu */}
        <Animated.View
          style={{
            transform: [{ translateX: drawerAnim }],
            width: DRAWER_WIDTH,
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: drawerOpen ? 1000 : -1,
          }}
        >
          {renderDrawer()}
        </Animated.View>

        {/* Overlay - cliquable pour fermer le drawer */}
        {drawerOpen && (
          <TouchableOpacity
            className="absolute inset-0"
            onPress={toggleDrawer}
            activeOpacity={1}
            style={{ zIndex: 999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}