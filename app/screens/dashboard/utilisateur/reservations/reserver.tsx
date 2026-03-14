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
                .listen('SiegeUpdated', (event: any) => {
                    console.log('Real-time seat update received:', event);
                    setSeatPlan((prevPlan) => 
                        prevPlan.map((seat) => 
                            seat.code === event.siege.siege_numero 
                                ? { ...seat, statut: event.siege.statut, selectable: event.siege.selectable }
                                : seat
                        )
                    );
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
                        { text: 'OK', onPress: () => router.replace('/screens/dashboard/utilisateur/(tabs)/reservation') }
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
                        setChauffeur(`${c.prenom} ${c.nom}`);
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

    const fetchInvoice = async () => {
        try {
            const response = await reservationService.obtenirFacture(reservationResult.res_id);
            if (response.statut) {
                setInvoiceData(response.data);
                setCurrentStep(6);
            }
        } catch (error) {
            console.error('Error fetching invoice:', error);
            Alert.alert('Attention', 'Réservation confirmée mais erreur lors du chargement de la facture.');
            router.replace('/screens/dashboard/utilisateur/(tabs)/reservation');
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
                    siege_numero: seat
                }));
                setVoyageurs(initialVoyageurs);
                setCurrentStep(4);
            }
        }
        else if (currentStep === 4) {
            const isValid = voyageurs.every(v => v.nom.trim() !== '' && v.prenom.trim() !== '');
            if (!isValid) Alert.alert('Attention', 'Veuillez remplir le nom et le prénom pour tous les voyageurs.');
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

    const renderStep3 = () => (
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
                            {selectedVoyage?.voiture?.marque || 'VOLKSWAGEN'} - {selectedVoyage?.voiture?.modele || 'Crafter'}
                        </Text>
                        <Text className="text-gray-500 text-xs">{selectedVoyage?.voiture?.places} places</Text>
                    </View>
                </View>

                {/* Seats Grid Container */}
                <View className="px-2 pb-6">
                    {/* Front Row: Driver + Seats 1 & 2 (3 items) */}
                    <View className="flex-row justify-between mb-4" style={{ paddingHorizontal: '5%' }}>
                        <View className="items-center justify-center" style={{ width: '28%' }}>
                            <View className="h-14 items-center justify-center">
                                <Ionicons name="person-circle" size={48} color="#111827" />
                            </View>
                        </View>
                        
                        {seatPlan.slice(0, 2).map((seat) => {
                            const isSelected = selectedSeats.includes(seat.code);
                            const isAvailable = seat.statut === 'disponible';
                            const isReserved = seat.statut === 'reserve';
                            const isTemporary = seat.statut === 'selectionne';

                            return (
                                <View key={seat.code} className="items-center" style={{ width: '28%' }}>
                                    <TouchableOpacity
                                        className={`w-full h-14 rounded-[12px] items-center justify-center border ${
                                            isSelected 
                                                ? 'bg-[#0ea5e9] border-[#0ea5e9]' 
                                                : isTemporary
                                                    ? 'bg-gray-200 border-gray-300' 
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
                                            <Ionicons name="hourglass-outline" size={20} color="#9ca3af" />
                                        ) : (
                                            <Text className="text-sm font-bold text-gray-700">{seat.code}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>

                    {/* Passenger Rows: 4 seats per row */}
                    <View className="flex-row flex-wrap" style={{ paddingHorizontal: '1%' }}>
                        {seatPlan.slice(2).map((seat) => {
                            const isSelected = selectedSeats.includes(seat.code);
                            const isAvailable = seat.statut === 'disponible';
                            const isReserved = seat.statut === 'reserve';
                            const isTemporary = seat.statut === 'selectionne';

                            return (
                                <View key={seat.code} className="mb-4 items-center px-1" style={{ width: '25%' }}>
                                    <TouchableOpacity
                                        className={`w-full h-14 rounded-[12px] items-center justify-center border ${
                                            isSelected 
                                                ? 'bg-[#0ea5e9] border-[#0ea5e9]' 
                                                : isTemporary
                                                    ? 'bg-gray-200 border-gray-300' 
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
                                            <Ionicons name="hourglass-outline" size={20} color="#9ca3af" />
                                        ) : (
                                            <Text className="text-sm font-bold text-gray-700">{seat.code}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Legend (Positioned absolutely at the bottom inside the container) */}
                <View className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-gray-50 flex-row flex-wrap justify-between bg-white rounded-b-3xl">
                    <View className="flex-row items-center w-[23%]">
                        <View className="w-3 h-3 rounded-sm bg-white border border-gray-200 mr-2" />
                        <Text className="text-[9px] text-gray-500">Libre</Text>
                    </View>
                    <View className="flex-row items-center w-[23%]">
                        <View className="w-3 h-3 rounded-sm bg-[#0ea5e9] mr-2" />
                        <Text className="text-[9px] text-gray-500">Choisi</Text>
                    </View>
                    <View className="flex-row items-center w-[23%]">
                        <View className="w-3 h-3 rounded-sm bg-gray-200 mr-2" />
                        <Text className="text-[9px] text-gray-500">Attente</Text>
                    </View>
                    <View className="flex-row items-center w-[23%]">
                        <View className="w-3 h-3 rounded-sm bg-[#ef4444] mr-2" />
                        <Text className="text-[9px] text-gray-500">Occupé</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 mb-6">Informations voyageurs</Text>
            {voyageurs.map((v, index) => (
                <View key={index} className="bg-white p-6 rounded-[32px] mb-6 border border-gray-100">
                    <Text className="text-blue-900 font-bold text-lg mb-4">Siège {v.siege_numero}</Text>
                    <TextInput
                        className="bg-gray-50 p-4 rounded-xl mb-4 text-base"
                        placeholder="Nom"
                        value={v.nom}
                        onChangeText={(val) => updateVoyageur(index, 'nom', val)}
                    />
                    <TextInput
                        className="bg-gray-50 p-4 rounded-xl text-base"
                        placeholder="Prénom"
                        value={v.prenom}
                        onChangeText={(val) => updateVoyageur(index, 'prenom', val)}
                    />
                </View>
            ))}
        </View>
    );

    const renderStep5 = () => (
        <View className="flex-1">
            <View className="bg-red-50 p-6 rounded-[32px] border border-red-100 items-center mb-8">
                <Ionicons name="timer-outline" size={32} color="#ef4444" />
                <Text className="text-red-900 font-bold text-2xl mt-2">{formatTime(timeLeft)}</Text>
                <Text className="text-red-600 text-xs text-center mt-1">Veuillez confirmer votre paiement avant l'expiration du délai.</Text>
            </View>

            <Text className="text-xl font-bold text-gray-900 mb-6">Mode de paiement</Text>
            {[
                { id: 1, name: 'Orange Money', icon: 'phone-portrait-outline' },
                { id: 2, name: 'Mvola', icon: 'wallet-outline' },
                { id: 3, name: 'Airtel Money', icon: 'phone-landscape-outline' }
            ].map(mode => (
                <TouchableOpacity
                    key={mode.id}
                    className={`bg-white p-6 rounded-3xl mb-4 border ${paymentMode?.id === mode.id ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100'}`}
                    onPress={() => setPaymentMode(mode)}
                >
                    <View className="flex-row items-center">
                        <Ionicons name={mode.icon as any} size={28} color="#1e3a8a" />
                        <Text className="text-gray-900 font-bold text-lg ml-4">{mode.name}</Text>
                    </View>
                </TouchableOpacity>
            ))}
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
            {currentStep < 6 && (
                <View className="p-6 bg-white border-t border-gray-100">
                    <TouchableOpacity
                        className={`py-4 rounded-2xl items-center shadow-md ${((currentStep === 1 && (!proDepartId || !proArriveeId)) || (currentStep === 2 && !selectedVoyage) || (currentStep === 3 && selectedSeats.length === 0) || loading) ? 'bg-gray-300' : 'bg-blue-900'}`}
                        onPress={handleNext}
                        disabled={loading}
                    >
                        <Text className="text-white font-bold text-lg">{currentStep === 1 ? 'Rechercher' : currentStep === 5 ? 'Confirmer le paiement' : 'Continuer'}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
