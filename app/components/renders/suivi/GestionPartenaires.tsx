import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/app/components/common/Skeleton';
import { useConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { Recherche } from '@/app/components/flotte/communs';
import { Bouton, Carte, EnTete, ModalPleinEcran, Pastille, Segmente, Texte } from '@/app/components/ui';
import { couleurs } from '@/app/theme/ocean';
import { suiviService, CompagnieSuivi } from '@/app/services/suivi/suiviService';

/**
 * Compagnies partenaires de la compagnie : celles qui accueillent ses voitures à
 * destination. Le lien est réciproque, actif dès l'ajout, et chacune peut le retirer.
 * Une compagnie garde toujours au moins un partenaire.
 */

function Logo({ c }: { c: CompagnieSuivi }) {
  const initiales = c.nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
  return (
    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {c.logo ? <Image source={{ uri: c.logo }} style={{ width: '100%', height: '100%' }} /> : <Texte graisse="tresGras" taille={14} couleur={couleurs.ocean800}>{initiales}</Texte>}
    </View>
  );
}

function LigneCompagnie({ c, premiere, droite }: { c: CompagnieSuivi; premiere: boolean; droite: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: premiere ? 0 : 1, borderTopColor: couleurs.separateur }}>
      <Logo c={c} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texte graisse="tresGras" taille={14} numberOfLines={1}>{c.nom}</Texte>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="location-outline" size={12} color={couleurs.gris} />
          <Texte graisse="moyen" taille={12} couleur={couleurs.gris} numberOfLines={1}>{c.province?.nom || 'Province non renseignée'}</Texte>
        </View>
      </View>
      {droite}
    </View>
  );
}

