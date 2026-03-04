import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SideMenuItem {
    label: string;
    icon: string;
}

interface SideMenuProps {
    visible: boolean;
    onClose: () => void;
    items: SideMenuItem[];
}

export const SideMenu = ({ visible, onClose, items }: SideMenuProps) => {
    const menuScale = useRef(new Animated.Value(0.8)).current;
    const menuOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(menuScale, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(menuOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(menuScale, {
                    toValue: 0.8,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(menuOpacity, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, alignItems: 'center', justifyContent: 'center' }}
        >
            <Pressable
                onPress={onClose}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
            />
            <Animated.View
                style={{
                    transform: [{ scale: menuScale }],
                    opacity: menuOpacity,
                    backgroundColor: '#ffffff',
                    width: width * 0.8,
                    borderRadius: 30,
                    padding: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.2,
                    shadowRadius: 20,
                    elevation: 20
                }}
            >
                <View className="flex-row justify-end mb-4">
                    <TouchableOpacity onPress={onClose} className="p-1">
                        <Ionicons name="close-circle-outline" size={32} color="#1e3a8a" />
                    </TouchableOpacity>
                </View>

                <View>
                    {items.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            className="flex-row items-center p-4 mb-3 rounded-2xl bg-blue-50/50 border border-blue-50"
                        >
                            <View style={{ backgroundColor: '#1e3a8a' }} className="p-2.5 rounded-xl mr-4 shadow-sm">
                                <Ionicons name={item.icon as any} size={22} color="#ffffff" />
                            </View>
                            <Text style={{ color: '#1e3a8a' }} className="text-lg font-bold">{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>
        </View>
    );
};
