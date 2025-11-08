/**
 * Utilitaires pour l'application
 */

/**
 * Formate une date relative (ex: "Il y a 2 jours")
 */
export const formatDateRelative = (dateString: string): string => {
  const date = new Date(dateString);
  const maintenant = new Date();
  const diffMs = maintenant.getTime() - date.getTime();
  const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffJours === 0) return "Aujourd'hui";
  if (diffJours === 1) return 'Hier';
  if (diffJours < 7) return `Il y a ${diffJours} jours`;
  if (diffJours < 30) return `Il y a ${Math.floor(diffJours / 7)} semaine${Math.floor(diffJours / 7) > 1 ? 's' : ''}`;
  if (diffJours < 365) return `Il y a ${Math.floor(diffJours / 30)} mois`;
  return `Il y a ${Math.floor(diffJours / 365)} an${Math.floor(diffJours / 365) > 1 ? 's' : ''}`;
};

/**
 * Formate une date au format français
 */
export const formatDateFr = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Obtient les initiales d'un nom et prénom
 */
export const getInitiales = (prenom: string, nom: string): string => {
  return `${prenom[0] || ''}${nom[0] || ''}`.toUpperCase();
};

/**
 * Formate un numéro de téléphone
 */
export const formatPhoneNumber = (phone: string): string => {
  // Retire tous les espaces et caractères spéciaux
  const cleaned = phone.replace(/\D/g, '');
  
  // Format pour Madagascar: +261 XX XX XXX XX
  if (cleaned.startsWith('261') && cleaned.length === 12) {
    return `+261 ${cleaned.substring(3, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7, 10)} ${cleaned.substring(10)}`;
  }
  
  return phone;
};

/**
 * Valide une adresse email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valide un numéro de téléphone
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+261|0)?[0-9]{9,10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Tronque un texte avec ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Formate un montant en Ariary
 */
export const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
  }).format(montant);
};

/**
 * Détermine la couleur d'un statut
 */
export const getStatutColor = (
  statut: number
): { bg: string; text: string; label: string } => {
  const configs: Record<number, { bg: string; text: string; label: string }> = {
    1: { bg: 'bg-green-100', text: 'text-green-600', label: 'Actif' },
    2: { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Inactif' },
    3: { bg: 'bg-red-100', text: 'text-red-600', label: 'Supprimé' },
  };
  return configs[statut] || configs[2];
};

