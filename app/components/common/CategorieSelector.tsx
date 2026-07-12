import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Categorie } from '../../hooks/useCompagnieModes';

interface Props {
  value: Categorie;
  onChange: (cat: Categorie) => void;
  modeVip: boolean;
  modePremium: boolean;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

interface OptionConfig {
  value: Categorie;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeBg: string;
  activeText: string;
  borderActive: string;
  enabled: boolean;
}

export const CategorieSelector: React.FC<Props> = ({
  value,
  onChange,
  modeVip,
  modePremium,
  disabled,
  label = 'Catégorie',
  helperText,
}) => {
  const options: OptionConfig[] = [
    {
      value: 'classique',
      label: 'Classique',
      icon: 'car',
      activeBg: 'bg-blue-100',
      activeText: 'text-blue-700',
      borderActive: 'border-blue-500',
      enabled: true,
    },
    {
      value: 'vip',
      label: 'VIP',
      icon: 'star',
      activeBg: 'bg-amber-100',
      activeText: 'text-amber-700',
      borderActive: 'border-amber-500',
      enabled: modeVip,
    },
    {
      value: 'premium',
      label: 'Premium',
      icon: 'diamond',
      activeBg: 'bg-purple-100',
      activeText: 'text-purple-700',
      borderActive: 'border-purple-500',
      enabled: modePremium,
    },
  ];

  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-semibold mb-2">{label}</Text>
      <View className="flex-row gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value;
          const isDisabled = disabled || !opt.enabled;
          const baseClasses = isActive
            ? `${opt.activeBg} ${opt.borderActive}`
            : 'bg-gray-50 border-gray-300';
          const opacity = isDisabled && !isActive ? 'opacity-40' : '';
          return (
            <TouchableOpacity
              key={opt.value}
              className={`flex-1 flex-row items-center justify-center border rounded-xl py-3 ${baseClasses} ${opacity}`}
              onPress={() => !isDisabled && onChange(opt.value)}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <Ionicons
                name={opt.icon}
                size={18}
                color={isActive ? undefined : '#6b7280'}
                style={{ marginRight: 6 }}
              />
              <Text
                className={`text-sm font-semibold ${isActive ? opt.activeText : 'text-gray-600'}`}
              >
                {opt.label}
              </Text>
              {!opt.enabled && (
                <Ionicons name="lock-closed" size={12} color="#9ca3af" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {helperText ? (
        <Text className="text-gray-500 text-xs mt-2">{helperText}</Text>
      ) : null}
      {(!modeVip || !modePremium) && (
        <Text className="text-gray-400 text-xs mt-1">
          Les catégories verrouillées doivent être activées par le super-admin.
        </Text>
      )}
    </View>
  );
};

export default CategorieSelector;
