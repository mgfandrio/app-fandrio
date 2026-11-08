import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import compagnieService from '../../services/compagnies/compagnieService';
import { reservationAdminService } from '../../services/reservations/reservationAdminService';
import { Skeleton } from '../common/Skeleton';
import { Bouton, Carte, Texte } from '../ui';
import { couleurs, formatAriary } from '../../theme/ocean';
import { dateDepuisJJMMAAAA } from '../../utils/statutBillet';

interface DashboardStatsProps {
  refreshTrigger?: number;
  onNavigate?: (tab: string) => void;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Couleurs propres à chaque opérateur de paiement (identification immédiate). */
const COULEURS_PAIEMENT: Record<string, string> = { MVola: '#C8102E', 'Orange Money': '#E86A00', 'Airtel Money': '#D7141A' };

/** « 08/11/2026 » -> « Auj. », « Dem. » ou « 12/11 ». */
function jourCourt(date?: string) {
  const d = dateDepuisJJMMAAAA(date);
  if (!d) return '';
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const ecart = Math.round((d.getTime() - auj.getTime()) / 86400000);
  if (ecart === 0) return 'Auj.';
  if (ecart === 1) return 'Dem.';
  return date!.slice(0, 5);
}

function TitreSection({ titre, onToutVoir }: { titre: string; onToutVoir?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 8 }}>
      <Texte graisse="tresGras" taille={16}>{titre}</Texte>
      {onToutVoir && <Bouton titre="Tout voir" variante="lien" compact onPress={onToutVoir} />}
    </View>
  );
}

/** Une case de la grille d'indicateurs. */
function Indicateur({ valeur, libelle, droite, bas, children }: { valeur: string | number; libelle: string; droite?: boolean; bas?: boolean; children?: React.ReactNode }) {
  return (
    <View style={{ width: '50%', padding: 12, gap: 2, borderRightWidth: droite ? 1 : 0, borderBottomWidth: bas ? 1 : 0, borderColor: couleurs.separateur }}>
      <Texte variante="montant" taille={20}>{valeur}</Texte>
      <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>{libelle}</Texte>
      {children}
    </View>
  );
}

