import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable, Linking, StatusBar, Platform, KeyboardAvoidingView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { provinceService } from '../../../../services/provinces/provinceService';
import { voyageService } from '../../../../services/voyages/voyageService';
import { reservationService } from '../../../../services/reservations/reservationService';
import { siegeService } from '../../../../services/sieges/siegeService';
import {
    clearPendingReservation,
    loadPendingReservation,
    savePendingReservation,
} from '../../../../services/reservations/pendingReservation';
import { useNetwork } from '../../../../hooks/useNetwork';
import { SearchableDropdown } from '../../../../components/common/SearchableDropdown';
import { useConfirmDialog } from '../../../../components/common/ConfirmDialog';
import echo from '../../../../services/echo/echoConfig';
import {
    Bouton, BoutonIcone, CaseACocher, Carte, ChampSaisie, Etapes, FeuilleModale,
    LegendePlan, Pastille, PlanSieges, Texte,
} from '@/app/components/ui';
import { couleurs, dateLocaleISO, formatAriary } from '@/app/theme/ocean';

/*
 * Parcours de réservation (étapes internes) :
 *   1 Itinéraire  2 Voyage  3 Sièges  4 Voyageurs  5 Paiement  6 Billet
 * Depuis l'accueil (voyage déjà choisi), on démarre directement à l'étape 3.
 */

const BILLETS = '/screens/dashboard/utilisateur/(tabs)/reservation';
const ACCUEIL = '/screens/dashboard/utilisateur/(tabs)/accueil';
const DELAI_PAR_DEFAUT = 120; // secondes, si l'API n'a pas renvoyé l'heure limite

/** Nom d'une province, qu'elle soit renvoyée en objet ou en texte. */
function nomProvince(p: any, defaut = '—') {
    return (typeof p === 'object' ? p?.nom || p?.pro_nom : p) || defaut;
}

/** Nom du chauffeur : l'API renvoie un texte (ou un objet sur d'anciennes versions). */
function nomChauffeur(c: any) {
    if (!c || c === 'N/A') return '';
    if (typeof c === 'string') return c;
    return [c.prenom, c.nom].filter(Boolean).join(' ');
}

/** Infos affichées dans la fenêtre « Reprendre votre réservation ». */
function infosVoyage(v: any) {
    return {
        depart: nomProvince(v?.trajet?.province_depart, ''),
        arrivee: nomProvince(v?.trajet?.province_arrivee, ''),
        date: [v?.date, v?.heure_depart].filter(Boolean).join(' · '),
        compagnie: v?.compagnie?.nom,
    };
}

