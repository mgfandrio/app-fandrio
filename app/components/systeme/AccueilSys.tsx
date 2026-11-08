import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import commissionService from '../../services/commissions/commissionService';
import compagnieService from '../../services/compagnies/compagnieService';
import provinceService from '../../services/provinces/provinceService';
import utilisateurService from '../../services/utilisateurs/utilisateurService';
import { useNotifications } from '../../hooks/useNotifications';
import { Skeleton } from '../common/Skeleton';
import { BoutonIcone, Carte, Pastille, Texte } from '../ui';
import { couleurs, formatAriary, ombres } from '../../theme/ocean';
import { donnees, etatCollecte, initialesNom, MOIS } from './outils';
import { GraphiqueEvolution } from './GraphiqueEvolution';

type NomIcone = keyof typeof Ionicons.glyphMap;

function Indicateur({ icone, valeur, libelle, detail, ombre }: { icone: NomIcone; valeur: string | number; libelle: string; detail?: React.ReactNode; ombre?: boolean }) {
  return (
    <Carte style={{ width: '48.5%', gap: 10, ...(ombre ? ombres.carte : {}) }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icone} size={20} color={couleurs.ocean800} />
      </View>
      <View>
        <Texte variante="montant" taille={22}>{valeur}</Texte>
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{libelle}{detail}</Texte>
      </View>
    </Carte>
  );
}

function Action({ icone, ton, titre, detail, onPress, premiere }: { icone: NomIcone; ton: 'alerte' | 'danger' | 'info'; titre: string; detail: string; onPress: () => void; premiere?: boolean }) {
  const fond = ton === 'alerte' ? couleurs.alerteFond : ton === 'danger' ? couleurs.dangerFond : couleurs.ocean50;
  const couleur = ton === 'alerte' ? couleurs.alerte : ton === 'danger' ? couleurs.danger : couleurs.ocean800;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icone} size={20} color={couleur} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texte graisse="tresGras" taille={14}>{titre}</Texte>
        <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{detail}</Texte>
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.grisClair} />
    </Pressable>
  );
}

