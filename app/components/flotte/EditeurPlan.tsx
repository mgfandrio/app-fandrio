import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { voitureService } from '../../services';
import { useConfirmDialog } from '../common/ConfirmDialog';
import { Bouton, Carte, dispositionMinibus, EnTete, ModalPleinEcran, Segmente, Texte } from '../ui';
import { couleurs } from '../../theme/ocean';

/**
 * Éditeur du plan de sièges d'un véhicule.
 * La compagnie dessine son véhicule case par case : touchez une case vide pour
 * y mettre un siège, touchez un siège pour le retirer. Les sièges sont numérotés
 * automatiquement de l'avant vers l'arrière, de gauche à droite.
 *
 * Cases : 'C' chauffeur, 'S' siège, '-' vide ou couloir.
 */

type CaseEdit = 'C' | 'S' | '-';
type Grille = CaseEdit[][];
type PlaceChauffeur = 'gauche' | 'droite' | 'aucun';

/** Grille de l'API ('C', '' ou numéro) → cases de l'éditeur. */
export function grilleDepuisApi(g: string[][]): Grille {
  return g.map((r) => r.map((c): CaseEdit => (c === 'C' ? 'C' : c ? 'S' : '-')));
}

/** Disposition standard de minibus pour n places. */
function modeleMinibus(n: number): Grille {
  const codes = Array.from({ length: Math.max(n, 1) }, (_, i) => String(i + 1));
  return dispositionMinibus(codes).map((r) => r.map((c): CaseEdit => (c.type === 'chauffeur' ? 'C' : c.type === 'siege' ? 'S' : '-')));
}

/** Bus « gauche + couloir + droite », chauffeur devant à gauche, banquette arrière pleine. */
function modeleBus(n: number, gauche: number, droite: number): Grille {
  const largeur = gauche + 1 + droite;
  const grille: Grille = [['C', ...Array<CaseEdit>(largeur - 1).fill('-')]];
  let restant = Math.max(n, 1);
  // Banquette arrière : toute la largeur si elle peut être remplie
  const banquette = restant > largeur ? largeur : 0;
  restant -= banquette;
  while (restant > 0) {
    const r: CaseEdit[] = [];
    for (let c = 0; c < largeur; c++) {
      if (c === gauche) r.push('-');
      else if (restant > 0) {
        r.push('S');
        restant--;
      } else r.push('-');
    }
    grille.push(r);
  }
  if (banquette) grille.push(Array<CaseEdit>(largeur).fill('S'));
  return grille;
}

function compterPlaces(g: Grille) {
  return g.reduce((t, r) => t + r.filter((c) => c === 'S').length, 0);
}

function placeChauffeur(g: Grille): PlaceChauffeur {
  const r = g[0] || [];
  if (r[0] === 'C') return 'gauche';
  if (r[r.length - 1] === 'C') return 'droite';
  return g.some((l) => l.includes('C')) ? 'gauche' : 'aucun';
}

function Volant({ taille }: { taille: number }) {
  return (
    <Svg width={taille * 0.6} height={taille * 0.6} viewBox="0 0 24 24" fill="none" stroke={couleurs.gris} strokeWidth={1.8} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={12} cy={12} r={2.2} />
      <Path d="M3.5 10.5h6.3M14.2 10.5h6.3M12 14.2V21" />
    </Svg>
  );
}

interface Props {
  visible: boolean;
  voitureId: number;
  titre: string;
  /** Grille actuelle (API), ou null : on part de la disposition standard. */
  grilleInitiale: string[][] | null;
  placesActuelles: number;
  onClose: () => void;
  onEnregistre: () => void;
}

