import { StyleSheet, Text, View, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState } from "react";
import  LinkPlaid from "react-native-plaid-link-sdk";
import { router } from "expo-router";
import { LinkAccount } from "react-native-plaid-link-sdk";

// Replace this with your actual backend URL
const BACKEND_URL = "http://192.168.7.243:8080"; // use your LAN IP if running on physical device
// const BACKEND_URL = "192.168.7.243";
// const BACKEND_URL = "http://localhost:8080";

export default function BankLinkScreen() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [sessionId] = useState<string>(Math.random().toString(36).substring(2));

  // Fetch link_token on mount
  useEffect(() => {
    async function fetchLinkToken() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/create_link_token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
          body: JSON.stringify({ address: "localhost" }), // or 'android' based on platform
        });

        const data = await res.json();
        setLinkToken(data.link_token);
      } catch (err) {
        console.error("Error fetching link token:", err);
        Alert.alert("Error", "Failed to fetch link token");
      }
    }

    fetchLinkToken();
  }, [sessionId]);

  const onSuccess = async ({ publicToken }: { publicToken: string }) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/exchange_public_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ public_token: publicToken }),
      });

      const data = await res.json();
      if (data.success || data === true) {
        Alert.alert("Success", "Bank account linked!");
        //router.navigate("/(home)/home"); // or wherever you want to go
      } else {
        Alert.alert("Error", "Failed to exchange token");
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error("Error:", err.message);
      } else {
        console.error("Unexpected error:", err);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Link Your Bank</Text>
      {linkToken ? (
        <LinkPlaid
          tokenConfig={{ token: linkToken }}
          onSuccess={onSuccess}
          onExit={(exit) => console.log("Exited Plaid:", exit)}
        />
      ) : (
        <Text>Loading Plaid Link...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F2F2F2",
  },
  text: {
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 24,
    marginBottom: 20,
  },
});