export function GestionPartenaires({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const [vue, setVue] = useState<'mes' | 'ajouter'>('mes');
  const [partenaires, setPartenaires] = useState<CompagnieSuivi[]>([]);
  const [disponibles, setDisponibles] = useState<CompagnieSuivi[]>([]);
  const [recherche, setRecherche] = useState('');
  const [loading, setLoading] = useState(true);
  const [enCours, setEnCours] = useState<number | null>(null);

  const message = (title: string, msg: string, type: 'success' | 'danger' | 'warning' = 'danger') =>
    showDialog({ title, message: msg, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

  const chargerPartenaires = useCallback(async () => {
    const r = await suiviService.partenaires();
    if (r.statut) setPartenaires(r.data);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setVue('mes');
    setRecherche('');
    setLoading(true);
    chargerPartenaires().finally(() => setLoading(false));
  }, [visible, chargerPartenaires]);

  // Recherche des compagnies à ajouter (légère temporisation pendant la saisie)
  useEffect(() => {
    if (!visible || vue !== 'ajouter') return;
    const t = setTimeout(() => {
      suiviService.compagniesDisponibles(recherche.trim() || undefined).then((r) => r.statut && setDisponibles(r.data));
    }, 250);
    return () => clearTimeout(t);
  }, [visible, vue, recherche]);

  const ajouter = async (c: CompagnieSuivi) => {
    setEnCours(c.id);
    const r = await suiviService.ajouterPartenaire(c.id);
    setEnCours(null);
    if (r.statut) {
      setDisponibles((d) => d.filter((x) => x.id !== c.id));
      await chargerPartenaires();
      message('Partenaire ajouté', `${c.nom} pourra être choisie comme compagnie de réception pour vos voyages vers ${c.province?.nom || 'sa province'}. Elle a été prévenue.`, 'success');
    } else {
      message('Partenaire non ajouté', r.message);
    }
  };

  const retirer = (c: CompagnieSuivi) => {
    if (partenaires.length <= 1) {
      message('Dernier partenaire', 'Votre compagnie doit garder au moins une compagnie partenaire. Ajoutez-en une autre avant de retirer celle-ci.', 'warning');
      return;
    }
    showDialog({
      title: `Retirer ${c.nom} ?`,
      message: `Vous ne recevrez plus le suivi de ses voitures et elle ne recevra plus celui des vôtres. Vos voyages pas encore partis vers ${c.province?.nom || 'sa province'} n'auront plus de compagnie de réception.`,
      type: 'danger',
      confirmText: 'Retirer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        setEnCours(c.id);
        const r = await suiviService.retirerPartenaire(c.id);
        setEnCours(null);
        if (r.statut) await chargerPartenaires();
        else message('Partenaire non retiré', r.message);
      },
      onCancel: () => {},
    });
  };

  return (
    <ModalPleinEcran visible={visible} onClose={onClose}>
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <DialogComponent />
        <EnTete titre="Compagnies partenaires" sousTitre="Elles accueillent vos voitures à destination" gauche="fermer" onGauche={onClose} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Segmente<'mes' | 'ajouter'>
            libelleAccessible="Mes partenaires ou ajouter"
            valeur={vue}
            onChange={setVue}
            options={[
              { valeur: 'mes', libelle: partenaires.length ? `Mes partenaires (${partenaires.length})` : 'Mes partenaires' },
              { valeur: 'ajouter', libelle: 'Ajouter' },
            ]}
          />

          {vue === 'mes' ? (
            <>
              <Carte style={{ flexDirection: 'row', gap: 10, backgroundColor: couleurs.ocean50 }}>
                <Ionicons name="information-circle-outline" size={20} color={couleurs.ocean800} />
                <Texte graisse="moyen" taille={12.5} couleur={couleurs.encreDouce} style={{ flex: 1, lineHeight: 18 }}>
                  En planifiant un voyage, vous choisissez la compagnie partenaire située dans la province d'arrivée. Au départ, elle reçoit le véhicule, le chauffeur et la liste des voyageurs, puis confirme l'arrivée.
                </Texte>
              </Carte>

              {loading ? (
                <Skeleton height={140} borderRadius={16} />
              ) : partenaires.length === 0 ? (
                <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
                  <Ionicons name="people-outline" size={30} color={couleurs.alerte} />
                  <Texte graisse="tresGras" taille={15} centre>Aucune compagnie partenaire</Texte>
                  <Texte variante="legende" centre>Ajoutez au moins une compagnie pour suivre vos voitures jusqu'à destination.</Texte>
                  <Bouton titre="Ajouter une compagnie" compact icone="add" onPress={() => setVue('ajouter')} style={{ marginTop: 4 }} />
                </Carte>
              ) : (
                <Carte padding={0}>
                  {partenaires.map((c, i) => (
                    <LigneCompagnie
                      key={c.id}
                      c={c}
                      premiere={i === 0}
                      droite={
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          {c.ajoute_par === 'partenaire' && <Pastille libelle="Vous a ajoutée" tonalite="info" point={false} />}
                          <Bouton titre="Retirer" variante="danger" compact onPress={() => retirer(c)} chargement={enCours === c.id} />
                        </View>
                      }
                    />
                  ))}
                </Carte>
              )}
            </>
          ) : (
            <>
              <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom de la compagnie ou province" />
              {disponibles.length === 0 ? (
                <Carte style={{ alignItems: 'center', gap: 6, paddingVertical: 22 }}>
                  <Texte graisse="tresGras" taille={14.5} centre>{recherche ? 'Aucune compagnie trouvée' : 'Aucune autre compagnie à ajouter'}</Texte>
                  <Texte variante="legende" centre>Seules les compagnies actives sur FANDRIO peuvent être ajoutées.</Texte>
                </Carte>
              ) : (
                <Carte padding={0}>
                  {disponibles.map((c, i) => (
                    <LigneCompagnie
                      key={c.id}
                      c={c}
                      premiere={i === 0}
                      droite={<Bouton titre="Ajouter" compact icone="add" onPress={() => ajouter(c)} chargement={enCours === c.id} />}
                    />
                  ))}
                </Carte>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </ModalPleinEcran>
  );
}

export default GestionPartenaires;