export default function ReserverScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ voyageData?: string }>();
    const { showDialog, DialogComponent } = useConfirmDialog();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const debutAuxSieges = useRef(!!params.voyageData).current;

    // Choix de l'utilisateur
    const [proDepartId, setProDepartId] = useState<number | string | undefined>(undefined);
    const [proArriveeId, setProArriveeId] = useState<number | string | undefined>(undefined);
    const [selectedVoyage, setSelectedVoyage] = useState<any>(null);
    const [chauffeur, setChauffeur] = useState<string>('');
    const [plans, setPlans] = useState<any>(null);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [voyageurs, setVoyageurs] = useState<any[]>([]);
    const [paymentMode, setPaymentMode] = useState<any>(null);
    const [reservationResult, setReservationResult] = useState<any>(null);
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [transactionRef, setTransactionRef] = useState('');
    const [transactionRefError, setTransactionRefError] = useState<string | null>(null);
    const [papiWaiting, setPapiWaiting] = useState(false);
    const [utilisateur, setUtilisateur] = useState<any>(null);

    // Réseau
    const { isOnline, onReconnect } = useNetwork();
    const pendingRetryRef = useRef<null | (() => void)>(null);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [resumeData, setResumeData] = useState<any>(null);

    // Délai de paiement (calculé depuis l'heure limite renvoyée par l'API)
    const [timeLeft, setTimeLeft] = useState(DELAI_PAR_DEFAUT);
    const [expiree, setExpiree] = useState(false);
    const timerRef = useRef<any>(null);

    // Données des étapes 1 à 3
    const [provinces, setProvinces] = useState<any[]>([]);
    const [availableVoyages, setAvailableVoyages] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 });
    const [seatPlan, setSeatPlan] = useState<any[]>([]);

    // Filtre de dates (étape 2)
    const [dateDebut, setDateDebut] = useState<Date | null>(null);
    const [dateFin, setDateFin] = useState<Date | null>(null);
    const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
    const [dateFilterActive, setDateFilterActive] = useState(false);
    const [noResults, setNoResults] = useState(false);

    const alerte = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'warning') =>
        showDialog({ title, message, type, confirmText: 'OK', onConfirm: () => {}, onCancel: () => {} });

    useEffect(() => {
        fetchProvinces();
        // Utilisateur connecté (pour « C'est moi » à l'étape voyageurs)
        SecureStore.getItemAsync('fandrioUser')
            .then((json) => json && setUtilisateur(JSON.parse(json)))
            .catch(() => {});
    }, []);

    // Réservation interrompue à reprendre ?
    useEffect(() => {
        (async () => {
            const pending = await loadPendingReservation();
            if (pending && !params.voyageData) {
                setResumeData(pending);
                setShowResumeModal(true);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Relance automatique des actions critiques au retour de la connexion
    useEffect(() => {
        const unsubscribe = onReconnect(() => {
            const fn = pendingRetryRef.current;
            if (fn) {
                pendingRetryRef.current = null;
                fn();
            }
        });
        return unsubscribe;
    }, [onReconnect]);

    // Voyage passé en paramètre : directement au choix des sièges
    useEffect(() => {
        if (params.voyageData) {
            try {
                const voyage = JSON.parse(params.voyageData);
                setSelectedVoyage(voyage);
                const depId = voyage.trajet?.province_depart?.id || voyage.trajet?.province_depart?.pro_id || voyage.trajet?.pro_depart;
                const arrId = voyage.trajet?.province_arrivee?.id || voyage.trajet?.province_arrivee?.pro_id || voyage.trajet?.pro_arrivee;
                if (depId) setProDepartId(depId);
                if (arrId) setProArriveeId(arrId);
                setCurrentStep(3);
            } catch (e) {
                console.warn('Invalid voyageData param:', e);
            }
        }
    }, [params.voyageData]);

    // Plan des sièges + mises à jour en temps réel (étape 3)
    useEffect(() => {
        if (currentStep === 3 && selectedVoyage) {
            fetchSeatPlan(selectedVoyage.voyage_id);

            const canal = `sieges.voyage.${selectedVoyage.voyage_id}`;
            echo.channel(canal).listen('.siege.updated', (event: any) => {
                const siegeNumero = event.siege_numero;
                const statut = event.data?.statut;
                // Statut numérique de l'API -> libellé du plan
                const newStatut = statut === 1 ? 'reserve' : statut === 3 ? 'selectionne' : statut === 2 ? 'disponible' : null;
                if (!newStatut || !siegeNumero) return;

                setSeatPlan((prev) => prev.map((seat) =>
                    seat.code === siegeNumero ? { ...seat, statut: newStatut, selectable: newStatut === 'disponible' } : seat
                ));
                // Siège choisi ici mais pris par quelqu'un d'autre : on le retire
                if (newStatut !== 'disponible') {
                    setSelectedSeats((prev) => prev.filter((s) => s !== siegeNumero));
                }
            });

            return () => {
                echo.leaveChannel(canal);
            };
        }
    }, [currentStep, selectedVoyage]);

    // Compte à rebours du paiement (étape 5)
    useEffect(() => {
        if (currentStep !== 5 || expiree) {
            stopTimer();
            return;
        }
        const limite = reservationResult?.date_limite_paiement
            ? new Date(reservationResult.date_limite_paiement).getTime()
            : Date.now() + DELAI_PAR_DEFAUT * 1000;

        const tick = () => {
            const reste = Math.max(0, Math.round((limite - Date.now()) / 1000));
            setTimeLeft(reste);
            if (reste <= 0) {
                stopTimer();
                surExpiration();
            }
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
        return () => stopTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, reservationResult?.date_limite_paiement, expiree]);

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    };

    /** Délai dépassé : on libère tout de suite les sièges et on affiche l'écran « délai écoulé ». */
    const surExpiration = async () => {
        setShowPaymentModal(false);
        setExpiree(true);
        await clearPendingReservation();
        if (reservationResult?.res_id) {
            // Sans attendre la tâche planifiée du serveur (jusqu'à 1 min)
            reservationService.annulerReservation(reservationResult.res_id).catch(() => {});
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const fetchProvinces = async () => {
        try {
            const response = await provinceService.listerProvinces();
            if (response && 'statut' in response && response.statut) {
                const data = (response as any).data?.provinces || (response as any).data;
                setProvinces(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching provinces:', error);
        }
    };

    const fetchSeatPlan = async (voyageId: number) => {
        setLoading(true);
        try {
            const response = await siegeService.getPlan(voyageId);
            if (response.statut === true || response.status === 'true') {
                setSeatPlan(response.data.plan || []);
                setPlans(response.data);
                setChauffeur(nomChauffeur(response.data.voiture?.chauffeur));
            }
        } catch (error) {
            console.error('Error fetching seat plan:', error);
            alerte('Plan indisponible', 'Impossible de charger le plan des sièges. Vérifiez votre connexion et réessayez.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const findVoyages = async (page = 1, applyDateFilter = false) => {
        if (!proDepartId || !proArriveeId) {
            alerte('Trajet incomplet', 'Choisissez le départ et la destination.');
            return;
        }
        if (proDepartId === proArriveeId) {
            alerte('Trajet invalide', 'Le départ et la destination doivent être différents.');
            return;
        }
        setLoading(true);
        try {
            const filters: any = { pro_depart: proDepartId, pro_arrivee: proArriveeId, page, per_page: 15 };

            // Filtre de date uniquement s'il est demandé (dates locales)
            if (applyDateFilter && dateDebut) {
                const debut = dateLocaleISO(dateDebut);
                if (dateFin && dateFin > dateDebut) {
                    filters.date_debut = debut;
                    filters.date_fin = dateLocaleISO(dateFin);
                } else {
                    filters.date_exacte = debut;
                }
            }

            const response = await voyageService.rechercherVoyages(filters);
            if (response.statut === true) {
                const liste = response.data.voyages || [];
                setAvailableVoyages(liste);
                setPagination({
                    currentPage: response.data.pagination?.current_page || 1,
                    lastPage: response.data.pagination?.last_page || 1,
                    total: response.data.pagination?.total || 0,
                });
                if (applyDateFilter) setDateFilterActive(true);
                setNoResults(liste.length === 0);
                if (liste.length > 0 && currentStep === 1) setCurrentStep(2);
            }
        } catch (error: any) {
            alerte('Recherche impossible', error.message || 'Impossible de trouver des voyages pour ce trajet.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const totalTheorique = selectedSeats.length * (selectedVoyage?.trajet?.tarif || 0);
    // Le montant renvoyé par l'API fait foi une fois la réservation créée
    const totalAPayer = Number(reservationResult?.montant_total ?? totalTheorique) || 0;

    const createInitialReservation = async () => {
        if (!selectedVoyage) return;
        const data = {
            voyage_id: selectedVoyage.voyage_id,
            nb_voyageurs: selectedSeats.length,
            montant_total: totalTheorique,
            sieges: selectedSeats,
            voyageurs,
        };
        const sauvegarde = { ...data, voyage: selectedVoyage, voyageInfo: infosVoyage(selectedVoyage) };

        // Sauvegarde avant l'envoi : reprise possible après une coupure ou un plantage
        await savePendingReservation({ payload: sauvegarde, step: 4 });

        if (!isOnline) {
            alerte('Hors connexion', 'Votre réservation est sauvegardée. Elle sera envoyée automatiquement dès le retour de la connexion.', 'info');
            pendingRetryRef.current = createInitialReservation;
            return;
        }

        setLoading(true);
        try {
            const response = await reservationService.creerReservation(data);
            if (response.statut) {
                pendingRetryRef.current = null;
                setReservationResult(response.data);
                setExpiree(false);
                await savePendingReservation({
                    payload: {
                        ...sauvegarde,
                        date_limite_paiement: response.data?.date_limite_paiement,
                        montant_serveur: response.data?.montant_total,
                    },
                    step: 5,
                    res_id: response.data?.res_id,
                });
                setCurrentStep(5);
            }
        } catch (error: any) {
            if (error?.offline || error?.isNetworkError) {
                pendingRetryRef.current = createInitialReservation;
                alerte('Connexion perdue', "Pas d'inquiétude : votre réservation est sauvegardée et sera renvoyée automatiquement dès le retour en ligne.", 'info');
            } else {
                alerte('Réservation impossible', error?.message || error?.response?.data?.message || 'Impossible de créer la réservation.', 'danger');
            }
        } finally {
            setLoading(false);
        }
    };

    const confirmPayment = () => {
        if (!paymentMode) {
            alerte('Mode de paiement', 'Choisissez un mode de paiement.');
            return;
        }
        setShowPaymentModal(true);
    };

    const validateTransactionRef = (ref: string): string | null => {
        const cleaned = ref.replace(/[^a-zA-Z0-9\-]/g, '');
        if (!cleaned || cleaned.length < 5) return 'Au moins 5 lettres ou chiffres.';
        if (cleaned.length > 50) return '50 caractères au maximum.';
        return null;
    };

    const handlePaymentConfirmed = async () => {
        const error = validateTransactionRef(transactionRef);
        if (error) {
            setTransactionRefError(error);
            return;
        }
        setTransactionRefError(null);

        if (!isOnline) {
            alerte('Hors connexion', 'Votre confirmation de paiement sera envoyée automatiquement dès le retour en ligne.', 'info');
            pendingRetryRef.current = handlePaymentConfirmed;
            return;
        }

        setShowPaymentModal(false);
        setLoading(true);
        try {
            const cleanRef = transactionRef.replace(/[^a-zA-Z0-9\-]/g, '');
            const response = await reservationService.confirmerReservation(reservationResult.res_id, {
                type_paie_id: paymentMode.type_paie_id,
                numero_paiement: cleanRef,
            });
            if (response.statut) {
                pendingRetryRef.current = null;
                await clearPendingReservation();
                stopTimer();
                setTransactionRef('');
                fetchInvoice();
            }
        } catch (error: any) {
            if (error?.offline || error?.isNetworkError) {
                pendingRetryRef.current = handlePaymentConfirmed;
                alerte('Connexion perdue', 'La confirmation sera renvoyée automatiquement dès le retour en ligne.', 'info');
            } else {
                alerte('Confirmation impossible', error?.message || error?.response?.data?.message || 'La confirmation a échoué.', 'danger');
            }
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string, field: string) => {
        await Clipboard.setStringAsync(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleCancelProcess = () => {
        const reservationCreee = !!reservationResult?.res_id;
        showDialog({
            title: 'Abandonner la réservation ?',
            message: reservationCreee
                ? 'Vos sièges seront libérés pour les autres voyageurs.'
                : 'Les choix que vous avez faits seront perdus.',
            type: 'danger',
            confirmText: 'Abandonner',
            cancelText: 'Continuer',
            onConfirm: async () => {
                if (reservationCreee) {
                    setLoading(true);
                    try {
                        await reservationService.annulerReservation(reservationResult.res_id);
                    } catch (error) {
                        console.error('Error voiding reservation:', error);
                    } finally {
                        setLoading(false);
                    }
                }
                await clearPendingReservation();
                router.replace(reservationCreee ? BILLETS : ACCUEIL);
            },
            onCancel: () => {},
        });
    };

    const fetchInvoice = async () => {
        try {
            const response = await reservationService.obtenirFacture(reservationResult.res_id);
            if (response.statut) {
                setInvoiceData(response.data);
                setCurrentStep(6);
            }
        } catch (error) {
            console.error('Error fetching invoice:', error);
            router.replace(BILLETS);
        }
    };

    // Paiement en ligne PAPI (compagnies qui l'ont activé)
    const handlePayerEnLigne = async () => {
        if (!reservationResult?.res_id) return;
        setLoading(true);
        try {
            const res = await reservationService.payerReservation(reservationResult.res_id);
            if (res.statut && res.data?.payment_url) {
                setPapiWaiting(true);
                await Linking.openURL(res.data.payment_url);
            } else {
                alerte('Paiement indisponible', res.message || "Le paiement en ligne n'est pas disponible pour le moment.", 'danger');
            }
        } catch (error: any) {
            alerte('Paiement impossible', error?.message || 'Impossible de démarrer le paiement en ligne.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    // Vérifie (via la facture) si le paiement PAPI a été confirmé par le webhook
    const handleVerifierPaiement = async () => {
        if (!reservationResult?.res_id) return;
        setLoading(true);
        try {
            const response = await reservationService.obtenirFacture(reservationResult.res_id);
            if (response.statut && response.data?.reservation?.statut === 2) {
                await clearPendingReservation();
                stopTimer();
                setInvoiceData(response.data);
                setCurrentStep(6);
            } else {
                alerte('Paiement en attente', "Le paiement n'est pas encore confirmé. Si vous venez de payer, patientez quelques secondes puis appuyez à nouveau sur « Vérifier le paiement ».", 'info');
            }
        } catch (error: any) {
            alerte('Vérification impossible', error?.message || 'Vérification impossible pour le moment.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentStep === 1) findVoyages();
        else if (currentStep === 2) {
            if (!selectedVoyage) alerte('Choisissez un voyage', 'Touchez un voyage de la liste pour le sélectionner.');
            else setCurrentStep(3);
        } else if (currentStep === 3) {
            if (selectedSeats.length === 0) alerte('Aucun siège', 'Touchez au moins un siège libre sur le plan.');
            else {
                // Conserver ce qui a déjà été saisi si on revient en arrière
                setVoyageurs(selectedSeats.map((seat) =>
                    voyageurs.find((v) => v.siege_numero === seat) || { nom: '', prenom: '', phone: '', phone2: '', cin: '', age: '', siege_numero: seat }
                ));
                setCurrentStep(4);
            }
        } else if (currentStep === 4) {
            const isValid = voyageurs.every((v) =>
                v.nom.trim() !== '' && v.prenom.trim() !== '' && v.phone.trim() !== '' && v.phone2.trim() !== ''
            );
            if (!isValid) alerte('Informations manquantes', 'Renseignez le nom, le prénom, le téléphone et le contact d\'urgence de chaque voyageur.');
            else createInitialReservation();
        } else if (currentStep === 5) {
            confirmPayment();
        }
    };

    /** Retour arrière : après création de la réservation, revenir = abandonner. */
    const handleBack = () => {
        if (currentStep === 6) router.replace(BILLETS);
        else if (currentStep === 5) handleCancelProcess();
        else if (currentStep > (debutAuxSieges ? 3 : 1)) setCurrentStep(currentStep - 1);
        else router.back();
    };

    const updateVoyageur = (index: number, field: string, value: string) => {
        setVoyageurs((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    /** « C'est moi » : préremplit le voyageur avec le compte connecté. */
    const remplirAvecMoi = (index: number, coche: boolean) => {
        setVoyageurs((prev) => {
            const updated = [...prev];
            updated[index] = coche && utilisateur
                ? { ...updated[index], moi: true, nom: utilisateur.nom || '', prenom: utilisateur.prenom || '', phone: utilisateur.telephone || '' }
                : { ...updated[index], moi: false };
            return updated;
        });
    };

    const toggleSeat = (code: string) => {
        setSelectedSeats((prev) => (prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code].sort((a, b) => Number(a) - Number(b))));
    };

    /** Reprendre au choix des sièges après expiration du délai. */
    const recommencerSieges = () => {
        setReservationResult(null);
        setExpiree(false);
        setPapiWaiting(false);
        setPaymentMode(null);
        setSelectedSeats([]);
        setCurrentStep(3);
    };

    // ─────────────────────────── Rendu des étapes ───────────────────────────

    const resumeVoyage = () => {
        if (!selectedVoyage) return null;
        return (
            <Carte marine style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Texte graisse="tresGras" taille={16} couleur="#FFFFFF" numberOfLines={1}>
                            {nomProvince(selectedVoyage.trajet?.province_depart)} → {nomProvince(selectedVoyage.trajet?.province_arrivee)}
                        </Texte>
                        <Texte graisse="moyen" taille={12.5} couleur={couleurs.texteSurMarine} numberOfLines={1}>
                            {selectedVoyage.compagnie?.nom || 'Compagnie'} · {selectedVoyage.date} · {selectedVoyage.heure_depart}
                        </Texte>
                    </View>
                </View>
            </Carte>
        );
    };

    const renderStep1 = () => (
        <View style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
                <Texte variante="titre" taille={22}>Votre itinéraire</Texte>
                <Texte graisse="moyen" taille={14} couleur={couleurs.gris}>Choisissez d'où vous partez et où vous allez.</Texte>
            </View>
            <View>
                <SearchableDropdown
                    label="Départ"
                    data={provinces.filter((p) => p.id !== proArriveeId)}
                    selectedId={proDepartId}
                    onSelect={(id: any) => { setProDepartId(id); setNoResults(false); }}
                    placeholder="Province de départ"
                    showAllOption={false}
                />
                <SearchableDropdown
                    label="Destination"
                    data={provinces.filter((p) => p.id !== proDepartId)}
                    selectedId={proArriveeId}
                    onSelect={(id: any) => { setProArriveeId(id); setNoResults(false); }}
                    placeholder="Province d'arrivée"
                    showAllOption={false}
                />
            </View>
            {noResults && availableVoyages.length === 0 && (
                <Carte style={{ alignItems: 'center', gap: 8, backgroundColor: couleurs.alerteFond, borderColor: couleurs.alerteFond }}>
                    <Ionicons name="bus-outline" size={30} color={couleurs.alerte} />
                    <Texte graisse="tresGras" taille={15} couleur={couleurs.alerte}>Aucun voyage pour ce trajet</Texte>
                    <Texte graisse="moyen" taille={13} couleur={couleurs.alerte} centre>Essayez un autre départ ou une autre destination.</Texte>
                </Carte>
            )}
        </View>
    );

    const champDate = (libelle: string, valeur: Date | null, quel: 'start' | 'end') => (
        <Pressable
            onPress={() => setShowPicker(quel)}
            accessibilityRole="button"
            accessibilityLabel={`${libelle} : ${valeur ? valeur.toLocaleDateString('fr-FR') : 'non choisie'}`}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: couleurs.champ, backgroundColor: couleurs.surface }}
        >
            <Ionicons name="calendar-outline" size={18} color={couleurs.ocean800} />
            <View style={{ flex: 1 }}>
                <Texte variante="legende" taille={11}>{libelle}</Texte>
                <Texte graisse="gras" taille={14} couleur={valeur ? couleurs.encre : '#8A99AD'}>
                    {valeur ? valeur.toLocaleDateString('fr-FR') : 'Choisir'}
                </Texte>
            </View>
        </Pressable>
    );

    const renderStep2 = () => (
        <View style={{ gap: 14 }}>
            <Texte variante="titre" taille={22}>Voyages disponibles</Texte>

            <Carte style={{ gap: 12 }}>
                <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>Filtrer par date</Texte>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {champDate('À partir du', dateDebut, 'start')}
                    {champDate("Jusqu'au (facultatif)", dateFin, 'end')}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(dateDebut || dateFin) && (
                        <Bouton
                            titre="Effacer"
                            variante="secondaire"
                            compact
                            onPress={() => { setDateDebut(null); setDateFin(null); setDateFilterActive(false); findVoyages(1, false); }}
                            style={{ flex: 1 }}
                        />
                    )}
                    <Bouton titre="Filtrer" compact onPress={() => { setDateFilterActive(false); findVoyages(1, true); }} style={{ flex: 1 }} />
                </View>
            </Carte>

            {showPicker && (
                <DateTimePicker
                    value={showPicker === 'start' ? (dateDebut || new Date()) : (dateFin || new Date())}
                    mode="date"
                    minimumDate={new Date()}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                        const quel = showPicker;
                        setShowPicker(null);
                        if (selectedDate) {
                            if (quel === 'start') setDateDebut(selectedDate);
                            else if (quel === 'end') setDateFin(selectedDate);
                        }
                    }}
                />
            )}

            {noResults && availableVoyages.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
                    <Ionicons name="search-outline" size={40} color={couleurs.grisClair} />
                    <Texte graisse="tresGras" taille={16}>Aucun voyage trouvé</Texte>
                    <Texte variante="legende" centre>Essayez une autre date.</Texte>
                </View>
            )}

            {availableVoyages.map((voyage) => {
                const choisi = selectedVoyage?.voyage_id === voyage.voyage_id;
                const categorie = String(voyage.categorie || voyage.trajet?.categorie || '').toLowerCase();
                return (
                    <Carte
                        key={voyage.voyage_id}
                        onPress={() => setSelectedVoyage(voyage)}
                        accessibilityState={{ selected: choisi }}
                        style={{ gap: 10, borderWidth: choisi ? 2 : 1, borderColor: choisi ? couleurs.ocean800 : couleurs.ligne, backgroundColor: choisi ? '#F3F8FD' : couleurs.surface }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Texte graisse="tresGras" taille={15} numberOfLines={1}>{voyage.compagnie?.nom || 'Compagnie'}</Texte>
                                <Texte variante="legende" numberOfLines={1}>{voyage.trajet?.nom}</Texte>
                            </View>
                            {(categorie === 'vip' || categorie === 'premium') && (
                                <Pastille libelle={categorie === 'vip' ? 'VIP' : 'Premium'} tonalite="marine" point={false} />
                            )}
                            <Ionicons name={choisi ? 'radio-button-on' : 'radio-button-off'} size={22} color={choisi ? couleurs.ocean800 : couleurs.grisClair} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                            <Texte graisse="gras" taille={13} couleur={couleurs.encreDouce}>
                                {voyage.date} · {voyage.heure_depart} · {voyage.places_disponibles} places
                            </Texte>
                            <Texte variante="montant" couleur={couleurs.ocean800}>
                                {formatAriary(voyage.trajet?.tarif || 0)}<Texte graisse="gras" taille={12} couleur={couleurs.gris}> Ar</Texte>
                            </Texte>
                        </View>
                    </Carte>
                );
            })}

            {availableVoyages.length > 0 && pagination.lastPage > 1 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 4 }}>
                    <BoutonIcone icone="chevron-back" libelle="Page précédente" onPress={() => pagination.currentPage > 1 && findVoyages(pagination.currentPage - 1, dateFilterActive)} />
                    <View style={{ alignItems: 'center' }}>
                        <Texte graisse="tresGras">Page {pagination.currentPage} / {pagination.lastPage}</Texte>
                        <Texte variante="legende">{pagination.total} voyages</Texte>
                    </View>
                    <BoutonIcone icone="chevron-forward" libelle="Page suivante" onPress={() => pagination.currentPage < pagination.lastPage && findVoyages(pagination.currentPage + 1, dateFilterActive)} />
                </View>
            )}
        </View>
    );

    const renderStep3 = () => {
        const voiture = plans?.voiture || selectedVoyage?.voiture || {};
        const nomVoiture = [voiture.marque || voiture.voit_marque, voiture.modele || voiture.voit_modele].filter(Boolean).join(' ');
        return (
            <View style={{ gap: 14 }}>
                {resumeVoyage()}

                {seatPlan.length === 0 ? (
                    <Carte style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
                        <Ionicons name="alert-circle-outline" size={36} color={couleurs.danger} />
                        <Texte graisse="tresGras" taille={15} centre>Plan de sièges indisponible</Texte>
                        <Texte variante="legende" centre>Ce véhicule n'a pas encore de plan de sièges. Contactez la compagnie.</Texte>
                        <Bouton titre="Réessayer" variante="secondaire" compact onPress={() => fetchSeatPlan(selectedVoyage.voyage_id)} style={{ marginTop: 6 }} />
                    </Carte>
                ) : (
                    <>
                        {(nomVoiture || chauffeur) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                <Ionicons name="bus-outline" size={16} color={couleurs.gris} />
                                <Texte variante="legende" numberOfLines={1}>
                                    {[nomVoiture, `${seatPlan.length} places`, chauffeur && `chauffeur ${chauffeur}`].filter(Boolean).join(' · ')}
                                </Texte>
                            </View>
                        )}
                        <LegendePlan />
                        <PlanSieges sieges={seatPlan} selection={selectedSeats} onToggle={toggleSeat} />
                        <Texte variante="legende" centre>Les sièges se mettent à jour en direct quand d'autres clients réservent.</Texte>
                    </>
                )}
            </View>
        );
    };

    const renderVoyageur = (v: any, index: number) => (
        <Carte key={v.siege_numero} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: couleurs.ocean800, alignItems: 'center', justifyContent: 'center' }}>
                    <Texte graisse="tresGras" taille={14} couleur="#FFFFFF">{v.siege_numero}</Texte>
                </View>
                <View style={{ flex: 1 }}>
                    <Texte graisse="tresGras" taille={15}>Voyageur {index + 1}</Texte>
                    <Texte variante="legende">Siège {v.siege_numero}</Texte>
                </View>
                {index === 0 && utilisateur && (
                    <CaseACocher coche={!!v.moi} onChange={(c) => remplirAvecMoi(index, c)} libelle="C'est moi" />
                )}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                    <ChampSaisie libelle="Prénom" obligatoire value={v.prenom} onChangeText={(val) => updateVoyageur(index, 'prenom', val)} autoCapitalize="words" placeholder="Prénom" />
                </View>
                <View style={{ flex: 1 }}>
                    <ChampSaisie libelle="Nom" obligatoire value={v.nom} onChangeText={(val) => updateVoyageur(index, 'nom', val)} autoCapitalize="words" placeholder="Nom" />
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 96 }}>
                    <ChampSaisie libelle="Âge" value={v.age ? String(v.age) : ''} onChangeText={(val) => updateVoyageur(index, 'age', val.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Ex. 25" maxLength={3} />
                </View>
                <View style={{ flex: 1 }}>
                    <ChampSaisie libelle="N° CIN" value={v.cin} onChangeText={(val) => updateVoyageur(index, 'cin', val)} placeholder="Facultatif" keyboardType="number-pad" />
                </View>
            </View>
            <ChampSaisie libelle="Téléphone" obligatoire prefixe="+261" value={v.phone} onChangeText={(val) => updateVoyageur(index, 'phone', val)} keyboardType="phone-pad" placeholder="032 XX XXX XX" />
            <ChampSaisie
                libelle="Contact d'urgence"
                obligatoire
                prefixe="+261"
                value={v.phone2}
                onChangeText={(val) => updateVoyageur(index, 'phone2', val)}
                keyboardType="phone-pad"
                placeholder="034 XX XXX XX"
                aide="Un proche à prévenir en cas de problème sur la route."
            />
        </Carte>
    );

    const renderStep4 = () => (
        <View style={{ gap: 14 }}>
            {resumeVoyage()}
            <View style={{ gap: 2 }}>
                <Texte variante="titre" taille={22}>Qui voyage ?</Texte>
                <Texte graisse="moyen" taille={14} couleur={couleurs.gris}>Le nom doit correspondre à la pièce d'identité.</Texte>
            </View>
            {voyageurs.map(renderVoyageur)}
        </View>
    );

    const renderStep5 = () => {
        const modes = selectedVoyage?.compagnie?.modes_paiement || [];
        const papiActif = selectedVoyage?.compagnie?.papi_actif === true;
        const urgent = timeLeft <= 30;

        return (
            <View style={{ gap: 14 }}>
                {/* Compte à rebours */}
                <View
                    accessibilityRole="timer"
                    accessibilityLabel={`Sièges gardés encore ${Math.floor(timeLeft / 60)} minutes ${timeLeft % 60} secondes`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: urgent ? couleurs.dangerFond : couleurs.alerteFond }}
                >
                    <Ionicons name="hourglass-outline" size={22} color={urgent ? couleurs.danger : couleurs.alerte} />
                    <Texte graisse="gras" taille={13.5} couleur={urgent ? couleurs.danger : couleurs.alerte} style={{ flex: 1 }}>
                        Vos sièges sont gardés pendant
                    </Texte>
                    <Texte variante="montant" taille={22} couleur={urgent ? couleurs.danger : couleurs.alerte}>{formatTime(timeLeft)}</Texte>
                </View>

                {/* Récapitulatif */}
                <Carte style={{ gap: 9 }}>
                    <Texte variante="etiquette">Récapitulatif</Texte>
                    {[
                        ['Trajet', `${nomProvince(selectedVoyage?.trajet?.province_depart)} → ${nomProvince(selectedVoyage?.trajet?.province_arrivee)}`],
                        ['Départ', `${selectedVoyage?.date || '—'} · ${selectedVoyage?.heure_depart || '—'}`],
                        ['Compagnie', selectedVoyage?.compagnie?.nom || '—'],
                        ['Sièges', `${selectedSeats.join(', ')} · ${selectedSeats.length} × ${formatAriary(selectedVoyage?.trajet?.tarif || 0)} Ar`],
                    ].map(([libelle, valeur]) => (
                        <View key={libelle} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                            <Texte graisse="moyen" taille={13.5} couleur={couleurs.gris}>{libelle}</Texte>
                            <Texte graisse="gras" taille={13.5} style={{ flexShrink: 1, textAlign: 'right' }} numberOfLines={2}>{valeur}</Texte>
                        </View>
                    ))}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                        <Texte graisse="tresGras" taille={15}>Total</Texte>
                        <Texte variante="montant" taille={22}>{formatAriary(totalAPayer)} Ar</Texte>
                    </View>
                </Carte>

                {papiActif ? (
                    <Carte style={{ alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="shield-checkmark" size={26} color={couleurs.ocean800} />
                        </View>
                        <Texte graisse="tresGras" taille={16}>Paiement sécurisé en ligne</Texte>
                        <Texte variante="legende" centre>Payez par MVola, Orange Money, Airtel Money ou carte. La confirmation est automatique.</Texte>
                        {papiWaiting && (
                            <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, backgroundColor: couleurs.alerteFond, marginTop: 4 }}>
                                <Ionicons name="information-circle-outline" size={18} color={couleurs.alerte} />
                                <Texte graisse="moyen" taille={12.5} couleur={couleurs.alerte} style={{ flex: 1, lineHeight: 18 }}>
                                    Après avoir payé sur la page ouverte, revenez ici et appuyez sur « Vérifier le paiement ».
                                </Texte>
                            </View>
                        )}
                    </Carte>
                ) : (
                    <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                        <Texte variante="etiquette" style={{ marginLeft: 2 }}>Payer avec</Texte>
                        {modes.length === 0 && (
                            <Carte style={{ backgroundColor: couleurs.alerteFond, borderColor: couleurs.alerteFond }}>
                                <Texte graisse="gras" taille={13} couleur={couleurs.alerte} centre>Cette compagnie n'a pas encore configuré de mode de paiement.</Texte>
                            </Carte>
                        )}
                        {modes.map((mode: any) => {
                            const choisi = paymentMode?.type_paie_id === mode.type_paie_id;
                            const nom = mode.nom_paie || mode.type_paie;
                            return (
                                <Pressable
                                    key={mode.type_paie_id}
                                    onPress={() => setPaymentMode(mode)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: choisi }}
                                    style={{
                                        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14,
                                        borderWidth: 1.5, borderColor: choisi ? couleurs.ocean800 : couleurs.champ,
                                        backgroundColor: choisi ? '#F3F8FD' : couleurs.surface,
                                    }}
                                >
                                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: couleurs.ocean50, alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="phone-portrait-outline" size={20} color={couleurs.ocean800} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Texte graisse="tresGras" taille={14.5}>{nom}</Texte>
                                        {!!mode.numero && <Texte variante="legende">{mode.numero}</Texte>}
                                    </View>
                                    <Ionicons name={choisi ? 'radio-button-on' : 'radio-button-off'} size={22} color={choisi ? couleurs.ocean800 : couleurs.grisClair} />
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {/* Paiement manuel : numéro, montant, référence */}
                <FeuilleModale
                    visible={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    titre={`Payer par ${paymentMode?.nom_paie || paymentMode?.type_paie || ''}`}
                    sousTitre={`Temps restant ${formatTime(timeLeft)}`}
                    pied={
                        <Bouton
                            titre="J'ai effectué le paiement"
                            onPress={handlePaymentConfirmed}
                            chargement={loading}
                            desactive={!transactionRef.trim()}
                        />
                    }
                >
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
                        <View style={{ alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: couleurs.ocean50 }}>
                            <Texte variante="etiquette" couleur={couleurs.ocean800}>Montant exact à envoyer</Texte>
                            <Texte variante="montant" taille={30} couleur={couleurs.ocean950}>{formatAriary(totalAPayer)} Ar</Texte>
                        </View>

                        <Carte style={{ gap: 12, backgroundColor: couleurs.fond }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Texte variante="legende">Numéro</Texte>
                                    <Texte variante="montant" taille={19} style={{ letterSpacing: 1 }}>{paymentMode?.numero || '—'}</Texte>
                                </View>
                                <Bouton
                                    titre={copiedField === 'numero' ? 'Copié' : 'Copier'}
                                    icone={copiedField === 'numero' ? 'checkmark' : 'copy-outline'}
                                    variante="secondaire"
                                    compact
                                    onPress={() => paymentMode?.numero && copyToClipboard(paymentMode.numero, 'numero')}
                                    style={{ minHeight: 40, paddingHorizontal: 12 }}
                                />
                            </View>
                            <View>
                                <Texte variante="legende">Titulaire du compte</Texte>
                                <Texte graisse="tresGras" taille={15}>{paymentMode?.titulaire || '—'}</Texte>
                            </View>
                        </Carte>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Ionicons name="information-circle-outline" size={18} color={couleurs.ocean800} />
                            <Texte graisse="moyen" taille={13} couleur={couleurs.encreDouce} style={{ flex: 1, lineHeight: 19 }}>
                                Envoyez le montant exact à ce numéro, puis saisissez la référence de la transaction reçue par SMS.
                            </Texte>
                        </View>

                        <ChampSaisie
                            libelle="Référence de la transaction"
                            icone="document-text-outline"
                            placeholder="Ex. TRX123456789"
                            value={transactionRef}
                            onChangeText={(text) => {
                                setTransactionRef(text);
                                if (transactionRefError) setTransactionRefError(null);
                            }}
                            maxLength={50}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            erreur={transactionRefError || undefined}
                        />
                    </ScrollView>
                </FeuilleModale>
            </View>
        );
    };

    const renderExpiree = () => (
        <View style={{ alignItems: 'center', gap: 16, paddingTop: 24 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: couleurs.alerteFond, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="hourglass-outline" size={42} color={couleurs.alerte} />
            </View>
            <View style={{ gap: 8, alignItems: 'center' }}>
                <Texte variante="titre" taille={23} centre>Le délai de paiement est écoulé</Texte>
                <Texte graisse="moyen" taille={14.5} couleur={couleurs.gris} centre style={{ lineHeight: 21, maxWidth: 320 }}>
                    {selectedSeats.length > 1 ? `Les sièges ${selectedSeats.join(', ')} ont été libérés` : `Le siège ${selectedSeats[0] || ''} a été libéré`} pour d'autres voyageurs. Aucun montant n'a été prélevé.
                </Texte>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, backgroundColor: couleurs.ocean50, alignSelf: 'stretch' }}>
                <Ionicons name="information-circle-outline" size={18} color={couleurs.ocean800} />
                <Texte graisse="moyen" taille={12.5} couleur={couleurs.encreDouce} style={{ flex: 1, lineHeight: 18 }}>
                    Si votre paiement arrive malgré tout, il vous sera remboursé automatiquement. Suivez-le dans Remboursements.
                </Texte>
            </View>
        </View>
    );

    const renderStep6 = () => {
        const qrData = invoiceData?.reservation?.qr_data || '';
        let qrString = '';
        try {
            qrString = qrData ? atob(qrData) : '';
        } catch {
            qrString = qrData;
        }

        return (
            <View style={{ gap: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: couleurs.succesVif, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={26} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Texte variante="titre" taille={21} couleur="#FFFFFF">Réservation confirmée</Texte>
                        <Texte graisse="moyen" taille={13} couleur={couleurs.texteSurMarine}>
                            {invoiceData?.reservation?.paiement?.type ? `Paiement ${invoiceData.reservation.paiement.type} reçu · ` : ''}{formatAriary(invoiceData?.reservation?.montant || 0)} Ar
                        </Texte>
                    </View>
                </View>

                {/* Billet */}
                <View style={{ backgroundColor: couleurs.surface, borderRadius: 22, overflow: 'hidden' }}>
                    <View style={{ padding: 18, gap: 14 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Texte graisse="tresGras" taille={13} couleur={couleurs.ocean950}>{invoiceData?.voyage?.compagnie || selectedVoyage?.compagnie?.nom}</Texte>
                            <Texte graisse="gras" taille={12} couleur={couleurs.gris}>Billet {invoiceData?.reservation?.numero}</Texte>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Texte graisse="tresGras" taille={18} numberOfLines={1}>{invoiceData?.voyage?.depart}</Texte>
                            </View>
                            <Ionicons name="bus-outline" size={20} color={couleurs.ocean800} />
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Texte graisse="tresGras" taille={18} numberOfLines={1}>{invoiceData?.voyage?.arrivee}</Texte>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            {[
                                ['Date', invoiceData?.voyage?.date],
                                ['Heure', invoiceData?.voyage?.heure],
                                ['Sièges', (invoiceData?.voyageurs || []).map((v: any) => v.siege).join(', ') || selectedSeats.join(', ')],
                            ].map(([l, val]) => (
                                <View key={l}>
                                    <Texte variante="etiquette" taille={10.5}>{l}</Texte>
                                    <Texte graisse="tresGras" taille={14}>{val || '—'}</Texte>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Perforation */}
                    <View style={{ height: 22, justifyContent: 'center' }}>
                        <View style={{ position: 'absolute', left: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: couleurs.ocean950 }} />
                        <View style={{ marginHorizontal: 18, borderTopWidth: 2, borderStyle: 'dashed', borderColor: couleurs.ocean100 }} />
                        <View style={{ position: 'absolute', right: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: couleurs.ocean950 }} />
                    </View>

                    <View style={{ alignItems: 'center', gap: 10, padding: 18, paddingTop: 10 }}>
                        <View style={{ padding: 10, borderRadius: 14, borderWidth: 1, borderColor: couleurs.ligne }}>
                            {qrString ? (
                                <QRCode value={qrString} size={180} color={couleurs.ocean950} backgroundColor="#FFFFFF" />
                            ) : (
                                <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
                                    <ActivityIndicator color={couleurs.ocean800} />
                                </View>
                            )}
                        </View>
                        <Texte variante="legende" centre>Présentez ce code au chauffeur à l'embarquement</Texte>
                        {(invoiceData?.voyageurs || []).length > 0 && (
                            <View style={{ alignSelf: 'stretch', gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: couleurs.separateur }}>
                                {invoiceData.voyageurs.map((v: any, i: number) => (
                                    <Texte key={i} graisse="moyen" taille={13}>{v.prenom} {v.nom} · siège {v.siege}</Texte>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    // ─────────────────────────── Mise en page ───────────────────────────

    const marine = currentStep === 6;
    const etapesAffichees = debutAuxSieges ? ['Sièges', 'Voyageurs', 'Paiement'] : ['Trajet', 'Voyage', 'Sièges', 'Voyageurs', 'Paiement'];
    const indexEtape = Math.min(currentStep, 5) - (debutAuxSieges ? 3 : 1);
    const titres: Record<number, string> = {
        1: 'Réserver un voyage', 2: 'Choisir un voyage', 3: 'Choisissez vos sièges', 4: 'Voyageurs', 5: 'Paiement', 6: 'Votre billet',
    };

    const piedEtapes = () => {
        if (expiree) {
            return (
                <View style={{ gap: 10 }}>
                    <Bouton titre="Choisir à nouveau mes sièges" icone="refresh" onPress={recommencerSieges} />
                    <Bouton titre="Retour à l'accueil" variante="secondaire" onPress={() => router.replace(ACCUEIL)} />
                </View>
            );
        }
        if (currentStep === 6) {
            return <Bouton titre="Voir mes billets" variante="secondaire" onPress={() => router.replace(BILLETS)} style={{ backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' }} />;
        }
        if (currentStep === 5) {
            const papiActif = selectedVoyage?.compagnie?.papi_actif === true;
            return (
                <View style={{ gap: 6 }}>
                    {papiActif ? (
                        papiWaiting ? (
                            <Bouton titre="Vérifier le paiement" variante="succes" icone="refresh" onPress={handleVerifierPaiement} chargement={loading} />
                        ) : (
                            <Bouton titre={`Payer ${formatAriary(totalAPayer)} Ar`} icone="lock-closed" onPress={handlePayerEnLigne} chargement={loading} />
                        )
                    ) : (
                        <Bouton titre="Continuer vers le paiement" onPress={confirmPayment} desactive={!paymentMode} chargement={loading} />
                    )}
                    <Bouton titre="Abandonner la réservation" variante="lien" compact onPress={handleCancelProcess} />
                </View>
            );
        }
        // Étapes 1 à 4 : résumé + bouton
        const desactive = (currentStep === 1 && (!proDepartId || !proArriveeId)) || (currentStep === 2 && !selectedVoyage) || (currentStep === 3 && selectedSeats.length === 0);
        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {currentStep >= 3 && (
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Texte variante="legende" numberOfLines={1}>
                            {selectedSeats.length === 0
                                ? 'Aucun siège choisi'
                                : `${selectedSeats.length} siège${selectedSeats.length > 1 ? 's' : ''} · n° ${selectedSeats.join(', ')}`}
                        </Texte>
                        <Texte variante="montant" taille={20}>
                            {formatAriary(totalTheorique)}<Texte graisse="gras" taille={13} couleur={couleurs.gris}> Ar</Texte>
                        </Texte>
                    </View>
                )}
                <Bouton
                    titre={currentStep === 1 ? 'Rechercher' : currentStep === 4 ? 'Réserver' : 'Continuer'}
                    onPress={handleNext}
                    desactive={desactive}
                    chargement={loading && currentStep === 4}
                    style={currentStep >= 3 ? { paddingHorizontal: 26 } : { flex: 1 }}
                />
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: marine ? couleurs.ocean950 : couleurs.fond }}>
            <Stack.Screen options={{ headerShown: false }} />
            <DialogComponent />
            <StatusBar barStyle={marine ? 'light-content' : 'dark-content'} backgroundColor={marine ? couleurs.ocean950 : couleurs.surface} />

            {/* En-tête */}
            {!marine && (
                <View style={{ backgroundColor: couleurs.surface, borderBottomWidth: 1, borderBottomColor: couleurs.ligne, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 14, gap: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <BoutonIcone icone={currentStep === 5 && !expiree ? 'close' : 'chevron-back'} libelle={currentStep === 5 ? 'Abandonner' : 'Retour'} onPress={expiree ? () => router.replace(ACCUEIL) : handleBack} />
                        <Texte variante="sousTitre" style={{ flex: 1 }} numberOfLines={1}>{expiree ? 'Réservation expirée' : titres[currentStep]}</Texte>
                    </View>
                    {!expiree && <Etapes etapes={etapesAffichees} courante={Math.max(0, indexEtape)} />}
                </View>
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingTop: marine ? insets.top + 20 : 16, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {loading && currentStep !== 4 && currentStep !== 5 ? (
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 }}>
                            <ActivityIndicator size="large" color={couleurs.ocean800} />
                            <Texte graisse="gras" couleur={couleurs.gris}>Chargement…</Texte>
                        </View>
                    ) : expiree ? (
                        renderExpiree()
                    ) : (
                        <>
                            {currentStep === 1 && renderStep1()}
                            {currentStep === 2 && renderStep2()}
                            {currentStep === 3 && renderStep3()}
                            {currentStep === 4 && renderStep4()}
                            {currentStep === 5 && renderStep5()}
                            {currentStep === 6 && renderStep6()}
                        </>
                    )}
                </ScrollView>

                {/* Pied fixe */}
                <View
                    style={{
                        backgroundColor: marine ? couleurs.ocean950 : couleurs.surface,
                        borderTopWidth: marine ? 0 : 1,
                        borderTopColor: couleurs.ligne,
                        paddingHorizontal: 16,
                        paddingTop: 12,
                        paddingBottom: Math.max(insets.bottom, 12) + 8,
                    }}
                >
                    {piedEtapes()}
                </View>
            </KeyboardAvoidingView>

            {/* Reprendre une réservation interrompue */}
            <FeuilleModale
                visible={showResumeModal}
                onClose={() => setShowResumeModal(false)}
                titre="Reprendre votre réservation ?"
                sousTitre="Elle a été interrompue (connexion ou fermeture de l'app)."
                pied={
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Bouton
                            titre="Abandonner"
                            variante="secondaire"
                            style={{ flex: 1 }}
                            onPress={async () => {
                                // Libérer les sièges si la réservation avait été créée
                                if (resumeData?.res_id) reservationService.annulerReservation(resumeData.res_id).catch(() => {});
                                await clearPendingReservation();
                                setShowResumeModal(false);
                                setResumeData(null);
                            }}
                        />
                        <Bouton
                            titre="Reprendre"
                            style={{ flex: 1 }}
                            onPress={() => {
                                if (!resumeData) return;
                                const p = resumeData.payload;
                                setShowResumeModal(false);
                                if (!p.voyage) {
                                    // Ancienne sauvegarde sans le voyage : impossible de reprendre proprement
                                    clearPendingReservation();
                                    alerte('Reprise impossible', 'Cette réservation ne peut pas être reprise. Recommencez depuis l\'accueil.', 'info');
                                    return;
                                }
                                setSelectedVoyage(p.voyage);
                                setSelectedSeats(p.sieges || []);
                                setVoyageurs(p.voyageurs || []);
                                if (resumeData.res_id) {
                                    // Réservation déjà créée -> paiement (le délai vient du serveur)
                                    setReservationResult({
                                        res_id: resumeData.res_id,
                                        date_limite_paiement: p.date_limite_paiement,
                                        montant_total: p.montant_serveur,
                                    });
                                    setCurrentStep(5);
                                } else if (!isOnline) {
                                    pendingRetryRef.current = createInitialReservation;
                                    setCurrentStep(4);
                                    alerte('Hors connexion', 'Votre réservation sera envoyée dès le retour en ligne.', 'info');
                                } else {
                                    // Pas encore créée : on revient aux voyageurs pour valider
                                    setCurrentStep(4);
                                }
                            }}
                        />
                    </View>
                }
            >
                {resumeData?.payload?.voyageInfo && (
                    <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                        <Carte style={{ gap: 4, backgroundColor: couleurs.fond }}>
                            <Texte graisse="tresGras" taille={15}>
                                {resumeData.payload.voyageInfo.depart || '—'} → {resumeData.payload.voyageInfo.arrivee || '—'}
                            </Texte>
                            {!!resumeData.payload.voyageInfo.compagnie && <Texte variante="legende">{resumeData.payload.voyageInfo.compagnie}</Texte>}
                            {!!resumeData.payload.voyageInfo.date && <Texte variante="legende">{resumeData.payload.voyageInfo.date}</Texte>}
                            <Texte graisse="gras" taille={13} couleur={couleurs.encreDouce}>
                                {resumeData.payload.nb_voyageurs} voyageur{resumeData.payload.nb_voyageurs > 1 ? 's' : ''} · {formatAriary(resumeData.payload.montant_serveur ?? resumeData.payload.montant_total)} Ar
                            </Texte>
                        </Carte>
                    </View>
                )}
            </FeuilleModale>
        </View>
    );
}
