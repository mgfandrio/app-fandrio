import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { provinceService } from '../../../../services/provinces/provinceService';
import { voyageService } from '../../../../services/voyages/voyageService';
import { reservationService } from '../../../../services/reservations/reservationService';
import { siegeService } from '../../../../services/sieges/siegeService';
import { SearchableDropdown } from '../../../../components/common/SearchableDropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import echo from '../../../../services/echo/echoConfig';

const STEPS = [
    'Itinéraire',
    'Voyage',
    'Sièges',
    'Voyageurs',
    'Paiement',
    'Confirmation'
];

export default function ReserverScreen() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
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

    // Timer State
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
    const timerRef = useRef<any>(null);

    // Data for Step 1, 2, 3
    const [provinces, setProvinces] = useState<any[]>([]);
    const [availableVoyages, setAvailableVoyages] = useState<any[]>([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        lastPage: 1,
        total: 0
    });
    const [seatPlan, setSeatPlan] = useState<any[]>([]);

    // Date Filter State
    const [dateDebut, setDateDebut] = useState<Date | null>(null);
    const [dateFin, setDateFin] = useState<Date | null>(null);
    const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
    const [dateFilterActive, setDateFilterActive] = useState(false);
    const [noResults, setNoResults] = useState(false);

    useEffect(() => {
        fetchProvinces();
    }, []);

    useEffect(() => {
        if (currentStep === 3 && selectedVoyage) {
            fetchSeatPlan(selectedVoyage.voyage_id);

            // Écouter les mises à jour en temps réel pour ce voyage
            const channel = echo.channel(`sieges.voyage.${selectedVoyage.voyage_id}`)
                .listen('.siege.updated', (event: any) => {
                    console.log('Real-time seat update received:', event);
                    const siegeNumero = event.siege_numero;
                    const statut = event.data?.statut;
                    // Convertir le statut numérique en label frontend
                    const newStatut = statut === 1 ? 'reserve'
                        : statut === 3 ? 'selectionne'
                        : statut === 2 ? 'disponible'
                        : null;
                    if (!newStatut || !siegeNumero) return;

                    setSeatPlan((prevPlan) => 
                        prevPlan.map((seat) => 
                            seat.code === siegeNumero 
                                ? { ...seat, statut: newStatut, selectable: newStatut === 'disponible' }
                                : seat
                        )
                    );

                    // Si un siège sélectionné localement a été pris par un autre, le désélectionner
                    if (newStatut !== 'disponible') {
                        setSelectedSeats((prev) => prev.filter(s => s !== siegeNumero));
                    }
                });

            return () => {
                echo.leaveChannel(`sieges.voyage.${selectedVoyage.voyage_id}`);
            };
        }

        if (currentStep === 5) {
            startTimer();
        } else {
            stopTimer();
        }

        return () => stopTimer();
    }, [currentStep, selectedVoyage]);

    const startTimer = () => {
        setTimeLeft(120);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    stopTimer();
                    Alert.alert('Temps écoulé', 'Le délai de réservation a expiré. Veuillez recommencer.', [
                        { text: 'OK', onPress: () => router.replace('/screens/dashboard/utilisateur/reservation') }
                    ]);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
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
                const resData = response as any;
                const data = resData.data?.provinces || resData.data;
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
                // Update selectedVoyage with extra info
                if (response && response.statut) {
                    setPlans(response.data);
                    if (response.data.voiture?.chauffeur) {
                        const c = response.data.voiture.chauffeur;
                        const fullName = [c.prenom, c.nom].filter(Boolean).join(' ');
                        setChauffeur(fullName || 'Chauffeur');
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching seat plan:', error);
            Alert.alert('Erreur', 'Impossible de charger le plan des sièges.');
        } finally {
            setLoading(false);
        }
    };

    const findVoyages = async (page = 1, applyDateFilter = false) => {
        if (!proDepartId || !proArriveeId) {
            Alert.alert('Attention', 'Veuillez choisir le départ et la destination.');
            return;
        }
        if (proDepartId === proArriveeId) {
            Alert.alert('Attention', 'Le départ et la destination doivent être différents.');
            return;
        }
        setLoading(true);
        try {
            const filters: any = {
                pro_depart: proDepartId,
                pro_arrivee: proArriveeId,
                page: page,
                per_page: 15
            };

            // N'appliquer le filtre de date que si explicitement demandé par l'utilisateur
            if (applyDateFilter && dateDebut) {
                const debut = dateDebut.toISOString().split('T')[0];
                if (dateFin && dateFin > dateDebut) {
                    // Plage de dates
                    filters.date_debut = debut;
                    filters.date_fin = dateFin.toISOString().split('T')[0];
                } else {
                    // Date exacte
                    filters.date_exacte = debut;
                }
            }

            const response = await voyageService.rechercherVoyages(filters);
            if (response.statut === true) {
                setAvailableVoyages(response.data.voyages || []);
                setPagination({
                    currentPage: response.data.pagination?.current_page || 1,
                    lastPage: response.data.pagination?.last_page || 1,
                    total: response.data.pagination?.total || 0
                });

                if (applyDateFilter) setDateFilterActive(true);
                setNoResults((response.data.voyages || []).length === 0);

                if ((response.data.voyages || []).length === 0) {
                    // Message inline, pas d'Alert
                } else if (currentStep === 1) {
                    setCurrentStep(2);
                }
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Impossible de trouver des voyages pour ce trajet.');
        } finally {
            setLoading(false);
        }
    };

    const createInitialReservation = async () => {
        setLoading(true);
        try {
            const data = {
                voyage_id: selectedVoyage.voyage_id,
                nb_voyageurs: selectedSeats.length,
                montant_total: selectedSeats.length * (selectedVoyage?.trajet?.tarif || 0),
                sieges: selectedSeats,
                voyageurs: voyageurs
            };
            const response = await reservationService.creerReservation(data);
            if (response.statut) {
                setReservationResult(response.data);
                setCurrentStep(5);
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.response?.data?.message || 'Impossible de créer la réservation.');
        } finally {
            setLoading(false);
        }
    };

    const confirmPayment = async () => {
        if (!paymentMode) {
            Alert.alert('Attention', 'Veuillez choisir un mode de paiement.');
            return;
        }
        setLoading(true);
        try {
            const response = await reservationService.confirmerReservation(reservationResult.res_id, {
                type_paie_id: paymentMode.id,
                numero_paiement: 'PAY-' + Date.now() // Mock payment number
            });
            if (response.statut) {
                stopTimer();
                fetchInvoice();
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.response?.data?.message || 'La confirmation a échoué.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelProcess = () => {
        Alert.alert(
            'Confirmation',
            'Voulez-vous vraiment annuler cette réservation ? Tous vos choix seront perdus.',
            [
                { text: 'Non', style: 'cancel' },
                { 
                    text: 'Oui, annuler', 
                    style: 'destructive',
                    onPress: async () => {
                        if (reservationResult?.res_id) {
                            setLoading(true);
                            try {
                                await reservationService.annulerReservation(reservationResult.res_id);
                            } catch (error) {
                                console.error('Error voiding reservation:', error);
                            } finally {
                                setLoading(false);
                            }
                        }
                        router.replace('/screens/dashboard/utilisateur/reservation');
                    }
                }
            ]
        );
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
            router.replace('/screens/dashboard/utilisateur/reservation');
        }
    };

    const handleNext = () => {
        if (currentStep === 1) findVoyages();
        else if (currentStep === 2) {
            if (!selectedVoyage) Alert.alert('Attention', 'Veuillez choisir un voyage.');
            else setCurrentStep(3);
        }
        else if (currentStep === 3) {
            if (selectedSeats.length === 0) Alert.alert('Attention', 'Veuillez sélectionner au moins un siège.');
            else {
                const initialVoyageurs = selectedSeats.map(seat => ({
                    nom: '',
                    prenom: '',
                    phone: '',
                    phone2: '',
                    cin: '',
                    age: '',
                    siege_numero: seat
                }));
                setVoyageurs(initialVoyageurs);
                setCurrentStep(4);
            }
        }
        else if (currentStep === 4) {
            const isValid = voyageurs.every(v => 
                v.nom.trim() !== '' && 
                v.prenom.trim() !== '' && 
                v.phone.trim() !== '' && 
                v.phone2.trim() !== ''
            );
            if (!isValid) Alert.alert('Attention', 'Veuillez remplir le nom, le prénom et les deux numéros de téléphone pour tous les voyageurs.');
            else createInitialReservation();
        }
        else if (currentStep === 5) {
            confirmPayment();
        }
    };

    const updateVoyageur = (index: number, field: string, value: string) => {
        const updated = [...voyageurs];
        updated[index] = { ...updated[index], [field]: value };
        setVoyageurs(updated);
    };

    const toggleSeat = (seatCode: string, isAvailable: boolean) => {
        if (!isAvailable) return;
        if (selectedSeats.includes(seatCode)) {
            setSelectedSeats(selectedSeats.filter(s => s !== seatCode));
        } else {
            setSelectedSeats([...selectedSeats, seatCode]);
        }
    };

    const renderHeader = () => (
        <View className="bg-white px-6 pt-4 pb-2 border-b border-gray-100">
            <View className="flex-row items-center mb-4">
                <TouchableOpacity onPress={() => currentStep > 1 && currentStep < 6 ? setCurrentStep(currentStep - 1) : router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900 ml-4">Réservation</Text>
            </View>

            {/* Progress Bar */}
            <View className="flex-row justify-between mb-2">
                {STEPS.map((step, index) => (
                    <View key={index} className="items-center flex-1">
                        <View
                            className={`w-6 h-6 rounded-full items-center justify-center mb-1 ${index + 1 === currentStep ? 'bg-blue-900' : index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200'
                                }`}
                        >
                            {index + 1 < currentStep ? (
                                <Ionicons name="checkmark" size={14} color="white" />
                            ) : (
                                <Text className="text-white text-[10px] font-bold">{index + 1}</Text>
                            )}
                        </View>
                        <Text className={`text-[8px] font-bold uppercase text-center ${index + 1 === currentStep ? 'text-blue-900' : 'text-gray-400'}`}>
                            {step}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );

    const renderStep1 = () => (
        <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 mb-6">Sélectionnez votre itinéraire</Text>
            <View className="mb-6">
                <SearchableDropdown
                    label="Départ"
                    data={provinces.filter(p => p.id !== proArriveeId)}
                    selectedId={proDepartId}
                    onSelect={(id: any) => setProDepartId(id)}
                    placeholder="Ville de départ"
                    displayKey="nom"
                    valueKey="id"
                    showAllOption={false}
                />
            </View>
            <View className="mb-8">
                <SearchableDropdown
                    label="Destination"
                    data={provinces.filter(p => p.id !== proDepartId)}
                    selectedId={proArriveeId}
                    onSelect={(id: any) => setProArriveeId(id)}
                    placeholder="Ville d'arrivée"
                    displayKey="nom"
                    valueKey="id"
                    showAllOption={false}
                />
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 mb-4">Voyages disponibles</Text>

            {/* Date Filters */}
            <View className="bg-white p-4 rounded-3xl mb-6 border border-gray-100">
                <Text className="text-sm font-bold text-gray-700 mb-3">Filtrer par date</Text>

                <View className="flex-row" style={{ gap: 10 }}>
                    {/* Date de départ */}
                    <TouchableOpacity
                        onPress={() => setShowPicker('start')}
                        className="flex-1 flex-row items-center bg-gray-50 p-3 rounded-2xl border border-gray-100"
                    >
                        <Ionicons name="calendar-outline" size={18} color="#1e3a8a" />
                        <View className="ml-2">
                            <Text className="text-gray-400 text-[10px]">À partir du</Text>
                            <Text className="text-gray-700 text-xs font-bold">
                                {dateDebut ? dateDebut.toLocaleDateString('fr-FR') : 'Choisir'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Flèche séparateur */}
                    <View className="items-center justify-center">
                        <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                    </View>

                    {/* Date de fin (optionnelle) */}
                    <TouchableOpacity
                        onPress={() => setShowPicker('end')}
                        className="flex-1 flex-row items-center bg-gray-50 p-3 rounded-2xl border border-gray-100"
                    >
                        <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
                        <View className="ml-2">
                            <Text className="text-gray-400 text-[10px]">Jusqu'au (opt.)</Text>
                            <Text className={`text-xs font-bold ${dateFin ? 'text-gray-700' : 'text-gray-400'}`}>
                                {dateFin ? dateFin.toLocaleDateString('fr-FR') : 'Choisir'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Reset filtre */}
                    {(dateDebut || dateFin) && (
                        <TouchableOpacity
                            onPress={() => { setDateDebut(null); setDateFin(null); setDateFilterActive(false); findVoyages(1, false); }}
                            className="items-center justify-center px-2"
                        >
                            <Ionicons name="close-circle" size={22} color="#ef4444" />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => { setDateFilterActive(false); findVoyages(1, true); }}
                    className="mt-4 bg-blue-900 py-3 rounded-2xl items-center"
                >
                    <Text className="text-white font-bold text-sm">Rechercher</Text>
                </TouchableOpacity>
            </View>

            {showPicker && (
                <DateTimePicker
                    value={showPicker === 'start' ? (dateDebut || new Date()) : (dateFin || new Date())}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                        setShowPicker(null);
                        if (selectedDate) {
                            if (showPicker === 'start') setDateDebut(selectedDate);
                            else if (showPicker === 'end') setDateFin(selectedDate);
                        }
                    }}
                />
            )}

            {/* Résultat vide inline */}
            {noResults && availableVoyages.length === 0 && (
                <View className="items-center py-10">
                    <Ionicons name="search-outline" size={48} color="#d1d5db" />
                    <Text className="text-gray-400 font-bold text-lg mt-3">Aucun voyage trouvé</Text>
                    <Text className="text-gray-300 text-sm text-center mt-1">Essayez une autre date ou un autre trajet.</Text>
                </View>
            )}

            {availableVoyages.map((voyage) => (
                <TouchableOpacity
                    key={voyage.voyage_id}
                    className={`bg-white p-4 rounded-3xl mb-4 border ${selectedVoyage?.voyage_id === voyage.voyage_id ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100'
                        }`}
                    onPress={() => setSelectedVoyage(voyage)}
                >
                    <View className="flex-row justify-between items-start mb-3">
                        <View>
                            <Text className="text-gray-900 font-bold text-xl">{voyage.compagnie?.nom || 'Compagnie'}</Text>
                            <View className="flex-row items-center mt-1">
                                <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                                <Text className="text-gray-500 text-sm ml-1 mr-3">{voyage.date}</Text>
                                <Ionicons name="time-outline" size={14} color="#6b7280" />
                                <Text className="text-gray-500 text-sm ml-1">{voyage.heure_depart}</Text>
                            </View>
                        </View>
                        <Text className="text-blue-900 font-bold text-xl">{new Intl.NumberFormat('fr-FR').format(voyage.trajet?.tarif || 0)} Ar</Text>
                    </View>
                    <View className="flex-row justify-between items-center pt-2 border-t border-gray-50">
                        <Text className="text-gray-500 text-xs italic">{voyage.trajet?.nom}</Text>
                        <Text className="text-gray-600 font-bold text-xs">{voyage.places_disponibles} places restantes</Text>
                    </View>
                </TouchableOpacity>
            ))}

            {availableVoyages.length > 0 && pagination.lastPage > 1 && (
                <View className="flex-row justify-center items-center mt-4 mb-8">
                    <TouchableOpacity
                        onPress={() => findVoyages(pagination.currentPage - 1, dateFilterActive)}
                        disabled={pagination.currentPage === 1}
                        className={`p-2 rounded-full ${pagination.currentPage === 1 ? 'opacity-30' : 'bg-white shadow-sm'}`}
                    >
                        <Ionicons name="chevron-back" size={24} color="#1e3a8a" />
                    </TouchableOpacity>

                    <View className="mx-6 items-center">
                        <Text className="text-gray-900 font-bold">Page {pagination.currentPage}</Text>
                        <Text className="text-gray-400 text-[10px]">{pagination.total} voyages trouvés</Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => findVoyages(pagination.currentPage + 1, dateFilterActive)}
                        disabled={pagination.currentPage === pagination.lastPage}
                        className={`p-2 rounded-full ${pagination.currentPage === pagination.lastPage ? 'opacity-30' : 'bg-white shadow-sm'}`}
                    >
                        <Ionicons name="chevron-forward" size={24} color="#1e3a8a" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderStep3 = () => {
        // Robust capacity detection
        const getPlaceCount = () => {
            // 1. D'abord la longueur du plan (source la plus fiable pour le rendu)
            if (seatPlan && seatPlan.length > 0) return seatPlan.length;

            // 2. Ensuite les champs de données (priorité à voit_places)
            const sources = [
                plans?.voiture,
                selectedVoyage?.voiture,
                plans,
                selectedVoyage
            ];
            const fields = ['voit_places', 'places', 'nb_places', 'nb_place'];
            
            for (const source of sources) {
                if (!source) continue;
                for (const field of fields) {
                    const value = source[field];
                    if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
                        return Number(value);
                    }
                }
            }
            return NaN;
        };

        const placeCount = getPlaceCount();
        const isSupported = [16, 18, 22].includes(placeCount);

        if (!isSupported) {
            return (
                <View className="flex-1 items-center justify-center py-10">
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <Text className="text-gray-900 font-bold text-lg mt-4 text-center">
                        Plan de siège non disponible
                    </Text>
                    <Text className="text-gray-500 text-sm mt-2 text-center px-6">
                        Désolé, le plan de siège pour un véhicule de {placeCount || '?'} places n'est pas encore configuré. 
                        Veuillez contacter le support.
                    </Text>
                </View>
            );
        }

        const renderSeat = (seat: any, width: any = '25%') => {
            const isSelected = selectedSeats.includes(seat.code);
            const isAvailable = seat.statut === 'disponible';
            const isReserved = seat.statut === 'reserve';
            const isTemporary = seat.statut === 'selectionne';

            return (
                <View key={seat.code} className="mb-4 items-center px-1" style={{ width }}>
                    <TouchableOpacity
                        className={`w-full h-14 rounded-[12px] items-center justify-center border ${
                            isSelected 
                                ? 'bg-[#0ea5e9] border-[#0ea5e9]' 
                                : isTemporary
                                    ? 'bg-[#FFA500] border-[#FFA500]' 
                                    : isReserved 
                                        ? 'bg-[#ef4444] border-[#ef4444]' 
                                        : 'bg-white border-gray-200 shadow-sm' 
                        }`}
                        onPress={() => toggleSeat(seat.code, isAvailable)}
                        disabled={!isAvailable && !isSelected}
                    >
                        {isReserved ? (
                            <Ionicons name="person" size={24} color="white" />
                        ) : isSelected ? (
                            <Ionicons name="person" size={24} color="white" />
                        ) : isTemporary ? (
                            <Ionicons name="time-outline" size={24} color="white" />
                        ) : (
                            <Text className="text-sm font-bold text-gray-700">{seat.code}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            );
        };

        const renderGrid = () => {
            const passengers = seatPlan.slice(2);
            
            if (placeCount === 16) {
                // Logic for 16 seats: specific aisle at Row 3, Column 3
                const gridItems = [];
                let passengerIdx = 0;

                for (let row = 0; row < 4; row++) {
                    for (let col = 0; col < 4; col++) {
                        if ((row === 1 || row === 2) && col === 2) {
                            gridItems.push(
                                <View key={`aisle-${row}`} className="mb-4 items-center px-1 justify-center" style={{ width: '25%' as any }}>
                                    <View className="w-full h-14 rounded-[12px] items-center justify-center bg-yellow-500">
                                        <Text className="text-[8px] font-bold text-white uppercase" style={{ transform: [{ rotate: '90deg' }] }}>COULOIRE</Text>
                                    </View>
                                </View>
                            );
                        } else if (passengerIdx < passengers.length) {
                            gridItems.push(renderSeat(passengers[passengerIdx]));
                            passengerIdx++;
                        }
                    }
                }
                return gridItems;
            }

            // Default for 18 and 22: simple wrap
            return passengers.map(seat => renderSeat(seat));
        };

        return (
            <View className="flex-1">
                <View className="flex-row items-center mb-4">
                    <Ionicons name="bus-outline" size={20} color="#6b7280" />
                    <Text className="text-sm font-bold text-gray-700 ml-2">Sélectionnez vos sièges</Text>
                </View>

                {/* Vehicle Seat Plan Container */}
                <View className="bg-white p-4 rounded-3xl border-2 border-[#0ea5e9] shadow-sm self-center relative w-full" style={{ paddingBottom: 60 }}>
                    {/* Vehicle Header Info */}
                    <View className="flex-row items-center mb-6 border-b border-gray-100 pb-4">
                        <View className="w-10 h-10 rounded-xl bg-fuchsia-500 items-center justify-center mr-3">
                            <Ionicons name="bus" size={24} color="white" />
                        </View>
                        <View>
                            <Text className="text-gray-900 font-bold text-base uppercase">
                                {selectedVoyage?.voiture?.voit_marque || selectedVoyage?.voiture?.marque || 'VOLKSWAGEN'} - {selectedVoyage?.voiture?.voit_modele || selectedVoyage?.voiture?.modele || 'Crafter'}
                            </Text>
                            <Text className="text-gray-500 text-xs">{placeCount || '?'} places</Text>
                        </View>
                    </View>

                    {/* Seats Grid Container */}
                    <View className="px-2 pb-6">
                        {/* Front Row: Driver + Seats 1 & 2 */}
                        <View className="flex-row justify-between mb-4" style={{ paddingHorizontal: '5%' }}>
                            <View className="items-center justify-center" style={{ width: '28%' as any }}>
                                <View className="h-14 items-center justify-center">
                                    <Ionicons name="person-circle" size={48} color="#111827" />
                                </View>
                                <Text className="text-[8px] text-gray-400 font-bold absolute -bottom-1 text-center" numberOfLines={1}>
                                    {chauffeur || 'Chauffeur'}
                                </Text>
                            </View>
                            
                            {seatPlan.slice(0, 2).map((seat) => renderSeat(seat, '28%'))}
                        </View>

                        {/* Passenger Rows */}
                        <View className="flex-row flex-wrap" style={{ paddingHorizontal: '1%' }}>
                            {renderGrid()}
                        </View>
                    </View>

                    {/* Legend */}
                    <View className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-gray-50 flex-row flex-wrap justify-between bg-white rounded-b-3xl">
                        <View className="flex-row items-center w-[23%]">
                            <View className="w-5 h-5 rounded-md bg-white border border-gray-200 mr-2" />
                            <Text className="text-[12px] font-bold text-gray-500">Libre</Text>
                        </View>
                        <View className="flex-row items-center w-[23%]">
                            <View className="w-5 h-5 rounded-md bg-[#0ea5e9] mr-2" />
                            <Text className="text-[12px] font-bold text-gray-500">Choisi</Text>
                        </View>
                        <View className="flex-row items-center w-[23%]">
                            <View className="w-5 h-5 rounded-md bg-[#FFA500] mr-2" />
                            <Text className="text-[12px] font-bold text-gray-500">Attente</Text>
                        </View>
                        <View className="flex-row items-center w-[23%]">
                            <View className="w-5 h-5 rounded-md bg-[#ef4444] mr-2" />
                            <Text className="text-[12px] font-bold text-gray-500">Occupé</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderStep4 = () => (
        <View className="flex-1">
            {/* Trip Summary Card */}
            <View className="bg-blue-900 p-5 rounded-[32px] mb-4 shadow-sm">
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                        <Ionicons name="map-outline" size={18} color="#93c5fd" />
                        <Text className="text-white font-bold ml-2">Récapitulatif du voyage</Text>
                    </View>
                    <View className="bg-blue-800 px-3 py-1 rounded-full">
                        <Text className="text-blue-100 text-[10px] font-bold uppercase">{selectedSeats.length} Passager(s)</Text>
                    </View>
                </View>
                
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1">
                        <Text className="text-blue-200 text-[10px] uppercase font-bold">Départ</Text>
                        <Text className="text-white font-bold text-sm" numberOfLines={1}>
                            {provinces.find(p => p.id === proDepartId)?.nom || selectedVoyage?.trajet?.depart?.pro_nom || 'N/A'}
                        </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#4b5563" className="mx-2" />
                    <View className="flex-1 items-end">
                        <Text className="text-blue-200 text-[10px] uppercase font-bold">Arrivée</Text>
                        <Text className="text-white font-bold text-sm" numberOfLines={1}>
                            {provinces.find(p => p.id === proArriveeId)?.nom || selectedVoyage?.trajet?.arrivee?.pro_nom || 'N/A'}
                        </Text>
                    </View>
                </View>

                <View className="flex-row justify-between border-t border-blue-800 pt-3">
                    <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={14} color="#93c5fd" />
                        <Text className="text-blue-100 text-xs ml-1">{selectedVoyage?.date || 'N/A'}</Text>
                    </View>
                    <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={14} color="#93c5fd" />
                        <Text className="text-blue-100 text-xs ml-1">{selectedVoyage?.heure_depart || 'N/A'}</Text>
                    </View>
                    <View className="flex-row items-center">
                        <Ionicons name="apps-outline" size={14} color="#93c5fd" />
                        <Text className="text-blue-100 text-xs ml-1">Sièges: {selectedSeats.join(', ')}</Text>
                    </View>
                </View>
            </View>

            <Text className="text-xl font-bold text-gray-900 mb-4 px-1">Informations voyageurs</Text>
            
            {voyageurs.map((v, index) => (
                <View key={index} className="bg-white p-5 rounded-[32px] mb-4 border border-gray-100 shadow-sm">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-blue-900 font-bold text-lg">Voyageur {index + 1}</Text>
                        <View className="bg-blue-50 px-3 py-1 rounded-full">
                            <Text className="text-blue-600 font-bold text-xs uppercase">Siège {v.siege_numero}</Text>
                        </View>
                    </View>

                    {/* Nom & Prénom */}
                    <View className="flex-row mb-4" style={{ gap: 12 }}>
                        <View className="flex-1">
                            <Text className="text-gray-700 text-sm font-bold mb-2">Nom *</Text>
                            <TextInput
                                className="bg-gray-50 p-4 rounded-xl text-base border border-gray-100"
                                placeholder="Nom"
                                value={v.nom}
                                onChangeText={(val) => updateVoyageur(index, 'nom', val)}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-700 text-sm font-bold mb-2">Prénom *</Text>
                            <TextInput
                                className="bg-gray-50 p-4 rounded-xl text-base border border-gray-100"
                                placeholder="Prénom"
                                value={v.prenom}
                                onChangeText={(val) => updateVoyageur(index, 'prenom', val)}
                            />
                        </View>
                    </View>

                    {/* CIN & Age */}
                    <View className="flex-row mb-4" style={{ gap: 12 }}>
                        <View className="flex-1">
                            <Text className="text-gray-700 text-sm font-bold mb-2">N° CIN</Text>
                            <TextInput
                                className="bg-gray-50 p-4 rounded-xl text-base border border-gray-100"
                                placeholder="Facultatif"
                                value={v.cin}
                                onChangeText={(val) => updateVoyageur(index, 'cin', val)}
                            />
                        </View>
                        <View className="w-24">
                            <Text className="text-gray-700 text-sm font-bold mb-2">Âge</Text>
                            <TextInput
                                className="bg-gray-50 p-4 rounded-xl text-base border border-gray-100"
                                placeholder="Ex: 25"
                                keyboardType="numeric"
                                value={v.age ? String(v.age) : ''}
                                onChangeText={(val) => updateVoyageur(index, 'age', val)}
                            />
                        </View>
                    </View>

                    {/* Téléphone 1 */}
                    <View className="mb-4">
                        <Text className="text-gray-700 text-sm font-bold mb-2">N° Téléphone *</Text>
                        <View className="flex-row">
                            <View className="bg-gray-100 px-3 flex-row items-center rounded-l-xl border border-r-0 border-gray-200">
                                <Text className="text-lg mr-1">🇲🇬</Text>
                                <Text className="text-gray-600 font-bold">+261</Text>
                            </View>
                            <TextInput
                                className="flex-1 bg-gray-50 p-4 rounded-r-xl text-base border border-gray-100"
                                placeholder="032 XX XXX XX"
                                keyboardType="phone-pad"
                                value={v.phone}
                                onChangeText={(val) => updateVoyageur(index, 'phone', val)}
                            />
                        </View>
                    </View>

                    {/* Téléphone 2 / Urgence */}
                    <View>
                        <Text className="text-gray-700 text-sm font-bold mb-2">Tél 2 (Contact Urgence) *</Text>
                        <View className="flex-row">
                            <View className="bg-gray-100 px-3 flex-row items-center rounded-l-xl border border-r-0 border-gray-200">
                                <Text className="text-lg mr-1">🇲🇬</Text>
                                <Text className="text-gray-600 font-bold">+261</Text>
                            </View>
                            <TextInput
                                className="flex-1 bg-gray-50 p-4 rounded-r-xl text-base border border-gray-100"
                                placeholder="034 XX XXX XX"
                                keyboardType="phone-pad"
                                value={v.phone2}
                                onChangeText={(val) => updateVoyageur(index, 'phone2', val)}
                            />
                        </View>
                        <Text className="text-gray-400 text-[10px] mt-2 italic">Ce numéro sera utilisé en cas d'urgence.</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderStep5 = () => (
        <View className="flex-1">
            <View className="bg-red-50 p-6 rounded-[32px] border border-red-100 items-center mb-6">
                <Ionicons name="timer-outline" size={32} color="#ef4444" />
                <Text className="text-red-900 font-bold text-2xl mt-2">{formatTime(timeLeft)}</Text>
                <Text className="text-red-600 text-[10px] text-center mt-1 mb-4">Veuillez confirmer votre paiement avant l'expiration du délai.</Text>
                
                <TouchableOpacity 
                    onPress={handleCancelProcess}
                    className="bg-white border border-red-200 px-6 py-2 rounded-full shadow-sm"
                >
                    <Text className="text-red-600 font-bold text-xs uppercase">Abandonner la réservation</Text>
                </TouchableOpacity>
            </View>

            {/* Reservation Summary Card */}
            <View className="bg-white p-5 rounded-[32px] mb-6 border border-blue-100 shadow-sm overflow-hidden relative">
                <View className="absolute -top-6 -right-6 w-20 h-20 bg-blue-50/50 rounded-full" />
                
                <View className="flex-row items-center mb-4">
                    <View className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center mr-3">
                        <Ionicons name="receipt-outline" size={18} color="#1e3a8a" />
                    </View>
                    <Text className="text-gray-900 font-bold text-lg">Détails de réservation</Text>
                </View>

                <View className="space-y-3">
                    <View className="flex-row justify-between">
                        <Text className="text-gray-500 text-xs">Itinéraire</Text>
                        <Text className="text-gray-900 font-bold text-xs" numberOfLines={1}>
                            {(provinces.find(p => p.id === proDepartId)?.nom || 'N/A') + ' → ' + (provinces.find(p => p.id === proArriveeId)?.nom || 'N/A')}
                        </Text>
                    </View>
                    <View className="flex-row justify-between">
                        <Text className="text-gray-500 text-xs">Date & Heure</Text>
                        <Text className="text-gray-900 font-bold text-xs">{selectedVoyage?.date} à {selectedVoyage?.heure_depart}</Text>
                    </View>
                    <View className="flex-row justify-between">
                        <Text className="text-gray-500 text-xs">Passagers ({selectedSeats.length})</Text>
                        <Text className="text-gray-900 font-bold text-xs">Sièges: {selectedSeats.join(', ')}</Text>
                    </View>
                    <View className="flex-row justify-between pt-3 border-t border-gray-50 mt-2">
                        <Text className="text-gray-900 font-bold text-base">Total à payer</Text>
                        <Text className="text-blue-900 font-bold text-lg">
                            {new Intl.NumberFormat('fr-FR').format(selectedSeats.length * (selectedVoyage?.trajet?.tarif || 0))} Ar
                        </Text>
                    </View>
                </View>
            </View>

            <Text className="text-lg font-bold text-gray-900 mb-4 px-1">Sélectionner le mode paiement</Text>
            <View className="flex-row flex-wrap justify-between" style={{ gap: 10 }}>
                {[
                    { id: 1, name: 'Orange Money', color: '#ff7900', icon: 'logo-edge' }, // approximation de icon
                    { id: 2, name: 'Mvola', color: '#00a4e4', icon: 'wallet-outline' },
                    { id: 3, name: 'Airtel Money', color: '#e11900', icon: 'phone-portrait-outline' }
                ].map(mode => (
                    <TouchableOpacity
                        key={mode.id}
                        className={`w-[48%] bg-white p-5 rounded-[28px] mb-2 border-2 items-center justify-center ${paymentMode?.id === mode.id ? 'border-blue-500 bg-blue-50/50' : 'border-gray-50 shadow-sm'}`}
                        onPress={() => setPaymentMode(mode)}
                    >
                        <View className="w-12 h-12 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: mode.color + '15' }}>
                            <Ionicons name={mode.icon as any} size={24} color={mode.color} />
                        </View>
                        <Text className="text-gray-900 font-bold text-center text-xs">{mode.name}</Text>
                        {paymentMode?.id === mode.id && (
                            <View className="absolute top-2 right-2">
                                <Ionicons name="checkmark-circle" size={18} color="#3b82f6" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderStep6 = () => (
        <View className="flex-1 items-center">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="checkmark-circle" size={50} color="#22c55e" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">Réservation Confirmée !</Text>
            <Text className="text-gray-500 text-center mb-8">Votre ticket est prêt. Présentez-le à l'embarquement.</Text>

            <View className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm w-full items-center">
                <Text className="text-gray-400 font-bold text-xs uppercase mb-1">Ticket N°</Text>
                <Text className="text-2xl font-bold text-blue-900 mb-6">{invoiceData?.reservation?.numero}</Text>

                {/* QR Code Placeholder */}
                <View className="w-48 h-48 bg-gray-50 items-center justify-center rounded-3xl border border-gray-100 mb-6">
                    <Ionicons name="qr-code-outline" size={100} color="#cbd5e1" />
                    <Text className="text-[10px] text-gray-400 mt-2">QR Code</Text>
                </View>

                <View className="w-full space-y-3">
                    <View className="flex-row justify-between border-b border-gray-50 pb-2">
                        <Text className="text-gray-500 text-sm">Trajet</Text>
                        <Text className="text-gray-900 font-bold text-sm">{invoiceData?.voyage?.depart} → {invoiceData?.voyage?.arrivee}</Text>
                    </View>
                    <View className="flex-row justify-between border-b border-gray-50 pb-2">
                        <Text className="text-gray-500 text-sm">Date & Heure</Text>
                        <Text className="text-gray-900 font-bold text-sm">{invoiceData?.voyage?.date} à {invoiceData?.voyage?.heure}</Text>
                    </View>
                    <View className="flex-row justify-between">
                        <Text className="text-gray-500 text-sm">Montant Payé</Text>
                        <Text className="text-blue-900 font-bold text-base">{new Intl.NumberFormat('fr-FR').format(invoiceData?.reservation?.montant || 0)} Ar</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                className="bg-blue-900 w-full py-4 rounded-2xl items-center mt-10"
                onPress={() => router.replace('/screens/dashboard/utilisateur/(tabs)/reservation')}
            >
                <Text className="text-white font-bold text-lg">Retour à l'accueil</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <Stack.Screen options={{ headerShown: false }} />
            {renderHeader()}
            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                {loading && (
                    <View className="items-center justify-center py-20">
                        <ActivityIndicator size="large" color="#1e3a8a" />
                        <Text className="text-gray-500 mt-4 font-bold">Traitement en cours...</Text>
                    </View>
                )}
                {!loading && currentStep === 1 && renderStep1()}
                {!loading && currentStep === 2 && renderStep2()}
                {!loading && currentStep === 3 && renderStep3()}
                {!loading && currentStep === 4 && renderStep4()}
                {!loading && currentStep === 5 && renderStep5()}
                {!loading && currentStep === 6 && renderStep6()}
            </ScrollView>
            {currentStep < 5 && (
                <View className="p-6 bg-white border-t border-gray-100 flex-row" style={{ gap: 12 }}>
                    <TouchableOpacity
                        className="flex-1 py-4 rounded-2xl items-center border border-red-200 bg-red-50"
                        onPress={handleCancelProcess}
                        disabled={loading}
                    >
                        <Text className="text-red-600 font-bold text-lg">Annuler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`flex-[1.5] py-4 rounded-2xl items-center shadow-md ${((currentStep === 1 && (!proDepartId || !proArriveeId)) || (currentStep === 2 && !selectedVoyage) || (currentStep === 3 && selectedSeats.length === 0) || loading) ? 'bg-gray-300' : 'bg-blue-900'}`}
                        onPress={handleNext}
                        disabled={loading}
                    >
                        <Text className="text-white font-bold text-lg">
                            {currentStep === 1 ? 'Rechercher' : 'Continuer'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {currentStep === 5 && (
                <View className="p-6 bg-white border-t border-gray-100">
                    <TouchableOpacity
                        className={`py-4 rounded-2xl items-center shadow-md ${loading ? 'bg-gray-300' : 'bg-blue-900'}`}
                        onPress={handleNext}
                        disabled={loading}
                    >
                        <Text className="text-white font-bold text-lg">Confirmer le mode de paiement</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
