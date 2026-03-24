import apiClient from '../api/axiosConfig';

export const notificationService = {
    /**
     * Récupérer les notifications
     */
    async getNotifications(page: number = 1) {
        const response = await apiClient.get(`/notifications?per_page=20&page=${page}`);
        return response.data;
    },

    /**
     * Récupérer le nombre de notifications non lues
     */
    async getUnreadCount() {
        const response = await apiClient.get('/notifications/unread-count');
        return response.data;
    },

    /**
     * Marquer une notification comme lue
     */
    async markAsRead(notifId: number) {
        const response = await apiClient.patch(`/notifications/${notifId}/read`);
        return response.data;
    },

    /**
     * Marquer toutes les notifications comme lues
     */
    async markAllAsRead() {
        const response = await apiClient.patch('/notifications/read-all');
        return response.data;
    },

    /**
     * Enregistrer le push token
     */
    async registerPushToken(pushToken: string) {
        const response = await apiClient.post('/notifications/push-token', { push_token: pushToken });
        return response.data;
    },

    /**
     * Supprimer le push token
     */
    async unregisterPushToken() {
        const response = await apiClient.delete('/notifications/push-token');
        return response.data;
    },
};
