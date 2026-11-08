import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Skeleton } from '@/app/components/common/Skeleton';
import { reservationService } from '@/app/services/reservations/reservationService';
import { Bouton, BoutonIcone, Carte, FeuilleModale, Pastille, Segmente, Texte } from '@/app/components/ui';
import { couleurs, formatAriary } from '@/app/theme/ocean';
import { dateDepuisJJMMAAAA, statutBillet, vignetteDate } from '@/app/utils/statutBillet';

type Onglet = 'avenir' | 'passe' | 'annule';

const RACCOURCIS = [
  { libelle: 'Factures', icone: 'receipt-outline' as const, route: '/screens/dashboard/utilisateur/reservations/clientFactures' },
  { libelle: 'Remboursements', icone: 'refresh-outline' as const, route: '/screens/dashboard/utilisateur/reservations/clientRemboursements' },
  { libelle: 'Historique', icone: 'time-outline' as const, route: '/screens/dashboard/utilisateur/reservations/history' },
];

const formatDateFr = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/** Onglet « Billets » : prochain voyage, raccourcis et liste des réservations. */
export default function ReservationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [onglet, setOnglet] = useState<Onglet>('avenir');

  // Filtre par date de réservation
  const [showDateModal, setShowDateModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'debut' | 'fin' | null>(null);
  const [dateDebut, setDateDebut] = useState<Date | null>(null);
  const [dateFin, setDateFin] = useState<Date | null>(null);
  const [filtreActif, setFiltreActif] = useState(false);

  // QR code
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrString, setQrString] = useState('');
  const [qrNumero, setQrNumero] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const dashResp = await reservationService.obtenirDashboard();
      if (dashResp && dashResp.statut) setDashboardData(dashResp.data);
    } catch (e) {
      console.warn('Error loading reservation data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openQrModal = async (resId: number) => {
    setQrModalVisible(true);
    setQrLoading(true);
    setQrString('');
    try {
      const response = await reservationService.obtenirFacture(resId);
      if (response.statut && response.data?.reservation?.qr_data) {
        const qrData = response.data.reservation.qr_data;
        try {
          setQrString(atob(qrData));
        } catch {
          setQrString(qrData);
        }
        setQrNumero(response.data.reservation.numero || '');
      }
    } catch (e) {
      console.error('Error loading QR:', e);
    } finally {
      setQrLoading(false);
    }
  };

  const ouvrirDetail = (id: any) =>
    router.push({ pathname: '/screens/dashboard/utilisateur/reservations/reservationDetail', params: { id: String(id) } });

  const historique: any[] = Array.isArray(dashboardData?.historique) ? dashboardData.historique : [];

  // Filtre par date de réservation (début et/ou fin)
  const historiqueFiltre = historique.filter((res) => {
    if (!filtreActif) return true;
    const d = dateDepuisJJMMAAAA(res?.date_reservation);
    if (!d) return false;
    if (dateDebut && d < new Date(dateDebut.getFullYear(), dateDebut.getMonth(), dateDebut.getDate())) return false;
    if (dateFin && d > new Date(dateFin.getFullYear(), dateFin.getMonth(), dateFin.getDate())) return false;
    return true;
  });

  const parOnglet = historiqueFiltre.filter((res) => statutBillet(res?.statut, res?.date).groupe === onglet);

  // Prochain voyage confirmé (le plus proche dans le temps)
  const prochain = historique
    .filter((res) => res?.statut === 2 && statutBillet(2, res?.date).groupe === 'avenir')
    .sort((a, b) => (dateDepuisJJMMAAAA(a.date)?.getTime() || 0) - (dateDepuisJJMMAAAA(b.date)?.getTime() || 0))[0];

  const compteur = (g: Onglet) => historiqueFiltre.filter((r) => statutBillet(r?.statut, r?.date).groupe === g).length;

  const libelleFiltre = filtreActif
    ? dateDebut && dateFin
      ? `${formatDateFr(dateDebut)} → ${formatDateFr(dateFin)}`
      : dateDebut
        ? `Depuis le ${formatDateFr(dateDebut)}`
        : `Jusqu'au ${formatDateFr(dateFin!)}`
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.fond} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={couleurs.ocean800}
            colors={[couleurs.ocean800]}
          />
        }
      >
        {/* Titre */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Texte variante="titre">Mes billets</Texte>
            <Texte variante="legende" taille={13}>
              {loading ? ' ' : `${dashboardData?.stats?.total_reservations || 0} voyage${(dashboardData?.stats?.total_reservations || 0) > 1 ? 's' : ''} avec FANDRIO`}
            </Texte>
          </View>
          <BoutonIcone icone="calendar-outline" libelle="Filtrer par date de réservation" onPress={() => setShowDateModal(true)} />
        </View>

        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={150} borderRadius={20} />
            <Skeleton height={76} borderRadius={16} />
            {[0, 1, 2].map((i) => <Skeleton key={i} height={72} borderRadius={16} />)}
          </View>
        ) : (
          <>
            {/* Prochain voyage */}
            {prochain ? (
              <Carte marine onPress={() => ouvrirDetail(prochain.id)} accessibilityLabel={`Prochain voyage : ${prochain.trajet}, le ${prochain.date} à ${prochain.heure}`} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Texte graisse="gras" taille={12} couleur={couleurs.texteSurMarine}>Prochain voyage</Texte>
                  <Pastille libelle="Confirmé" tonalite="succes" />
                </View>
                <Texte graisse="tresGras" taille={19} couleur="#FFFFFF" numberOfLines={2}>{prochain.trajet}</Texte>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', gap: 10 }}>
                  <Texte graisse="gras" taille={13} couleur="#FFFFFF" style={{ flex: 1 }}>
                    {prochain.date} · {prochain.heure} · {prochain.nb_voyageurs} voyageur{prochain.nb_voyageurs > 1 ? 's' : ''}
                  </Texte>
                  <Pressable
                    onPress={() => openQrModal(prochain.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Afficher le QR code"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#FFFFFF' }}
                  >
                    <Ionicons name="qr-code-outline" size={16} color={couleurs.ocean950} />
                    <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean950}>QR code</Texte>
                  </Pressable>
                </View>
              </Carte>
            ) : (
              <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="ticket-outline" size={26} color={couleurs.ocean800} />
                </View>
                <Texte graisse="tresGras" taille={15}>Aucun voyage à venir</Texte>
                <Texte variante="legende" centre>Réservez votre place en quelques secondes.</Texte>
                <Bouton titre="Réserver un voyage" compact icone="search" onPress={() => router.push('/screens/dashboard/utilisateur/(tabs)/accueil')} style={{ marginTop: 6 }} />
              </Carte>
            )}

            {/* Raccourcis */}
            <Carte padding={0} style={{ flexDirection: 'row' }}>
              {RACCOURCIS.map((r, i) => (
                <Pressable
                  key={r.libelle}
                  onPress={() => router.push(r.route as any)}
                  accessibilityRole="button"
                  style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: couleurs.separateur }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={r.icone} size={20} color={couleurs.ocean800} />
                  </View>
                  <Texte graisse="gras" taille={12} couleur={couleurs.encreDouce}>{r.libelle}</Texte>
                </Pressable>
              ))}
            </Carte>

            {/* Filtre actif */}
            {filtreActif && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingLeft: 14, borderRadius: 12, backgroundColor: couleurs.ocean50 }}>
                <Ionicons name="calendar" size={16} color={couleurs.ocean800} />
                <Texte graisse="gras" taille={13} couleur={couleurs.ocean950} style={{ flex: 1 }}>Réservés : {libelleFiltre}</Texte>
                <Pressable
                  onPress={() => { setFiltreActif(false); setDateDebut(null); setDateFin(null); }}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Retirer le filtre de date"
                >
                  <Ionicons name="close-circle" size={20} color={couleurs.ocean800} />
                </Pressable>
              </View>
            )}

            <Segmente<Onglet>
              libelleAccessible="Filtrer les billets"
              valeur={onglet}
              onChange={setOnglet}
              options={[
                { valeur: 'avenir', libelle: 'À venir', compteur: compteur('avenir') },
                { valeur: 'passe', libelle: 'Passés' },
                { valeur: 'annule', libelle: 'Annulés' },
              ]}
            />

            {/* Liste */}
            {parOnglet.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
                <Ionicons name="ticket-outline" size={32} color={couleurs.grisClair} />
                <Texte variante="legende" centre>
                  {filtreActif
                    ? 'Aucun billet pour ces dates.'
                    : onglet === 'avenir' ? 'Aucun billet à venir.' : onglet === 'passe' ? 'Aucun voyage passé.' : 'Aucun billet annulé.'}
                </Texte>
              </View>
            ) : (
              <Carte padding={0}>
                {parOnglet.map((res, index) => {
                  const s = statutBillet(res?.statut, res?.date);
                  const v = vignetteDate(res?.date);
                  return (
                    <Pressable
                      key={res?.id || index}
                      onPress={() => ouvrirDetail(res.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${res?.trajet}, ${res?.date} à ${res?.heure}, ${s.libelle}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}
                    >
                      <View style={{ width: 48, height: 52, borderRadius: 12, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                        <Texte variante="montant" taille={17} couleur={couleurs.ocean950}>{v.jour}</Texte>
                        <Texte graisse="tresGras" taille={10} couleur={couleurs.ocean800}>{v.mois}</Texte>
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Texte graisse="tresGras" taille={14} numberOfLines={1}>{res?.trajet || 'Trajet'}</Texte>
                        <Texte variante="legende" numberOfLines={1}>
                          {res?.heure} · N° {res?.numero} · {formatAriary(Number(res?.montant) || 0)} Ar
                        </Texte>
                        <Pastille libelle={s.libelle} tonalite={s.tonalite} />
                      </View>
                      {res?.statut === 2 && s.groupe === 'avenir' ? (
                        <BoutonIcone icone="qr-code-outline" libelle="Afficher le QR code" onPress={() => openQrModal(res.id)} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={couleurs.grisClair} />
                      )}
                    </Pressable>
                  );
                })}
              </Carte>
            )}
          </>
        )}
      </ScrollView>

      {/* QR code */}
      <FeuilleModale visible={qrModalVisible} onClose={() => setQrModalVisible(false)} titre="QR code d'embarquement" sousTitre={qrNumero ? `Billet ${qrNumero}` : undefined}>
        <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}>
          {qrLoading ? (
            <View style={{ height: 240, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator color={couleurs.ocean800} />
              <Texte variante="legende">Chargement du QR code…</Texte>
            </View>
          ) : qrString ? (
            <>
              <View style={{ padding: 14, borderRadius: 18, borderWidth: 1, borderColor: couleurs.ligne }}>
                <QRCode value={qrString} size={230} color={couleurs.ocean950} backgroundColor="#FFFFFF" />
              </View>
              <Texte variante="legende" centre>Présentez ce code au chauffeur à l'embarquement.</Texte>
            </>
          ) : (
            <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={36} color={couleurs.danger} />
              <Texte variante="legende">QR code indisponible pour ce billet.</Texte>
            </View>
          )}
        </View>
      </FeuilleModale>

      {/* Filtre par date de réservation */}
      <FeuilleModale
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        titre="Filtrer par date"
        sousTitre="Date à laquelle vous avez réservé"
        pied={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Bouton
              titre="Réinitialiser"
              variante="secondaire"
              style={{ flex: 1 }}
              onPress={() => { setDateDebut(null); setDateFin(null); setFiltreActif(false); setShowDateModal(false); }}
            />
            <Bouton
              titre="Appliquer"
              style={{ flex: 1.6 }}
              desactive={!dateDebut && !dateFin}
              onPress={() => { setFiltreActif(true); setShowDateModal(false); }}
            />
          </View>
        }
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, gap: 10 }}>
          {([
            { cle: 'debut', libelle: 'Du', valeur: dateDebut, effacer: () => setDateDebut(null) },
            { cle: 'fin', libelle: 'Au (facultatif)', valeur: dateFin, effacer: () => setDateFin(null) },
          ] as const).map((c) => (
            <Pressable
              key={c.cle}
              onPress={() => setPickerTarget(c.cle)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: c.valeur ? couleurs.ocean800 : couleurs.champ }}
            >
              <Ionicons name="calendar-outline" size={19} color={couleurs.ocean800} />
              <View style={{ flex: 1 }}>
                <Texte variante="legende" taille={11}>{c.libelle}</Texte>
                <Texte graisse="gras" taille={15} couleur={c.valeur ? couleurs.encre : '#8A99AD'}>
                  {c.valeur ? formatDateFr(c.valeur) : 'Choisir une date'}
                </Texte>
              </View>
              {c.valeur && (
                <Pressable onPress={c.effacer} hitSlop={10} accessibilityLabel="Effacer">
                  <Ionicons name="close-circle" size={19} color={couleurs.grisClair} />
                </Pressable>
              )}
            </Pressable>
          ))}
        </View>
        {pickerTarget && (
          <DateTimePicker
            value={(pickerTarget === 'debut' ? dateDebut : dateFin) || new Date()}
            mode="date"
            display="default"
            onChange={(_e: any, d?: Date) => {
              const cible = pickerTarget;
              setPickerTarget(null);
              if (!d) return;
              if (cible === 'debut') {
                setDateDebut(d);
                if (dateFin && d > dateFin) setDateFin(null);
              } else {
                setDateFin(d);
                if (dateDebut && d < dateDebut) setDateDebut(null);
              }
            }}
          />
        )}
      </FeuilleModale>
    </View>
  );
}
