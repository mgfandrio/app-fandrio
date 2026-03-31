import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import commissionService from '../../../services/commissions/commissionService';
import { useConfirmDialog } from '../../common/ConfirmDialog';

// ── Types ──
interface DashboardData {
  taux_commission: number;
  totaux: {
    brut: number;
    commission: number;
    total_billets: number;
    nb_reservations: number;
    nb_compagnies: number;
  };
  commissions_statut: { calculee: number; facturee: number; payee: number };
  par_periode: Record<string, { brut: number; commission: number; billets: number; reservations: number }>;
  evolution_mensuelle: { mois: string; brut: number; commission: number; billets: number; nb_reservations: number }[];
  top_compagnies: CompagnieResume[];
  repartition_operateur: { operateur: string; type_id: number; brut: number; commission: number; nb: number }[];
  collectes_en_attente: number;
}

interface CompagnieResume {
  comp_id: number;
  comp_nom: string;
  comp_statut?: number;
  frequence_collecte: string;
  brut: number;
  commission: number;
  nb_reservations: number;
  billets: number;
}

interface CommissionDetail {
  comm_id: number;
  periode: string;
  montant: number;
  taux: number;
  nb_reservations: number;
  statut: number;
  statut_label: string;
  date_calcul: string | null;
}

interface DetailCompagnieData {
  compagnie: { comp_id: number; comp_nom: string; frequence_collecte: string };
  totaux: { brut: number; commission: number; total_billets: number; nb_reservations: number };
  commissions: CommissionDetail[];
  evolution_mensuelle: { mois: string; brut: number; commission: number; nb_reservations: number }[];
}

interface CollecteItem {
  coll_id: number;
  comp_id: number;
  comp_nom: string;
  periode_debut: string;
  periode_fin: string;
  periode_debut_raw: string;
  periode_fin_raw: string;
  montant_brut: number;
  montant_commission: number;
  taux: number;
  nb_reservations: number;
  nb_billets: number;
  statut: number;
  statut_label: string;
  date_prevue: string;
  date_confirmation: string | null;
  created_at: string;
  compagnie_detail?: {
    nom: string;
    nif: string;
    stat: string;
    email: string;
    phone: string;
    adresse: string;
  };
  confirme_par_detail?: { nom: string; prenom: string };
}

// ── Utils ──
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' Ar';

const PERIODE_LABELS: Record<string, string> = {
  aujourdhui: "Aujourd'hui",
  cette_semaine: 'Cette semaine',
  ce_mois: 'Ce mois',
  cette_annee: 'Cette année',
};

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const STATUT_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Calculée' },
  2: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Facturée' },
  3: { bg: 'bg-green-100', text: 'text-green-700', label: 'Payée' },
};

const OPERATEUR_COLORS: Record<string, string> = {
  'Orange Money': '#f97316',
  'MVola': '#ef4444',
  'Airtel Money': '#e11d48',
};

const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DATES_MOIS = Array.from({ length: 28 }, (_, i) => i + 1);

