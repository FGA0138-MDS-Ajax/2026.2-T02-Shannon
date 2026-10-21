import { forwardRef } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  Text,
  type TextStyle,
} from "react-native";
import { theme } from "@/config/theme";
import {
  createTextVariants,
  createVariants,
  type VariantProps,
} from "@/utils/variants";

export const buttonVariants = createVariants({
  base: {
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    gap: 8,
  },
  variants: {
    variant: {
      primary: ({ pressed }) => ({
        backgroundColor: theme.colors.primary,
        borderWidth: 1,
        borderColor: theme.colors.primaryDark,
        opacity: pressed ? 0.8 : 1,
      }),
      secondary: ({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
      }),
    },
    width: {
      full: {
        width: "100%",
      },
      fit: {
        alignSelf: "auto",
      },
    },
  },
  defaultVariants: {
    variant: "primary",
    width: "fit",
  },
});

export const buttonTextVariants = createTextVariants({
  base: {
    fontFamily: theme.font.medium,
    fontSize: 16,
    textAlign: "center",
  },
  variants: {
    variant: {
      primary: {
        color: "#ffffff",
      },
      secondary: {
        color: theme.colors.primaryDark,
      },
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

export interface ButtonProps
  extends PressableProps,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
}

const Button = forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  (
    {
      children,
      disabled,
      prefix,
      suffix,
      variant = "primary",
      width = "fit",
      style,
      textStyle,
      ...props
    },
    ref,
  ) => {
    const renderSlot = (slot: React.ReactNode) => {
      if (slot === null || slot === undefined) return null;
      if (typeof slot === "string" || typeof slot === "number") {
        return (
          <Text style={[buttonTextVariants.style({ variant }), textStyle]}>
            {slot}
          </Text>
        );
      }
      return slot;
    };

    return (
      <Pressable
        ref={ref}
        disabled={disabled}
        testID={props.testID ?? "button"}
        style={(state) => [
          buttonVariants({ variant, width })(state),
          disabled && { opacity: 0.5 },
          typeof style === "function" ? style(state) : style,
        ]}
        {...props}
      >
        {renderSlot(prefix)}
        {renderSlot(children)}
        {renderSlot(suffix)}
      </Pressable>
    );
  },
);

Button.displayName = "Button";

export default Button;
