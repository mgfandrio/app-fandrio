import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConfirmDialog } from '../../../components/common/ConfirmDialog';
import { RenderChauffers } from '../../../components/renders/chauffeurs/RenderChauffers';
import { RenderTrajets } from '../../../components/renders/trajets/RenderTrajets';
import { RenderVoitures } from '../../../components/renders/voitures/RenderVoitures';
import { RenderVoyages } from '../../../components/RenderVoyages';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

export default function DashboardCompagnie() {
  const router = useRouter();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

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
          router.replace('./authentification/loginScreen');
        } catch (e) {
          console.warn('Logout error', e);
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => {}
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

  const renderDrawer = () => (
    <View className="bg-blue-600 h-full w-full">
      <SafeAreaView className="flex-1" edges={['top', 'left']}>
        <ScrollView className="flex-1">
          {/* Header du drawer */}
          <View className="px-4 py-6 border-b border-blue-700">
            <View className="flex-row items-center mb-4">
              <View className="bg-white rounded-full w-12 h-12 items-center justify-center mr-3">
                <Text className="text-blue-600 text-xl font-bold">
                  {user?.prenom?.[0] || 'C'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg">
                  {user ? `${user.prenom} ${user.nom}` : 'Compagnie'}
                </Text>
                <Text className="text-blue-200 text-xs">Admin Compagnie</Text>
              </View>
            </View>
          </View>

          {/* Menu items */}
          <View className="py-4">
            {/* Dashboard */}
            <TouchableOpacity
              className={`flex-row items-center px-4 py-3 mx-2 rounded-lg ${
                activeTab === 'dashboard' ? 'bg-blue-700' : ''
              }`}
              onPress={() => selectMenuItem('dashboard')}
            >
              <Ionicons 
                name={activeTab === 'dashboard' ? 'home' : 'home-outline'} 
                size={24} 
                color="#fff" 
              />
              <Text className="text-white text-base font-medium ml-4">Dashboard</Text>
            </TouchableOpacity>

            {/* Chauffeurs */}
            <TouchableOpacity
              className={`flex-row items-center px-4 py-3 mx-2 rounded-lg ${
                activeTab === 'chauffeurs' ? 'bg-blue-700' : ''
              }`}
              onPress={() => selectMenuItem('chauffeurs')}
            >
              <Ionicons 
                name={activeTab === 'chauffeurs' ? 'person' : 'person-outline'} 
                size={24} 
                color="#fff" 
              />
              <Text className="text-white text-base font-medium ml-4">Chauffeurs</Text>
            </TouchableOpacity>

            {/* Voitures */}
            <TouchableOpacity
              className={`flex-row items-center px-4 py-3 mx-2 rounded-lg ${
                activeTab === 'voitures' ? 'bg-blue-700' : ''
              }`}
              onPress={() => selectMenuItem('voitures')}
            >
              <Ionicons 
                name={activeTab === 'voitures' ? 'car' : 'car-outline'} 
                size={24} 
                color="#fff" 
              />
              <Text className="text-white text-base font-medium ml-4">Voitures</Text>
            </TouchableOpacity>

            {/* Trajets */}
            <TouchableOpacity
              className={`flex-row items-center px-4 py-3 mx-2 rounded-lg ${
                activeTab === 'trajets' ? 'bg-blue-700' : ''
              }`}
              onPress={() => selectMenuItem('trajets')}
            >
              <Ionicons 
                name={activeTab === 'trajets' ? 'map' : 'map-outline'} 
                size={24} 
                color="#fff" 
              />
              <Text className="text-white text-base font-medium ml-4">Trajets</Text>
            </TouchableOpacity>

            {/* Voyages */}
            <TouchableOpacity
              className={`flex-row items-center px-4 py-3 mx-2 rounded-lg ${
                activeTab === 'voyages' ? 'bg-blue-700' : ''
              }`}
              onPress={() => selectMenuItem('voyages')}
            >
              <Ionicons 
                name={activeTab === 'voyages' ? 'navigate' : 'navigate-outline'} 
                size={24} 
                color="#fff" 
              />
              <Text className="text-white text-base font-medium ml-4">Voyages</Text>
            </TouchableOpacity>

            {/* Paramètres */}
            <TouchableOpacity
              className={`flex-row items-center px-4 py-3 mx-2 rounded-lg ${
                activeTab === 'settings' ? 'bg-blue-700' : ''
              }`}
              onPress={() => selectMenuItem('settings')}
            >
              <Ionicons 
                name={activeTab === 'settings' ? 'settings' : 'settings-outline'} 
                size={24} 
                color="#fff" 
              />
              <Text className="text-white text-base font-medium ml-4">Paramètres</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1" />

          {/* Déconnexion */}
          <View className="px-2 py-4 border-t border-blue-700">
            <TouchableOpacity
              className={`flex-row items-center px-4 py-3 rounded-lg ${
                loading ? 'bg-blue-700 opacity-50' : 'bg-red-600'
              }`}
              onPress={() => {
                toggleDrawer();
                handleLogout();
              }}
              disabled={loading}
            >
              <Ionicons name="log-out-outline" size={24} color="#fff" />
              <Text className="text-white text-base font-medium ml-4">Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView className="flex-1 px-4 pt-6 pb-4">
      <Text className="text-2xl font-bold text-gray-900 mb-6">Tableau de Bord</Text>

      {/* Carte de bienvenue */}
      <View className="bg-blue-500 rounded-2xl p-6 mb-6 shadow-lg">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-sm opacity-90 mb-2">Bienvenue</Text>
            <Text className="text-white text-2xl font-bold">
              {user ? `${user.prenom} ${user.nom}` : 'Compagnie'}
            </Text>
            <Text className="text-white text-xs opacity-75 mt-1">Admin Compagnie</Text>
          </View>
          <View className="bg-white bg-opacity-20 rounded-full w-16 h-16 items-center justify-center">
            <Ionicons name="business" size={32} color="#fff" />
          </View>
        </View>
      </View>

      {/* Statistiques rapides */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">Accès rapide</Text>
        
        <TouchableOpacity
          className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm"
          onPress={() => setActiveTab('chauffeurs')}
          activeOpacity={0.7}
        >
          <View className="bg-blue-100 rounded-xl w-14 h-14 items-center justify-center mr-4">
            <Ionicons name="person" size={28} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-base">Chauffeurs</Text>
            <Text className="text-gray-500 text-sm">Gérer les chauffeurs</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white rounded-2xl p-4 flex-row items-center shadow-sm"
          onPress={() => setActiveTab('voitures')}
          activeOpacity={0.7}
        >
          <View className="bg-green-100 rounded-xl w-14 h-14 items-center justify-center mr-4">
            <Ionicons name="car" size={28} color="#10b981" />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-base">Voitures</Text>
            <Text className="text-gray-500 text-sm">Gérer les voitures</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Infos compagnie */}
      <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
        <Text className="text-lg font-bold text-gray-900 mb-4">Informations</Text>
        
        <View className="border-b border-gray-100 pb-3 mb-3">
          <Text className="text-gray-500 text-sm mb-1">Rôle</Text>
          <Text className="text-gray-900 font-semibold">Admin Compagnie</Text>
        </View>

        <View>
          <Text className="text-gray-500 text-sm mb-1">Email</Text>
          <Text className="text-gray-900 font-semibold">{user?.email || 'N/A'}</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView className="flex-1 px-4 pt-6">
      <Text className="text-2xl font-bold text-gray-900 mb-4">Paramètres</Text>

      {/* Profil */}
      <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <View className="flex-row items-center mb-4">
          <View className="bg-blue-500 rounded-full w-16 h-16 items-center justify-center mr-4">
            <Text className="text-white text-2xl font-bold">
              {user?.prenom?.[0] || 'C'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-lg">
              {user ? `${user.prenom} ${user.nom}` : 'Compagnie'}
            </Text>
            <Text className="text-gray-500">Admin Compagnie</Text>
          </View>
        </View>
      </View>

      {/* Options */}
      <View className="bg-white rounded-2xl mb-4 shadow-sm">
        <TouchableOpacity
          className="flex-row items-center p-4 border-b border-gray-100"
          onPress={() => router.push('/screens/profils/monProfil')}
          activeOpacity={0.7}
        >
          <View className="bg-blue-100 rounded-xl w-10 h-10 items-center justify-center mr-3">
            <Ionicons name="person" size={20} color="#3b82f6" />
          </View>
          <Text className="flex-1 text-gray-900 font-medium">Mon profil</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
          <View className="bg-purple-100 rounded-xl w-10 h-10 items-center justify-center mr-3">
            <Ionicons name="notifications" size={20} color="#8b5cf6" />
          </View>
          <Text className="flex-1 text-gray-900 font-medium">Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
          <View className="bg-green-100 rounded-xl w-10 h-10 items-center justify-center mr-3">
            <Ionicons name="shield-checkmark" size={20} color="#10b981" />
          </View>
          <Text className="flex-1 text-gray-900 font-medium">Sécurité</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center p-4">
          <View className="bg-orange-100 rounded-xl w-10 h-10 items-center justify-center mr-3">
            <Ionicons name="help-circle" size={20} color="#f97316" />
          </View>
          <Text className="flex-1 text-gray-900 font-medium">Aide & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <DialogComponent />
      
      {/* Header avec menu button */}
      <View className="bg-white border-b border-gray-200 px-4 py-3 flex-row items-center justify-between">
        <TouchableOpacity 
          onPress={toggleDrawer}
          className="p-2"
        >
          <Ionicons 
            name={drawerOpen ? "close" : "menu"} 
            size={28} 
            color="#3b82f6" 
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Compagnie</Text>
        <View className="w-10" />
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
            className="absolute inset-0 bg-black/30"
            onPress={toggleDrawer}
            activeOpacity={1}
            style={{ zIndex: 999 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}