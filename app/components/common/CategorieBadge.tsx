import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export type CategorieValue = 'classique' | 'vip' | 'premium' | string;

interface Props {
  categorie?: CategorieValue | null;
  size?: 'sm' | 'md';
  /** Si true, n'affiche rien pour la catégorie "classique" (badge réservé aux catégories distinctives). */
  hideClassique?: boolean;
}

const CONFIG: Record<string, { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  classique: { label: 'Classique', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'car' },
  vip: { label: 'VIP', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'star' },
  premium: { label: 'Premium', bg: 'bg-purple-100', text: 'text-purple-700', icon: 'diamond' },
};

export const CategorieBadge: React.FC<Props> = ({ categorie, size = 'sm', hideClassique = true }) => {
  const cat = (categorie || 'classique').toString().toLowerCase();

  if (hideClassique && cat === 'classique') return null;

  const conf = CONFIG[cat] || CONFIG.classique;
  const padding = size === 'md' ? 'px-3 py-1' : 'px-2 py-0.5';
  const fontSize = size === 'md' ? 'text-xs' : 'text-[10px]';
  const iconSize = size === 'md' ? 12 : 10;

  return (
    <View className={`flex-row items-center rounded-full ${padding} ${conf.bg}`}>
      <Ionicons name={conf.icon} size={iconSize} color={iconColor(cat)} style={{ marginRight: 3 }} />
      <Text className={`${fontSize} font-bold ${conf.text}`}>{conf.label}</Text>
    </View>
  );
};

function iconColor(cat: string): string {
  if (cat === 'vip') return '#b45309';
  if (cat === 'premium') return '#7c3aed';
  return '#1d4ed8';
}

export default CategorieBadge;
