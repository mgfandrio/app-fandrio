import React, { useState } from 'react';
import { View, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Texte } from '../ui/Texte';
import { couleurs, polices } from '../../theme/ocean';

interface SearchableDropdownProps {
    label: string;
    placeholder: string;
    data: any[];
    selectedId: string | number | undefined;
    onSelect: (id: any) => void;
    displayKey?: string;
    valueKey?: string;
    showAllOption?: boolean;
    allOptionLabel?: string;
}

/** Liste déroulante avec recherche (thème Océan). Même API qu'avant. */
export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    label,
    placeholder,
    data,
    selectedId,
    onSelect,
    displayKey = 'nom',
    valueKey = 'id',
    showAllOption = true,
    allOptionLabel = 'Tous',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState('');

    const selectedItem = data.find(item => (item[valueKey] || '').toString() === (selectedId || '').toString());
    const filteredData = data.filter(item =>
        (item[displayKey] || '').toLowerCase().includes(searchText.toLowerCase())
    );

    const choisir = (id: any) => {
        onSelect(id);
        setIsOpen(false);
        setSearchText('');
    };

    const ligne = (libelle: string, selectionne: boolean, onPress: () => void, cle: string) => (
        <Pressable
            key={cle}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: selectionne }}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 46,
                paddingHorizontal: 14,
                backgroundColor: selectionne ? couleurs.ocean50 : 'transparent',
                borderBottomWidth: 1,
                borderBottomColor: couleurs.separateur,
            }}
        >
            <Texte graisse={selectionne ? 'tresGras' : 'moyen'} taille={14} couleur={selectionne ? couleurs.ocean950 : couleurs.encre} style={{ flex: 1 }}>
                {libelle}
            </Texte>
            {selectionne && <Ionicons name="checkmark-circle" size={19} color={couleurs.ocean800} />}
        </Pressable>
    );

    return (
        <View style={{ marginBottom: 18, gap: 6 }}>
            <Texte graisse="gras" taille={12.5} couleur={couleurs.encreDouce}>{label}</Texte>

            {/* Bouton d'ouverture */}
            <Pressable
                onPress={() => setIsOpen(!isOpen)}
                accessibilityRole="button"
                accessibilityLabel={`${label} : ${selectedItem ? selectedItem[displayKey] : placeholder}`}
                accessibilityState={{ expanded: isOpen }}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    minHeight: 50,
                    paddingHorizontal: 14,
                    backgroundColor: couleurs.surface,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: isOpen ? couleurs.ocean800 : couleurs.champ,
                }}
            >
                <Texte
                    graisse={selectedItem ? 'gras' : 'moyen'}
                    taille={15}
                    couleur={selectedItem ? couleurs.encre : '#8A99AD'}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                >
                    {selectedItem ? selectedItem[displayKey] : placeholder}
                </Texte>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={couleurs.ocean800} />
            </Pressable>

            {/* Liste déroulante */}
            {isOpen && (
                <View style={{
                    backgroundColor: couleurs.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: couleurs.ligne,
                    overflow: 'hidden',
                    zIndex: 1000,
                }}>
                    {/* Champ de recherche */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 12,
                        minHeight: 44,
                        borderBottomWidth: 1,
                        borderBottomColor: couleurs.separateur,
                        backgroundColor: couleurs.fond,
                    }}>
                        <Ionicons name="search" size={17} color={couleurs.gris} />
                        <TextInput
                            placeholder="Rechercher…"
                            placeholderTextColor="#8A99AD"
                            value={searchText}
                            onChangeText={setSearchText}
                            accessibilityLabel={`Rechercher dans ${label}`}
                            style={{ flex: 1, fontFamily: polices.moyen, fontSize: 14, color: couleurs.encre, paddingVertical: 8 }}
                            autoFocus
                        />
                        {searchText !== '' && (
                            <Pressable onPress={() => setSearchText('')} hitSlop={10} accessibilityLabel="Effacer la recherche">
                                <Ionicons name="close-circle" size={18} color={couleurs.grisClair} />
                            </Pressable>
                        )}
                    </View>

                    {showAllOption && ligne(allOptionLabel, !selectedId, () => choisir(''), '__tous')}

                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {filteredData.length > 0 ? filteredData.map((item) => {
                            if (!item) return null;
                            const itemId = item[valueKey];
                            const isSelected = (selectedId || '').toString() === (itemId || '').toString();
                            return ligne(String(item[displayKey] ?? ''), isSelected, () => choisir(itemId), String(itemId));
                        }) : (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                <Texte variante="legende">Aucun résultat</Texte>
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};
