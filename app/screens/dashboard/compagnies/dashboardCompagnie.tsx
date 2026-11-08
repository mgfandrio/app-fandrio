import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConfirmDialog } from '../../../components/common/ConfirmDialog';
import { DashboardStats } from '../../../components/dashboard/DashboardStats';
import { MenuLateral, SectionMenu } from '../../../components/dashboard/MenuLateral';
import { BarreOngletsAdmin, OngletAdmin } from '../../../components/dashboard/BarreOngletsAdmin';
import { Bouton, BoutonIcone, Carte, FeuilleModale, Texte } from '../../../components/ui';
import { RenderChauffers } from '../../../components/renders/chauffeurs/RenderChauffers';
import { RenderTrajets } from '../../../components/renders/trajets/RenderTrajets';
import { RenderVoitures } from '../../../components/renders/voitures/RenderVoitures';
import { RenderPaiements } from '../../../components/renders/paiements/RenderPaiements';
import { RenderReservations } from '../../../components/renders/reservations/RenderReservations';
import { RenderFactures } from '../../../components/renders/factures/RenderFactures';
import { RenderPortefeuille } from '../../../components/renders/portefeuille/RenderPortefeuille';
import { RenderRemboursements } from '../../../components/renders/remboursements/RenderRemboursements';
import { RenderVoyages } from '../../../components/RenderVoyages';
import { useNotifications } from '../../../hooks/useNotifications';
import authService from '../../../services/auth/authService';
import { logoService } from '../../../services/compagnies/logoService';
import { couleurs } from '../../../theme/ocean';

type NomIcone = keyof typeof Ionicons.glyphMap;

const MENU: SectionMenu[] = [
  {
    title: 'Principal',
    items: [
      { key: 'dashboard', label: 'Tableau de bord', icon: 'home-outline', activeIcon: 'home' },
      { key: 'voyages', label: 'Voyages', icon: 'git-commit-outline', activeIcon: 'git-commit' },
      { key: 'reservations', label: 'Réservations', icon: 'ticket-outline', activeIcon: 'ticket' },
    ],
  },
  {
    title: 'Finances',
    items: [
      { key: 'portefeuille', label: 'Portefeuille', icon: 'wallet-outline', activeIcon: 'wallet' },
      { key: 'factures', label: 'Factures', icon: 'receipt-outline', activeIcon: 'receipt' },
      { key: 'remboursements', label: 'Remboursements', icon: 'refresh-outline', activeIcon: 'refresh' },
      { key: 'paiements', label: 'Paiements', icon: 'card-outline', activeIcon: 'card' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { key: 'chauffeurs', label: 'Chauffeurs', icon: 'people-outline', activeIcon: 'people' },
      { key: 'voitures', label: 'Véhicules', icon: 'bus-outline', activeIcon: 'bus' },
      { key: 'trajets', label: 'Trajets', icon: 'map-outline', activeIcon: 'map' },
    ],
  },
  {
    title: 'Compte',
    items: [{ key: 'settings', label: 'Paramètres', icon: 'options-outline', activeIcon: 'options' }],
  },
];

const TITRES: Record<string, string> = Object.fromEntries(MENU.flatMap((s) => s.items.map((i) => [i.key, i.label])));

const ONGLETS: OngletAdmin[] = [
  { key: 'dashboard', label: 'Accueil', icon: 'home-outline', activeIcon: 'home' },
  { key: 'reservations', label: 'Réservations', icon: 'ticket-outline', activeIcon: 'ticket' },
  { key: 'scanner', label: 'Scanner', icon: 'qr-code-outline', activeIcon: 'qr-code', central: true },
  { key: 'portefeuille', label: 'Portefeuille', icon: 'wallet-outline', activeIcon: 'wallet' },
  { key: 'menu', label: 'Menu', icon: 'menu-outline', activeIcon: 'menu' },
];

function initiales(texte?: string) {
  return (texte || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
}

/** Ligne de réglage ; sans action, elle est grisée avec « Bientôt disponible ». */
function LigneReglage({ icone, titre, sousTitre, onPress, premiere }: { icone: NomIcone; titre: string; sousTitre?: string; onPress?: () => void; premiere?: boolean }) {
  const inactif = !onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactif}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur, opacity: inactif ? 0.55 : 1 }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icone} size={19} color={couleurs.ocean800} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texte graisse="tresGras" taille={14}>{titre}</Texte>
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>{inactif ? 'Bientôt disponible' : sousTitre}</Texte>
      </View>
      {!inactif && <Ionicons name="chevron-forward" size={18} color={couleurs.grisClair} />}
    </Pressable>
  );
}

