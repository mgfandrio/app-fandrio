import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#374151', fontWeight: 'bold', marginBottom: 8, marginLeft: 4 }}>{label}</Text>

            {/* Bouton d'ouverture du dropdown */}
            <TouchableOpacity
                onPress={() => setIsOpen(!isOpen)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f9fafb',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderWidth: 1,
                    borderColor: isOpen ? '#1e3a8a' : '#e5e7eb',
                }}
            >
                <Text style={{
                    color: selectedItem ? '#1f2937' : '#9ca3af',
                    fontWeight: selectedItem ? '600' : '400',
                    fontSize: 15,
                }} numberOfLines={1}>
                    {selectedItem ? selectedItem[displayKey] : placeholder}
                </Text>
                <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#1e3a8a"
                />
            </TouchableOpacity>

            {/* Liste déroulante */}
            {isOpen && (
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 4,
                    zIndex: 1000,
                }}>
                    {/* Champ de recherche */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f3f4f6',
                        backgroundColor: '#f9fafb',
                    }}>
                        <Ionicons name="search" size={18} color="#9ca3af" />
                        <TextInput
                            placeholder="Rechercher..."
                            placeholderTextColor="#9ca3af"
                            value={searchText}
                            onChangeText={setSearchText}
                            style={{
                                flex: 1,
                                marginLeft: 8,
                                fontSize: 14,
                                color: '#1f2937',
                                paddingVertical: 2,
                            }}
                            autoFocus
                        />
                        {searchText !== '' && (
                            <TouchableOpacity onPress={() => setSearchText('')}>
                                <Ionicons name="close-circle" size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Option "Tous" si activée */}
                    {showAllOption && (
                        <TouchableOpacity
                            onPress={() => {
                                onSelect('');
                                setIsOpen(false);
                                setSearchText('');
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                backgroundColor: !selectedId ? '#eff6ff' : 'transparent',
                                borderBottomWidth: 1,
                                borderBottomColor: '#f3f4f6',
                            }}
                        >
                            <Text style={{
                                color: !selectedId ? '#1e3a8a' : '#6b7280',
                                fontWeight: !selectedId ? 'bold' : '400',
                                fontSize: 14,
                            }}>
                                {allOptionLabel}
                            </Text>
                            {!selectedId && (
                                <Ionicons name="checkmark-circle" size={20} color="#1e3a8a" />
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Liste des items */}
                    <ScrollView
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        {filteredData.length > 0 ? filteredData.map((item) => {
                            if (!item) return null;
                            const itemId = item[valueKey];
                            const isSelected = (selectedId || '').toString() === (itemId || '').toString();
                            return (
                                <TouchableOpacity
                                    key={itemId}
                                    onPress={() => {
                                        onSelect(itemId);
                                        setIsOpen(false);
                                        setSearchText('');
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#f3f4f6',
                                    }}
                                >
                                    <Text style={{
                                        color: isSelected ? '#1e3a8a' : '#374151',
                                        fontWeight: isSelected ? 'bold' : '400',
                                        fontSize: 14,
                                    }}>
                                        {item[displayKey]}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={20} color="#1e3a8a" />
                                    )}
                                </TouchableOpacity>
                            );
                        }) : (
                            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 13 }}>
                                    Aucun résultat
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};
