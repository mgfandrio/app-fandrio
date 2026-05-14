import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

/**
 * Type des données attendues (correspond au retour de `reservationService.obtenirFacture`).
 */
export interface BilletPdfData {
    reservation: {
        numero: string;
        statut: number;
        montant: number | string;
        date_reservation: string;
        paiement?: { type: string; numero: string } | null;
    };
    voyage: {
        depart: string;
        arrivee: string;
        date: string;
        heure: string;
        compagnie: string;
        matricule?: string;
    };
    voyageurs?: { nom: string; siege: string | number }[];
}

const STATUT_LABELS: Record<number, { label: string; couleur: string; bg: string }> = {
    1: { label: 'En attente', couleur: '#f97316', bg: '#fff7ed' },
    2: { label: 'Confirmée', couleur: '#16a34a', bg: '#f0fdf4' },
    3: { label: 'Terminée', couleur: '#374151', bg: '#f3f4f6' },
    4: { label: 'Annulée', couleur: '#dc2626', bg: '#fef2f2' },
};

const formatMontant = (montant: number | string): string => {
    try {
        const n = typeof montant === 'number' ? montant : Number(montant);
        return new Intl.NumberFormat('fr-FR').format(n);
    } catch {
        return String(montant ?? 0);
    }
};

/**
 * Construit le HTML du billet PDF.
 * @param data Données de la réservation/facture
 * @param qrDataUrl URL `data:image/png;base64,...` du QR code (peut être vide).
 */
const construireHtml = (data: BilletPdfData, qrDataUrl: string): string => {
    const statut = STATUT_LABELS[data.reservation.statut] || STATUT_LABELS[2];
    const voyageursHtml = (data.voyageurs ?? [])
        .map(
            (v, i) => `
                <tr>
                    <td style="padding:10px 8px; border-bottom:1px solid #f3f4f6; color:#6b7280; width:30px; font-weight:700;">${i + 1}</td>
                    <td style="padding:10px 8px; border-bottom:1px solid #f3f4f6; color:#111827; font-weight:600;">${v.nom}</td>
                    <td style="padding:10px 8px; border-bottom:1px solid #f3f4f6; text-align:right;">
                        <span style="background:#dbeafe; color:#1e3a8a; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700;">
                            Siège ${v.siege}
                        </span>
                    </td>
                </tr>`
        )
        .join('');

    const paiementHtml = data.reservation.paiement
        ? `
            <tr>
                <td style="padding:8px 0; color:#6b7280;">Mode de paiement</td>
                <td style="padding:8px 0; text-align:right; color:#111827; font-weight:700;">${data.reservation.paiement.type}</td>
            </tr>
            <tr>
                <td style="padding:8px 0; color:#6b7280;">Référence</td>
                <td style="padding:8px 0; text-align:right; color:#111827; font-weight:700;">${data.reservation.paiement.numero}</td>
            </tr>`
        : '';

    const qrHtml = qrDataUrl
        ? `<div style="text-align:center; margin:18px 0;">
                <img src="${qrDataUrl}" style="width:180px; height:180px;" alt="QR Code" />
                <div style="font-size:11px; color:#6b7280; margin-top:6px;">Présentez ce code lors de l'embarquement</div>
           </div>`
        : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Billet ${data.reservation.numero}</title>
<style>
    @page { margin: 24px; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827; margin:0; padding:0; }
    .container { max-width: 700px; margin: 0 auto; }
    .card { background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; padding:18px; margin-bottom:14px; }
    .header { background: linear-gradient(135deg, #1e3a8a, #1d4ed8); border-radius:18px; padding:22px; color:#ffffff; text-align:center; margin-bottom:16px; }
    .header .label { font-size:11px; letter-spacing:1.5px; color:#bfdbfe; font-weight:700; text-transform:uppercase; }
    .header .numero { font-size:26px; font-weight:800; margin:6px 0 10px; letter-spacing:1px; }
    .badge { display:inline-block; padding:5px 12px; border-radius:999px; font-size:11px; font-weight:700; background:rgba(255,255,255,0.2); color:#ffffff; }
    .section-title { display:flex; align-items:center; font-weight:700; color:#1e3a8a; font-size:15px; margin-bottom:10px; }
    .section-title .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#1e3a8a; margin-right:8px; }
    table { width:100%; border-collapse:collapse; }
    table.info td { padding:8px 0; font-size:13px; }
    table.info td:first-child { color:#6b7280; }
    table.info td:last-child { text-align:right; color:#111827; font-weight:700; }
    .total { background:#eff6ff; border:1px solid #bfdbfe; border-radius:14px; padding:14px 18px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; }
    .total .label { color:#1e3a8a; font-weight:800; font-size:15px; }
    .total .montant { color:#1e3a8a; font-weight:800; font-size:22px; }
    .footer { text-align:center; color:#9ca3af; font-size:11px; margin-top:20px; padding-top:14px; border-top:1px dashed #e5e7eb; }
    .stripe { border-top: 2px dashed #cbd5e1; margin: 12px 0; }
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="label">Billet de voyage</div>
            <div class="numero">N° ${data.reservation.numero}</div>
            <span class="badge">${statut.label}</span>
        </div>

        ${qrHtml ? `<div class="card">${qrHtml}</div>` : ''}

        <div class="card">
            <div class="section-title"><span class="dot"></span>Voyage</div>
            <table class="info">
                <tr><td>Trajet</td><td>${data.voyage.depart} → ${data.voyage.arrivee}</td></tr>
                <tr><td>Date</td><td>${data.voyage.date} à ${data.voyage.heure}</td></tr>
                <tr><td>Compagnie</td><td>${data.voyage.compagnie}</td></tr>
                ${data.voyage.matricule ? `<tr><td>Véhicule</td><td>${data.voyage.matricule}</td></tr>` : ''}
            </table>
        </div>

        ${
            voyageursHtml
                ? `<div class="card">
                        <div class="section-title"><span class="dot"></span>Voyageurs (${data.voyageurs!.length})</div>
                        <table>${voyageursHtml}</table>
                   </div>`
                : ''
        }

        <div class="card">
            <div class="section-title"><span class="dot"></span>Paiement</div>
            <table class="info">
                ${paiementHtml}
                <tr><td>Date de réservation</td><td>${data.reservation.date_reservation}</td></tr>
            </table>
            <div class="total">
                <span class="label">Montant total</span>
                <span class="montant">${formatMontant(data.reservation.montant)} Ar</span>
            </div>
        </div>

        <div class="footer">
            Ce billet est généré par <strong>FANDRIO</strong>. Conservez-le précieusement.<br/>
            Document généré le ${new Date().toLocaleString('fr-FR')}
        </div>
    </div>
</body>
</html>`;
};

/**
 * Génère et propose le téléchargement/partage du billet PDF.
 * @returns true si l'opération a réussi.
 */
export const genererBilletPdf = async (
    data: BilletPdfData,
    qrDataUrl: string = ''
): Promise<boolean> => {
    try {
        const html = construireHtml(data, qrDataUrl);
        const { uri } = await Print.printToFileAsync({ html, base64: false });

        if (Platform.OS === 'ios') {
            // iOS : Sharing fonctionne directement
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Billet ${data.reservation.numero}`,
                UTI: 'com.adobe.pdf',
            });
            return true;
        }

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Billet ${data.reservation.numero}`,
            });
            return true;
        }

        Alert.alert('PDF généré', `Fichier enregistré : ${uri}`);
        return true;
    } catch (e: any) {
        console.error('Erreur génération PDF billet :', e);
        Alert.alert('Erreur', 'Impossible de générer le PDF du billet.');
        return false;
    }
};
