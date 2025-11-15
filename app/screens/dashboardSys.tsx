import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConfirmDialog } from '../components/common/ConfirmDialog';
import { RenderCompagnies } from '../components/RenderCompagnies';
import { RenderDashboard } from '../components/RenderDashbord';
import { RenderUsers } from '../components/RenderUsers';
import { RenderProvinces } from '../components/RenderProvinces';

export default function DashboardSys() {
  const router = useRouter();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

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
          router.replace('./loginScreen');
        } catch (e) {
          console.warn('Logout error', e);
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => {}
    });
  };

  const renderSettings = () => (
    <ScrollView className="flex-1 px-4 pt-6">
      <Text className="text-2xl font-bold text-gray-900 mb-4">Paramètres</Text>
      
      {/* Profil */}
      <View className="bg-white rounded-2xl p-4 mb-4">
        <View className="flex-row items-center mb-4">
          <View className="bg-blue-500 rounded-full w-16 h-16 items-center justify-center mr-4">
            <Text className="text-white text-2xl font-bold">
              {user?.prenom?.[0] || 'A'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-lg">
              {user ? `${user.prenom} ${user.nom}` : 'Administrateur'}
            </Text>
            <Text className="text-gray-500">Rôle : Admin Système</Text>
          </View>
        </View>
      </View>

      {/* Options */}
      <View className="bg-white rounded-2xl mb-4">
        <TouchableOpacity 
          className="flex-row items-center p-4 border-b border-gray-100"
          onPress={() => router.push('./monProfil')}
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

      {/* Bouton Déconnexion */}
      <TouchableOpacity
        className={`rounded-2xl py-4 px-6 items-center mb-6 ${loading ? 'bg-gray-300' : 'bg-red-500'}`}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View className="flex-row items-center">
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text className="text-white font-semibold text-base ml-2">Déconnexion</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <DialogComponent />
      {/* Content */}
      <View className="flex-1">
        {activeTab === 'dashboard' && <RenderDashboard />}
        {activeTab === 'users' && <RenderUsers />}
        {activeTab === 'companies' && <RenderCompagnies />}
        {activeTab === 'provinces' && <RenderProvinces />}
        {activeTab === 'settings' && renderSettings()}
      </View>

      {/* Bottom Navigation */}
      <SafeAreaView edges={['bottom']} className="bg-white border-t border-gray-200 shadow-lg">
        <View className="flex-row justify-around items-center px-4 py-2">
          {/* Dashboard */}
          <TouchableOpacity
            className={`items-center justify-center py-2 px-6 rounded-xl ${
              activeTab === 'dashboard' ? 'bg-blue-500' : ''
            }`}
            onPress={() => setActiveTab('dashboard')}
          >
            <Ionicons
              name={activeTab === 'dashboard' ? 'home' : 'home-outline'}
              size={24}
              color={activeTab === 'dashboard' ? '#fff' : '#9ca3af'}
            />
            <Text
              className={`text-xs mt-1 ${
                activeTab === 'dashboard' ? 'text-white font-semibold' : 'text-gray-400'
              }`}
            >
              Dashboard
            </Text>
          </TouchableOpacity>

          {/* Utilisateurs */}
          <TouchableOpacity
            className={`items-center justify-center py-2 px-6 rounded-xl ${
              activeTab === 'users' ? 'bg-blue-500' : ''
            }`}
            onPress={() => setActiveTab('users')}
          >
            <Ionicons
              name={activeTab === 'users' ? 'people' : 'people-outline'}
              size={24}
              color={activeTab === 'users' ? '#fff' : '#9ca3af'}
            />
            <Text
              className={`text-xs mt-1 ${
                activeTab === 'users' ? 'text-white font-semibold' : 'text-gray-400'
              }`}
            >
              Utilisateurs
            </Text>
          </TouchableOpacity>

          {/* Compagnies */}
          <TouchableOpacity
            className={`items-center justify-center py-2 px-4 rounded-xl ${
              activeTab === 'companies' ? 'bg-blue-500' : ''
            }`}
            onPress={() => setActiveTab('companies')}
          >
            <Ionicons
              name={activeTab === 'companies' ? 'business' : 'business-outline'}
              size={24}
              color={activeTab === 'companies' ? '#fff' : '#9ca3af'}
            />
            <Text
              className={`text-xs mt-1 ${
                activeTab === 'companies' ? 'text-white font-semibold' : 'text-gray-400'
              }`}
            >
              Compagnies
            </Text>
          </TouchableOpacity>

          {/* Provinces */}
          <TouchableOpacity
            className={`items-center justify-center py-2 px-4 rounded-xl ${
              activeTab === 'provinces' ? 'bg-blue-500' : ''
            }`}
            onPress={() => setActiveTab('provinces')}
          >
            <Ionicons
              name={activeTab === 'provinces' ? 'map' : 'map-outline'}
              size={24}
              color={activeTab === 'provinces' ? '#fff' : '#9ca3af'}
            />
            <Text
              className={`text-xs mt-1 ${
                activeTab === 'provinces' ? 'text-white font-semibold' : 'text-gray-400'
              }`}
            >
              Provinces
            </Text>
          </TouchableOpacity>

          {/* Paramètres */}
          <TouchableOpacity
            className={`items-center justify-center py-2 px-4 rounded-xl ${
              activeTab === 'settings' ? 'bg-blue-500' : ''
            }`}
            onPress={() => setActiveTab('settings')}
          >
            <Ionicons
              name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
              size={24}
              color={activeTab === 'settings' ? '#fff' : '#9ca3af'}
            />
            <Text
              className={`text-xs mt-1 ${
                activeTab === 'settings' ? 'text-white font-semibold' : 'text-gray-400'
              }`}
            >
              Paramètres
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}