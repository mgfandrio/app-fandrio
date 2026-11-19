import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { versementService } from '@/app/services/versements/versementService';
import { Skeleton } from '@/app/components/common/Skeleton';
import { useConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { Bouton, Carte, EnTete, FeuilleModale, Segmente, Texte } from '@/app/components/ui';
import { ChampChoix, FeuilleChoix } from '@/app/components/voyages/FeuilleChoix';
import { ChampDateHeure } from '@/app/components/voyages/ChampDateHeure';
import { couleurs, dateLocaleISO, formatAriary } from '@/app/theme/ocean';

type Etat = 'en_cours' | 'regles' | 'tous';

const ETATS: Record<string, { libelle: string; fond: string; texte: string; bord: string }> = {
  en_vente: { libelle: 'Pas encore parti', fond: couleurs.neutreFond, texte: couleurs.neutre, bord: couleurs.ocean100 },
  en_attente: { libelle: 'Parti sous 50 %', fond: couleurs.ocean50, texte: couleurs.ocean800, bord: couleurs.ocean200 },
  a_regler: { libelle: 'À régler', fond: couleurs.alerteFond, texte: couleurs.alerte, bord: couleurs.alerteVif },
  retard: { libelle: 'En retard', fond: couleurs.dangerFond, texte: couleurs.danger, bord: couleurs.danger },
  regle: { libelle: 'Réglé', fond: couleurs.succesFond, texte: couleurs.succes, bord: couleurs.succesVif },
};

const dateFr = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const pourcent = (n: number) => `${String(n).replace('.', ',')} %`;

function raisonInactif(v: any): string {
  if (v.etat === 'en_vente') return 'Disponible au départ, dès 50 %';
  if (v.etat === 'en_attente') return 'Parti sous 50 % : réglable demain';
  return '';
}

function Ligne({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: couleurs.separateur }}>
      <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris} style={{ flex: 1 }}>{libelle}</Texte>
      <Texte graisse={fort ? 'tresGras' : 'gras'} taille={13.5}>{valeur}</Texte>
    </View>
  );
}

