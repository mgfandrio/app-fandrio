import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';

/**
 * Bandeau global affiché en haut de l'écran lorsque la connexion est perdue.
 * Affiche également un toast vert temporaire au retour en ligne.
 */
export const OfflineBanner: React.FC = () => {
    const { isOnline, justReconnected, refresh } = useNetwork();
    const slideAnim = useRef(new Animated.Value(-80)).current;

    const visible = !isOnline || justReconnected;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: visible ? 0 : -80,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [visible, slideAnim]);

    if (!visible && !isOnline) return null;

    const offline = !isOnline;

    return (
        <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                styles.container,
                { backgroundColor: offline ? '#dc2626' : '#16a34a', transform: [{ translateY: slideAnim }] },
            ]}
        >
            <View style={styles.row}>
                <Ionicons
                    name={offline ? 'cloud-offline-outline' : 'checkmark-circle-outline'}
                    size={20}
                    color="#fff"
                />
                <Text style={styles.text}>
                    {offline ? 'Hors-ligne — vérifiez votre connexion' : 'Connexion rétablie'}
                </Text>
                {offline && (
                    <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
                        <Ionicons name="refresh" size={16} color="#fff" />
                        <Text style={styles.retryText}>Réessayer</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 40,
        paddingBottom: 10,
        paddingHorizontal: 14,
        zIndex: 9999,
        elevation: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    text: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
        flex: 1,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    retryText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default OfflineBanner;
