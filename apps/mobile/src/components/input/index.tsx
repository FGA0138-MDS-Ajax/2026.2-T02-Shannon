import { type ComponentRef, forwardRef, useState } from "react";
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

const Input = forwardRef<ComponentRef<typeof TextInput>, InputProps>(
  ({ label, error, secureTextEntry, multiline, style, ...props }, ref) => {
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
            placeholderTextColor={theme.colors.placeholder}
            multiline={multiline}
            style={[styles.input, multiline && styles.multiline, style]}
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
    color: theme.colors.label,
    marginBottom: 6,
  },
  inputContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
  },
  inputError: {
    borderColor: theme.colors.dangerStrong,
  },
  input: {
    flex: 1,
    height: 48,
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.text,
  },
  // Altura livre: com altura fixa a primeira linha ficava cortada
  multiline: {
    height: undefined,
    minHeight: 96,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
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
    color: theme.colors.dangerStrong,
    marginTop: 4,
  },
});

export default Input;
