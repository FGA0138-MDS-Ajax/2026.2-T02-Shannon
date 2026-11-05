import { AppState, type AppStateStatus } from "react-native";
import { SWRConfig } from "swr";

type SWRProps = {
  children: React.ReactNode;
};

export default function SWR({ children }: SWRProps) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        isVisible: () => {
          return true;
        },
        initFocus(callback) {
          let appState = AppState.currentState;
          const onAppStateChange = (state: AppStateStatus) => {
            /* If it's resuming from background or inactive mode to active one */
            if (appState.match(/inactive|background/) && state === "active") {
              callback();
            }
            appState = state;
          };
          // Subscribe to the app state change events
          const subscription = AppState.addEventListener(
            "change",
            onAppStateChange,
          );
          return () => {
            subscription.remove();
          };
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
