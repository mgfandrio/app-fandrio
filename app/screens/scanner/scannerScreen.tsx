import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { reservationAdminService } from '@/app/services/reservations/reservationAdminService';

const formatMontant = (montant: number) =>
  montant.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' Ar';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [embarqueLoading, setEmbarqueLoading] = useState(false);
  const lastScannedRef = useRef<string>('');

  const handleScan = useCallback(async (data: { data: string }) => {
    if (scanned || scanning) return;
    if (data.data === lastScannedRef.current) return;
    lastScannedRef.current = data.data;
    setScanning(true);
    setScanned(true);

    try {
      const response = await reservationAdminService.scannerQR(data.data);
      setResult(response);
    } catch {
      setResult({ statut: false, message: 'Erreur réseau', validation: 'erreur' });
    } finally {
      setScanning(false);
    }
  }, [scanned, scanning]);

  const handleEmbarquer = async () => {
    if (!result?.data?.reservation?.res_id) return;
    setEmbarqueLoading(true);
    try {
      const res = await reservationAdminService.embarquer(result.data.reservation.res_id);
      if (res.statut) {
        Alert.alert('Embarquement', res.message || 'Voyageurs embarqués avec succès');
        // Update local state
        setResult((prev: any) => ({
          ...prev,
          data: {
            ...prev.data,
            reservation: { ...prev.data.reservation, tous_embarques: true },
            voyageurs: prev.data.voyageurs.map((v: any) => ({ ...v, embarque: true })),
          },
        }));
      } else {
        Alert.alert('Erreur', res.message || 'Erreur lors de l\'embarquement');
      }
    } catch {
      Alert.alert('Erreur', 'Erreur réseau');
    } finally {
      setEmbarqueLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setResult(null);
    lastScannedRef.current = '';
  };

  const validationConfig: Record<string, { icon: string; color: string; bg: string; gradientColors: [string, string] }> = {
    valide: { icon: 'checkmark-circle', color: '#10b981', bg: '#ecfdf5', gradientColors: ['#059669', '#10b981'] },
    futur: { icon: 'time', color: '#f59e0b', bg: '#fffbeb', gradientColors: ['#d97706', '#f59e0b'] },
    passe: { icon: 'alert-circle', color: '#f97316', bg: '#fff7ed', gradientColors: ['#ea580c', '#f97316'] },
    invalide: { icon: 'close-circle', color: '#ef4444', bg: '#fef2f2', gradientColors: ['#dc2626', '#ef4444'] },
    erreur: { icon: 'warning', color: '#ef4444', bg: '#fef2f2', gradientColors: ['#dc2626', '#ef4444'] },
  };

  // Permission not granted
  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-8">
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera" size={40} color="#3b82f6" />
          </View>
          <Text className="text-gray-900 font-bold text-lg mt-6 text-center">Accès à la caméra requis</Text>
          <Text className="text-gray-500 text-sm mt-2 text-center">Pour scanner les QR codes des billets, autorisez l'accès à la caméra.</Text>
          <TouchableOpacity onPress={requestPermission} className="bg-blue-600 px-8 py-3 rounded-xl mt-6">
            <Text className="text-white font-bold">Autoriser la caméra</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-gray-400 font-semibold">Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Camera or Result */}
      {!scanned ? (
        <View className="flex-1">
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
          {/* Overlay */}
          <View className="flex-1">
            {/* Top bar */}
            <View className="flex-row items-center justify-between px-5 pt-3 pb-3" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
                <Ionicons name="arrow-back" size={22} color="#fff" />
                <Text className="text-white font-bold ml-2">Retour</Text>
              </TouchableOpacity>
              <Text className="text-white/70 text-xs">Scanner QR</Text>
            </View>

            {/* Center frame */}
            <View className="flex-1 items-center justify-center">
              <View style={{ width: 250, height: 250, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 20 }}>
                {/* Corner decorations */}
                <View style={{ position: 'absolute', top: -2, left: -2, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#3b82f6', borderTopLeftRadius: 12 }} />
                <View style={{ position: 'absolute', top: -2, right: -2, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#3b82f6', borderTopRightRadius: 12 }} />
                <View style={{ position: 'absolute', bottom: -2, left: -2, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#3b82f6', borderBottomLeftRadius: 12 }} />
                <View style={{ position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#3b82f6', borderBottomRightRadius: 12 }} />
              </View>
              <Text className="text-white/60 text-sm mt-6">Placez le QR code du billet dans le cadre</Text>
            </View>
          </View>

          {/* Loading overlay */}
          {scanning && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-white font-bold mt-3">Vérification du billet...</Text>
            </View>
          )}
        </View>
      ) : (
        <View className="flex-1 bg-gray-50">
          {/* Result header */}
          <View className="flex-row items-center justify-between px-5 pt-3 pb-3 bg-white border-b border-gray-100">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
              <Ionicons name="arrow-back" size={22} color="#1e293b" />
              <Text className="text-gray-900 font-bold ml-2">Scanner QR</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
            {result && (() => {
              const v = result.validation || 'erreur';
              const config = validationConfig[v] || validationConfig.erreur;
              return (
                <>
                  {/* Validation badge */}
                  <LinearGradient
                    colors={config.gradientColors}
                    className="rounded-2xl p-5 items-center mb-4"
                  >
                    <Ionicons name={config.icon as any} size={48} color="#fff" />
                    <Text className="text-white font-bold text-lg mt-2 text-center">{result.message}</Text>
                    {v === 'valide' && !result.data?.reservation?.tous_embarques && (
                      <View className="bg-white/20 rounded-full px-3 py-1 mt-2">
                        <Text className="text-white text-xs font-bold">Prêt pour l'embarquement</Text>
                      </View>
                    )}
                    {result.data?.reservation?.tous_embarques && (
                      <View className="bg-white/20 rounded-full px-3 py-1 mt-2">
                        <Text className="text-white text-xs font-bold">Déjà embarqué</Text>
                      </View>
                    )}
                  </LinearGradient>

                  {/* Reservation details */}
                  {result.data && (
                    <>
                      <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 1 }}>
                        <Text className="text-xs text-gray-400 font-bold mb-3">RÉSERVATION</Text>
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-gray-500 text-xs">N° Réservation</Text>
                          <Text className="text-gray-900 font-bold text-sm">{result.data.reservation.res_numero}</Text>
                        </View>
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-gray-500 text-xs">Montant</Text>
                          <Text className="text-green-600 font-bold">{formatMontant(result.data.reservation.montant_total)}</Text>
                        </View>
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-gray-500 text-xs">Paiement</Text>
                          <Text className="text-gray-700 font-semibold text-xs">{result.data.reservation.type_paiement}</Text>
                        </View>
                        {result.data.reservation.numero_paiement && (
                          <View className="flex-row items-center justify-between">
                            <Text className="text-gray-500 text-xs">Réf. paiement</Text>
                            <Text className="text-gray-700 text-xs">{result.data.reservation.numero_paiement}</Text>
                          </View>
                        )}
                      </View>

                      <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 1 }}>
                        <Text className="text-xs text-gray-400 font-bold mb-3">VOYAGE</Text>
                        <View className="flex-row items-center mb-2">
                          <Ionicons name="navigate" size={16} color="#3b82f6" />
                          <Text className="text-gray-900 font-bold text-sm ml-2">{result.data.voyage.trajet}</Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="calendar" size={16} color="#6b7280" />
                          <Text className="text-gray-600 text-xs ml-2">{result.data.voyage.date} à {result.data.voyage.heure}</Text>
                        </View>
                      </View>

                      <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 1 }}>
                        <Text className="text-xs text-gray-400 font-bold mb-3">CLIENT</Text>
                        <Text className="text-gray-900 font-bold">{result.data.client?.nom || 'N/A'}</Text>
                        <Text className="text-gray-500 text-xs mt-1">{result.data.client?.telephone || ''}</Text>
                      </View>

                      {/* Passengers */}
                      <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 1 }}>
                        <Text className="text-xs text-gray-400 font-bold mb-3">VOYAGEURS ({result.data.voyageurs?.length || 0})</Text>
                        {result.data.voyageurs?.map((v: any, i: number) => (
                          <View key={i} className={`flex-row items-center py-2 ${i < result.data.voyageurs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: v.embarque ? '#d1fae5' : '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name={v.embarque ? 'checkmark' : 'person'} size={16} color={v.embarque ? '#10b981' : '#3b82f6'} />
                            </View>
                            <View className="flex-1 ml-3">
                              <Text className="text-gray-900 font-semibold text-xs">{v.nom}</Text>
                              <Text className="text-gray-400 text-[10px]">Siège {v.siege}</Text>
                            </View>
                            {v.embarque && (
                              <View className="bg-green-100 px-2 py-0.5 rounded-full">
                                <Text className="text-green-700 text-[9px] font-bold">Embarqué</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>

                      {/* Embarquer button */}
                      {v === 'valide' && !result.data.reservation.tous_embarques && (
                        <TouchableOpacity
                          onPress={handleEmbarquer}
                          disabled={embarqueLoading}
                          className="bg-green-600 rounded-2xl py-4 items-center mb-3"
                          activeOpacity={0.8}
                        >
                          {embarqueLoading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <View className="flex-row items-center">
                              <Ionicons name="checkmark-done" size={20} color="#fff" />
                              <Text className="text-white font-bold text-base ml-2">Confirmer l'embarquement</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </>
              );
            })()}

            {/* Scan another */}
            <TouchableOpacity
              onPress={resetScanner}
              className="border-2 border-blue-200 bg-blue-50 rounded-2xl py-4 items-center mb-8"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Ionicons name="scan" size={20} color="#3b82f6" />
                <Text className="text-blue-600 font-bold text-base ml-2">Scanner un autre billet</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
