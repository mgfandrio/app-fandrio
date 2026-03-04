import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EdgeInsets } from 'react-native-safe-area-context';

interface DashboardHeaderProps {
    user: any;
    insets: EdgeInsets;
    onMenuPress: () => void;
    onFilterPress: () => void;
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (text: string) => void;
}

export const DashboardHeader = ({
    user,
    insets,
    onMenuPress,
    onFilterPress,
    searchPlaceholder = "Destination, ville ...",
    searchValue,
    onSearchChange
}: DashboardHeaderProps) => {
    return (
        <View>
            {/* Refined Header with Elegant Navy Background */}
            <View
                style={{
                    backgroundColor: '#1e3a8a',
                    borderBottomLeftRadius: 40,
                    borderBottomRightRadius: 40,
                    paddingTop: insets.top + 10,
                    paddingBottom: 56
                }}
                className="px-6 shadow-lg"
            >
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                        {/* Avatar */}
                        <View className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-md">
                            <Text style={{ color: '#1e3a8a' }} className="font-bold text-2xl">
                                {user?.prenom?.[0]?.toUpperCase() || ''}{user?.nom?.[0]?.toUpperCase() || ''}
                            </Text>
                        </View>

                        {/* User Name Display */}
                        <View className="ml-4">
                            <Text className="text-white font-bold text-xl leading-tight">
                                {user?.nom?.toUpperCase() || ''}
                            </Text>
                            <Text className="text-blue-100 text-sm font-medium opacity-80">
                                {user?.prenom || ''}
                            </Text>
                        </View>
                    </View>

                    {/* Icons */}
                    <View className="flex-row items-center">
                        <TouchableOpacity className="relative p-2 bg-white/10 rounded-full mr-4">
                            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
                            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2 border-[#1e3a8a]">
                                <Text className="text-white text-[10px] font-bold">0</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity className="relative p-2 bg-white/10 rounded-full mr-4">
                            <Ionicons name="mail-outline" size={24} color="#ffffff" />
                            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2 border-[#1e3a8a]">
                                <Text className="text-white text-[10px] font-bold">0</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onMenuPress}
                            className="p-2 bg-white/10 rounded-full"
                        >
                            <Ionicons name="menu-outline" size={28} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Fixed Styled Search Bar (Outside ScrollView) */}
            <View className="px-6 -mt-7 z-10">
                <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-md border border-gray-100">
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        placeholder={searchPlaceholder}
                        placeholderTextColor="#9ca3af"
                        className="flex-1 ml-3 text-gray-800 text-base"
                        value={searchValue}
                        onChangeText={onSearchChange}
                    />
                    <TouchableOpacity
                        onPress={onFilterPress}
                        className="ml-2 p-1.5 bg-blue-50 rounded-xl"
                    >
                        <Ionicons name="options-outline" size={22} color="#1e3a8a" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};
