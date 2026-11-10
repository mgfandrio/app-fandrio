import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Texte } from '../ui';
import { couleurs } from '../../theme/ocean';

/**
 * Message unique, repris partout où le client voit son billet : le QR code
 * s'affiche et se scanne SANS connexion internet, le jour du départ.
 *
 * - « legende » : une ligne sous un QR code.
 * - « complet » : encart explicatif (étapes + précautions).
 */

export const LEGENDE_QR = "Le jour du départ, montrez ce QR code à l'agent de la compagnie pour l'enregistrement et l'embarquement. Fonctionne sans internet.";

function Etape({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        <Texte graisse="tresGras" taille={12} couleur="#FFFFFF">{n}</Texte>
      </View>
      <Texte graisse="moyen" taille={13.5} couleur={couleurs.encre} style={{ flex: 1, lineHeight: 20 }}>{children}</Texte>
    </View>
  );
}

export function AvisSansInternet({ style }: { style?: ViewStyle }) {
  return (
    <View
      accessible
      accessibilityLabel="Pas besoin d'internet le jour du départ. Votre billet est enregistré sur ce téléphone. À la gare, ouvrez FANDRIO, onglet Billets, et montrez le QR code à l'agent de la compagnie pour l'enregistrement et l'embarquement. Ne vous déconnectez pas de l'application avant votre voyage."
      style={[{ gap: 12, padding: 14, borderRadius: 16, backgroundColor: couleurs.ocean50, borderWidth: 1, borderColor: couleurs.ocean100 }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="cloud-offline-outline" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Texte graisse="tresGras" taille={15} couleur={couleurs.ocean950}>Pas besoin d'internet le jour du départ</Texte>
          <Texte graisse="moyen" taille={12.5} couleur={couleurs.ocean800}>Votre billet est enregistré sur ce téléphone.</Texte>
        </View>
      </View>

      <Etape n={1}>À la gare, ouvrez FANDRIO puis l'onglet <Texte graisse="tresGras" taille={13.5}>Billets</Texte>, même sans connexion (pas de réseau, pas de crédit ou mode avion).</Etape>
      <Etape n={2}>Montrez le <Texte graisse="tresGras" taille={13.5}>QR code</Texte> à l'agent de la compagnie : il le scanne pour votre enregistrement et votre embarquement.</Etape>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingTop: 10, borderTopWidth: 1, borderTopColor: couleurs.ocean100 }}>
        <Ionicons name="warning-outline" size={16} color={couleurs.alerte} style={{ marginTop: 2 }} />
        <Texte graisse="gras" taille={12.5} couleur={couleurs.alerte} style={{ flex: 1, lineHeight: 18 }}>
          Ne vous déconnectez pas de l'application avant votre voyage : la déconnexion efface les billets enregistrés sur le téléphone. Par précaution, vous pouvez aussi faire une capture d'écran du QR code.
        </Texte>
      </View>
    </View>
  );
}
