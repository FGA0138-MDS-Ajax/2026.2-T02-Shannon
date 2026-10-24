import type {
  PressableStateCallbackType,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";

export type VariantValue<TStyle, TState = PressableStateCallbackType> =
  | StyleProp<TStyle>
  | ((state: TState) => StyleProp<TStyle>);

export type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : K]: T[K];
};

export type VariantPropsType<TVariants> = {
  [K in keyof TVariants as string extends K
    ? never
    : number extends K
      ? never
      : K]?: keyof TVariants[K];
};

export type VariantProps<T> = T extends {
  _variantProps: infer P;
}
  ? RemoveIndexSignature<P>
  : T extends (props?: infer P, ...args: unknown[]) => unknown
    ? RemoveIndexSignature<NonNullable<P>>
    : Record<string, unknown>;

export interface CreateVariantsOptions<
  TVariants extends Record<string, Record<string, unknown>>,
  TStyle = ViewStyle,
  TState = PressableStateCallbackType,
> {
  base?: VariantValue<NoInfer<TStyle>, TState>;
  variants?: {
    [K in keyof TVariants]: {
      [V in keyof TVariants[K]]: VariantValue<NoInfer<TStyle>, TState>;
    };
  };
  defaultVariants?: {
    [K in keyof TVariants as string extends K ? never : K]?: NoInfer<
      keyof TVariants[K]
    >;
  };
  compoundVariants?: Array<
    {
      [K in keyof TVariants as string extends K ? never : K]?:
        | NoInfer<keyof TVariants[K]>
        | Array<NoInfer<keyof TVariants[K]>>
        | undefined;
    } & {
      style: VariantValue<NoInfer<TStyle>, TState>;
    }
  >;
}

export interface VariantsFunction<
  TVariants extends Record<string, Record<string, unknown>>,
  TStyle = ViewStyle,
  TState = PressableStateCallbackType,
> {
  (
    props?: VariantPropsType<TVariants>,
  ): (state?: Partial<TState>) => StyleProp<TStyle>;
  (
    props: VariantPropsType<TVariants> | undefined,
    state: Partial<TState>,
  ): StyleProp<TStyle>;
  style: (
    props?: VariantPropsType<TVariants>,
    state?: Partial<TState>,
  ) => StyleProp<TStyle>;
  _variantProps: VariantPropsType<TVariants>;
}

function resolveStyleValue<TStyle, TState>(
  value: VariantValue<TStyle, TState> | undefined,
  state: TState,
): StyleProp<TStyle> {
  if (!value) return undefined;
  if (typeof value === "function") {
    return (value as (state: TState) => StyleProp<TStyle>)(state);
  }
  return value;
}

export function createVariants<
  TVariants extends Record<string, Record<string, unknown>>,
  TStyle = ViewStyle,
  TState = PressableStateCallbackType,
>(
  config: CreateVariantsOptions<TVariants, TStyle, TState>,
): VariantsFunction<TVariants, TStyle, TState> {
  const { base, variants, defaultVariants, compoundVariants } = config;

  const defaultState = { pressed: false } as unknown as TState;

  const resolve = (
    props?: VariantPropsType<TVariants>,
    state?: Partial<TState>,
  ): StyleProp<TStyle> => {
    const currentState = (
      state ? { ...defaultState, ...state } : defaultState
    ) as TState;
    const styles: Array<StyleProp<TStyle>> = [];

    // 1. Base style
    if (base) {
      styles.push(resolveStyleValue(base, currentState));
    }

    // 2. Variants
    if (variants) {
      const mergedProps: Record<string, unknown> = {
        ...defaultVariants,
        ...props,
      };

      for (const variantKey in variants) {
        const variantPropValue = mergedProps[variantKey];
        if (variantPropValue !== undefined && variantPropValue !== null) {
          const variantStyle = (
            variants as Record<string, Record<string, unknown>>
          )[variantKey]?.[variantPropValue as string];
          if (variantStyle) {
            styles.push(
              resolveStyleValue(
                variantStyle as VariantValue<TStyle, TState>,
                currentState,
              ),
            );
          }
        }
      }
    }

    // 3. Compound variants
    if (compoundVariants && compoundVariants.length > 0) {
      const mergedProps: Record<string, unknown> = {
        ...defaultVariants,
        ...props,
      };

      for (const compound of compoundVariants) {
        const { style: compoundStyle, ...conditions } = compound;
        let matches = true;

        for (const key in conditions) {
          const expectedValue = (conditions as Record<string, unknown>)[key];
          const actualValue = mergedProps[key];

          if (Array.isArray(expectedValue)) {
            if (!expectedValue.includes(actualValue)) {
              matches = false;
              break;
            }
          } else if (actualValue !== expectedValue) {
            matches = false;
            break;
          }
        }

        if (matches && compoundStyle) {
          styles.push(resolveStyleValue(compoundStyle, currentState));
        }
      }
    }

    return styles.filter(Boolean) as StyleProp<TStyle>;
  };

  const variantFn = ((
    props?: VariantPropsType<TVariants>,
    ...rest: [state?: Partial<TState>]
  ) => {
    const [state] = rest;
    if (rest.length > 0 && state !== undefined) {
      return resolve(props, state);
    }

    return (callbackState?: Partial<TState>) => resolve(props, callbackState);
  }) as VariantsFunction<TVariants, TStyle, TState>;

  variantFn.style = (
    props?: VariantPropsType<TVariants>,
    state?: Partial<TState>,
  ): StyleProp<TStyle> => {
    return resolve(props, state);
  };

  variantFn._variantProps = {} as VariantPropsType<TVariants>;

  return variantFn;
}

export function createTextVariants<
  TVariants extends Record<string, Record<string, unknown>>,
  TState = PressableStateCallbackType,
>(
  config: CreateVariantsOptions<TVariants, TextStyle, TState>,
): VariantsFunction<TVariants, TextStyle, TState> {
  return createVariants<TVariants, TextStyle, TState>(config);
}
