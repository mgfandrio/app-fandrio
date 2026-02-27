import { Redirect } from 'expo-router';

export default function DashboardUser() {
  // Redirection vers la navigation des tabs utilisateur
  return <Redirect href="/screens/dashboard/utilisateur/(tabs)/accueil" />;
}
