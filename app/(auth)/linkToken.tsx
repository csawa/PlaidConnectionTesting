import { useEffect, useState, useCallback } from "react";
import { View, Text, Button, Alert, Platform, StyleSheet } from "react-native";
import { create, open, dismissLink, LinkSuccess, LinkExit, LinkIOSPresentationStyle, LinkLogLevel } from "react-native-plaid-link-sdk";
import { router } from "expo-router";

// const BACKEND_IP = "192.168.7.243";
const BACKEND_IP = "10.19.89.203";
const BACKEND_URL = `http://${BACKEND_IP}:8080`;
const sessionId = Math.random().toString(36).substring(2);

export default function BankLinkScreen() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isPlaidReady, setIsPlaidReady] = useState(false); 
  const address = Platform.OS === "ios" ? "localhost" : BACKEND_IP;

  const fetchLinkToken = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/create_link_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      setLinkToken(data.link_token);
      console.log("link token set");
      console.log(data.link_token);
    } catch (err) {
      console.error("Error fetching link token:", err);
      Alert.alert("Error", "Failed to fetch link token");
    }
  }, []);

  useEffect(() => {
    if (linkToken === null) {
      fetchLinkToken();
    } else {
      const config = {
        token: linkToken,
        noLoadingState: false,
      };
      create(config);
      setIsPlaidReady(true);
      console.log("plaid is ready");
    }
  }, [linkToken]);

  /*
  try {
            const res = await fetch(`${BACKEND_URL}/api/exchange_public_token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-session-id": sessionId,
              },
              body: JSON.stringify({ public_token: success.publicToken }),
            });
            const data = await res.json();
  
            if (data.success || data === true) {
              Alert.alert("Success", "Bank account linked!");
              // router.navigate("/(home)/home");
            } else {
              Alert.alert("Error", "Failed to exchange token");
            }
          } catch (err) {
            console.error("Error exchanging public token:", err);
          }
  */
  const handleOpenLink = () => {
    if (!isPlaidReady) {
        console.warn("Plaid not ready yet");
        return;
    }
    
    console.log("Opening Plaid with token:", linkToken);
    open({
        onSuccess: async (success: LinkSuccess) => {
          console.log("success");
        },
        onExit: (exit: LinkExit) => {
          console.log("Exited Plaid:", exit);
          dismissLink();
        },
        iOSPresentationStyle: LinkIOSPresentationStyle.MODAL,
        logLevel: LinkLogLevel.ERROR,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Link Your Bank</Text>
      <Button title="Open Plaid Link" onPress={handleOpenLink} disabled={!isPlaidReady} />
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