export function RenderCommissions() {
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [vue, setVue] = useState<'dashboard' | 'compagnies' | 'detail' | 'collectes' | 'facture'>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [compagnies, setCompagnies] = useState<CompagnieResume[]>([]);
  const [detail, setDetail] = useState<DetailCompagnieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriode, setSelectedPeriode] = useState('ce_mois');
  const [recherche, setRecherche] = useState('');
  const [filtreFrequence, setFiltreFrequence] = useState<string | undefined>(undefined);

  // Modal fréquence
  const [showFreqModal, setShowFreqModal] = useState(false);
  const [freqCompagnie, setFreqCompagnie] = useState<{ id: number; nom: string; freq: string; jour?: string } | null>(null);
  const [selectedFreq, setSelectedFreq] = useState<string>('mensuelle');
  const [selectedJour, setSelectedJour] = useState<string>('');

  // Collectes
  const [collectesDues, setCollectesDues] = useState<CollecteItem[]>([]);
  const [collectes, setCollectes] = useState<CollecteItem[]>([]);
  const [collecteDetail, setCollecteDetail] = useState<CollecteItem | null>(null);
  const [filtreCollecteStatut, setFiltreCollecteStatut] = useState<number | undefined>(undefined);
  const [historiqueCollectes, setHistoriqueCollectes] = useState<CollecteItem[]>([]);
  const [confirmingCollecte, setConfirmingCollecte] = useState(false);

  // ── Chargement ──
  const chargerDashboard = useCallback(async () => {
    try {
      const res = await commissionService.getDashboard();
      if (res.statut && res.data) setDashboard(res.data);
    } catch {}
  }, []);

  const chargerCompagnies = useCallback(async () => {
    try {
      const res = await commissionService.getCompagnies({
        recherche: recherche || undefined,
        frequence: filtreFrequence,
      });
      if (res.statut && res.data) setCompagnies(res.data.compagnies);
    } catch {}
  }, [recherche, filtreFrequence]);

  const chargerDetail = useCallback(async (compId: number) => {
    setLoading(true);
    try {
      const res = await commissionService.getDetailCompagnie(compId);
      if (res.statut && res.data) {
        setDetail(res.data);
        setVue('detail');
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const chargerCollectesDues = useCallback(async () => {
    try {
      const res = await commissionService.getCollectesDues();
      if (res.statut && res.data) setCollectesDues(res.data.collectes);
    } catch {}
  }, []);

  const chargerCollectes = useCallback(async () => {
    try {
      const res = await commissionService.getCollectes({
        statut: filtreCollecteStatut,
        per_page: 50,
      });
      if (res.statut && res.data) setCollectes(res.data.collectes);
    } catch {}
  }, [filtreCollecteStatut]);

  const chargerDetailCollecte = useCallback(async (collecteId: number) => {
    setLoading(true);
    try {
      const res = await commissionService.getDetailCollecte(collecteId);
      if (res.statut && res.data) {
        setCollecteDetail(res.data);
        setVue('facture');
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const chargerHistoriqueCollectes = useCallback(async (compId: number) => {
    try {
      const res = await commissionService.getHistoriqueCollectes(compId);
      if (res.statut && res.data) setHistoriqueCollectes(res.data.collectes);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([chargerDashboard(), chargerCollectesDues()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (vue === 'compagnies') chargerCompagnies();
  }, [vue, recherche, filtreFrequence]);

  useEffect(() => {
    if (vue === 'collectes') chargerCollectes();
  }, [vue, filtreCollecteStatut]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (vue === 'dashboard') {
      await Promise.all([chargerDashboard(), chargerCollectesDues()]);
    } else if (vue === 'compagnies') {
      await chargerCompagnies();
    } else if (vue === 'detail' && detail) {
      await chargerDetail(detail.compagnie.comp_id);
    } else if (vue === 'collectes') {
      await chargerCollectes();
    } else if (vue === 'facture' && collecteDetail) {
      await chargerDetailCollecte(collecteDetail.coll_id);
    }
    setRefreshing(false);
  }, [vue, detail, collecteDetail]);

  // ── Actions ──
  const handleConfirmerReception = (comm: CommissionDetail) => {
    const nextStatut = comm.statut === 1 ? 2 : 3;
    const nextLabel = nextStatut === 2 ? 'Facturée' : 'Payée';
    showDialog({
      title: 'Confirmer le statut',
      message: `Marquer la commission de ${comm.periode} (${fmt(comm.montant)}) comme "${nextLabel}" ?`,
      type: 'info',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        const res = await commissionService.confirmerReception(comm.comm_id, nextStatut);
        if (res.statut && detail) {
          await chargerDetail(detail.compagnie.comp_id);
        }
      },
      onCancel: () => {},
    });
  };

  const handleOpenFreqModal = (id: number, nom: string, freq: string, jour?: string) => {
    setFreqCompagnie({ id, nom, freq, jour });
    setSelectedFreq(freq || 'mensuelle');
    setSelectedJour(jour || '');
    setShowFreqModal(true);
  };

  const handleSaveFrequence = async () => {
    if (!freqCompagnie) return;
    const res = await commissionService.updateFrequence(freqCompagnie.id, {
      frequence: selectedFreq as any,
      jour_collecte: selectedJour || undefined,
    });
    if (res.statut) {
      setShowFreqModal(false);
      setFreqCompagnie(null);
      if (vue === 'compagnies') await chargerCompagnies();
      if (vue === 'detail' && detail) await chargerDetail(detail.compagnie.comp_id);
      if (vue === 'dashboard') await chargerDashboard();
    }
  };

  const handleToggleCommission = async (compId: number, compNom: string, actif: boolean) => {
    const etat = actif ? 'activer' : 'désactiver';
    showDialog({
      title: `${actif ? 'Activer' : 'Désactiver'} la commission`,
      message: `Voulez-vous ${etat} la commission pour "${compNom}" ?`,
      type: actif ? 'info' : 'warning',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        const res = await commissionService.toggleCommission(compId, actif);
        if (res.statut) {
          Alert.alert('Succès', res.message);
          if (vue === 'detail' && detail) await chargerDetail(detail.compagnie.comp_id);
          if (vue === 'compagnies') await chargerCompagnies();
        }
      },
      onCancel: () => {},
    });
  };

  const handleConfirmerCollecte = (collecte: CollecteItem) => {
    showDialog({
      title: 'Confirmer la collecte',
      message: `Confirmer la collecte de ${fmt(collecte.montant_commission)} pour "${collecte.comp_nom}" (${collecte.periode_debut} - ${collecte.periode_fin}) ?\n\nUne notification sera envoyée à la compagnie.`,
      type: 'info',
      confirmText: 'Confirmer la collecte',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setConfirmingCollecte(true);
        try {
          const res = await commissionService.confirmerCollecte(collecte.coll_id);
          if (res.statut) {
            Alert.alert('Succès', 'Collecte confirmée. La compagnie a été notifiée.');
            await Promise.all([chargerCollectesDues(), chargerCollectes()]);
            if (vue === 'facture') {
              await chargerDetailCollecte(collecte.coll_id);
            }
          }
        } finally {
          setConfirmingCollecte(false);
        }
      },
      onCancel: () => {},
    });
  };

  // ── Loading ──
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text className="text-gray-500 mt-3">Chargement des commissions...</Text>
      </View>
    );
  }

  // ── Dashboard View ──
  const renderDashboardView = () => {
    if (!dashboard) return null;
    const periode = dashboard.par_periode[selectedPeriode];
    const maxEvol = Math.max(...dashboard.evolution_mensuelle.map(e => e.commission), 1);

    return (
      <>
        {/* HERO */}
        <LinearGradient
          colors={['#0f172a', '#1e3a8a', '#2563eb']}
          className="mx-4 mt-4 rounded-3xl px-5 pt-6 pb-5"
          style={{ elevation: 6 }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="bg-white/10 rounded-full p-2 mr-2">
                <Ionicons name="cash" size={20} color="#fff" />
              </View>
              <Text className="text-white/80 text-sm font-medium">Commissions Plateforme</Text>
            </View>
            <View className="bg-yellow-400/20 rounded-full px-3 py-1">
              <Text className="text-yellow-300 text-xs font-bold">{dashboard.taux_commission}%</Text>
            </View>
          </View>

          <Text className="text-white text-3xl font-bold">{fmt(dashboard.totaux.commission)}</Text>
          <Text className="text-white/50 text-xs mt-1">Total des commissions générées</Text>

          <View className="flex-row mt-4 gap-4">
            <View className="flex-1 bg-white/10 rounded-xl p-3">
              <Text className="text-white/60 text-xs">Revenu brut total</Text>
              <Text className="text-white font-bold text-base mt-0.5">{fmt(dashboard.totaux.brut)}</Text>
            </View>
            <View className="flex-1 bg-green-500/20 rounded-xl p-3">
              <Text className="text-green-300/80 text-xs">Compagnies actives</Text>
              <Text className="text-green-300 font-bold text-base mt-0.5">{dashboard.totaux.nb_compagnies}</Text>
            </View>
          </View>

          <View className="flex-row mt-3 gap-4">
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-lg">{dashboard.totaux.total_billets}</Text>
              <Text className="text-white/50 text-xs">Billets</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-lg">{dashboard.totaux.nb_reservations}</Text>
              <Text className="text-white/50 text-xs">Réservations</Text>
            </View>
          </View>
        </LinearGradient>

        {/* RAPPEL COLLECTES DUES */}
        {dashboard.collectes_en_attente > 0 && (
          <TouchableOpacity
            className="mx-4 mt-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex-row items-center"
            style={{ elevation: 2 }}
            onPress={() => setVue('collectes')}
            activeOpacity={0.7}
          >
            <View className="bg-orange-500 rounded-full p-2 mr-3">
              <Ionicons name="alert-circle" size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-orange-800 font-bold text-base">Collectes en attente</Text>
              <Text className="text-orange-600 text-sm mt-0.5">
                {dashboard.collectes_en_attente} collecte{dashboard.collectes_en_attente > 1 ? 's' : ''} à confirmer
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ea580c" />
          </TouchableOpacity>
        )}

        {/* Statut commissions */}
        <View className="mx-4 mt-4">
          <Text className="text-gray-900 text-base font-bold mb-3">Statut des commissions</Text>
          <View className="flex-row gap-2">
            <View className="flex-1 bg-yellow-50 rounded-2xl p-3 items-center">
              <Ionicons name="calculator-outline" size={22} color="#ca8a04" />
              <Text className="text-yellow-700 font-bold text-sm mt-1">{fmt(dashboard.commissions_statut.calculee)}</Text>
              <Text className="text-yellow-600/70 text-xs">Calculées</Text>
            </View>
            <View className="flex-1 bg-blue-50 rounded-2xl p-3 items-center">
              <Ionicons name="document-text-outline" size={22} color="#2563eb" />
              <Text className="text-blue-700 font-bold text-sm mt-1">{fmt(dashboard.commissions_statut.facturee)}</Text>
              <Text className="text-blue-600/70 text-xs">Facturées</Text>
            </View>
            <View className="flex-1 bg-green-50 rounded-2xl p-3 items-center">
              <Ionicons name="checkmark-circle-outline" size={22} color="#16a34a" />
              <Text className="text-green-700 font-bold text-sm mt-1">{fmt(dashboard.commissions_statut.payee)}</Text>
              <Text className="text-green-600/70 text-xs">Payées</Text>
            </View>
          </View>
        </View>

        {/* Par période */}
        <View className="mx-4 mt-4">
          <Text className="text-gray-900 text-base font-bold mb-3">Commissions par période</Text>
          <View className="flex-row mb-3 gap-2">
            {Object.keys(PERIODE_LABELS).map((key) => (
              <TouchableOpacity
                key={key}
                className={`flex-1 py-2 rounded-lg ${selectedPeriode === key ? 'bg-blue-600' : 'bg-gray-100'}`}
                onPress={() => setSelectedPeriode(key)}
              >
                <Text className={`text-center text-xs font-semibold ${selectedPeriode === key ? 'text-white' : 'text-gray-600'}`}>
                  {PERIODE_LABELS[key]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {periode && (
            <View className="bg-white rounded-2xl p-4" style={{ elevation: 2 }}>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-gray-500 text-xs">Brut</Text>
                  <Text className="text-gray-900 font-bold text-lg">{fmt(periode.brut)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-green-500 text-xs">Commission</Text>
                  <Text className="text-green-600 font-bold text-lg">{fmt(periode.commission)}</Text>
                </View>
              </View>
              <View className="flex-row mt-3 gap-4">
                <View className="flex-1 items-center">
                  <Text className="text-gray-900 font-bold">{periode.billets}</Text>
                  <Text className="text-gray-400 text-xs">Billets</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-gray-900 font-bold">{periode.reservations}</Text>
                  <Text className="text-gray-400 text-xs">Réservations</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Graphique évolution */}
        {dashboard.evolution_mensuelle.length > 0 && (
          <View className="mx-4 mt-4">
            <Text className="text-gray-900 text-base font-bold mb-3">Évolution mensuelle</Text>
            <View className="bg-white rounded-2xl p-4" style={{ elevation: 2 }}>
              <View className="flex-row items-end justify-between" style={{ height: 120 }}>
                {dashboard.evolution_mensuelle.map((item, index) => {
                  const height = Math.max((item.commission / maxEvol) * 100, 4);
                  const moisIndex = parseInt(item.mois.split('-')[1]) - 1;
                  return (
                    <View key={index} className="items-center flex-1">
                      <Text className="text-green-600 text-xs font-bold mb-1">
                        {item.commission >= 1000 ? `${(item.commission / 1000).toFixed(0)}k` : item.commission}
                      </Text>
                      <View
                        className="bg-green-500 rounded-t-md w-5"
                        style={{ height }}
                      />
                      <Text className="text-gray-400 text-xs mt-1">{MOIS_LABELS[moisIndex]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Répartition opérateur */}
        {dashboard.repartition_operateur.length > 0 && (
          <View className="mx-4 mt-4">
            <Text className="text-gray-900 text-base font-bold mb-3">Répartition par opérateur</Text>
            <View className="bg-white rounded-2xl p-4" style={{ elevation: 2 }}>
              {dashboard.repartition_operateur.map((op, index) => {
                const total = dashboard.repartition_operateur.reduce((s, o) => s + o.commission, 0);
                const pct = total > 0 ? Math.round((op.commission / total) * 100) : 0;
                const color = OPERATEUR_COLORS[op.operateur] || '#6b7280';
                return (
                  <View key={index} className={`${index > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-gray-900 font-semibold text-sm">{op.operateur}</Text>
                      <Text className="text-gray-600 font-bold text-sm">{fmt(op.commission)}</Text>
                    </View>
                    <View className="bg-gray-100 rounded-full h-2 mt-1">
                      <View className="rounded-full h-2" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </View>
                    <Text className="text-gray-400 text-xs mt-1">{pct}% · {op.nb} transactions</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top compagnies */}
        {dashboard.top_compagnies.length > 0 && (
          <View className="mx-4 mt-4 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-gray-900 text-base font-bold">Top compagnies</Text>
              <TouchableOpacity onPress={() => setVue('compagnies')}>
                <Text className="text-blue-600 text-sm font-semibold">Voir tout</Text>
              </TouchableOpacity>
            </View>
            {dashboard.top_compagnies.slice(0, 5).map((comp, index) => (
              <TouchableOpacity
                key={comp.comp_id}
                className="bg-white rounded-2xl p-4 mb-2"
                style={{ elevation: 1 }}
                onPress={() => chargerDetail(comp.comp_id)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="bg-blue-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                      <Text className="text-blue-600 font-bold text-sm">#{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold" numberOfLines={1}>{comp.comp_nom}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">{comp.nb_reservations} rés. · {comp.billets} billets</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-green-600 font-bold text-sm">{fmt(comp.commission)}</Text>
                    <View className="bg-gray-100 rounded-full px-2 py-0.5 mt-1">
                      <Text className="text-gray-500 text-xs capitalize">{comp.frequence_collecte}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </>
    );
  };

  // ── Liste des compagnies ──
  const renderCompagniesView = () => (
    <>
      {/* Header */}
      <View className="mx-4 mt-4 bg-white rounded-2xl p-4" style={{ elevation: 2 }}>
        <View className="flex-row items-center mb-3">
          <TouchableOpacity onPress={() => setVue('dashboard')} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">Compagnies</Text>
            <Text className="text-gray-500 text-sm">Commissions par compagnie</Text>
          </View>
        </View>

        {/* Recherche */}
        <View className="bg-gray-100 rounded-xl px-3 py-2 flex-row items-center">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-gray-900 text-sm"
            placeholder="Rechercher une compagnie..."
            value={recherche}
            onChangeText={setRecherche}
            returnKeyType="search"
          />
          {recherche.length > 0 && (
            <TouchableOpacity onPress={() => setRecherche('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtre fréquence */}
        <View className="flex-row mt-3 gap-2">
          {[undefined, 'mensuelle', 'hebdomadaire'].map((f) => (
            <TouchableOpacity
              key={f ?? 'all'}
              className={`flex-1 py-2 rounded-lg ${filtreFrequence === f ? 'bg-blue-600' : 'bg-gray-100'}`}
              onPress={() => setFiltreFrequence(f)}
            >
              <Text className={`text-center text-xs font-semibold ${filtreFrequence === f ? 'text-white' : 'text-gray-600'}`}>
                {f === undefined ? 'Toutes' : f === 'mensuelle' ? 'Mensuelles' : 'Hebdo.'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Liste */}
      {compagnies.map((comp) => (
        <TouchableOpacity
          key={comp.comp_id}
          className="mx-4 mt-2 bg-white rounded-2xl p-4"
          style={{ elevation: 1 }}
          onPress={() => chargerDetail(comp.comp_id)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-gray-900 font-semibold" numberOfLines={1}>{comp.comp_nom}</Text>
              <Text className="text-gray-400 text-xs mt-1">
                {comp.nb_reservations} réservations · {comp.billets} billets
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-green-600 font-bold">{fmt(comp.commission)}</Text>
              <TouchableOpacity
                className="bg-gray-100 rounded-full px-2 py-1 mt-1 flex-row items-center"
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleOpenFreqModal(comp.comp_id, comp.comp_nom, comp.frequence_collecte);
                }}
              >
                <Ionicons name="time-outline" size={12} color="#6b7280" />
                <Text className="text-gray-500 text-xs ml-1 capitalize">{comp.frequence_collecte}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      {compagnies.length === 0 && (
        <View className="items-center py-10">
          <Ionicons name="business-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 mt-2">Aucune compagnie trouvée</Text>
        </View>
      )}
      <View className="h-6" />
    </>
  );

  // ── Détail compagnie ──
  const renderDetailView = () => {
    if (!detail) return null;
    const maxEvol = Math.max(...detail.evolution_mensuelle.map(e => e.commission), 1);

    return (
      <>
        {/* Header compagnie */}
        <View className="mx-4 mt-4">
          <View className="flex-row items-center mb-3">
            <TouchableOpacity onPress={() => setVue(compagnies.length > 0 ? 'compagnies' : 'dashboard')} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{detail.compagnie.comp_nom}</Text>
              <Text className="text-gray-500 text-sm">Détail des commissions</Text>
            </View>
            <TouchableOpacity
              className="bg-gray-100 rounded-full px-3 py-1.5 flex-row items-center"
              onPress={() => {
                handleOpenFreqModal(
                  detail.compagnie.comp_id,
                  detail.compagnie.comp_nom,
                  detail.compagnie.frequence_collecte,
                );
              }}
            >
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text className="text-gray-600 text-xs ml-1 capitalize">{detail.compagnie.frequence_collecte}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Totaux */}
        <LinearGradient
          colors={['#0f172a', '#1e3a8a', '#2563eb']}
          className="mx-4 rounded-3xl px-5 pt-5 pb-4"
          style={{ elevation: 4 }}
        >
          <View className="flex-row gap-4">
            <View className="flex-1 bg-white/10 rounded-xl p-3">
              <Text className="text-white/60 text-xs">Brut</Text>
              <Text className="text-white font-bold text-base">{fmt(detail.totaux.brut)}</Text>
            </View>
            <View className="flex-1 bg-green-500/20 rounded-xl p-3">
              <Text className="text-green-300/80 text-xs">Commission</Text>
              <Text className="text-green-300 font-bold text-base">{fmt(detail.totaux.commission)}</Text>
            </View>
          </View>
          <View className="flex-row mt-3 gap-4">
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-lg">{detail.totaux.nb_reservations}</Text>
              <Text className="text-white/50 text-xs">Réservations</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-lg">{detail.totaux.total_billets}</Text>
              <Text className="text-white/50 text-xs">Billets</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Graphique évolution */}
        {detail.evolution_mensuelle.length > 0 && (
          <View className="mx-4 mt-4">
            <Text className="text-gray-900 text-base font-bold mb-3">Évolution mensuelle</Text>
            <View className="bg-white rounded-2xl p-4" style={{ elevation: 2 }}>
              <View className="flex-row items-end justify-between" style={{ height: 100 }}>
                {detail.evolution_mensuelle.map((item, index) => {
                  const height = Math.max((item.commission / maxEvol) * 80, 4);
                  const moisIndex = parseInt(item.mois.split('-')[1]) - 1;
                  return (
                    <View key={index} className="items-center flex-1">
                      <Text className="text-green-600 text-xs font-bold mb-1">
                        {item.commission >= 1000 ? `${(item.commission / 1000).toFixed(0)}k` : item.commission}
                      </Text>
                      <View className="bg-green-500 rounded-t-md w-5" style={{ height }} />
                      <Text className="text-gray-400 text-xs mt-1">{MOIS_LABELS[moisIndex]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Commissions enregistrées */}
        <View className="mx-4 mt-4 mb-6">
          <Text className="text-gray-900 text-base font-bold mb-3">Commissions enregistrées</Text>
          {detail.commissions.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center" style={{ elevation: 1 }}>
              <Ionicons name="document-text-outline" size={40} color="#d1d5db" />
              <Text className="text-gray-400 mt-2">Aucune commission enregistrée</Text>
            </View>
          ) : (
            detail.commissions.map((comm) => {
              const config = STATUT_COLORS[comm.statut] || STATUT_COLORS[1];
              return (
                <View key={comm.comm_id} className="bg-white rounded-2xl p-4 mb-2" style={{ elevation: 1 }}>
                  <View className="flex-row items-center justify-between mb-2">
                    <View>
                      <Text className="text-gray-900 font-bold text-base">{comm.periode}</Text>
                      <Text className="text-gray-400 text-xs">{comm.nb_reservations} réservations · Taux {comm.taux}%</Text>
                    </View>
                    <View className={`${config.bg} rounded-full px-3 py-1`}>
                      <Text className={`${config.text} text-xs font-semibold`}>{config.label}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-green-600 font-bold text-lg">{fmt(comm.montant)}</Text>
                    {comm.statut < 3 && (
                      <TouchableOpacity
                        className="bg-blue-600 rounded-xl px-4 py-2"
                        onPress={() => handleConfirmerReception(comm)}
                        activeOpacity={0.7}
                      >
                        <Text className="text-white text-xs font-semibold">
                          {comm.statut === 1 ? 'Marquer facturée' : 'Marquer payée'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {comm.statut === 3 && (
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                        <Text className="text-green-600 text-xs ml-1 font-semibold">Reçue</Text>
                      </View>
                    )}
                  </View>
                  {comm.date_calcul && (
                    <Text className="text-gray-400 text-xs mt-2">Calculée le {comm.date_calcul}</Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </>
    );
  };

  // ── Vue Collectes (liste) ──
  const renderCollectesView = () => (
    <>
      {/* Header */}
      <View className="mx-4 mt-4 bg-white rounded-2xl p-4" style={{ elevation: 2 }}>
        <View className="flex-row items-center mb-3">
          <TouchableOpacity onPress={() => setVue('dashboard')} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">Collectes</Text>
            <Text className="text-gray-500 text-sm">Historique et gestion des collectes</Text>
          </View>
        </View>
        {/* Filtre statut */}
        <View className="flex-row gap-2">
          {[
            { val: undefined, label: 'Toutes' },
            { val: 1, label: 'En attente' },
            { val: 2, label: 'Confirmées' },
          ].map((f) => (
            <TouchableOpacity
              key={f.label}
              className={`flex-1 py-2 rounded-lg ${filtreCollecteStatut === f.val ? 'bg-blue-600' : 'bg-gray-100'}`}
              onPress={() => setFiltreCollecteStatut(f.val)}
            >
              <Text className={`text-center text-xs font-semibold ${filtreCollecteStatut === f.val ? 'text-white' : 'text-gray-600'}`}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Collectes dues en haut */}
      {collectesDues.length > 0 && filtreCollecteStatut !== 2 && (
        <View className="mx-4 mt-3">
          <View className="flex-row items-center mb-2">
            <Ionicons name="alert-circle" size={18} color="#ea580c" />
            <Text className="text-orange-700 font-bold text-sm ml-1">
              À confirmer ({collectesDues.length})
            </Text>
          </View>
          {collectesDues.map((coll) => (
            <View key={coll.coll_id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-2">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold">{coll.comp_nom}</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">{coll.periode_debut} → {coll.periode_fin}</Text>
                </View>
                <Text className="text-green-600 font-bold text-base">{fmt(coll.montant_commission)}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-400 text-xs">{coll.nb_reservations} rés. · {coll.nb_billets} billets</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="bg-white rounded-lg px-3 py-1.5"
                    onPress={() => chargerDetailCollecte(coll.coll_id)}
                  >
                    <Text className="text-blue-600 text-xs font-semibold">Détail</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-green-600 rounded-lg px-3 py-1.5"
                    onPress={() => handleConfirmerCollecte(coll)}
                    disabled={confirmingCollecte}
                  >
                    <Text className="text-white text-xs font-semibold">Confirmer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Liste des collectes */}
      <View className="mx-4 mt-3 mb-6">
        {collectes.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center" style={{ elevation: 1 }}>
            <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 mt-2">Aucune collecte trouvée</Text>
          </View>
        ) : (
          collectes.map((coll) => (
            <TouchableOpacity
              key={coll.coll_id}
              className="bg-white rounded-2xl p-4 mb-2"
              style={{ elevation: 1 }}
              onPress={() => chargerDetailCollecte(coll.coll_id)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold">{coll.comp_nom}</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">{coll.periode_debut} → {coll.periode_fin}</Text>
                </View>
                <View className={`rounded-full px-3 py-1 ${coll.statut === 2 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <Text className={`text-xs font-semibold ${coll.statut === 2 ? 'text-green-700' : 'text-yellow-700'}`}>
                    {coll.statut_label}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-400 text-xs">{coll.nb_reservations} rés. · {coll.nb_billets} billets · Prévue: {coll.date_prevue}</Text>
                <Text className="text-green-600 font-bold">{fmt(coll.montant_commission)}</Text>
              </View>
              {coll.statut === 2 && coll.date_confirmation && (
                <Text className="text-gray-400 text-xs mt-1">Confirmée le {coll.date_confirmation}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </>
  );

  // ── Vue Facture (détail collecte) ──
  const renderFactureView = () => {
    if (!collecteDetail) return null;
    const c = collecteDetail;

    return (
      <>
        {/* Header */}
        <View className="mx-4 mt-4 flex-row items-center mb-3">
          <TouchableOpacity
            onPress={() => setVue('collectes')}
            className="mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">Détail de collecte</Text>
            <Text className="text-gray-500 text-sm">Reçu / Facture</Text>
          </View>
          <View className={`rounded-full px-3 py-1 ${c.statut === 2 ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <Text className={`text-xs font-bold ${c.statut === 2 ? 'text-green-700' : 'text-yellow-700'}`}>
              {c.statut_label}
            </Text>
          </View>
        </View>

        {/* Facture card */}
        <View className="mx-4 bg-white rounded-3xl p-5" style={{ elevation: 3 }}>
          {/* En-tête facture */}
          <View className="border-b border-gray-100 pb-4 mb-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-blue-900 text-lg font-bold">FANDRIO</Text>
                <Text className="text-gray-400 text-xs">Collecte de commission</Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-xs">Réf: COL-{String(c.coll_id).padStart(4, '0')}</Text>
                <Text className="text-gray-400 text-xs">{c.created_at}</Text>
              </View>
            </View>
          </View>

          {/* Compagnie */}
          {c.compagnie_detail && (
            <View className="bg-gray-50 rounded-xl p-3 mb-4">
              <Text className="text-gray-900 font-bold text-sm">{c.compagnie_detail.nom}</Text>
              {c.compagnie_detail.nif && (
                <Text className="text-gray-500 text-xs mt-1">NIF: {c.compagnie_detail.nif}</Text>
              )}
              {c.compagnie_detail.stat && (
                <Text className="text-gray-500 text-xs">STAT: {c.compagnie_detail.stat}</Text>
              )}
              {c.compagnie_detail.email && (
                <Text className="text-gray-500 text-xs">Email: {c.compagnie_detail.email}</Text>
              )}
              {c.compagnie_detail.phone && (
                <Text className="text-gray-500 text-xs">Tél: {c.compagnie_detail.phone}</Text>
              )}
            </View>
          )}

          {/* Période */}
          <View className="flex-row items-center bg-blue-50 rounded-xl p-3 mb-4">
            <Ionicons name="calendar-outline" size={18} color="#2563eb" />
            <Text className="text-blue-700 font-semibold text-sm ml-2">
              Période : {c.periode_debut} → {c.periode_fin}
            </Text>
          </View>

          {/* Détails chiffrés */}
          <View className="border-t border-gray-100 pt-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-500 text-sm">Revenu brut</Text>
              <Text className="text-gray-900 font-semibold">{fmt(c.montant_brut)}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-500 text-sm">Taux commission</Text>
              <Text className="text-gray-900 font-semibold">{c.taux}%</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-500 text-sm">Réservations</Text>
              <Text className="text-gray-900 font-semibold">{c.nb_reservations}</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-500 text-sm">Billets vendus</Text>
              <Text className="text-gray-900 font-semibold">{c.nb_billets}</Text>
            </View>

            <View className="border-t border-dashed border-gray-200 pt-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-900 font-bold text-base">Montant commission</Text>
                <Text className="text-green-600 font-bold text-xl">{fmt(c.montant_commission)}</Text>
              </View>
            </View>
          </View>

          {/* Date prévue & confirmation */}
          <View className="border-t border-gray-100 mt-4 pt-4">
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-400 text-xs">Date prévue</Text>
              <Text className="text-gray-600 text-xs">{c.date_prevue}</Text>
            </View>
            {c.date_confirmation && (
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-400 text-xs">Confirmée le</Text>
                <Text className="text-green-600 text-xs font-semibold">{c.date_confirmation}</Text>
              </View>
            )}
            {c.confirme_par_detail && (
              <View className="flex-row justify-between">
                <Text className="text-gray-400 text-xs">Confirmée par</Text>
                <Text className="text-gray-600 text-xs">{c.confirme_par_detail.prenom} {c.confirme_par_detail.nom}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bouton confirmer si en attente */}
        {c.statut === 1 && (
          <View className="mx-4 mt-4 mb-6">
            <TouchableOpacity
              className="bg-green-600 rounded-2xl py-4 flex-row items-center justify-center"
              style={{ elevation: 3 }}
              onPress={() => handleConfirmerCollecte(c)}
              disabled={confirmingCollecte}
              activeOpacity={0.8}
            >
              {confirmingCollecte ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text className="text-white font-bold text-base ml-2">Confirmer la collecte</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {c.statut === 2 && (
          <View className="mx-4 mt-4 mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
            <View className="ml-3 flex-1">
              <Text className="text-green-800 font-bold">Collecte confirmée</Text>
              <Text className="text-green-600 text-xs mt-0.5">La compagnie a été notifiée du prélèvement.</Text>
            </View>
          </View>
        )}
      </>
    );
  };

  // ── Navigation tabs ──
  const renderNavTabs = () => (
    <View className="mx-4 mt-3 flex-row gap-2">
      <TouchableOpacity
        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${vue === 'dashboard' ? 'bg-blue-600' : 'bg-white'}`}
        onPress={() => setVue('dashboard')}
        style={vue !== 'dashboard' ? { elevation: 1 } : undefined}
      >
        <Ionicons name="stats-chart" size={16} color={vue === 'dashboard' ? '#fff' : '#6b7280'} />
        <Text className={`ml-1.5 text-sm font-semibold ${vue === 'dashboard' ? 'text-white' : 'text-gray-500'}`}>Vue globale</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${vue === 'compagnies' ? 'bg-blue-600' : 'bg-white'}`}
        onPress={() => setVue('compagnies')}
        style={vue !== 'compagnies' ? { elevation: 1 } : undefined}
      >
        <Ionicons name="business" size={16} color={vue === 'compagnies' ? '#fff' : '#6b7280'} />
        <Text className={`ml-1.5 text-sm font-semibold ${vue === 'compagnies' ? 'text-white' : 'text-gray-500'}`}>Compagnies</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center ${vue === 'collectes' ? 'bg-blue-600' : 'bg-white'}`}
        onPress={() => setVue('collectes')}
        style={vue !== 'collectes' ? { elevation: 1 } : undefined}
      >
        <Ionicons name="receipt" size={16} color={vue === 'collectes' ? '#fff' : '#6b7280'} />
        <Text className={`ml-1.5 text-sm font-semibold ${vue === 'collectes' ? 'text-white' : 'text-gray-500'}`}>Collectes</Text>
        {(dashboard?.collectes_en_attente ?? 0) > 0 && (
          <View className="bg-red-500 rounded-full w-5 h-5 items-center justify-center ml-1">
            <Text className="text-white text-xs font-bold">{dashboard?.collectes_en_attente}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <DialogComponent />

      {/* Modal fréquence + jour de collecte */}
      <Modal visible={showFreqModal} transparent animationType="fade" onRequestClose={() => setShowFreqModal(false)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm" style={{ maxHeight: '80%' }}>
            <Text className="text-gray-900 text-lg font-bold mb-1">Configuration de collecte</Text>
            <Text className="text-gray-500 text-sm mb-4">{freqCompagnie?.nom}</Text>

            {/* Fréquence */}
            <Text className="text-gray-700 text-sm font-semibold mb-2">Fréquence</Text>
            {['mensuelle', 'hebdomadaire'].map((f) => (
              <TouchableOpacity
                key={f}
                className={`flex-row items-center p-3 rounded-xl mb-2 ${selectedFreq === f ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
                onPress={() => {
                  setSelectedFreq(f);
                  setSelectedJour('');
                }}
              >
                <Ionicons
                  name={selectedFreq === f ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedFreq === f ? '#2563eb' : '#9ca3af'}
                />
                <Text className={`ml-3 text-sm font-medium capitalize ${selectedFreq === f ? 'text-blue-700' : 'text-gray-700'}`}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Jour de collecte */}
            <Text className="text-gray-700 text-sm font-semibold mt-3 mb-2">
              {selectedFreq === 'hebdomadaire' ? 'Jour de collecte' : 'Date de collecte (1-28)'}
            </Text>

            {selectedFreq === 'hebdomadaire' ? (
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                {JOURS_SEMAINE.map((jour) => (
                  <TouchableOpacity
                    key={jour}
                    className={`flex-row items-center p-3 rounded-xl mb-1 ${selectedJour === jour ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                    onPress={() => setSelectedJour(jour)}
                  >
                    <Ionicons
                      name={selectedJour === jour ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={selectedJour === jour ? '#16a34a' : '#9ca3af'}
                    />
                    <Text className={`ml-2 text-sm capitalize ${selectedJour === jour ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>
                      {jour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap gap-2">
                  {DATES_MOIS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      className={`w-11 h-11 rounded-xl items-center justify-center ${selectedJour === String(d) ? 'bg-green-600' : 'bg-gray-100'}`}
                      onPress={() => setSelectedJour(String(d))}
                    >
                      <Text className={`text-sm font-semibold ${selectedJour === String(d) ? 'text-white' : 'text-gray-700'}`}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Boutons */}
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity className="flex-1 py-3 bg-gray-100 rounded-xl items-center" onPress={() => setShowFreqModal(false)}>
                <Text className="text-gray-500 font-semibold">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 py-3 bg-blue-600 rounded-xl items-center" onPress={handleSaveFrequence}>
                <Text className="text-white font-semibold">Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {!['detail', 'facture'].includes(vue) && renderNavTabs()}
        {vue === 'dashboard' && renderDashboardView()}
        {vue === 'compagnies' && renderCompagniesView()}
        {vue === 'detail' && renderDetailView()}
        {vue === 'collectes' && renderCollectesView()}
        {vue === 'facture' && renderFactureView()}
      </ScrollView>
    </View>
  );
}
