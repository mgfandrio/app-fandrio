import { File } from 'expo-file-system/next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';
import { reservationAdminService } from '../services/reservations/reservationAdminService';

/**
 * Génère et partage un PDF "Fiche Voyageurs" pour un voyage donné.
 * Ce document est destiné aux chauffeurs pour les contrôles routiers.
 */
export const genererFicheVoyageurs = async (voyage: any): Promise<void> => {
  try {
    // 1. Récupérer les voyageurs depuis l'API
    const res = await reservationAdminService.obtenirVoyageurs(voyage.voyage_id);
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
    const voitureMatricule = voyage.voiture?.matricule || '';

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
        </style>
      </head>
      <body>
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

/** Échappe les caractères HTML spéciaux */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
