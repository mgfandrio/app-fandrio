import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EdgeInsets } from 'react-native-safe-area-context';

interface DashboardHeaderProps {
    user: any;
    insets: EdgeInsets;
    onMenuPress: () => void;
    onFilterPress: () => void;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (text: string) => void;
    onSearchPress?: () => void;
    onResetPress?: () => void;
    searchIcon?: string;
}

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
};

export const DashboardHeader = ({
    user,
    insets,
    onMenuPress,
    onFilterPress,
    searchPlaceholder = "Où voulez-vous aller ?",
    searchValue,
    onSearchChange,
    onSearchPress,
    onResetPress,
    searchIcon = "search"
}: DashboardHeaderProps) => {
    const greeting = getGreeting();
    const initials = `${(user?.prenom?.[0] || '').toUpperCase()}${(user?.nom?.[0] || '').toUpperCase()}`;

    return (
        <View>
            {/* Gradient Header */}
            <LinearGradient
                colors={['#0f172a', '#1e3a8a', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                    paddingTop: insets.top + 12,
                    paddingBottom: 52,
                }}
            >
                <View className="px-5">
                    <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center flex-1">
                            {/* Avatar with gradient ring */}
                            <View className="rounded-full p-0.5 mr-3" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                                <View className="w-13 h-13 rounded-full overflow-hidden" style={{ width: 50, height: 50 }}>
                                    <LinearGradient
                                        colors={['#3b82f6', '#60a5fa']}
                                        className="w-full h-full items-center justify-center"
                                    >
                                        <Text className="text-white font-bold text-lg">{initials}</Text>
                                    </LinearGradient>
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-blue-200 text-sm">{greeting} 👋</Text>
                                <Text className="text-white font-bold text-lg" numberOfLines={1}>
                                    {user?.prenom || ''} {user?.nom?.toUpperCase() || ''}
                                </Text>
                            </View>
                        </View>

                        {/* Action icons */}
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                className="relative p-2.5 rounded-xl mr-2"
                                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                            >
                                <Ionicons name="notifications-outline" size={22} color="#fff" />
                                <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-4.5 h-4.5 items-center justify-center" style={{ width: 18, height: 18, borderWidth: 2, borderColor: '#1e3a8a' }}>
                                    <Text className="text-white text-[9px] font-bold">0</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={onMenuPress}
                                className="p-2.5 rounded-xl"
                                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                            >
                                <Ionicons name="menu" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Floating Search Bar */}
            <View className="px-5 -mt-7 z-10">
                <Pressable
                    onPress={onSearchPress || onFilterPress}
                    className="flex-row items-center bg-white rounded-2xl px-4"
                    style={{ elevation: 6, shadowColor: '#1e3a8a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }}
                >
                    <View className="bg-blue-50 rounded-xl p-2 mr-3">
                        <Ionicons name={searchIcon as any} size={20} color="#2563eb" />
                    </View>
                    {onSearchPress ? (
                        <View className="flex-1 py-4">
                            <Text className={searchValue ? "text-slate-800 text-base" : "text-slate-400 text-base"}>
                                {searchValue || searchPlaceholder}
                            </Text>
                        </View>
                    ) : (
                        <TextInput
                            placeholder={searchPlaceholder}
                            placeholderTextColor="#94a3b8"
                            className="flex-1 text-slate-800 text-base py-4"
                            value={searchValue}
                            onChangeText={onSearchChange}
                        />
                    )}

                    {onResetPress && searchValue && (
                        <TouchableOpacity onPress={onResetPress} className="p-1.5">
                            <Ionicons name="refresh-outline" size={18} color="#3b82f6" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={onFilterPress}
                        className="ml-2 rounded-xl overflow-hidden"
                    >
                        <LinearGradient colors={['#1e40af', '#3b82f6']} className="p-2.5">
                            <Ionicons name="options" size={18} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </Pressable>
            </View>
        </View>
    );
};
