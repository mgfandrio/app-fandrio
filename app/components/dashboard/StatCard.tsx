import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'bg-blue-100' | 'bg-green-100' | 'bg-yellow-100' | 'bg-red-100' | 'bg-gray-100';
  textColor: string;
  iconColor: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  textColor,
  iconColor,
}) => {
  return (
    <View className={`${color} rounded-xl p-4 flex-1 items-center justify-center mr-2 mb-2`}>
      <Ionicons name={icon as any} size={24} color={iconColor} />
      <Text className="text-gray-700 text-xs font-medium mt-2 text-center">{title}</Text>
      <Text className={`${textColor} text-2xl font-bold mt-1`}>{value}</Text>
    </View>
  );
};
