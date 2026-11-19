import { File } from 'expo-file-system/next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';
import { reservationAdminService } from '../services/reservations/reservationAdminService';
import { dispositionGrille, dispositionMinibus } from '../components/ui/PlanSieges';

/**
 * Génère et partage un PDF "Fiche Voyageurs" pour un voyage donné.
 * Ce document est destiné aux chauffeurs pour les contrôles routiers.
 */
export const genererFicheVoyageurs = async (voyage: any): Promise<void> => {
  try {
    // 1. Récupérer les voyageurs et le plan de la voiture depuis l'API
    const [res, resPlan] = await Promise.all([
      reservationAdminService.obtenirVoyageurs(voyage.voyage_id),
      reservationAdminService.obtenirPlanSieges(voyage.voyage_id).catch(() => null),
    ]);
    if (!res.statut || !res.data?.voyageurs) {
      Alert.alert('Erreur', 'Impossible de récupérer la liste des voyageurs.');
      return;
    }

    const voyageurs = res.data.voyageurs || [];
    const voyageInfo = res.data.voyage || {};

    if (voyageurs.length === 0) {
      Alert.alert('Aucun voyageur', 'Ce voyage ne contient aucun voyageur enregistré.');
      return;
    }

    // 2. Construire le HTML pour le PDF
    const trajet = voyageInfo.trajet || `${voyage.trajet?.province_depart || ''} → ${voyage.trajet?.province_arrivee || ''}`;
    const date = voyageInfo.date || voyage.date || '';
    const heure = voyageInfo.heure || voyage.heure_depart || '';
    const voitureMatricule = voyage.voiture?.matricule || resPlan?.data?.voiture?.matricule || '';
    const nomChauffeur: string = resPlan?.data?.voiture?.chauffeur || '';
    const planHtml = construirePlanHtml(resPlan?.data, voyageurs, nomChauffeur);

    // Récupérer le nom de la compagnie depuis SecureStore
    let nomCompagnie = '';
    try {
      const userJson = await SecureStore.getItemAsync('fandrioUser');
      if (userJson) {
        const userData = JSON.parse(userJson);
        nomCompagnie = userData?.compagnie?.nom || '';
      }
    } catch { }

    const now = new Date();
    const dateGeneration = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} à ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const rowsHtml = voyageurs.map((v: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td class="bold">${escapeHtml(v.prenom || '')} ${escapeHtml(v.nom || '')}</td>
        <td class="center">${v.cin || '—'}</td>
        <td class="center">${v.phone || '—'}</td>
        <td class="center">${v.siege || '—'}</td>
        <td class="center">${v.age ? v.age + ' ans' : '—'}</td>
        <td>${v.reservation_numero || '—'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 24px; color: #1e293b; font-size: 11px; }
          
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 3px solid #c2410c; }
          .header h1 { font-size: 20px; color: #c2410c; margin-bottom: 4px; letter-spacing: 1px; }
          .header .company { font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 6px; }
          .header .subtitle { font-size: 12px; color: #64748b; }
          
          .info-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; padding: 12px; background: #fef7f0; border-radius: 8px; border: 1px solid #fed7aa; }
          .info-item { flex: 1 1 45%; min-width: 200px; }
          .info-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; }
          .info-value { font-size: 12px; font-weight: bold; color: #1e293b; margin-top: 2px; }
          
          .legal-notice { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 9px; color: #92400e; }
          .legal-notice strong { color: #78350f; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          thead th { background: #c2410c; color: white; padding: 8px 6px; text-align: left; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          thead th:first-child { border-radius: 6px 0 0 0; }
          thead th:last-child { border-radius: 0 6px 0 0; }
          tbody tr { border-bottom: 1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          tbody td { padding: 7px 6px; font-size: 10px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          
          .footer { margin-top: 24px; padding-top: 12px; border-top: 2px solid #e2e8f0; }
          .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
          .signature-box { width: 45%; text-align: center; }
          .signature-line { border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 6px; font-size: 10px; color: #64748b; }
          
          .total-badge { display: inline-block; background: #c2410c; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 11px; margin-bottom: 12px; }
          
          .generation-info { text-align: center; font-size: 8px; color: #94a3b8; margin-top: 16px; }

          .plan-page { page-break-after: always; }
          .plan-titre { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-bottom: 6px; }
          table.plan { border-collapse: separate; border-spacing: 6px; table-layout: fixed; margin: 0; }
          table.plan td { height: 64px; vertical-align: top; padding: 5px 6px; border-radius: 6px; }
          table.plan td.chauffeur { background: #1e293b; color: #fff; border: 2px solid #1e293b; }
          table.plan td.occupe { background: #fef7f0; border: 2px solid #c2410c; }
          table.plan td.libre { border: 2px dashed #cbd5e1; color: #94a3b8; }
          table.plan .num { font-size: 13px; font-weight: bold; }
          table.plan .nom { font-size: 9.5px; font-weight: bold; line-height: 1.2; word-break: break-word; }
          table.plan .petit { font-size: 9px; }
          .plan-legende { font-size: 9px; color: #64748b; margin-top: 8px; }
        </style>
      </head>
      <body>
        ${planHtml}
        <div class="header">
          ${nomCompagnie ? `<div class="company">${escapeHtml(nomCompagnie)}</div>` : ''}
          <h1>FICHE DE TRANSPORT — LISTE DES VOYAGEURS</h1>
          <div class="subtitle">Document destiné au chauffeur pour les contrôles routiers</div>
        </div>

        <div class="info-grid">
          ${nomCompagnie ? `
          <div class="info-item">
            <div class="info-label">Compagnie</div>
            <div class="info-value">${escapeHtml(nomCompagnie)}</div>
          </div>` : ''}
          <div class="info-item">
            <div class="info-label">Trajet</div>
            <div class="info-value">${escapeHtml(trajet)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date de départ</div>
            <div class="info-value">${escapeHtml(date)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Heure de départ</div>
            <div class="info-value">${escapeHtml(heure)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Véhicule</div>
            <div class="info-value">${escapeHtml(voitureMatricule)}</div>
          </div>
          ${nomChauffeur ? `
          <div class="info-item">
            <div class="info-label">Chauffeur</div>
            <div class="info-value">${escapeHtml(nomChauffeur)}</div>
          </div>` : ''}
        </div>

        <div class="legal-notice">
          <strong>Objet :</strong> Ce document constitue la liste officielle des passagers à bord du véhicule ci-dessus mentionné. 
          Il est établi conformément aux dispositions réglementaires en vigueur relatives au transport routier de voyageurs à Madagascar.
        </div>

        <div class="total-badge">${voyageurs.length} voyageur(s) enregistré(s)</div>

        <table>
          <thead>
            <tr>
              <th class="center">N°</th>
              <th>Nom complet</th>
              <th class="center">CIN</th>
              <th class="center">Téléphone</th>
              <th class="center">Siège</th>
              <th class="center">Âge</th>
              <th>N° Réservation</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-line">Signature du chauffeur</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Cachet de la compagnie</div>
            </div>
          </div>
        </div>

        <div class="generation-info">
          Document généré automatiquement par FANDRIO le ${dateGeneration}
        </div>
      </body>
      </html>
    `;

    // 3. Générer le PDF avec un nom de fichier explicite
    const trajetSlug = trajet.replace(/[^a-zA-Z0-9À-ÿ]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const dateSlug = (date || '').replace(/\//g, '-');
    const fileName = `Fiche_Voyageurs_${trajetSlug}_${dateSlug}.pdf`;

    const { uri: tempUri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Renommer le fichier avec le bon nom
    const tempFile = new File(tempUri);
    const parentDir = tempFile.parentDirectory;
    const finalFile = new File(parentDir, fileName);
    tempFile.move(finalFile);
    const finalUri = finalFile.uri;

    // 4. Partager le fichier
    if (Platform.OS === 'web') {
      Alert.alert('Succès', 'Le PDF a été généré.');
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(finalUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Fiche voyageurs — Contrôle routier',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('PDF généré', `Le fichier a été enregistré à : ${finalUri}`);
    }
  } catch (error: any) {
    console.error('Erreur génération fiche voyageurs:', error);
    Alert.alert('Erreur', error?.message || 'Impossible de générer la fiche voyageurs.');
  }
};

/**
 * Page 1 de la fiche : plan de la voiture vu de dessus, avant en haut, avec le
 * nom du voyageur sur chaque siège occupé. Vide si le plan est indisponible.
 */
function construirePlanHtml(plan: any, voyageurs: any[], chauffeur: string): string {
  const codes: string[] = (plan?.plan || []).map((s: any) => String(s.code));
  if (!codes.length) return '';
  const rangees = plan?.grille?.length ? dispositionGrille(plan.grille) : dispositionMinibus([...codes].sort((a, b) => Number(a) - Number(b)));
  const parSiege = new Map<string, any>(voyageurs.map((v: any) => [String(v.siege), v]));
  const colonnes = Math.max(1, ...rangees.map((r: any[]) => r.length));
  const occupes = codes.filter((c) => parSiege.has(c)).length;

  const lignes = rangees
    .map((r: any[]) => {
      const cases = Array.from({ length: colonnes }, (_, j) => {
        const c = r[j] || { type: 'vide' };
        if (c.type === 'chauffeur') return `<td class="chauffeur"><div class="petit"><b>CHAUFFEUR</b></div><div class="nom">${escapeHtml(chauffeur || '—')}</div></td>`;
        if (c.type !== 'siege') return '<td></td>';
        const v = parSiege.get(String(c.code));
        return v
          ? `<td class="occupe"><div class="num">${escapeHtml(String(c.code))}</div><div class="nom">${escapeHtml(`${v.prenom || ''} ${v.nom || ''}`.trim())}</div></td>`
          : `<td class="libre"><div class="num">${escapeHtml(String(c.code))}</div><div class="petit">Libre</div></td>`;
      }).join('');
      return `<tr>${cases}</tr>`;
    })
    .join('');

  return `
    <div class="plan-page">
      <div class="header">
        <h1>PLAN DE LA VOITURE ET VOYAGEURS</h1>
        <div class="subtitle">Document destiné au chauffeur pour les contrôles routiers</div>
      </div>
      <div class="plan-titre"><span>▲ Avant de la voiture</span><span>${occupes} siège(s) occupé(s) sur ${codes.length}</span></div>
      <table class="plan" style="width: 100%;"><tbody>${lignes}</tbody></table>
      <div class="plan-titre" style="margin-top: 6px;"><span>▼ Arrière de la voiture</span><span></span></div>
      <div class="plan-legende">Sièges encadrés en orange : occupés (nom du voyageur). Pointillés : libres. Le détail des voyageurs (CIN, téléphone, âge, réservation) est en page suivante.</div>
    </div>`;
}

/** Échappe les caractères HTML spéciaux */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
