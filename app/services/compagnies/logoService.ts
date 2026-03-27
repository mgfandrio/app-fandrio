import apiClient from '../api/axiosConfig';

/**
 * Service pour la gestion du logo de la compagnie
 * Upload vers Cloudinary via le backend Laravel
 */
export const logoService = {
    /**
     * Upload ou remplace le logo de la compagnie
     * @param imageUri URI locale de l'image (depuis expo-image-picker)
     */
    uploadLogo: async (imageUri: string) => {
        try {
            const formData = new FormData();

            // Extraire le nom et le type du fichier
            const filename = imageUri.split('/').pop() || 'logo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'image/jpeg';

            formData.append('logo', {
                uri: imageUri,
                name: filename,
                type,
            } as any);

            const response = await apiClient.post('/api/adminCompagnie/logo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 60000, // 60s pour l'upload
            });

            return response.data;
        } catch (error: any) {
            console.error('Erreur uploadLogo:', error.message);
            throw error;
        }
    },

    /**
     * Supprime le logo de la compagnie
     */
    deleteLogo: async () => {
        try {
            const response = await apiClient.delete('/api/adminCompagnie/logo');
            return response.data;
        } catch (error: any) {
            console.error('Erreur deleteLogo:', error.message);
            throw error;
        }
    },
};
