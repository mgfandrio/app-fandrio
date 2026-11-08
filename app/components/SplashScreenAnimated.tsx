import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs, polices } from '../theme/ocean';

interface SplashScreenAnimatedProps {
  onFinish: () => void;
  /** Appelé quand la barre de progression est pleine : la vérification de session peut commencer. */
  onAnimationReady?: () => void;
}

/** Anneau concentrique qui s'élargit doucement derrière le logo. */
function Onde({ delai }: { delai: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const boucle = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 2600, delay: delai, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    boucle.start();
    return () => boucle.stop();
  }, [v, delai]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 1.5,
        borderColor: couleurs.ocean500,
        opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.9] }) }],
      }}
    />
  );
}

/** Écran d'ouverture : fond marine, logo, nom et barre de progression. Durée totale ≈ 4 s. */
export default function SplashScreenAnimated({ onFinish, onAnimationReady }: SplashScreenAnimatedProps) {
  const insets = useSafeAreaInsets();
  const logo = useRef(new Animated.Value(0)).current;
  const titre = useRef(new Animated.Value(0)).current;
  const sousTitre = useRef(new Animated.Value(0)).current;
  const progression = useRef(new Animated.Value(0)).current;
  const barre = useRef(new Animated.Value(0)).current;
  const ecran = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(logo, { toValue: 1, damping: 13, stiffness: 110, delay: 150, useNativeDriver: true }).start();
    Animated.timing(titre, { toValue: 1, duration: 550, delay: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(sousTitre, { toValue: 1, duration: 500, delay: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(barre, { toValue: 1, duration: 350, delay: 1100, useNativeDriver: true }).start();
    Animated.timing(progression, { toValue: 1, duration: 2000, delay: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(() => {
      onAnimationReady?.();
    });
    Animated.timing(ecran, { toValue: 0, duration: 450, delay: 3500, useNativeDriver: true }).start(() => onFinish());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monte = (v: Animated.Value, distance: number) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: couleurs.ocean950, opacity: ecran }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Halo discret en haut de l'écran */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -160, alignSelf: 'center', width: 420, height: 420, borderRadius: 210, backgroundColor: couleurs.ocean800, opacity: 0.35 }} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
          <Onde delai={600} />
          <Onde delai={1900} />
          <Animated.Image
            source={require('../../assets/images/fandrioLogo.png')}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            style={{
              width: 170,
              height: 170,
              opacity: logo,
              transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            }}
          />
        </View>

        <Animated.Text
          accessibilityRole="header"
          style={[{ fontFamily: polices.tresGras, fontSize: 34, letterSpacing: 9, color: '#FFFFFF', marginTop: 4 }, monte(titre, 18)]}
        >
          FANDRIO
        </Animated.Text>
        <Animated.Text
          style={[{ fontFamily: polices.moyen, fontSize: 15, color: couleurs.texteSurMarine, marginTop: 8, textAlign: 'center' }, monte(sousTitre, 12)]}
        >
          Réservez votre voyage en quelques clics
        </Animated.Text>

        <Animated.View style={{ marginTop: 44, width: 160, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', opacity: barre }}>
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 2,
              backgroundColor: couleurs.ocean300,
              width: progression.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }}
          />
        </Animated.View>
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
          opacity: sousTitre,
        }}
      >
        Facile, rapide et sécurisé
      </Animated.Text>
    </Animated.View>
  );
}