export default function DashboardCompagnie() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [user, setUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState(tab || 'dashboard');
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [compagnieLogo, setCompagnieLogo] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [feuilleLogo, setFeuilleLogo] = useState(false);
  const { unreadCount: notificationCount } = useNotifications();

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  // Onglet demandé par une notification
  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  // Relu à chaque retour sur l'écran (le profil a pu changer le nom ou la photo)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const userJson = await SecureStore.getItemAsync('fandrioUser');
          if (userJson) {
            const userData = JSON.parse(userJson);
            setUser(userData);
            setCompagnieLogo(userData?.compagnie?.logo || null);
          }
        } catch (e) {
          console.warn('SecureStore read error', e);
        }
      })();
    }, [])
  );

  /** Met à jour l'utilisateur en mémoire et dans le cache local. */
  const majUtilisateur = async (modifier: (u: any) => any) => {
    try {
      const userJson = await SecureStore.getItemAsync('fandrioUser');
      if (!userJson) return;
      const userData = modifier(JSON.parse(userJson));
      await SecureStore.setItemAsync('fandrioUser', JSON.stringify(userData));
      setUser(userData);
    } catch (e) {
      console.warn('SecureStore write error', e);
    }
  };

  const pickAndUploadLogo = async () => {
    setFeuilleLogo(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        message('Autorisation requise', "Autorisez l'accès à vos photos pour choisir un logo.", 'warning');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const image = result.assets[0];
      if (image.fileSize && image.fileSize > 5 * 1024 * 1024) {
        message('Image trop lourde', "L'image ne doit pas dépasser 5 Mo.", 'warning');
        return;
      }
      setLogoUploading(true);
      const response = await logoService.uploadLogo(image.uri);
      if (response.statut) {
        setCompagnieLogo(response.data.logo_url);
        await majUtilisateur((u) => ({ ...u, compagnie: u.compagnie ? { ...u.compagnie, logo: response.data.logo_url } : u.compagnie }));
      } else {
        message('Logo non modifié', response.message || 'Échec de la mise à jour du logo.');
      }
    } catch (error: any) {
      message('Logo non modifié', error?.response?.data?.message || error?.message || "Erreur lors de l'envoi du logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleDeleteLogo = () => {
    setFeuilleLogo(false);
    showDialog({
      title: 'Retirer le logo ?',
      message: 'Les initiales de la compagnie seront affichées à la place.',
      type: 'danger',
      confirmText: 'Retirer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          setLogoUploading(true);
          const response = await logoService.deleteLogo();
          if (response.statut) {
            setCompagnieLogo(null);
            await majUtilisateur((u) => ({ ...u, compagnie: u.compagnie ? { ...u.compagnie, logo: null } : u.compagnie }));
          }
        } catch {
          message('Logo non retiré', 'Erreur lors de la suppression du logo.');
        } finally {
          setLogoUploading(false);
        }
      },
      onCancel: () => {},
    });
  };

  const handleLogout = () => {
    showDialog({
      title: 'Se déconnecter ?',
      message: 'Vous devrez saisir à nouveau vos identifiants.',
      type: 'danger',
      confirmText: 'Se déconnecter',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await authService.deconnexion();
        } catch (e) {
          console.warn('Logout API error', e);
        } finally {
          await SecureStore.deleteItemAsync('fandrioToken');
          await SecureStore.deleteItemAsync('fandrioUser');
          router.replace('/screens/authentification/loginScreen');
        }
      },
      onCancel: () => {},
    });
  };

  const fermerMenu = useCallback(() => setMenuOuvert(false), []);
  const choisirOnglet = (key: string) => {
    setActiveTab(key);
    setMenuOuvert(false);
  };
  const appuiOnglet = (key: string) => {
    if (key === 'scanner') router.push('/screens/scanner/scannerScreen');
    else if (key === 'menu') setMenuOuvert(true);
    else setActiveTab(key);
  };

  const nomAdmin = user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : '';
  const nomCompagnie = user?.compagnie?.nom || 'Ma compagnie';
  // Les sections ouvertes depuis le menu allument l'onglet « Menu »
  const ongletActif = ONGLETS.some((o) => o.key === activeTab) ? activeTab : 'menu';
  const accueil = activeTab === 'dashboard';
  // Voyages et Réservations ont leur propre grand titre (maquette) : pas de barre du haut
  const sansBarre = activeTab === 'voyages' || activeTab === 'reservations';

  const renderSettings = () => (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* Identité de la compagnie */}
      <View style={{ backgroundColor: couleurs.ocean950, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPress={() => setFeuilleLogo(true)} disabled={logoUploading} accessibilityRole="button" accessibilityLabel="Logo de la compagnie">
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {logoUploading ? (
              <ActivityIndicator color={couleurs.ocean800} />
            ) : compagnieLogo ? (
              <Image source={{ uri: compagnieLogo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Texte graisse="tresGras" taille={20} couleur={couleurs.ocean950}>{initiales(nomCompagnie)}</Texte>
            )}
          </View>
          <View style={{ position: 'absolute', right: -6, bottom: -6, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: couleurs.ocean950, backgroundColor: couleurs.ocean500, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera" size={13} color="#FFFFFF" />
          </View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Texte graisse="tresGras" taille={17} couleur="#FFFFFF" numberOfLines={2}>{nomCompagnie}</Texte>
          {!!user?.compagnie?.localisation && (
            <Texte graisse="moyen" taille={12.5} couleur={couleurs.texteSurMarine}>{user.compagnie.localisation}</Texte>
          )}
        </View>
      </View>

      <Texte variante="etiquette" style={{ marginLeft: 4 }}>Compagnie</Texte>
      <Carte padding={0}>
        <LigneReglage premiere icone="business-outline" titre="Informations publiques" sousTitre="Description, contact, adresse" />
        <LigneReglage icone="card-outline" titre="Modes de paiement" sousTitre="MVola, Orange Money, Airtel Money" onPress={() => setActiveTab('paiements')} />
        <LigneReglage icone="map-outline" titre="Provinces desservies" />
      </Carte>

      <Texte variante="etiquette" style={{ marginLeft: 4 }}>Mon compte</Texte>
      <Carte padding={0}>
        <LigneReglage premiere icone="person-outline" titre="Mon profil" sousTitre={nomAdmin || 'Nom, téléphone, mot de passe'} onPress={() => router.push('/screens/profils/monProfil')} />
        <LigneReglage icone="notifications-outline" titre="Notifications" sousTitre="Réservations, paiements, collectes" onPress={() => router.push('/screens/notifications/notificationsScreen')} />
        <LigneReglage icone="help-circle-outline" titre="Aide et contact FANDRIO" />
      </Carte>

      <Bouton titre="Se déconnecter" variante="danger" icone="log-out-outline" onPress={handleLogout} />
      <Texte graisse="moyen" taille={12} couleur={couleurs.grisClair} centre>FANDRIO version 1.0.0</Texte>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <StatusBar barStyle="dark-content" backgroundColor={accueil || sansBarre ? couleurs.fond : couleurs.surface} />
      <DialogComponent />

      {/* Barre du haut : sur le fond pour l'accueil, blanche ailleurs */}
      {!sansBarre && (
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: accueil ? 4 : 12,
            paddingHorizontal: 16,
            backgroundColor: accueil ? couleurs.fond : couleurs.surface,
            borderBottomWidth: accueil ? 0 : 1,
            borderBottomColor: couleurs.ligne,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <BoutonIcone icone="menu" libelle="Ouvrir le menu" onPress={() => setMenuOuvert(true)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {accueil && <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>{nomCompagnie}</Texte>}
            <Texte graisse="tresGras" taille={17} numberOfLines={1}>{TITRES[activeTab] || 'Tableau de bord'}</Texte>
          </View>
          {accueil && (
            <BoutonIcone icone="notifications-outline" libelle="Notifications" compteur={notificationCount} onPress={() => router.push('/screens/notifications/notificationsScreen')} />
          )}
        </View>
      )}

      <View style={{ flex: 1 }}>
        {accueil && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <DashboardStats refreshTrigger={0} onNavigate={setActiveTab} />
          </ScrollView>
        )}
        {activeTab === 'chauffeurs' && <RenderChauffers />}
        {activeTab === 'voitures' && <RenderVoitures />}
        {activeTab === 'trajets' && <RenderTrajets />}
        {activeTab === 'voyages' && <RenderVoyages />}
        {activeTab === 'reservations' && <RenderReservations />}
        {activeTab === 'factures' && <RenderFactures />}
        {activeTab === 'paiements' && <RenderPaiements />}
        {activeTab === 'portefeuille' && <RenderPortefeuille />}
        {activeTab === 'remboursements' && <RenderRemboursements />}
        {activeTab === 'settings' && renderSettings()}
      </View>

      <BarreOngletsAdmin onglets={ONGLETS} actif={ongletActif} onPress={appuiOnglet} />

      <MenuLateral
        visible={menuOuvert}
        onClose={fermerMenu}
        sections={MENU}
        actif={activeTab}
        onSelect={choisirOnglet}
        onDeconnexion={() => {
          setMenuOuvert(false);
          handleLogout();
        }}
        entete={
          <View style={{ gap: 14, marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6 }}>
              <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {user?.photo ? (
                  <Image source={{ uri: user.photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Texte graisse="tresGras" taille={17} couleur="#FFFFFF">{initiales(nomAdmin)}</Texte>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Texte graisse="tresGras" taille={16} couleur="#FFFFFF" numberOfLines={1}>{nomAdmin || 'Administrateur'}</Texte>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#3DD68C' }} />
                  <Texte graisse="moyen" taille={12.5} couleur={couleurs.texteSurMarine}>Admin compagnie</Texte>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <Ionicons name="business-outline" size={18} color={couleurs.ocean300} />
              <Texte graisse="gras" taille={13.5} couleur="#D5E2F0" numberOfLines={1} style={{ flex: 1 }}>{nomCompagnie}</Texte>
            </View>
          </View>
        }
      />

      <FeuilleModale visible={feuilleLogo} onClose={() => setFeuilleLogo(false)} titre="Logo de la compagnie" sousTitre="Affiché aux voyageurs. Image carrée, 5 Mo maximum.">
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 10 }}>
          <Bouton titre={compagnieLogo ? 'Choisir une autre image' : 'Choisir une image'} icone="image-outline" onPress={pickAndUploadLogo} />
          {!!compagnieLogo && <Bouton titre="Retirer le logo" variante="danger" icone="trash-outline" onPress={handleDeleteLogo} />}
        </View>
      </FeuilleModale>
    </View>
  );
}