/** Onglet « Versements » : part des chauffeurs des voitures de particuliers, voyage par voyage. */
export const RenderVersements = ({ onMenu }: { onMenu?: () => void }) => {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [etat, setEtat] = useState<Etat>('en_cours');
  const [voiture, setVoiture] = useState('');
  const [chauffeur, setChauffeur] = useState('');
  const [trajet, setTrajet] = useState('');
  const [du, setDu] = useState<Date | null>(null);
  const [au, setAu] = useState<Date | null>(null);
  const [feuilleFiltres, setFeuilleFiltres] = useState(false);
  const [choix, setChoix] = useState<null | 'voiture' | 'chauffeur' | 'trajet'>(null);

  const [lignes, setLignes] = useState<any[]>([]);
  const [resume, setResume] = useState<any>(null);
  const [options, setOptions] = useState<any>({ voitures: [], chauffeurs: [], trajets: [] });
  const [page, setPage] = useState({ courante: 1, derniere: 1 });
  const [loading, setLoading] = useState(true);
  const [suite, setSuite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [envoi, setEnvoi] = useState(false);
  const requete = useRef(0);

  const nbFiltres = [voiture, chauffeur, trajet, du, au].filter(Boolean).length;

  const charger = useCallback(
    async (numero = 1) => {
      const n = ++requete.current;
      const r = await versementService.lister({
        etat,
        page: numero,
        voit_id: voiture ? Number(voiture) : undefined,
        chauffeur: chauffeur || undefined,
        traj_id: trajet ? Number(trajet) : undefined,
        du: du ? dateLocaleISO(du) : undefined,
        au: au ? dateLocaleISO(au) : undefined,
      });
      if (n !== requete.current || !r.statut) return;
      setLignes((l) => (numero === 1 ? r.data?.versements || [] : [...l, ...(r.data?.versements || [])]));
      setResume(r.data?.resume || null);
      setOptions(r.data?.filtres || { voitures: [], chauffeurs: [], trajets: [] });
      setPage({ courante: r.data?.pagination?.current_page || numero, derniere: r.data?.pagination?.last_page || numero });
    },
    [etat, voiture, chauffeur, trajet, du, au]
  );

  useEffect(() => {
    setLoading(true);
    charger(1).finally(() => setLoading(false));
  }, [charger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await charger(1);
    setRefreshing(false);
  };
  const plus = () => {
    if (suite || loading || page.courante >= page.derniere) return;
    setSuite(true);
    charger(page.courante + 1).finally(() => setSuite(false));
  };

  const confirmerReglement = (v: any) =>
    showDialog({
      title: 'Marquer comme réglé ?',
      message: `Vous confirmez que ${v.chauffeur?.nom || 'le chauffeur'} a bien reçu ${formatAriary(v.part_chauffeur)} Ar pour ce voyage. Cette action est enregistrée à votre nom.`,
      type: 'success',
      confirmText: 'Oui, c’est réglé',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setEnvoi(true);
        const r = await versementService.regler(v.id);
        setEnvoi(false);
        if (r.statut) {
          setDetail(null);
          await charger(1);
          showDialog({ title: 'Versement réglé', message: r.message || 'Le versement est réglé.', type: 'success', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
        } else {
          showDialog({ title: 'Règlement impossible', message: r.message || 'Une erreur est survenue.', type: 'danger', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
        }
      },
      onCancel: () => {},
    });

  const voitureChoisie = options.voitures?.find((v: any) => String(v.id) === voiture);
  const trajetChoisi = options.trajets?.find((t: any) => String(t.id) === trajet);

  return (
    <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
      <DialogComponent />
      <EnTete
        titre="Versements"
        sousTitre="Part des chauffeurs · voitures de particuliers"
        gauche="menu"
        onGauche={onMenu}
        droite={
          <Pressable
            onPress={() => setFeuilleFiltres(true)}
            accessibilityRole="button"
            accessibilityLabel={`Filtres${nbFiltres ? `, ${nbFiltres} actifs` : ''}`}
            style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: couleurs.ligne, backgroundColor: couleurs.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="options-outline" size={21} color={couleurs.ocean950} />
            {nbFiltres > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Texte graisse="tresGras" taille={10} couleur="#FFFFFF">{nbFiltres}</Texte>
              </View>
            )}
          </Pressable>
        }
      />
      <FlatList
        data={loading ? [] : lignes}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={couleurs.ocean800} colors={[couleurs.ocean800]} />}
        onEndReached={plus}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: couleurs.ocean950, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Texte graisse="gras" taille={12} couleur={couleurs.texteSurMarine}>À verser</Texte>
                <Texte variante="montant" taille={24} couleur="#FFFFFF">
                  {resume ? formatAriary(resume.a_regler) : '…'} <Texte graisse="tresGras" taille={13} couleur={couleurs.texteSurMarine}>Ar</Texte>
                </Texte>
                <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>{resume ? `${resume.nb_a_regler} voyage${resume.nb_a_regler > 1 ? 's' : ''}` : ''}</Texte>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
              <View style={{ flex: 0.7 }}>
                <Texte graisse="gras" taille={12} couleur="#FFB4AC">En retard</Texte>
                <Texte variante="montant" taille={24} couleur="#FFFFFF">{resume ? resume.nb_retard : '…'}</Texte>
                <Texte graisse="moyen" taille={12} couleur={couleurs.texteSurMarine}>voyages passés</Texte>
              </View>
            </View>
            <Segmente<Etat>
              libelleAccessible="Versements affichés"
              valeur={etat}
              onChange={setEtat}
              options={[
                { valeur: 'en_cours', libelle: 'À régler' },
                { valeur: 'regles', libelle: 'Réglés' },
                { valeur: 'tous', libelle: 'Tous' },
              ]}
            />
            {loading && <Skeleton height={300} borderRadius={16} />}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
              <Ionicons name="swap-horizontal-outline" size={34} color={couleurs.grisClair} />
              <Texte graisse="tresGras" taille={15}>Aucun versement</Texte>
              <Texte variante="legende" centre>
                {nbFiltres ? 'Aucun versement ne correspond à ces filtres.' : 'Les versements apparaissent pour les voitures déclarées « à un particulier ».'}
              </Texte>
            </View>
          )
        }
        ListFooterComponent={suite ? <ActivityIndicator color={couleurs.ocean800} style={{ paddingVertical: 14 }} /> : null}
        renderItem={({ item: v }) => {
          const e = ETATS[v.etat] || ETATS.en_vente;
          return (
            <Pressable onPress={() => setDetail(v)} accessibilityRole="button" accessibilityLabel={`Versement ${v.trajet?.libelle}, ${e.libelle}`}>
              <Carte style={{ gap: 10, borderLeftWidth: 4, borderLeftColor: e.bord }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Texte graisse="tresGras" taille={14.5} numberOfLines={1}>{v.trajet?.libelle}</Texte>
                    <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>
                      {dateFr(v.date)} {v.heure} · {v.voiture?.matricule} · {v.chauffeur?.nom || 'Sans chauffeur'}
                    </Texte>
                  </View>
                  <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: e.fond, justifyContent: 'center' }}>
                    <Texte graisse="tresGras" taille={11} couleur={e.texte}>{e.libelle}</Texte>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: couleurs.ocean50, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(v.remplissage, 100)}%`, height: '100%', backgroundColor: v.remplissage >= 50 ? couleurs.succesVif : couleurs.alerteVif }} />
                  </View>
                  <Texte graisse="gras" taille={12} couleur={couleurs.encreDouce}>{v.nb_sieges}/{v.nb_places} · {v.remplissage} %</Texte>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <View>
                    <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Part du chauffeur</Texte>
                    <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>compagnie {pourcent(v.taux_compagnie)} · {formatAriary(v.part_compagnie)} Ar</Texte>
                  </View>
                  <Texte variante="montant" taille={18}>{formatAriary(v.part_chauffeur)} Ar</Texte>
                </View>
                {v.etat === 'regle' ? (
                  <Texte graisse="gras" taille={12.5} couleur={couleurs.succes}>Réglé le {dateFr(v.regle_le)} à {String(v.regle_le).slice(11, 16)} par {v.regle_par || '—'}</Texte>
                ) : (
                  <Bouton titre={v.reglable ? 'Marquer comme réglé' : raisonInactif(v)} variante={v.reglable ? 'succes' : 'secondaire'} desactive={!v.reglable || envoi} compact onPress={() => confirmerReglement(v)} />
                )}
              </Carte>
            </Pressable>
          );
        }}
      />

      {/* Détail d'un versement */}
      <FeuilleModale visible={!!detail} onClose={() => setDetail(null)} titre="Versement du voyage" sousTitre={detail ? `${detail.trajet?.libelle} · ${dateFr(detail.date)} ${detail.heure}` : undefined}>
        {detail && (
          <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, gap: 12 }}>
            <Carte style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: couleurs.ocean50, borderColor: couleurs.ocean100 }}>
              <View style={{ flex: 1 }}>
                <Texte graisse="tresGras" taille={14.5}>{detail.chauffeur?.nom || 'Sans chauffeur'}</Texte>
                <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris}>{[detail.chauffeur?.telephone, `voiture ${detail.voiture?.matricule}`].filter(Boolean).join(' · ')}</Texte>
              </View>
              <Texte graisse="tresGras" taille={12} couleur={couleurs.ocean800}>Compagnie {pourcent(detail.taux_compagnie)}</Texte>
            </Carte>
            <View>
              <Ligne libelle="Sièges vendus" valeur={`${detail.nb_sieges} sur ${detail.nb_places} · ${detail.remplissage} %`} />
              <Ligne libelle="Ventes" valeur={`${formatAriary(detail.montant_ventes)} Ar`} />
              <Ligne libelle="Commission FANDRIO (ventes en ligne)" valeur={`− ${formatAriary(detail.commission_fandrio)} Ar`} />
              <Ligne libelle={`Part de la compagnie (${pourcent(detail.taux_compagnie)})`} valeur={`${formatAriary(detail.part_compagnie)} Ar`} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', backgroundColor: couleurs.ocean950, borderRadius: 16, padding: 16 }}>
              <Texte graisse="gras" taille={14} couleur="#FFFFFF">{detail.etat === 'regle' ? 'Versé au chauffeur' : 'À verser au chauffeur'}</Texte>
              <Texte variante="montant" taille={22} couleur="#FFFFFF">{formatAriary(detail.part_chauffeur)} Ar</Texte>
            </View>
            {detail.etat === 'regle' ? (
              <Texte graisse="gras" taille={13} couleur={couleurs.succes}>Réglé le {dateFr(detail.regle_le)} à {String(detail.regle_le).slice(11, 16)} par {detail.regle_par || '—'}.</Texte>
            ) : (
              <Bouton titre={detail.reglable ? 'Marquer comme réglé' : raisonInactif(detail)} variante={detail.reglable ? 'succes' : 'secondaire'} desactive={!detail.reglable || envoi} chargement={envoi} onPress={() => confirmerReglement(detail)} />
            )}
            {!!detail.fige_le && (
              <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>Montants, voiture et chauffeur enregistrés au départ, le {dateFr(detail.fige_le)} à {String(detail.fige_le).slice(11, 16)}.</Texte>
            )}
          </View>
        )}
      </FeuilleModale>

      {/* Filtres */}
      <FeuilleModale
        visible={feuilleFiltres}
        onClose={() => setFeuilleFiltres(false)}
        titre="Filtrer les versements"
        pied={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Bouton titre="Effacer" variante="secondaire" desactive={!nbFiltres} onPress={() => { setVoiture(''); setChauffeur(''); setTrajet(''); setDu(null); setAu(null); }} />
            </View>
            <View style={{ flex: 1 }}>
              <Bouton titre="Voir les résultats" onPress={() => setFeuilleFiltres(false)} />
            </View>
          </View>
        }
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
          <ChampChoix libelle="Voiture (matricule)" icone="bus-outline" titre={voitureChoisie?.matricule} placeholder="Toutes les voitures" onPress={() => setChoix('voiture')} />
          <ChampChoix libelle="Chauffeur" icone="person-outline" titre={chauffeur || undefined} placeholder="Tous les chauffeurs" onPress={() => setChoix('chauffeur')} />
          <ChampChoix libelle="Trajet" icone="map-outline" titre={trajetChoisi?.libelle} placeholder="Tous les trajets" onPress={() => setChoix('trajet')} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <ChampDateHeure libelle="Voyages du" mode="date" valeur={du} affichage={du ? dateFr(dateLocaleISO(du)) : undefined} placeholder="Date" onChange={setDu} />
            </View>
            <View style={{ flex: 1 }}>
              <ChampDateHeure libelle="au" mode="date" valeur={au} affichage={au ? dateFr(dateLocaleISO(au)) : undefined} placeholder="Date" onChange={setAu} />
            </View>
          </View>
        </View>
      </FeuilleModale>
      <FeuilleChoix
        visible={choix === 'voiture'}
        onClose={() => setChoix(null)}
        titre="Voiture"
        recherche="Rechercher un matricule"
        valeur={voiture}
        onChoisir={(v) => { setVoiture(v === voiture ? '' : v); setChoix(null); }}
        options={[{ id: '', titre: 'Toutes les voitures' }, ...(options.voitures || []).map((v: any) => ({ id: String(v.id), titre: v.matricule }))]}
      />
      <FeuilleChoix
        visible={choix === 'chauffeur'}
        onClose={() => setChoix(null)}
        titre="Chauffeur"
        recherche="Rechercher un chauffeur"
        valeur={chauffeur}
        onChoisir={(v) => { setChauffeur(v); setChoix(null); }}
        options={[{ id: '', titre: 'Tous les chauffeurs' }, ...(options.chauffeurs || []).map((n: string) => ({ id: n, titre: n }))]}
      />
      <FeuilleChoix
        visible={choix === 'trajet'}
        onClose={() => setChoix(null)}
        titre="Trajet"
        recherche="Rechercher un trajet"
        valeur={trajet}
        onChoisir={(v) => { setTrajet(v); setChoix(null); }}
        options={[{ id: '', titre: 'Tous les trajets' }, ...(options.trajets || []).map((t: any) => ({ id: String(t.id), titre: t.libelle }))]}
      />
    </View>
  );
};

export default RenderVersements;
