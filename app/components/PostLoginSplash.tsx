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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PostLoginSplashProps {
  userName: string;
  onFinish: () => void;
}

// Petit point lumineux qui monte le long de la route
function RoadDot({ delay, x }: { delay: number; x: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 2000,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, -60],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: '50%',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#93c5fd',
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

export default function PostLoginSplash({ userName, onFinish }: PostLoginSplashProps) {
  // Animations
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.3)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeTranslateY = useRef(new Animated.Value(20)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameTranslateY = useRef(new Animated.Value(15)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const busTranslateX = useRef(new Animated.Value(-60)).current;
  const busOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const stepsOpacity = useRef(new Animated.Value(0)).current;
  const step1 = useRef(new Animated.Value(0)).current;
  const step2 = useRef(new Animated.Value(0)).current;
  const step3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Anneau lumineux
    Animated.parallel([
      Animated.spring(ringScale, { toValue: 1, damping: 10, stiffness: 80, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // 2. Checkmark bounce
    Animated.parallel([
      Animated.timing(checkOpacity, { toValue: 1, duration: 300, delay: 300, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, damping: 8, stiffness: 120, delay: 300, useNativeDriver: true }),
    ]).start();

    // 3. Texte "Bienvenue"
    Animated.parallel([
      Animated.timing(welcomeOpacity, { toValue: 1, duration: 500, delay: 600, useNativeDriver: true }),
      Animated.spring(welcomeTranslateY, { toValue: 0, damping: 14, stiffness: 100, delay: 600, useNativeDriver: true }),
    ]).start();

    // 4. Nom de l'utilisateur
    Animated.parallel([
      Animated.timing(nameOpacity, { toValue: 1, duration: 500, delay: 800, useNativeDriver: true }),
      Animated.spring(nameTranslateY, { toValue: 0, damping: 14, stiffness: 100, delay: 800, useNativeDriver: true }),
    ]).start();

    // 5. Bus animation
    Animated.parallel([
      Animated.timing(busOpacity, { toValue: 1, duration: 300, delay: 1000, useNativeDriver: true }),
      Animated.timing(busTranslateX, {
        toValue: SCREEN_WIDTH + 60,
        duration: 2500,
        delay: 1000,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 6. Étapes de chargement
    Animated.timing(stepsOpacity, { toValue: 1, duration: 400, delay: 1200, useNativeDriver: true }).start();
    Animated.timing(step1, { toValue: 1, duration: 400, delay: 1400, useNativeDriver: true }).start();
    Animated.timing(step2, { toValue: 1, duration: 400, delay: 1800, useNativeDriver: true }).start();
    Animated.timing(step3, { toValue: 1, duration: 400, delay: 2200, useNativeDriver: true }).start();

    // 7. Loader dots
    Animated.timing(loaderOpacity, { toValue: 1, duration: 300, delay: 1100, useNativeDriver: true }).start();
    Animated.loop(
      Animated.timing(dotAnim, { toValue: 3, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // 8. Fondu de sortie → navigation
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 500,
      delay: 3200,
      useNativeDriver: true,
    }).start(() => {
      onFinish();
    });
  }, []);

  // Dots animation helpers
  const getDotOpacity = (index: number) =>
    dotAnim.interpolate({
      inputRange: [index, index + 0.5, index + 1],
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#1e40af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Points lumineux de route */}
      {[0, 1, 2, 3, 4].map((i) => (
        <RoadDot key={i} delay={i * 400} x={SCREEN_WIDTH * 0.15 + i * (SCREEN_WIDTH * 0.17)} />
      ))}

      <View style={styles.content}>
        {/* Anneau lumineux + checkmark */}
        <View style={styles.checkContainer}>
          <Animated.View
            style={[
              styles.ring,
              { opacity: ringOpacity, transform: [{ scale: ringScale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.checkCircle,
              { opacity: checkOpacity, transform: [{ scale: checkScale }] },
            ]}
          >
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              style={styles.checkGradient}
            >
              <Ionicons name="checkmark" size={40} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Bienvenue */}
        <Animated.Text
          style={[
            styles.welcomeText,
            { opacity: welcomeOpacity, transform: [{ translateY: welcomeTranslateY }] },
          ]}
        >
          Connexion réussie !
        </Animated.Text>

        {/* Nom */}
        <Animated.Text
          style={[
            styles.nameText,
            { opacity: nameOpacity, transform: [{ translateY: nameTranslateY }] },
          ]}
        >
          Bienvenue, {userName} 👋
        </Animated.Text>

        {/* Bus qui traverse */}
        <Animated.View
          style={[
            styles.busContainer,
            { opacity: busOpacity, transform: [{ translateX: busTranslateX }] },
          ]}
        >
          <View style={styles.busTrail} />
          <View style={styles.busBubble}>
            <Ionicons name="bus" size={22} color="#3b82f6" />
          </View>
        </Animated.View>

        {/* Route line */}
        <View style={styles.roadLine}>
          <LinearGradient
            colors={['transparent', '#3b82f6', '#60a5fa', '#3b82f6', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 2, width: '100%', borderRadius: 1 }}
          />
        </View>

        {/* Étapes de préparation */}
        <Animated.View style={[styles.stepsContainer, { opacity: stepsOpacity }]}>
          {[
            { icon: 'shield-checkmark-outline' as const, label: 'Session sécurisée', anim: step1 },
            { icon: 'sync-outline' as const, label: 'Synchronisation', anim: step2 },
            { icon: 'rocket-outline' as const, label: 'Préparation du tableau de bord', anim: step3 },
          ].map((step, i) => (
            <Animated.View key={i} style={[styles.stepRow, { opacity: step.anim }]}>
              <View style={styles.stepDot}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              </View>
              <Text style={styles.stepLabel}>{step.label}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Loading dots */}
        <Animated.View style={[styles.dotsContainer, { opacity: loaderOpacity }]}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity: getDotOpacity(i) }]}
            />
          ))}
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: nameOpacity }]}>
        <Text style={styles.footerText}>FANDRIO • Transport régional</Text>
      </Animated.View>
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
  checkContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  checkCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: 'hidden',
  },
  checkGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  nameText: {
    color: '#93c5fd',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
  },
  busContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.6,
  },
  busBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 10,
    elevation: 6,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  busTrail: {
    width: 40,
    height: 2,
    backgroundColor: '#3b82f640',
    borderRadius: 1,
    marginRight: -2,
  },
  roadLine: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.6 + 20,
    left: 30,
    right: 30,
  },
  stepsContainer: {
    alignSelf: 'stretch',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60a5fa',
    marginHorizontal: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
});
