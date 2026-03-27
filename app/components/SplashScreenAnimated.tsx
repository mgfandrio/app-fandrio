import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenAnimatedProps {
  onFinish: () => void;
  onAnimationReady?: () => void; // Appelé quand l'animation est prête pour la vérification
}

// Particule lumineuse flottante
function Particle({ delay, startX, startY, size }: { delay: number; startX: number; startY: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      delay,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true, delay }),
        Animated.timing(anim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.3, 0.8] });
  const opacity = Animated.multiply(
    fadeIn,
    anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.7, 0.2] })
  );

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#ffffff',
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    />
  );
}

export default function SplashScreenAnimated({ onFinish, onAnimationReady }: SplashScreenAnimatedProps) {
  // Valeurs animées
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(-10)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const iconsOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Glow
    Animated.parallel([
      Animated.timing(glowOpacity, { toValue: 0.4, duration: 800, delay: 100, useNativeDriver: true }),
      Animated.spring(glowScale, { toValue: 1, damping: 8, stiffness: 60, delay: 100, useNativeDriver: true }),
    ]).start();

    // 2. Logo
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, damping: 12, stiffness: 100, delay: 200, useNativeDriver: true }),
      Animated.spring(logoRotate, { toValue: 0, damping: 14, stiffness: 80, delay: 200, useNativeDriver: true }),
    ]).start();

    // 3. Pulse continu
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true, delay: 1000 }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // 4. Texte "FANDRIO"
    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 1, duration: 600, delay: 600, useNativeDriver: true }),
      Animated.spring(textTranslateY, { toValue: 0, damping: 14, stiffness: 90, delay: 600, useNativeDriver: true }),
    ]).start();

    // 5. Sous-titre
    Animated.parallel([
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, delay: 900, useNativeDriver: true }),
      Animated.spring(subtitleTranslateY, { toValue: 0, damping: 14, stiffness: 90, delay: 900, useNativeDriver: true }),
    ]).start();

    // 6. Barre de progression
    Animated.timing(progressOpacity, { toValue: 1, duration: 400, delay: 1100, useNativeDriver: true }).start();
    Animated.timing(progressWidth, { toValue: 1, duration: 2000, delay: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(() => {
      // Signaler que l'animation est prête — la vérification du token peut commencer
      onAnimationReady?.();
    });

    // 7. Icônes
    Animated.timing(iconsOpacity, { toValue: 0.5, duration: 600, delay: 1400, useNativeDriver: true }).start();

    // 8. Fondu de sortie
    Animated.timing(screenOpacity, { toValue: 0, duration: 500, delay: 3500, useNativeDriver: true }).start(() => {
      onFinish();
    });
  }, []);

  const rotateInterpolation = logoRotate.interpolate({ inputRange: [-10, 0], outputRange: ['-10deg', '0deg'] });
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  // Particules
  const particles = [
    { delay: 300, startX: SCREEN_WIDTH * 0.1, startY: SCREEN_HEIGHT * 0.2, size: 4 },
    { delay: 600, startX: SCREEN_WIDTH * 0.85, startY: SCREEN_HEIGHT * 0.15, size: 3 },
    { delay: 400, startX: SCREEN_WIDTH * 0.7, startY: SCREEN_HEIGHT * 0.3, size: 5 },
    { delay: 800, startX: SCREEN_WIDTH * 0.15, startY: SCREEN_HEIGHT * 0.45, size: 3 },
    { delay: 500, startX: SCREEN_WIDTH * 0.9, startY: SCREEN_HEIGHT * 0.5, size: 4 },
    { delay: 700, startX: SCREEN_WIDTH * 0.05, startY: SCREEN_HEIGHT * 0.65, size: 3 },
    { delay: 350, startX: SCREEN_WIDTH * 0.75, startY: SCREEN_HEIGHT * 0.7, size: 5 },
    { delay: 900, startX: SCREEN_WIDTH * 0.3, startY: SCREEN_HEIGHT * 0.8, size: 3 },
    { delay: 550, startX: SCREEN_WIDTH * 0.55, startY: SCREEN_HEIGHT * 0.12, size: 4 },
    { delay: 450, startX: SCREEN_WIDTH * 0.4, startY: SCREEN_HEIGHT * 0.6, size: 3 },
  ];

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#0f2557', '#1e40af', '#2563eb', '#3b82f6', '#1e40af', '#0f2557']}
        locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Particules */}
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {/* Contenu centré */}
      <View style={styles.content}>
        {/* Glow derrière le logo */}
        <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

        {/* Logo */}
        <Animated.Image
          source={require("../../assets/images/fandrioLogo.png")}
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [
                { scale: Animated.multiply(logoScale, pulseScale) },
                { rotate: rotateInterpolation },
              ],
            },
          ]}
          resizeMode="contain"
        />

        {/* FANDRIO */}
        <Animated.Text style={[styles.title, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
          FANDRIO
        </Animated.Text>

        {/* Sous-titre */}
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }] }]}>
          Réservez votre voyage en quelques clics
        </Animated.Text>

        {/* Icônes décoratives */}
        <Animated.View style={[styles.iconsRow, { opacity: iconsOpacity }]}>
          <View style={styles.iconBubble}>
            <Ionicons name="bus-outline" size={18} color="#93c5fd" />
          </View>
          <View style={styles.iconBubble}>
            <Ionicons name="location-outline" size={18} color="#93c5fd" />
          </View>
          <View style={styles.iconBubble}>
            <Ionicons name="ticket-outline" size={18} color="#93c5fd" />
          </View>
        </Animated.View>

        {/* Barre de progression */}
        <Animated.View style={[styles.progressContainer, { opacity: progressOpacity }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
              <LinearGradient
                colors={['#60a5fa', '#ffffff', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Animated.Text style={[styles.footerText, { opacity: subtitleOpacity }]}>
          Transport régional • Madagascar
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#3b82f6',
    top: '50%',
    marginTop: -200,
  },
  logo: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 10,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#bfdbfe',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  iconsRow: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 16,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginTop: 40,
    width: '80%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  footer: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(191, 219, 254, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
  },
});
