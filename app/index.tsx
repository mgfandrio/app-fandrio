import { Redirect } from 'expo-router';

export default function Index() {
  // Use declarative Redirect so navigation happens after layout is mounted
  return <Redirect href="/screens/authentification/loginScreen" />;
}