/** Accueil de l'admin système : commissions du mois, indicateurs, actions à traiter, top compagnies. */
export function AccueilSys({ onNavigate }: { onNavigate: (onglet: string) => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const [prenom, setPrenom] = useState('');
  const [chargement, setChargement] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [d, setD] = useState<any>({});

  const charger = useCallback(async () => {
    try {
      const u = JSON.parse((await SecureStore.getItemAsync('fandrioUser')) || '{}');
      setPrenom(u?.prenom || '');
    } catch {}
    const [su, sc, sp, dash, col, cies] = await Promise.all([
      utilisateurService.getStatistiques().catch(() => null),
      compagnieService.getStatistiques().catch(() => null),
      provinceService.getStatistiques().catch(() => null),
      commissionService.getDashboard().catch(() => null),
      commissionService.getCollectes({ per_page: 100 }).catch(() => null),
      commissionService.getCompagnies().catch(() => null),
    ]);
    setD({
      users: donnees(su),
      cies: donnees(sc),
      provinces: donnees(sp),
      dash: donnees(dash),
      collectes: donnees<any>(col)?.collectes || [],
      commissionsCies: donnees<any>(cies)?.compagnies || [],
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      setChargement(true);
      charger().finally(() => setChargement(false));
    }, [charger])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await charger();
    setRefreshing(false);
  };

  const mois = d.dash?.par_periode?.ce_mois || {};
  const evolution: any[] = d.dash?.evolution_mensuelle || [];
  const precedent = evolution.length >= 2 ? Number(evolution[evolution.length - 2]?.commission) || 0 : 0;
  const variation = precedent > 0 ? ((Number(mois.commission) || 0) - precedent) / precedent * 100 : null;
  const collectes: any[] = d.collectes || [];
  const payees = collectes.filter((c) => etatCollecte(c).cle === 'payee').reduce((s, c) => s + Number(c.montant_commission || 0), 0);
  const enAttente = collectes.filter((c) => etatCollecte(c).cle !== 'payee');
  const montantAttente = enAttente.reduce((s, c) => s + Number(c.montant_commission || 0), 0);
  const ciesAttente = new Set(enAttente.map((c) => c.comp_id)).size;
  const suspendues = (d.commissionsCies || []).filter((c: any) => c.suspendu).length;
  const top: any[] = (d.dash?.top_compagnies || []).slice(0, 5);
  const maxTop = Math.max(...top.map((c) => Number(c.billets) || 0), 1);
  const part = payees + montantAttente > 0 ? payees / (payees + montantAttente) : 0;
  const nbActions = (enAttente.length ? 1 : 0) + (suspendues ? 1 : 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: couleurs.fond }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={[couleurs.ocean800]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête marine : commissions du mois */}
      <View style={{ backgroundColor: couleurs.ocean950, paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 72, gap: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            <Texte graisse="moyen" taille={13} couleur={couleurs.texteSurMarine}>Bonjour{prenom ? `, ${prenom}` : ''}</Texte>
            <Texte graisse="tresGras" taille={20} couleur="#FFFFFF">Administration FANDRIO</Texte>
          </View>
          <BoutonIcone icone="notifications-outline" libelle="Notifications" variante="marine" compteur={unreadCount} onPress={() => router.push('/screens/notifications/notificationsScreen')} />
        </View>
        <View style={{ gap: 6 }}>
          <Texte graisse="gras" taille={12} couleur={couleurs.texteSurMarine} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>Commissions · {MOIS[new Date().getMonth()]}</Texte>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Texte variante="montant" taille={34} couleur="#FFFFFF" style={{ letterSpacing: -0.5 }}>{chargement ? '…' : formatAriary(Number(mois.commission) || 0)}</Texte>
            <Texte graisse="gras" taille={15} couleur={couleurs.texteSurMarine}>Ar</Texte>
            {variation !== null && (
              <View style={{ marginLeft: 'auto', height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: 'rgba(46,143,224,0.18)', justifyContent: 'center' }}>
                <Texte graisse="tresGras" taille={11} couleur="#CFE6FB">{variation >= 0 ? '+' : '−'}{Math.abs(variation).toFixed(1).replace('.', ',')} % vs mois dernier</Texte>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
            <View style={{ flex: Math.max(part, 0.001), backgroundColor: couleurs.ocean500 }} />
            <View style={{ flex: Math.max(1 - part, 0.001), backgroundColor: 'rgba(255,255,255,0.18)' }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}><Texte graisse="tresGras" taille={12} couleur="#FFFFFF">{formatAriary(payees)} Ar</Texte> collectés</Texte>
            <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}><Texte graisse="tresGras" taille={12} couleur="#FFFFFF">{formatAriary(montantAttente)} Ar</Texte> en attente</Texte>
          </View>
        </View>
      </View>

      {/* Indicateurs */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: -52, marginHorizontal: 16 }}>
        {chargement ? (
          [1, 2, 3, 4].map((i) => <View key={i} style={{ width: '48.5%' }}><Skeleton height={112} borderRadius={16} /></View>)
        ) : (
          <>
            <Indicateur ombre icone="people-outline" valeur={formatAriary(d.users?.total || 0)} libelle="Clients" detail={d.users?.nouveaux_ce_mois ? <Texte graisse="gras" taille={12} couleur={couleurs.succes}> · +{d.users.nouveaux_ce_mois}</Texte> : undefined} />
            <Indicateur ombre icone="business-outline" valeur={d.cies?.total || 0} libelle={`Compagnies · ${d.cies?.actives || 0} actives`} />
            <Indicateur icone="ticket-outline" valeur={formatAriary(Number(mois.billets) || 0)} libelle="Billets vendus ce mois" />
            <Indicateur icone="map-outline" valeur={d.provinces?.total || 0} libelle="Provinces" />
          </>
        )}
      </View>

      {/* Vue d'ensemble : commissions, clients, compagnies mois par mois */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <GraphiqueEvolution />
      </View>

      {/* À traiter */}
      {!chargement && nbActions > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 22, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Texte graisse="tresGras" taille={16}>À traiter</Texte>
            <Pastille libelle={`${nbActions} action${nbActions > 1 ? 's' : ''}`} tonalite="alerte" point={false} />
          </View>
          <Carte padding={0}>
            {enAttente.length > 0 && (
              <Action premiere icone="time-outline" ton="alerte" titre="Collectes en attente" detail={`${ciesAttente} compagnie${ciesAttente > 1 ? 's' : ''} · ${formatAriary(montantAttente)} Ar`} onPress={() => onNavigate('commissions')} />
            )}
            {suspendues > 0 && (
              <Action premiere={!enAttente.length} icone="ban-outline" ton="danger" titre="Compagnies suspendues" detail={`${suspendues} · commission impayée`} onPress={() => onNavigate('compagnies')} />
            )}
          </Carte>
        </View>
      )}

      {/* Compagnies les plus actives */}
      {top.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 22, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Texte graisse="tresGras" taille={16}>Compagnies les plus actives</Texte>
            <Pressable onPress={() => onNavigate('compagnies')} accessibilityRole="button" hitSlop={8}>
              <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean800}>Tout voir</Texte>
            </Pressable>
          </View>
          <Carte style={{ paddingVertical: 6 }}>
            {top.map((c) => (
              <View key={c.comp_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: couleurs.ocean950, alignItems: 'center', justifyContent: 'center' }}>
                  <Texte graisse="tresGras" taille={12} couleur="#FFFFFF">{initialesNom(c.comp_nom)}</Texte>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texte graisse="tresGras" taille={13.5} numberOfLines={1}>{c.comp_nom}</Texte>
                  <View style={{ height: 5, borderRadius: 999, backgroundColor: couleurs.ocean50, marginTop: 6, overflow: 'hidden' }}>
                    <View style={{ width: `${((Number(c.billets) || 0) / maxTop) * 100}%`, height: '100%', borderRadius: 999, backgroundColor: couleurs.ocean800 }} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
                  <Texte variante="montant" taille={13}>{c.billets}</Texte>
                  <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>billets</Texte>
                </View>
              </View>
            ))}
          </Carte>
        </View>
      )}
    </ScrollView>
  );
}

export default AccueilSys;
