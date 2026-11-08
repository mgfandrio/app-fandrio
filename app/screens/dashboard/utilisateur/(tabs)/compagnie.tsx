import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Image, RefreshControl, TextInput, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { compagnieService } from '@/app/services/compagnies/compagnieService';
import { Skeleton } from '@/app/components/common/Skeleton';
import { Carte, Puce, Texte } from '@/app/components/ui';
import { couleurs, polices } from '@/app/theme/ocean';

/** Initiales d'un nom de compagnie : « Mahery Trans » -> « MT ». */
function initiales(nom?: string) {
  return (nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
}

/** Onglet « Compagnies » : recherche, filtre par province, liste des compagnies. */
export default function CompagnieScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [compagnies, setCompagnies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [province, setProvince] = useState<string | null>(null);

  useEffect(() => {
    fetchCompagnies();
  }, []);

  const fetchCompagnies = async () => {
    try {
      setLoading(true);
      const res = await compagnieService.listerCompagniesGenerique();
      if (res && 'statut' in res && res.statut !== false) {
        setCompagnies((res as any).data?.compagnies || []);
      }
    } catch (error) {
      console.error('Error fetching compagnies:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompagnies();
    setRefreshing(false);
  };

  // Provinces présentes dans la liste (pour les filtres)
  const provinces = useMemo(
    () => Array.from(new Set(compagnies.map((c) => c.localisation?.nom).filter(Boolean))).sort() as string[],
    [compagnies]
  );

  const q = searchQuery.trim().toLowerCase();
  const filtrees = compagnies.filter((c) => {
    const correspond = !q || c.nom?.toLowerCase().includes(q) || c.localisation?.nom?.toLowerCase().includes(q);
    const dansProvince = !province || c.localisation?.nom === province;
    return correspond && dansProvince;
  });

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.fond} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <Texte variante="titre">Compagnies</Texte>
          <Texte variante="legende" taille={13}>
            {loading ? ' ' : `${compagnies.length} compagnie${compagnies.length > 1 ? 's' : ''} partenaire${compagnies.length > 1 ? 's' : ''}`}
          </Texte>
        </View>

        {/* Recherche */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14, backgroundColor: couleurs.surface, borderWidth: 1, borderColor: couleurs.ligne, borderRadius: 14 }}>
            <Ionicons name="search" size={19} color={couleurs.gris} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Nom de la compagnie ou ville"
              placeholderTextColor="#8A99AD"
              accessibilityLabel="Rechercher une compagnie"
              returnKeyType="search"
              style={{ flex: 1, fontFamily: polices.moyen, fontSize: 14.5, color: couleurs.encre, paddingVertical: 10 }}
            />
            {!!searchQuery && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={10} accessibilityLabel="Effacer la recherche">
                <Ionicons name="close-circle" size={19} color={couleurs.grisClair} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filtre par province */}
        {provinces.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <Puce libelle="Toutes" active={!province} onPress={() => setProvince(null)} />
            {provinces.map((p) => (
              <Puce key={p} libelle={p} active={province === p} onPress={() => setProvince(province === p ? null : p)} />
            ))}
          </ScrollView>
        )}

        {/* Liste */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {loading ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} height={78} borderRadius={16} />)
          ) : filtrees.length > 0 ? (
            filtrees.map((compagnie) => (
              <Carte
                key={compagnie.id}
                onPress={() => router.push({ pathname: '/screens/dashboard/utilisateur/compagnieDetail/[id]', params: { id: compagnie.id } })}
                accessibilityLabel={`${compagnie.nom}${compagnie.localisation?.nom ? `, ${compagnie.localisation.nom}` : ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: couleurs.ocean950, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {compagnie.logo ? (
                    <Image source={{ uri: compagnie.logo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Texte graisse="tresGras" taille={16} couleur="#FFFFFF">{initiales(compagnie.nom)}</Texte>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Texte graisse="tresGras" taille={15.5} numberOfLines={1}>{compagnie.nom}</Texte>
                  {!!compagnie.localisation?.nom && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="location-outline" size={14} color={couleurs.gris} />
                      <Texte variante="legende" taille={12.5} numberOfLines={1}>{compagnie.localisation.nom}</Texte>
                    </View>
                  )}
                  {!!compagnie.description && (
                    <Texte variante="legende" numberOfLines={1}>{compagnie.description}</Texte>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={couleurs.grisClair} />
              </Carte>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
              <Ionicons name="business-outline" size={34} color={couleurs.grisClair} />
              <Texte graisse="tresGras" taille={15}>{q || province ? 'Aucune compagnie trouvée' : 'Aucune compagnie disponible'}</Texte>
              <Texte variante="legende" centre>{q || province ? 'Essayez un autre nom ou une autre province.' : 'Revenez un peu plus tard.'}</Texte>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