/** Accueil de l'admin compagnie : chiffre d'affaires, indicateurs, prochains départs, puis le détail. */
export const DashboardStats: React.FC<DashboardStatsProps> = ({ refreshTrigger = 0, onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, [refreshTrigger]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [opRes, finRes] = await Promise.all([compagnieService.getTableauBord(), reservationAdminService.obtenirTableauBordFinancier()]);
      if (opRes.statut && 'data' in opRes) setStats(opRes.data);
      if (finRes.statut) setFinance(finRes.data);
      else setError('Impossible de charger le tableau de bord.');
    } catch {
      setError('Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ gap: 14 }}>
        <Skeleton height={206} borderRadius={20} />
        <Skeleton height={150} borderRadius={16} />
        <Skeleton height={190} borderRadius={16} />
      </View>
    );
  }

  if (error || !finance) {
    return (
      <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
        <Ionicons name="cloud-offline-outline" size={32} color={couleurs.danger} />
        <Texte graisse="moyen" taille={14} couleur={couleurs.gris} centre>{error || 'Aucune donnée.'}</Texte>
        <Bouton titre="Réessayer" variante="secondaire" compact icone="refresh" onPress={fetchAll} />
      </Carte>
    );
  }

  const ca = finance.ca || {};
  const totaux = finance.totaux || {};
  const evolution: any[] = finance.evolution_mensuelle || [];
  const repartition: any[] = finance.repartition_paiement || [];
  const prochains: any[] = finance.prochains_voyages || [];
  const recentes: any[] = finance.reservations_recentes || [];
  const taux = Math.round(Number(finance.taux_remplissage) || 0);
  const totalPaiements = repartition.reduce((s: number, r: any) => s + r.montant, 0) || 1;
  const valeurs = evolution.map((d) => parseFloat(d.ca) || 0);
  const maxCa = Math.max(...valeurs, 1);
  const evo = ca.evolution_mois;

  return (
    <View style={{ gap: 14 }}>
      {/* Chiffre d'affaires du mois */}
      <View style={{ backgroundColor: couleurs.ocean950, borderRadius: 20, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Texte graisse="gras" taille={12} couleur={couleurs.texteSurMarine}>Chiffre d'affaires · {MOIS[new Date().getMonth()]}</Texte>
            <Texte variante="montant" taille={30} couleur="#FFFFFF" style={{ marginTop: 2, letterSpacing: -0.5 }}>
              {formatAriary(ca.ce_mois || 0)} <Texte graisse="tresGras" taille={14} couleur={couleurs.texteSurMarine}>Ar</Texte>
            </Texte>
          </View>
          {evo != null && (
            <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: 'rgba(46,143,224,0.18)', justifyContent: 'center' }}>
              <Texte graisse="tresGras" taille={11} couleur="#CFE6FB">
                {evo >= 0 ? '+' : '−'}{Math.abs(evo).toString().replace('.', ',')} %
              </Texte>
            </View>
          )}
        </View>

        {valeurs.length > 0 && (
          <View accessibilityRole="image" accessibilityLabel="Chiffre d'affaires des 12 derniers mois" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 56 }}>
            {valeurs.map((v, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max((v / maxCa) * 100, 4)}%`,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  borderBottomLeftRadius: 2,
                  borderBottomRightRadius: 2,
                  backgroundColor: i === valeurs.length - 1 ? couleurs.ocean500 : 'rgba(255,255,255,0.22)',
                }}
              />
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }}>
          {([
            ["Aujourd'hui", ca.aujourdhui || 0],
            ['Cette semaine', ca.cette_semaine || 0],
          ] as [string, number][]).map(([l, v]) => (
            <View key={l} style={{ flex: 1 }}>
              <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>{l}</Texte>
              <Texte variante="montant" taille={15} couleur="#FFFFFF">{formatAriary(v)} Ar</Texte>
            </View>
          ))}
        </View>
      </View>

      {/* Indicateurs */}
      <Carte padding={0} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Indicateur valeur={totaux.reservations || 0} libelle="Réservations" droite bas />
        <Indicateur valeur={totaux.voyageurs || 0} libelle="Voyageurs" bas />
        <Indicateur valeur={`${taux} %`} libelle="Taux de remplissage" droite>
          <View style={{ height: 5, borderRadius: 999, backgroundColor: couleurs.ocean50, marginTop: 6, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(taux, 100)}%`, height: '100%', backgroundColor: couleurs.ocean800 }} />
          </View>
        </Indicateur>
        <Indicateur valeur={totaux.voyages_complets || 0} libelle="Voyages complets" />
      </Carte>

      {/* Prochains départs */}
      <View>
        <TitreSection titre="Prochains départs" onToutVoir={onNavigate ? () => onNavigate('voyages') : undefined} />
        {prochains.length === 0 ? (
          <Carte style={{ alignItems: 'center', gap: 6, paddingVertical: 20 }}>
            <Ionicons name="bus-outline" size={26} color={couleurs.grisClair} />
            <Texte variante="legende" centre>Aucun départ programmé.</Texte>
          </Carte>
        ) : (
          <Carte padding={0}>
            {prochains.map((v, i) => {
              const total = Number(v.places_disponibles) || 0;
              const pris = Number(v.places_reservees) || 0;
              const complet = total > 0 && pris >= total;
              const pct = total > 0 ? Math.min((pris / total) * 100, 100) : 0;
              return (
                <View
                  key={v.voyage_id ?? i}
                  accessibilityLabel={`${v.heure}, ${v.trajet}, ${complet ? 'complet' : `${pris} places sur ${total}`}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}
                >
                  <View style={{ width: 52 }}>
                    <Texte variante="montant" taille={16}>{String(v.heure || '').slice(0, 5)}</Texte>
                    <Texte graisse="moyen" taille={11} couleur={couleurs.gris}>{jourCourt(v.date)}</Texte>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Texte graisse="tresGras" taille={14} numberOfLines={1}>{v.trajet}</Texte>
                    <View style={{ height: 5, borderRadius: 999, backgroundColor: couleurs.ocean50, marginTop: 7, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: complet ? couleurs.succes : couleurs.ocean800 }} />
                    </View>
                  </View>
                  <Texte variante="montant" taille={13} style={{ minWidth: 44, textAlign: 'right' }}>{complet ? 'Complet' : `${pris}/${total}`}</Texte>
                </View>
              );
            })}
          </Carte>
        )}
      </View>

      {/* Dernières réservations */}
      {recentes.length > 0 && (
        <View>
          <TitreSection titre="Dernières réservations" onToutVoir={onNavigate ? () => onNavigate('reservations') : undefined} />
          <Carte padding={0}>
            {recentes.map((r, i) => (
              <View key={r.res_numero ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: couleurs.separateur }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                  <Texte graisse="tresGras" taille={12.5} couleur={couleurs.ocean800}>
                    {r.client?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                  </Texte>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texte graisse="tresGras" taille={14} numberOfLines={1}>{r.client || 'Client'}</Texte>
                  <Texte variante="legende" numberOfLines={1}>{r.trajet} · {r.nb_voyageurs} voy.</Texte>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Texte variante="montant" taille={13.5}>{formatAriary(r.montant || 0)} Ar</Texte>
                  <Texte variante="legende" taille={11}>{r.type_paiement}</Texte>
                </View>
              </View>
            ))}
          </Carte>
        </View>
      )}

      {/* Répartition des paiements */}
      {repartition.length > 0 && (
        <View>
          <TitreSection titre="Paiements reçus" />
          <Carte style={{ gap: 12 }}>
            {repartition.map((item, i) => {
              const pct = Math.round((item.montant / totalPaiements) * 100);
              return (
                <View key={i} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <Texte graisse="gras" taille={13.5}>{item.type}</Texte>
                    <Texte variante="montant" taille={13.5}>{formatAriary(item.montant)} Ar</Texte>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: couleurs.separateur, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: COULEURS_PAIEMENT[item.type] || couleurs.ocean800 }} />
                  </View>
                </View>
              );
            })}
          </Carte>
        </View>
      )}

      {/* Parc et équipe */}
      {stats && (
        <View>
          <TitreSection titre="Parc et équipe" />
          <Carte padding={0} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[
              { tab: 'voitures', total: stats.voitures?.total || 0, l: 'Véhicules', d: `${stats.voitures?.disponibles || 0} disponibles` },
              { tab: 'chauffeurs', total: stats.chauffeurs?.total || 0, l: 'Chauffeurs', d: `${stats.chauffeurs?.actifs || 0} actifs` },
            ].map((p, i) => (
              <View key={p.tab} style={{ width: '50%', borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: couleurs.separateur }}>
                <Carte padding={12} onPress={() => onNavigate?.(p.tab)} accessibilityLabel={`${p.l} : ${p.total}, ${p.d}`} style={{ borderWidth: 0, gap: 2 }}>
                  <Texte variante="montant" taille={20}>{p.total}</Texte>
                  <Texte graisse="moyen" taille={11.5} couleur={couleurs.gris}>{p.l} · {p.d}</Texte>
                </Carte>
              </View>
            ))}
          </Carte>
        </View>
      )}
    </View>
  );
};
