import apiClient from '../api/axiosConfig';

export interface UpdateProfilData {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
}

export interface ChangePasswordData {
    ancien_mot_de_passe: string;
    nouveau_mot_de_passe: string;
    nouveau_mot_de_passe_confirmation: string;
}

export const profilService = {
    /**
     * Met à jour les informations du profil
     */
    updateProfil: async (data: UpdateProfilData) => {
        const response = await apiClient.put('/profil', data);
        return response.data;
    },

    /**
     * Change le mot de passe
     */
    changerMotDePasse: async (data: ChangePasswordData) => {
        const response = await apiClient.put('/profil/mot-de-passe', data);
        return response.data;
    },

    /**
     * Upload la photo de profil
     */
    uploadPhoto: async (imageUri: string) => {
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'image/jpeg';

        formData.append('photo', {
            uri: imageUri,
            name: filename,
            type,
        } as any);

        const response = await apiClient.post('/profil/photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        });
        return response.data;
    },

    /**
     * Supprime la photo de profil
     */
    deletePhoto: async () => {
        const response = await apiClient.delete('/profil/photo');
        return response.data;
    },
};
