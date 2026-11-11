import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View, ScrollView, Image, RefreshControl, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { accueilService } from '@/app/services/accueil/accueilService';
import { Skeleton } from '@/app/components/common/Skeleton';
import RechercheFilterModal from '@/app/components/modals/recherche/RechercheFilterModal';
import DestinationSearchModal from '@/app/components/modals/recherche/DestinationSearchModal';
import { useNotifications } from '@/app/hooks/useNotifications';
import { useUser } from '@/app/hooks/useUser';
import { Bouton, BoutonIcone, Carte, Pastille, Texte } from '@/app/components/ui';
import { couleurs, formatAriary } from '@/app/theme/ocean';
import { ChoixDepart, heureCourte, iconeCreneau } from '@/app/components/voyages/ChoixDepart';
import type { Depart } from '@/app/components/voyages/ChoixDepart';

/** Initiales d'un nom de compagnie : « Mahery Trans » -> « MT ». */
function initiales(nom?: string) {
  return (nom || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join('');
}

/** Nom d'une province, qu'elle soit renvoyée en objet ou en texte. */
function nomProvince(p: any, defaut: string) {
  return (typeof p === 'object' ? p?.nom : p) || defaut;
}

/** Pastille de places restantes. */
function PastillePlaces({ places, complet }: { places?: number; complet?: boolean }) {
  if (complet || places === 0) return <Pastille libelle="Complet" tonalite="neutre" />;
  if (places === undefined || places === null) return null;
  return <Pastille libelle={`${places} place${places > 1 ? 's' : ''}`} tonalite={places <= 3 ? 'alerte' : 'info'} />;
}

export default function AccueilScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [compagnies, setCompagnies] = useState<any[]>([]);
  const [voyages, setVoyages] = useState<any[]>([]);
  const [loadingCompagnies, setLoadingCompagnies] = useState(true);
  const [loadingVoyages, setLoadingVoyages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Fil des voyages paginé (défilement infini)
  const [page, setPage] = useState(1);
  const [aSuivre, setASuivre] = useState(false);
  const [chargementSuite, setChargementSuite] = useState(false);
  const dernierChargement = useRef(0);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [provinceDetectee, setProvinceDetectee] = useState<string | null>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { unreadCount } = useNotifications();

  // L'onglet « Recherche » ouvre la recherche détaillée sur cet écran
  useEffect(() => {
    if (params.openSearch) {
      setShowSearchModal(true);
    }
  }, [params.openSearch]);

  const fetchData = async (silencieux = false) => {
    try {
      if (!silencieux) {
        setLoadingCompagnies(true);
        setLoadingVoyages(true);
      }

      // Récupérer la position GPS si pas encore fait
      if (!locationRef.current) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low, // Rapide, suffisant pour 7 provinces
            });
            locationRef.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          }
        } catch (e) {
          console.warn('GPS indisponible:', e);
        }
      }

      // Appel unifié /api/accueil avec géolocalisation
      const resp = await accueilService.getDonneesAccueil(locationRef.current?.lat, locationRef.current?.lng);
      if (resp && resp.statut && resp.data) {
        setCompagnies(resp.data.compagnies || []);
        setVoyages(resp.data.voyages || []);
        setProvinceDetectee(resp.data.province_detectee?.nom || null);
        setPage(1);
        setASuivre(!!resp.data.pagination?.a_suivre);
        dernierChargement.current = Date.now();
      }
    } catch (e) {
      console.error('Fetch data error:', e);
    } finally {
      setLoadingCompagnies(false);
      setLoadingVoyages(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Retour sur l'onglet : actualiser le fil s'il date de plus d'une minute
  useFocusEffect(
    useCallback(() => {
      if (!isSearchMode && dernierChargement.current && Date.now() - dernierChargement.current > 60_000) {
        fetchData(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSearchMode])
  );

  /** Page suivante du fil, quand on approche du bas. */
  const chargerSuite = async () => {
    if (isSearchMode || !aSuivre || chargementSuite || loadingVoyages) return;
    setChargementSuite(true);
    try {
      const resp: any = await accueilService.getDonneesAccueil(locationRef.current?.lat, locationRef.current?.lng, page + 1);
      if (resp?.statut && resp.data) {
        setVoyages((prev) => {
          const deja = new Set(prev.map((v) => v.voyage_id));
          return [...prev, ...(resp.data.voyages || []).filter((v: any) => !deja.has(v.voyage_id))];
        });
        setPage((p) => p + 1);
        setASuivre(!!resp.data.pagination?.a_suivre);
      }
    } finally {
      setChargementSuite(false);
    }
  };

  const surDefilement = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 500) chargerSuite();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setIsSearchMode(false);
    await fetchData();
    setRefreshing(false);
  };

  // Carte à plusieurs départs le même jour : le client choisit d'abord son heure
  const [carteChoix, setCarteChoix] = useState<any>(null);

  /** La carte du fil + le départ choisi = le voyage à réserver. */
  const avecDepart = (carte: any, d?: Depart) => {
    const { departs, ...voyage } = carte;
    return d ? { ...voyage, ...d, voiture: d.voiture ?? voyage.voiture } : voyage;
  };

  const ouvrirCarte = (carte: any) => {
    const departs: Depart[] = carte.departs || [];
    if (departs.length > 1) setCarteChoix(carte);
    else reserver(avecDepart(carte, departs[0]));
  };

  const reserver = (voyage: any) =>
    router.push({
      pathname: '/screens/dashboard/utilisateur/reservations/reserver',
      params: { voyageData: JSON.stringify(voyage) },
    });

  const ouvrirCompagnie = (id: any) =>
    router.push({
      pathname: '/screens/dashboard/utilisateur/compagnieDetail/[id]',
      params: { id },
    });

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <StatusBar barStyle="light-content" backgroundColor={couleurs.ocean950} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        onScroll={surDefilement}
        scrollEventThrottle={250}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={couleurs.ocean800}
            colors={[couleurs.ocean800]}
            progressViewOffset={insets.top}
          />
        }
      >
        {/* En-tête marine */}
        <View
          style={{
            backgroundColor: couleurs.ocean950,
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 92,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Texte graisse="moyen" taille={13} couleur={couleurs.texteSurMarine} numberOfLines={1}>
              {user?.prenom ? `Salama, ${user.prenom}` : 'Salama'}
            </Texte>
            <Texte variante="titre" taille={22} couleur="#FFFFFF">Où allez-vous ?</Texte>
          </View>
          <BoutonIcone
            icone="notifications-outline"
            libelle="Notifications"
            variante="marine"
            compteur={unreadCount}
            onPress={() => router.push('/screens/notifications/notificationsScreen')}
          />
        </View>

        {/* Carte de recherche (chevauche l'en-tête) */}
        <Carte enRelief padding={0} style={{ marginHorizontal: 16, marginTop: -76 }}>
          <Pressable
            onPress={() => setShowDestinationModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Choisir le départ et l'arrivée"
            style={{ paddingHorizontal: 16, paddingTop: 6 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: couleurs.separateur }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: couleurs.ocean800 }} />
              <View style={{ flex: 1 }}>
                <Texte variante="legende" taille={11.5}>Départ</Texte>
                <Texte graisse="tresGras" taille={16} couleur={provinceDetectee ? couleurs.encre : '#8A99AD'} numberOfLines={1}>
                  {provinceDetectee || "D'où partez-vous ?"}
                </Texte>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: couleurs.ocean800 }} />
              <View style={{ flex: 1 }}>
                <Texte variante="legende" taille={11.5}>Arrivée</Texte>
                <Texte graisse="tresGras" taille={16} couleur="#8A99AD">Choisir une destination</Texte>
              </View>
            </View>
          </Pressable>

          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            <Pressable
              onPress={() => setShowSearchModal(true)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: couleurs.fond }}
            >
              <Ionicons name="options-outline" size={18} color={couleurs.ocean800} />
              <Texte graisse="gras" taille={13.5} style={{ flex: 1 }}>Dates et filtres</Texte>
              <Ionicons name="chevron-forward" size={16} color={couleurs.grisClair} />
            </Pressable>
            <Bouton titre="Rechercher" icone="search" onPress={() => setShowDestinationModal(true)} />
          </View>
        </Carte>

        {/* Bandeau des résultats de recherche */}
        {isSearchMode && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Carte padding={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: couleurs.ocean50, borderColor: couleurs.ocean100 }}>
              <Ionicons name="search" size={20} color={couleurs.ocean800} />
              <View style={{ flex: 1 }}>
                <Texte graisse="tresGras" taille={14} couleur={couleurs.ocean950}>Résultats de recherche</Texte>
                <Texte variante="legende">{voyages.length} voyage{voyages.length !== 1 ? 's' : ''} trouvé{voyages.length !== 1 ? 's' : ''}</Texte>
              </View>
              <Bouton titre="Modifier" variante="secondaire" compact onPress={() => setShowSearchModal(true)} style={{ minHeight: 40, paddingHorizontal: 12 }} />
              <BoutonIcone
                icone="close"
                libelle="Effacer la recherche"
                onPress={() => {
                  setIsSearchMode(false);
                  fetchData();
                }}
              />
            </Carte>
          </View>
        )}

        {/* Compagnies */}
        {!isSearchMode && (
          <View style={{ marginTop: 22, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 18 }}>
              <Texte variante="sousTitre" taille={16}>Compagnies</Texte>
              <Pressable onPress={() => router.push('/screens/dashboard/utilisateur/(tabs)/compagnie')} hitSlop={10} accessibilityRole="link">
                <Texte graisse="gras" taille={13} couleur={couleurs.ocean800}>Voir tout</Texte>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {loadingCompagnies ? (
                [1, 2, 3, 4].map((i) => (
                  <View key={i} style={{ width: 78, alignItems: 'center', gap: 6 }}>
                    <Skeleton width={58} height={58} borderRadius={18} />
                    <Skeleton width={56} height={10} />
                  </View>
                ))
              ) : compagnies.length > 0 ? (
                compagnies.map((compagnie) => (
                  <Pressable
                    key={compagnie.id}
                    onPress={() => ouvrirCompagnie(compagnie.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Compagnie ${compagnie.nom}`}
                    style={{ width: 78, alignItems: 'center', gap: 6 }}
                  >
                    <View
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 18,
                        backgroundColor: couleurs.surface,
                        borderWidth: 1,
                        borderColor: couleurs.ligne,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {compagnie.logo ? (
                        <Image source={{ uri: compagnie.logo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Texte graisse="tresGras" taille={16} couleur={couleurs.ocean950}>{initiales(compagnie.nom)}</Texte>
                      )}
                    </View>
                    <Texte graisse="gras" taille={11.5} centre numberOfLines={1} style={{ maxWidth: 78 }}>
                      {compagnie.nom}
                    </Texte>
                  </Pressable>
                ))
              ) : (
                <Texte variante="legende" style={{ paddingVertical: 12 }}>Aucune compagnie disponible pour le moment.</Texte>
              )}
            </ScrollView>
          </View>
        )}

        {/* Voyages */}
        <View style={{ paddingHorizontal: 16, marginTop: 22, gap: 10 }}>
          <View style={{ paddingHorizontal: 2 }}>
            <Texte variante="sousTitre" taille={16}>
              {isSearchMode ? 'Voyages trouvés' : provinceDetectee ? 'Départs près de chez vous' : 'Prochains départs'}
            </Texte>
            {!isSearchMode && !!provinceDetectee && (
              <Texte variante="legende">Depuis {provinceDetectee} en priorité</Texte>
            )}
          </View>

          {loadingVoyages ? (
            [1, 2, 3].map((i) => (
              <Carte key={i} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Skeleton width={34} height={34} borderRadius={10} />
                  <Skeleton width="50%" height={14} />
                </View>
                <Skeleton width="85%" height={18} />
                <Skeleton width="40%" height={12} />
              </Carte>
            ))
          ) : voyages.length > 0 ? (
            voyages.map((voyage) => {
              const categorie = String(voyage.categorie || voyage.trajet?.categorie || '').toLowerCase();
              const departs: Depart[] = voyage.departs || [];
              const plusieurs = departs.length > 1;
              const placesTotal = plusieurs ? departs.reduce((t, d) => t + (Number(d.places_disponibles) || 0), 0) : voyage.places_disponibles;
              const complet = plusieurs ? placesTotal === 0 : voyage.est_complet || voyage.places_disponibles === 0;
              const depart = nomProvince(voyage.trajet?.province_depart, 'Départ');
              const arrivee = nomProvince(voyage.trajet?.province_arrivee, 'Arrivée');
              return (
                <Carte
                  key={voyage.voyage_id}
                  onPress={complet ? undefined : () => (isSearchMode ? reserver(voyage) : ouvrirCarte(voyage))}
                  accessibilityLabel={
                    plusieurs
                      ? `${voyage.compagnie?.nom || 'Compagnie'}, ${depart} vers ${arrivee}, le ${voyage.date || ''}, ${departs.length} départs : ${departs.map((d) => heureCourte(d.heure_depart)).join(', ')}. Touchez pour choisir votre heure.`
                      : `${voyage.compagnie?.nom || 'Compagnie'}, ${depart} vers ${arrivee}, ${voyage.date || ''} à ${voyage.heure_depart || ''}`
                  }
                  style={{ gap: 10, opacity: complet ? 0.6 : 1 }}
                >
                  {/* Compagnie + places */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: couleurs.ocean950, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {voyage.compagnie?.logo ? (
                        <Image source={{ uri: voyage.compagnie.logo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Texte graisse="tresGras" taille={12} couleur="#FFFFFF">{initiales(voyage.compagnie?.nom)}</Texte>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Texte graisse="tresGras" taille={14} numberOfLines={1}>{voyage.compagnie?.nom || 'Compagnie'}</Texte>
                      <Texte variante="legende" numberOfLines={1}>
                        {plusieurs ? `${departs.length} départs ce jour` : voyage.type === 'nuit' ? 'Nuit' : 'Jour'}
                        {voyage.trajet?.distance_km ? ` · ${voyage.trajet.distance_km} km` : ''}
                        {voyage.trajet?.duree ? ` · ${voyage.trajet.duree}` : ''}
                      </Texte>
                    </View>
                    {(categorie === 'vip' || categorie === 'premium') && (
                      <Pastille libelle={categorie === 'vip' ? 'VIP' : 'Premium'} tonalite="marine" point={false} />
                    )}
                    <PastillePlaces places={placesTotal ?? voyage.places_disponibles_restantes} complet={complet} />
                  </View>

                  {/* Trajet */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Texte graisse="tresGras" taille={16} numberOfLines={1}>{depart}</Texte>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={couleurs.grisClair} />
                    <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
                      <Texte graisse="tresGras" taille={16} numberOfLines={1}>{arrivee}</Texte>
                    </View>
                  </View>

                  {/* Plusieurs heures de départ : bien visibles */}
                  {plusieurs && (
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {departs.map((d) => (
                          <View
                            key={d.voyage_id}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 999, backgroundColor: couleurs.ocean50, opacity: d.est_complet ? 0.45 : 1 }}
                          >
                            <Ionicons name={iconeCreneau(d.heure_depart)} size={14} color={couleurs.ocean800} />
                            <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean950} style={{ fontVariant: ['tabular-nums'] }}>{heureCourte(d.heure_depart)}</Texte>
                          </View>
                        ))}
                      </View>
                      <Texte graisse="gras" taille={12} couleur={couleurs.ocean800}>Touchez pour choisir votre heure de départ</Texte>
                    </View>
                  )}

                  {/* Date + prix */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="calendar-outline" size={15} color={couleurs.gris} />
                      <Texte graisse="gras" taille={13} couleur={couleurs.encreDouce}>
                        {plusieurs ? `${voyage.date || '—'} · ${departs.length} horaires` : `${voyage.date || '—'} · ${voyage.heure_depart || '—'}`}
                      </Texte>
                    </View>
                    <Texte variante="montant" couleur={couleurs.ocean800}>
                      {typeof voyage.trajet?.tarif === 'number' ? formatAriary(voyage.trajet.tarif) : voyage.trajet?.tarif ?? '—'}
                      <Texte graisse="gras" taille={12} couleur={couleurs.gris}> Ar</Texte>
                    </Texte>
                  </View>
                </Carte>
              );
            })
          ) : (
            <Carte style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="bus-outline" size={30} color={couleurs.ocean800} />
              </View>
              <Texte graisse="tresGras" taille={15} centre>
                {isSearchMode ? 'Aucun voyage trouvé' : 'Aucun départ pour le moment'}
              </Texte>
              <Texte variante="legende" centre style={{ maxWidth: 260 }}>
                {isSearchMode ? 'Essayez une autre date ou une autre destination.' : 'Tirez vers le bas pour actualiser.'}
              </Texte>
              {isSearchMode && (
                <Bouton titre="Modifier la recherche" variante="secondaire" compact onPress={() => setShowSearchModal(true)} style={{ marginTop: 6 }} />
              )}
            </Carte>
          )}

          {/* Suite du fil */}
          {!isSearchMode && !loadingVoyages && voyages.length > 0 && (
            chargementSuite ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator color={couleurs.ocean800} />
              </View>
            ) : !aSuivre ? (
              <Texte variante="legende" centre style={{ paddingVertical: 12 }}>Vous avez vu tous les départs disponibles.</Texte>
            ) : null
          )}
        </View>
      </ScrollView>

      {/* Choix de l'heure de départ (plusieurs départs le même jour) */}
      <ChoixDepart
        visible={!!carteChoix}
        onClose={() => setCarteChoix(null)}
        trajet={carteChoix ? `${nomProvince(carteChoix.trajet?.province_depart, 'Départ')} → ${nomProvince(carteChoix.trajet?.province_arrivee, 'Arrivée')}` : ''}
        sousTitre={carteChoix ? [carteChoix.date, carteChoix.compagnie?.nom].filter(Boolean).join(' · ') : ''}
        departs={carteChoix?.departs || []}
        onChoisir={(d) => {
          const carte = carteChoix;
          setCarteChoix(null);
          reserver(avecDepart(carte, d));
        }}
      />

      {/* Recherche rapide (départ / arrivée) */}
      <DestinationSearchModal
        visible={showDestinationModal}
        onClose={() => setShowDestinationModal(false)}
        onResults={(results) => {
          setVoyages(results);
          setIsSearchMode(true);
        }}
      />

      {/* Recherche détaillée (dates, filtres) */}
      <RechercheFilterModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onApply={(results) => {
          setVoyages(results);
          setIsSearchMode(true);
        }}
        setLoading={(loading) => setLoadingVoyages(loading)}
      />
    </View>
  );
}
