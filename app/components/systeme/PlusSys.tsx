import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import provinceService from '../../services/provinces/provinceService';
import { Bouton, Carte, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';
import { donnees, initialesNom } from './outils';

type NomIcone = keyof typeof Ionicons.glyphMap;

function Ligne({ icone, titre, detail, onPress, premiere }: { icone: NomIcone; titre: string; detail: string; onPress: () => void; premiere?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icone} size={19} color={couleurs.ocean800} />
      </View>
      <View style={{ flex: 1 }}>
        <Texte graisse="tresGras" taille={14}>{titre}</Texte>
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{detail}</Texte>
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.grisClair} />
    </Pressable>
  );
}

/** Onglet « Plus » de l'admin système : provinces, collectes, profil, déconnexion. */
export function PlusSys({ onOuvrir, onDeconnexion }: { onOuvrir: (section: 'provinces' | 'commissions') => void; onDeconnexion: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [nbProvinces, setNbProvinces] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setUser(JSON.parse((await SecureStore.getItemAsync('fandrioUser')) || 'null'));
        } catch {}
        const s: any = donnees(await provinceService.getStatistiques().catch(() => null));
        setNbProvinces(s?.total ?? null);
      })();
    }, [])
  );

  const nom = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : '';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: couleurs.fond }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 18, paddingBottom: 24, gap: 12 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 2, paddingBottom: 6 }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: couleurs.ocean950, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {user?.photo ? <Image source={{ uri: user.photo }} style={{ width: '100%', height: '100%' }} /> : <Texte graisse="tresGras" taille={20} couleur="#FFFFFF">{initialesNom(nom || 'A')}</Texte>}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Texte graisse="tresGras" taille={18} numberOfLines={1}>{nom || 'Administrateur'}</Texte>
          <View style={{ alignSelf: 'flex-start', height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: couleurs.ocean950, justifyContent: 'center' }}>
            <Texte graisse="gras" taille={11} couleur="#FFFFFF">Admin système</Texte>
          </View>
        </View>
      </View>

      <Texte variante="etiquette" style={{ marginLeft: 4 }}>Plateforme</Texte>
      <Carte padding={0}>
        <Ligne premiere icone="map-outline" titre="Provinces" detail={nbProvinces != null ? `${nbProvinces} province${nbProvinces > 1 ? 's' : ''}` : 'Trajets et recherche'} onPress={() => onOuvrir('provinces')} />
        <Ligne icone="calendar-outline" titre="Collectes de commission" detail="Échéances, retards, confirmations" onPress={() => onOuvrir('commissions')} />
      </Carte>

      <Texte variante="etiquette" style={{ marginLeft: 4 }}>Mon compte</Texte>
      <Carte padding={0}>
        <Ligne premiere icone="person-outline" titre="Mon profil" detail="Informations, mot de passe" onPress={() => router.push('/screens/profils/monProfil')} />
        <Ligne icone="notifications-outline" titre="Notifications" detail="Collectes en retard, nouvelles compagnies" onPress={() => router.push('/screens/notifications/notificationsScreen')} />
      </Carte>

      <Bouton titre="Se déconnecter" variante="danger" icone="log-out-outline" onPress={onDeconnexion} />
      <Texte graisse="moyen" taille={12} couleur={couleurs.grisClair} centre>FANDRIO version 1.0.0</Texte>
    </ScrollView>
  );
}

export default PlusSys;
