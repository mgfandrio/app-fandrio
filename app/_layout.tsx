import { Stack } from "expo-router";
import "../globals.css";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("=== ERREUR CAPTURÉE PAR ErrorBoundary ===");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("=========================================");
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#ef4444", marginBottom: 10 }}>
            Erreur détectée
          </Text>
          <ScrollView style={{ maxHeight: 300, backgroundColor: "#f3f4f6", borderRadius: 10, padding: 10, width: "100%" }}>
            <Text style={{ fontSize: 12, color: "#374151", fontFamily: "monospace" }}>
              {this.state.error?.message}
            </Text>
            <Text style={{ fontSize: 10, color: "#6b7280", marginTop: 10, fontFamily: "monospace" }}>
              {this.state.error?.stack}
            </Text>
          </ScrollView>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 20, backgroundColor: "#1e3a8a", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
