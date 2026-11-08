import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { reservationAdminService } from '@/app/services/reservations/reservationAdminService';
import { Bouton, Texte } from '@/app/components/ui';
import { couleurs, formatAriary } from '@/app/theme/ocean';
import { dateCourte, dateVoyage } from '@/app/utils/voyageStatut';

const FOND = '#0A1626';
const CADRE = 250;

type Issue = { titre: string; sousTitre: string; ton: 'ok' | 'alerte' | 'refus' };

/** Traduit la réponse de l'API en état d'écran : valide, déjà utilisé, autre jour, refusé. */
function issueDu(resultat: any, embarque: boolean): Issue {
  const v = resultat?.validation || 'erreur';
  const d = resultat?.data;
  if (embarque) return { titre: 'Embarquement confirmé', sousTitre: 'Bon voyage !', ton: 'ok' };
  if (v === 'valide' && d?.reservation?.tous_embarques) return { titre: 'Billet déjà utilisé', sousTitre: 'Tous les voyageurs de ce billet sont déjà embarqués.', ton: 'alerte' };
  if (v === 'valide') return { titre: 'Billet valide', sousTitre: "Prêt pour l'embarquement", ton: 'ok' };
  if (v === 'futur') return { titre: 'Billet pour un autre jour', sousTitre: `Ce billet est pour le ${dateCourte(dateVoyage(d?.voyage?.date))} à ${String(d?.voyage?.heure || '').slice(0, 5)}.`, ton: 'alerte' };
  if (v === 'passe') return { titre: 'Voyage déjà passé', sousTitre: `Ce billet concernait le départ du ${dateCourte(dateVoyage(d?.voyage?.date))}.`, ton: 'alerte' };
  if (v === 'erreur') return { titre: 'Vérification impossible', sousTitre: resultat?.message || 'Problème de connexion. Réessayez.', ton: 'refus' };
  return { titre: 'Billet refusé', sousTitre: resultat?.message || 'QR code inconnu ou d’une autre compagnie.', ton: 'refus' };
}

const TONS = {
  ok: { icone: 'checkmark' as const, couleur: couleurs.succesVif, halo: 'rgba(61,214,140,0.16)', texte: couleurs.succes },
  alerte: { icone: 'alert' as const, couleur: '#E4A13A', halo: 'rgba(228,161,58,0.18)', texte: '#8F4F05' },
  refus: { icone: 'close' as const, couleur: couleurs.danger, halo: 'rgba(225,72,72,0.18)', texte: couleurs.danger },
};

function Ligne({ libelle, valeur }: { libelle: string; valeur?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris}>{libelle}</Texte>
      <Texte graisse="gras" taille={13.5} style={{ flexShrink: 1, textAlign: 'right' }}>{valeur || '—'}</Texte>
    </View>
  );
}

/** Coin blanc du cadre de visée. */
function Coin({ position }: { position: 'hg' | 'hd' | 'bg' | 'bd' }) {
  const haut = position[0] === 'h';
  const gauche = position[1] === 'g';
  return (
    <View
      style={{
        position: 'absolute',
        width: 42,
        height: 42,
        borderColor: '#FFFFFF',
        [haut ? 'top' : 'bottom']: 0,
        [gauche ? 'left' : 'right']: 0,
        borderTopWidth: haut ? 4 : 0,
        borderBottomWidth: haut ? 0 : 4,
        borderLeftWidth: gauche ? 4 : 0,
        borderRightWidth: gauche ? 0 : 4,
        borderTopLeftRadius: haut && gauche ? 18 : 0,
        borderTopRightRadius: haut && !gauche ? 18 : 0,
        borderBottomLeftRadius: !haut && gauche ? 18 : 0,
        borderBottomRightRadius: !haut && !gauche ? 18 : 0,
      }}
    />
  );
}

