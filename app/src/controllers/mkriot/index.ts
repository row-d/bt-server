import { createBLECentral } from "./central";
import { bleApp } from "./bleApp";
import type { BleAppFactory, CreateBLECentralFn } from "./types";

export * from "./types";
export { createBLECentral, bleApp };

if (typeof window !== "undefined") {
  const globalWindow = window as Window & {
    createBLECentral?: CreateBLECentralFn;
    bleApp?: BleAppFactory;
  };

  globalWindow.createBLECentral = createBLECentral;
  globalWindow.bleApp = bleApp;
}

try {
  if (
    typeof navigator !== "undefined" &&
    navigator.permissions &&
    navigator.permissions.query
  ) {
    navigator.permissions
      // @ts-ignore - bluetooth permission is still experimental
      .query({ name: "bluetooth" as PermissionName })
      .then((result) => console.debug("Bluetooth permission:", result.state))
      .catch(() => {});
  }
} catch {}
