import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StatusBar, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs, polices } from '../theme/ocean';

interface PostLoginSplashProps {
  userName: string;
  onFinish: () => void;
}

const ETAPES = ['Session sécurisée', 'Synchronisation de vos données', 'Préparation de votre espace'];

/** Écran affiché juste après la connexion : coche, salutation, petit bus sur la route. Durée ≈ 3,7 s. */
export default function PostLoginSplash({ userName, onFinish }: PostLoginSplashProps) {
  const insets = useSafeAreaInsets();
  const coche = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const titre = useRef(new Animated.Value(0)).current;
  const nom = useRef(new Animated.Value(0)).current;
  const route = useRef(new Animated.Value(0)).current;
  const bus = useRef(new Animated.Value(0)).current;
  const etapes = useRef(ETAPES.map(() => new Animated.Value(0))).current;
  const ecran = useRef(new Animated.Value(1)).current;
  const [largeurRoute, setLargeurRoute] = useState(0);

  useEffect(() => {
    Animated.spring(coche, { toValue: 1, damping: 9, stiffness: 130, delay: 150, useNativeDriver: true }).start();
    Animated.timing(halo, { toValue: 1, duration: 1100, delay: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.timing(titre, { toValue: 1, duration: 450, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(nom, { toValue: 1, duration: 450, delay: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(route, { toValue: 1, duration: 350, delay: 950, useNativeDriver: true }).start();
    Animated.timing(bus, { toValue: 1, duration: 2100, delay: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
    etapes.forEach((v, i) =>
      Animated.timing(v, { toValue: 1, duration: 350, delay: 1300 + i * 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
    );
    Animated.timing(ecran, { toValue: 0, duration: 450, delay: 3250, useNativeDriver: true }).start(() => onFinish());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monte = (v: Animated.Value, distance: number) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });

  const prenom = (userName || '').trim().split(/\s+/)[0];

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: couleurs.ocean950, opacity: ecran }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={{ position: 'absolute', top: -160, alignSelf: 'center', width: 420, height: 420, borderRadius: 210, backgroundColor: couleurs.ocean800, opacity: 0.35 }} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Coche dans un halo */}
        <View style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
          <Animated.View
            style={{
              position: 'absolute',
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: couleurs.succesVif,
              opacity: halo.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.3, 0.12] }),
              transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            }}
          />
          <Animated.View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: couleurs.succesVif,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: coche,
              transform: [{ scale: coche }],
            }}
          >
            <Ionicons name="checkmark" size={40} color="#FFFFFF" />
          </Animated.View>
        </View>

        <Animated.Text accessibilityRole="header" style={[{ fontFamily: polices.tresGras, fontSize: 25, color: '#FFFFFF', textAlign: 'center' }, monte(titre, 14)]}>
          Connexion réussie
        </Animated.Text>
        <Animated.Text style={[{ fontFamily: polices.moyen, fontSize: 17, color: couleurs.texteSurMarine, textAlign: 'center', marginTop: 6 }, monte(nom, 12)]}>
          {prenom ? `Bonjour, ${prenom}` : 'Bon retour parmi nous'}
        </Animated.Text>

        {/* Route et bus */}
        <Animated.View
          onLayout={(e: LayoutChangeEvent) => setLargeurRoute(e.nativeEvent.layout.width)}
          style={{ alignSelf: 'stretch', height: 44, marginTop: 40, justifyContent: 'center', opacity: route }}
        >
          <View style={{ height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />
          <View style={{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} />
            ))}
          </View>
          {largeurRoute > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ translateX: bus.interpolate({ inputRange: [0, 1], outputRange: [0, largeurRoute - 40] }) }],
              }}
            >
              <Ionicons name="bus" size={21} color={couleurs.ocean800} />
            </Animated.View>
          )}
        </Animated.View>

        {/* Étapes */}
        <View style={{ alignSelf: 'stretch', marginTop: 26, gap: 10 }}>
          {ETAPES.map((libelle, i) => (
            <Animated.View key={libelle} style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, monte(etapes[i], 6)]}>
              <Ionicons name="checkmark-circle" size={17} color={couleurs.ocean300} />
              <Animated.Text style={{ fontFamily: polices.moyen, fontSize: 13.5, color: couleurs.texteSurMarine }}>{libelle}</Animated.Text>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.Text
        style={{
          fontFamily: polices.gras,
          fontSize: 11.5,
          letterSpacing: 1.6,
          color: 'rgba(169,195,222,0.6)',
          textAlign: 'center',
          textTransform: 'uppercase',
          paddingBottom: insets.bottom + 32,
          opacity: nom,
        }}
      >
        FANDRIO · Transport régional
      </Animated.Text>
    </Animated.View>
  );
}