function EditeurPlanContenu({ visible, voitureId, titre, grilleInitiale, placesActuelles, onClose, onEnregistre }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { showDialog, DialogComponent } = useConfirmDialog();
  const depart = useMemo(
    () => (grilleInitiale?.length ? grilleDepuisApi(grilleInitiale) : modeleMinibus(placesActuelles || 16)),
    [grilleInitiale, placesActuelles]
  );
  const [grille, setGrille] = useState<Grille>(depart);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (visible) setGrille(depart);
  }, [visible, depart]);

  const largeur = grille[0]?.length || 4;
  const places = compterPlaces(grille);
  const modifie = JSON.stringify(grille) !== JSON.stringify(depart);
  const chauffeur = placeChauffeur(grille);

  // Taille d'une case : le plan tient dans la largeur de l'écran
  const ecart = 8;
  const taille = Math.min(52, Math.floor((width - 32 - 28 - 36 - (largeur - 1) * ecart) / largeur));

  // Numéro de chaque siège, dans l'ordre de lecture
  const numeros = useMemo(() => {
    let n = 0;
    return grille.map((r) => r.map((c) => (c === 'S' ? ++n : 0)));
  }, [grille]);

  const basculer = (r: number, c: number) =>
    setGrille((g) => g.map((l, i) => (i !== r ? l : l.map((x, j) => (j !== c || x === 'C' ? x : x === 'S' ? '-' : 'S')))));

  const changerLargeur = (n: number) =>
    setGrille((g) =>
      g.map((l) => {
        if (n > l.length) return [...l, ...Array<CaseEdit>(n - l.length).fill('-')];
        const coupe = l.slice(0, n);
        // Le chauffeur à droite reste à droite
        if (l[l.length - 1] === 'C' && !coupe.includes('C')) coupe[n - 1] = 'C';
        return coupe;
      })
    );

  const ajouterRangee = () => setGrille((g) => [...g, (g[g.length - 1] || []).map((c): CaseEdit => (c === 'C' ? '-' : c))]);
  const retirerRangee = () => setGrille((g) => (g.length > 1 ? g.slice(0, -1) : g));

  const deplacerChauffeur = (p: PlaceChauffeur) =>
    setGrille((g) =>
      g.map((l, i) => {
        const sans = l.map((c): CaseEdit => (c === 'C' ? '-' : c));
        if (i !== 0 || p === 'aucun') return sans;
        const k = p === 'gauche' ? 0 : sans.length - 1;
        sans[k] = 'C';
        return sans;
      })
    );

  const appliquerModele = (g: Grille) => {
    const n = places || placesActuelles || 16;
    showDialog({
      title: 'Remplacer le plan ?',
      message: `Le plan actuel sera remplacé par ce modèle (${n} places). Vous pourrez ensuite l’ajuster case par case.`,
      type: 'warning',
      confirmText: 'Remplacer',
      cancelText: 'Retour',
      onConfirm: () => setGrille(g),
      onCancel: () => {},
    });
  };

  const fermer = () => {
    if (!modifie) return onClose();
    showDialog({
      title: 'Abandonner les modifications ?',
      message: 'Le plan n’a pas été enregistré.',
      type: 'warning',
      confirmText: 'Abandonner',
      cancelText: 'Continuer',
      onConfirm: onClose,
      onCancel: () => {},
    });
  };

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const r = await voitureService.enregistrerGrille(voitureId, grille);
      if (r?.statut) {
        onEnregistre();
        onClose();
      } else {
        showDialog({ title: 'Plan non enregistré', message: r?.message || 'Une erreur est survenue.', type: 'danger', confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });
      }
    } finally {
      setEnvoi(false);
    }
  };

  const confirmer = () => {
    if (places === placesActuelles) return enregistrer();
    showDialog({
      title: `Passer à ${places} places ?`,
      message: `Le véhicule passe de ${placesActuelles} à ${places} places. Les voyages à venir de ce véhicule sont mis à jour ; les billets déjà vendus gardent leur numéro de siège.`,
      type: 'warning',
      confirmText: 'Enregistrer',
      cancelText: 'Retour',
      onConfirm: enregistrer,
      onCancel: () => {},
    });
  };

  const n = places || placesActuelles || 16;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={couleurs.surface} />
      <DialogComponent />
      <View style={{ flex: 1, backgroundColor: couleurs.fond }}>
        <EnTete
          titre="Plan de sièges"
          sousTitre={titre}
          gauche="fermer"
          onGauche={fermer}
          droite={
            <View style={{ paddingHorizontal: 10, height: 30, borderRadius: 999, backgroundColor: couleurs.ocean50, justifyContent: 'center' }}>
              <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean800}>{places} place{places > 1 ? 's' : ''}</Texte>
            </View>
          }
        />

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
          {/* Modèles */}
          <View style={{ gap: 8 }}>
            <Texte variante="etiquette" style={{ marginLeft: 2 }}>Partir d’un modèle</Texte>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { l: 'Minibus', d: '2 + 1', g: () => modeleMinibus(n) },
                { l: 'Bus', d: '2 + 2', g: () => modeleBus(n, 2, 2) },
                { l: 'Bus', d: '2 + 1', g: () => modeleBus(n, 2, 1) },
              ].map((m) => (
                <Carte key={m.l + m.d} onPress={() => appliquerModele(m.g())} accessibilityLabel={`Modèle ${m.l} ${m.d}`} padding={10} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                  <Texte graisse="tresGras" taille={13.5}>{m.l}</Texte>
                  <Texte graisse="moyen" taille={12} couleur={couleurs.gris}>{m.d}</Texte>
                </Carte>
              ))}
            </View>
          </View>

          {/* Plan à dessiner */}
          <Carte style={{ alignItems: 'center', gap: 12 }}>
            <Texte variante="legende" centre>Touchez une case vide pour ajouter un siège, un siège pour le retirer.</Texte>
            <View
              style={{
                backgroundColor: couleurs.surface,
                borderWidth: 2,
                borderColor: couleurs.champ,
                borderTopLeftRadius: 40,
                borderTopRightRadius: 40,
                borderBottomLeftRadius: 18,
                borderBottomRightRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 12,
                alignItems: 'center',
                gap: ecart,
              }}
            >
              <View style={{ width: '70%', height: 8, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: '#E3EDF7' }} />
              {grille.map((rangee, r) => (
                <View key={r} style={{ flexDirection: 'row', gap: ecart }}>
                  {rangee.map((c, k) =>
                    c === 'C' ? (
                      <View key={k} accessible accessibilityLabel="Chauffeur" style={{ width: taille, height: taille, alignItems: 'center', justifyContent: 'center' }}>
                        <Volant taille={taille} />
                      </View>
                    ) : (
                      <Pressable
                        key={k}
                        onPress={() => basculer(r, k)}
                        accessibilityRole="button"
                        accessibilityLabel={c === 'S' ? `Siège ${numeros[r][k]}, rangée ${r + 1} : retirer` : `Case vide, rangée ${r + 1} : ajouter un siège`}
                        style={
                          c === 'S'
                            ? { width: taille, height: taille, borderRadius: taille * 0.22, borderWidth: 1.5, borderColor: couleurs.ocean800, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }
                            : { width: taille, height: taille, borderRadius: taille * 0.22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: couleurs.champ, alignItems: 'center', justifyContent: 'center' }
                        }
                      >
                        {c === 'S' ? (
                          <Texte graisse="tresGras" taille={taille >= 44 ? 15 : 13} couleur="#FFFFFF" style={{ fontVariant: ['tabular-nums'] }}>{numeros[r][k]}</Texte>
                        ) : (
                          <Ionicons name="add" size={16} color={couleurs.grisClair} />
                        )}
                      </Pressable>
                    )
                  )}
                </View>
              ))}
              <Texte variante="etiquette" couleur="#8A99AD">Arrière</Texte>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch' }}>
              <Bouton titre="Rangée" icone="add" variante="secondaire" compact onPress={ajouterRangee} desactive={grille.length >= 25} style={{ flex: 1 }} />
              <Bouton titre="Rangée" icone="remove" variante="secondaire" compact onPress={retirerRangee} desactive={grille.length <= 1} style={{ flex: 1 }} />
            </View>
          </Carte>

          {/* Réglages */}
          <Carte style={{ gap: 14 }}>
            <View style={{ gap: 8 }}>
              <Texte graisse="tresGras" taille={14}>Cases par rangée</Texte>
              <Segmente<string>
                libelleAccessible="Cases par rangée"
                valeur={String(largeur)}
                onChange={(v) => changerLargeur(Number(v))}
                options={['3', '4', '5', '6'].map((v) => ({ valeur: v, libelle: v }))}
              />
              <Texte variante="legende">Couloir compris : une colonne laissée vide sert de couloir.</Texte>
            </View>
            <View style={{ gap: 8 }}>
              <Texte graisse="tresGras" taille={14}>Place du chauffeur</Texte>
              <Segmente<PlaceChauffeur>
                libelleAccessible="Place du chauffeur"
                valeur={chauffeur}
                onChange={deplacerChauffeur}
                options={[
                  { valeur: 'gauche', libelle: 'À gauche' },
                  { valeur: 'droite', libelle: 'À droite' },
                  { valeur: 'aucun', libelle: 'Masquée' },
                ]}
              />
            </View>
          </Carte>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Ionicons name="information-circle-outline" size={18} color={couleurs.ocean800} />
            <Texte graisse="moyen" taille={12.5} couleur={couleurs.gris} style={{ flex: 1, lineHeight: 18 }}>
              Les sièges sont numérotés automatiquement de 1 à {places}, de l’avant vers l’arrière. Les clients voient exactement ce plan au moment de réserver.
            </Texte>
          </View>
        </ScrollView>

        <View style={{ backgroundColor: couleurs.surface, borderTopWidth: 1, borderTopColor: couleurs.ligne, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
          <Bouton titre="Enregistrer le plan" onPress={confirmer} chargement={envoi} desactive={!modifie || places === 0} />
        </View>
      </View>
    </>
  );
}

/** Éditeur de plan dans sa propre fenêtre, avec les bonnes marges de sécurité. */
export function EditeurPlan(props: Props) {
  return (
    <ModalPleinEcran visible={props.visible} onClose={props.onClose}>
      <EditeurPlanContenu {...props} />
    </ModalPleinEcran>
  );
}

export default EditeurPlan;
