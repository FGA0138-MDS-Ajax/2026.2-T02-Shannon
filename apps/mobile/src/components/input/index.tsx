import { forwardRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { theme } from "@/config/theme";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, secureTextEntry, style, ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isSecure = secureTextEntry && !isPasswordVisible;

    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputFocused,
            !!error && styles.inputError,
          ]}
        >
          <TextInput
            ref={ref}
            placeholderTextColor="#8C8885"
            style={[styles.input, style]}
            secureTextEntry={isSecure}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="none"
            {...props}
          />
          {secureTextEntry && (
            <Pressable
              onPress={() => setIsPasswordVisible((prev) => !prev)}
              style={styles.eyeButton}
              hitSlop={8}
            >
              <Text style={styles.eyeText}>
                {isPasswordVisible ? "Ocultar" : "Mostrar"}
              </Text>
            </Pressable>
          )}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

Input.displayName = "Input";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontFamily: theme.font.medium,
    fontSize: 14,
    color: "#3D3835",
    marginBottom: 6,
  },
  inputContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D2CD",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
  },
  inputError: {
    borderColor: "#DC2626",
  },
  input: {
    flex: 1,
    height: 48,
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: "#1C1917",
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  eyeText: {
    fontSize: 12,
    fontFamily: theme.font.medium,
    color: theme.colors.primary,
  },
  errorText: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
});

export default Input;
