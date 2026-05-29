import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";

const GREEN = "#2e8b6e";

/**
 * Toast de confirmação de salvamento, reutilizável em qualquer tela.
 *
 * Uso:
 *   const { showToast, toast } = useSavedToast();
 *   ... await save(); showToast("Salvo com sucesso");
 *   return <View>...{toast}</View>; // renderize {toast} como último filho da raiz
 */
export function useSavedToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("Salvo com sucesso");
  const anim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (msg: string = "Salvo com sucesso") => {
      setMessage(msg);
      setVisible(true);
      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    },
    [anim],
  );

  const toast = visible ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toastBox,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Ionicons name="checkmark-circle" size={20} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  ) : null;

  return { showToast, toast };
}

const styles = StyleSheet.create({
  toastBox: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
});