/** Scanner d'embarquement : lit le QR code d'un billet, l'API le valide, la compagnie embarque. */
export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [lampe, setLampe] = useState(false);
  const [verification, setVerification] = useState(false);
  const [resultat, setResultat] = useState<any>(null);
  const [embarque, setEmbarque] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const verrou = useRef(false);
  const balayage = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(balayage, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(balayage, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    boucle.start();
    return () => boucle.stop();
  }, [balayage]);

  const lire = useCallback(async ({ data }: { data: string }) => {
    if (verrou.current) return;
    verrou.current = true;
    setVerification(true);
    try {
      setResultat(await reservationAdminService.scannerQR(data));
    } catch {
      setResultat({ statut: false, validation: 'erreur', message: 'Problème de connexion. Réessayez.' });
    } finally {
      setVerification(false);
    }
  }, []);

  const recommencer = () => {
    setResultat(null);
    setEmbarque(false);
    verrou.current = false;
  };

  const embarquer = async () => {
    const id = resultat?.data?.reservation?.res_id;
    if (!id) return;
    setEnvoi(true);
    try {
      const r = await reservationAdminService.embarquer(id);
      if (r?.statut) {
        setEmbarque(true);
        setResultat((p: any) => ({ ...p, data: { ...p.data, voyageurs: (p.data.voyageurs || []).map((v: any) => ({ ...v, embarque: true })) } }));
      } else {
        setResultat({ statut: false, validation: 'erreur', message: r?.message || 'Embarquement impossible.' });
      }
    } finally {
      setEnvoi(false);
    }
  };

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: FOND, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#FFFFFF" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: couleurs.fond, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" />
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="camera-outline" size={34} color={couleurs.ocean800} />
        </View>
        <Texte graisse="tresGras" taille={18} centre>Accès à la caméra requis</Texte>
        <Texte variante="legende" centre>Pour scanner les billets à l’embarquement, autorisez l’accès à la caméra.</Texte>
        <Bouton titre="Autoriser la caméra" onPress={requestPermission} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        <Bouton titre="Retour" variante="lien" onPress={() => router.back()} />
      </View>
    );
  }

  const d = resultat?.data;
  const issue = resultat ? issueDu(resultat, embarque) : null;
  const ton = issue ? TONS[issue.ton] : null;
  const peutEmbarquer = resultat?.validation === 'valide' && !d?.reservation?.tous_embarques && !embarque;
  const voyageurs: any[] = d?.voyageurs || [];
  const aEmbarquer = voyageurs.filter((v) => !v.embarque).length;

  return (
    <View style={{ flex: 1, backgroundColor: FOND }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={FOND} />

      {!resultat ? (
        <>
          <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={lampe} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={lire} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(7,15,26,0.45)' }]} />

          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Fermer le scanner" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', paddingHorizontal: 12 }}>
              <Texte graisse="tresGras" taille={13.5} couleur="#FFFFFF">Embarquement</Texte>
              <Texte graisse="moyen" taille={11.5} couleur="#CFE6FB">Scannez le QR code de chaque billet</Texte>
            </View>
            <Pressable
              onPress={() => setLampe((l) => !l)}
              accessibilityRole="switch"
              accessibilityState={{ checked: lampe }}
              accessibilityLabel={lampe ? 'Éteindre la lampe' : 'Allumer la lampe'}
              style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: lampe ? '#FFFFFF' : 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name={lampe ? 'flash' : 'flash-outline'} size={20} color={lampe ? FOND : '#FFFFFF'} />
            </Pressable>
          </View>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <View accessible accessibilityLabel="Zone de lecture du QR code" style={{ width: CADRE, height: CADRE }}>
              <Coin position="hg" />
              <Coin position="hd" />
              <Coin position="bg" />
              <Coin position="bd" />
              <Animated.View
                style={{
                  position: 'absolute',
                  left: '8%',
                  right: '8%',
                  top: CADRE * 0.08,
                  height: 2,
                  borderRadius: 2,
                  backgroundColor: couleurs.ocean300,
                  shadowColor: couleurs.ocean300,
                  shadowOpacity: 0.9,
                  shadowRadius: 8,
                  transform: [{ translateY: balayage.interpolate({ inputRange: [0, 1], outputRange: [0, CADRE * 0.8] }) }],
                }}
              />
            </View>
            <Texte graisse="gras" taille={15} couleur="#FFFFFF" centre>Placez le QR code du billet{'\n'}dans le cadre</Texte>
          </View>

          {verification && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(7,15,26,0.75)', alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Texte graisse="tresGras" taille={15} couleur="#FFFFFF">Vérification du billet…</Texte>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: ton!.halo, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: ton!.couleur, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={ton!.icone} size={36} color="#FFFFFF" />
              </View>
            </View>
          </View>

          <View style={{ maxHeight: '78%', backgroundColor: couleurs.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
            <ScrollView contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 18, paddingBottom: insets.bottom + 20, gap: 14 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: couleurs.champ }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Texte accessibilityRole="header" graisse="tresGras" taille={21} couleur={ton!.texte}>{issue!.titre}</Texte>
                  <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris}>{issue!.sousTitre}</Texte>
                </View>
                {!!d?.reservation?.res_numero && (
                  <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: couleurs.ocean50 }}>
                    <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean950}>{d.reservation.res_numero}</Texte>
                  </View>
                )}
              </View>

              {!!d && (
                <View style={{ gap: 9, padding: 14, borderRadius: 16, backgroundColor: couleurs.fond }}>
                  <Ligne libelle="Voyage" valeur={d.voyage?.trajet} />
                  <Ligne libelle="Départ" valeur={[dateCourte(dateVoyage(d.voyage?.date)), String(d.voyage?.heure || '').slice(0, 5)].filter(Boolean).join(' · ')} />
                  <Ligne libelle="Réservé par" valeur={[d.client?.nom, d.client?.telephone].filter(Boolean).join(' · ')} />
                  <Ligne libelle="Paiement" valeur={[d.reservation?.type_paiement, `${formatAriary(Number(d.reservation?.montant_total) || 0)} Ar`].filter(Boolean).join(' · ')} />
                </View>
              )}

              {voyageurs.length > 0 && (
                <>
                  <Texte variante="etiquette">Voyageurs</Texte>
                  {voyageurs.map((v, i) => (
                    <View key={v.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: couleurs.champ }}>
                      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }}>
                        <Texte graisse="tresGras" taille={14} couleur="#FFFFFF">{v.siege}</Texte>
                      </View>
                      <Texte graisse="tresGras" taille={14.5} style={{ flex: 1 }} numberOfLines={1}>{v.nom}</Texte>
                      {v.embarque ? (
                        <Ionicons name="checkmark-circle" size={22} color={couleurs.succesVif} accessibilityLabel="Embarqué" />
                      ) : (
                        <Texte graisse="gras" taille={12} couleur={couleurs.gris}>À bord ?</Texte>
                      )}
                    </View>
                  ))}
                </>
              )}

              {peutEmbarquer && (
                <Bouton titre={`Confirmer l'embarquement${aEmbarquer ? ` (${aEmbarquer})` : ''}`} variante="succes" icone="checkmark-done" onPress={embarquer} chargement={envoi} style={{ marginTop: 4 }} />
              )}
              <Bouton titre="Scanner un autre billet" variante={peutEmbarquer ? 'lien' : 'principal'} icone={peutEmbarquer ? undefined : 'scan-outline'} onPress={recommencer} />
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}
