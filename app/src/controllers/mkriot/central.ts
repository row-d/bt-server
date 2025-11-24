import {
  SERVICE_UUID,
  CONTROL_UUID,
  TEMP_UUID,
  HUM_UUID,
  PRES_UUID,
  LIGHT_UUID,
  COLOR_R_UUID,
  COLOR_G_UUID,
  COLOR_B_UUID,
  GX_UUID,
  GY_UUID,
  GZ_UUID,
  AX_UUID,
  AY_UUID,
  AZ_UUID,
  RELAY1_UUID,
  RELAY2_UUID,
  BUZZER_UUID,
  LED_UUID,
} from "./constants";
import type { BLECentralOptions, BLEController } from "./types";

export function createBLECentral(options: BLECentralOptions = {}): BLEController {
  const noop = () => {};
  const onTemp = options.onTemp || noop;
  const onHum = options.onHum || noop;
  const onPres = options.onPres || noop;
  const onLight = options.onLight || noop;
  const onStatus = options.onStatus || noop;
  const onConnected = options.onConnected || noop;
  const onDisconnected = options.onDisconnected || noop;

  let device: BluetoothDevice | null = null;
  let server: BluetoothRemoteGATTServer | null = null;
  let service: BluetoothRemoteGATTService | null = null;

  let tempChar: BluetoothRemoteGATTCharacteristic | null = null;
  let humChar: BluetoothRemoteGATTCharacteristic | null = null;
  let presChar: BluetoothRemoteGATTCharacteristic | null = null;
  let lightChar: BluetoothRemoteGATTCharacteristic | null = null;
  let colorRChar: BluetoothRemoteGATTCharacteristic | null = null;
  let colorGChar: BluetoothRemoteGATTCharacteristic | null = null;
  let colorBChar: BluetoothRemoteGATTCharacteristic | null = null;
  let gxChar: BluetoothRemoteGATTCharacteristic | null = null;
  let gyChar: BluetoothRemoteGATTCharacteristic | null = null;
  let gzChar: BluetoothRemoteGATTCharacteristic | null = null;
  let axChar: BluetoothRemoteGATTCharacteristic | null = null;
  let ayChar: BluetoothRemoteGATTCharacteristic | null = null;
  let azChar: BluetoothRemoteGATTCharacteristic | null = null;

  let relay1Char: BluetoothRemoteGATTCharacteristic | null = null;
  let relay2Char: BluetoothRemoteGATTCharacteristic | null = null;
  let buzzerChar: BluetoothRemoteGATTCharacteristic | null = null;
  let ledChar: BluetoothRemoteGATTCharacteristic | null = null;

  function requireBluetoothSupport() {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth no es compatible en este navegador");
    }
  }

  async function connect() {
    try {
      requireBluetoothSupport();
      onStatus("Buscando dispositivo…", "muted");

      device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [SERVICE_UUID] },
          { name: "Arduino MKR IoT Carrier" },
          { namePrefix: "Arduino" },
        ],
        optionalServices: [SERVICE_UUID, CONTROL_UUID],
      });

      device.addEventListener("gattserverdisconnected", handleDisconnected);

      onStatus("Conectando…", "muted");
      if (device.gatt) {
        server = await device.gatt.connect();
      } else {
        throw new Error("GATT not available");
      }

      onStatus("Descubriendo servicio…", "muted");
      if (!server) throw new Error("Server not connected");

      service = await server.getPrimaryService(SERVICE_UUID);
      const control = await server.getPrimaryService(CONTROL_UUID);

      [
        tempChar,
        humChar,
        presChar,
        lightChar,
        colorRChar,
        colorGChar,
        colorBChar,
        gxChar,
        gyChar,
        gzChar,
        axChar,
        ayChar,
        azChar,
      ] = await Promise.all([
        service.getCharacteristic(TEMP_UUID),
        service.getCharacteristic(HUM_UUID),
        service.getCharacteristic(PRES_UUID),
        service.getCharacteristic(LIGHT_UUID),
        service.getCharacteristic(COLOR_R_UUID),
        service.getCharacteristic(COLOR_G_UUID),
        service.getCharacteristic(COLOR_B_UUID),
        service.getCharacteristic(GX_UUID),
        service.getCharacteristic(GY_UUID),
        service.getCharacteristic(GZ_UUID),
        service.getCharacteristic(AX_UUID),
        service.getCharacteristic(AY_UUID),
        service.getCharacteristic(AZ_UUID),
      ]);

      [relay1Char, relay2Char, buzzerChar, ledChar] = await Promise.all([
        control.getCharacteristic(RELAY1_UUID),
        control.getCharacteristic(RELAY2_UUID),
        control.getCharacteristic(BUZZER_UUID),
        control.getCharacteristic(LED_UUID),
      ]);

      await Promise.all([
        startFloatNotifications(tempChar, onTemp),
        startFloatNotifications(humChar, onHum),
        startFloatNotifications(presChar, onPres),
        startIntNotifications(lightChar, onLight),
        startIntNotifications(colorRChar, (v) => options.onColorR?.(v)),
        startIntNotifications(colorGChar, (v) => options.onColorG?.(v)),
        startIntNotifications(colorBChar, (v) => options.onColorB?.(v)),
        startFloatNotifications(gxChar, (v) => options.onGx?.(v)),
        startFloatNotifications(gyChar, (v) => options.onGy?.(v)),
        startFloatNotifications(gzChar, (v) => options.onGz?.(v)),
        startFloatNotifications(axChar, (v) => options.onAx?.(v)),
        startFloatNotifications(ayChar, (v) => options.onAy?.(v)),
        startFloatNotifications(azChar, (v) => options.onAz?.(v)),
      ]);

      await Promise.all([
        readFloat(tempChar).then(onTemp).catch(noop),
        readFloat(humChar).then(onHum).catch(noop),
        readFloat(presChar).then(onPres).catch(noop),
        readInt(lightChar).then(onLight).catch(noop),
        readInt(colorRChar).then((v) => options.onColorR?.(v)).catch(noop),
        readInt(colorGChar).then((v) => options.onColorG?.(v)).catch(noop),
        readInt(colorBChar).then((v) => options.onColorB?.(v)).catch(noop),
        readFloat(gxChar).then((v) => options.onGx?.(v)).catch(noop),
        readFloat(gyChar).then((v) => options.onGy?.(v)).catch(noop),
        readFloat(gzChar).then((v) => options.onGz?.(v)).catch(noop),
        readFloat(axChar).then((v) => options.onAx?.(v)).catch(noop),
        readFloat(ayChar).then((v) => options.onAy?.(v)).catch(noop),
        readFloat(azChar).then((v) => options.onAz?.(v)).catch(noop),
      ]);

      onConnected(true);
      onStatus("Conectado", "ok");
    } catch (err: any) {
      console.error(err);
      onStatus(`Error: ${err.message || err}`, "warn");
      throw err;
    }
  }

  async function disconnect() {
    try {
      if (device && device.gatt && device.gatt.connected) {
        device.gatt.disconnect();
      }
    } catch {}
    cleanup();
  }

  function handleDisconnected() {
    cleanup();
  }

  function cleanup() {
    onConnected(false);
    onStatus("Desconectado", "muted");
    onDisconnected();
  }

  async function startFloatNotifications(
    characteristic: BluetoothRemoteGATTCharacteristic | null,
    onValue: (value: number) => void
  ) {
    if (!characteristic) return;
    await characteristic.startNotifications();
    characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
      try {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const dataView = target.value;
        if (dataView) {
          onValue(dataView.getFloat32(0, true));
        }
      } catch (err) {
        console.warn("Parse float error", err);
      }
    });
  }

  async function startIntNotifications(
    characteristic: BluetoothRemoteGATTCharacteristic | null,
    onValue: (value: number) => void
  ) {
    if (!characteristic) return;
    await characteristic.startNotifications();
    characteristic.addEventListener("characteristicvaluechanged", (event: Event) => {
      try {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const dataView = target.value;
        if (dataView) {
          onValue(dataView.getInt32(0, true));
        }
      } catch (err) {
        console.warn("Parse int error", err);
      }
    });
  }

  async function readFloat(characteristic: BluetoothRemoteGATTCharacteristic | null): Promise<number> {
    if (!characteristic) throw new Error("No characteristic");
    const value = await characteristic.readValue();
    return value.getFloat32(0, true);
  }

  async function readInt(characteristic: BluetoothRemoteGATTCharacteristic | null): Promise<number> {
    if (!characteristic) throw new Error("No characteristic");
    const value = await characteristic.readValue();
    return value.getInt32(0, true);
  }

  async function setRelay1(state: number) {
    if (!relay1Char) throw new Error("Not connected");
    await relay1Char.writeValue(new Uint8Array([state ? 1 : 0]));
  }

  async function setRelay2(state: number) {
    if (!relay2Char) throw new Error("Not connected");
    await relay2Char.writeValue(new Uint8Array([state ? 1 : 0]));
  }

  async function setBuzzer(freq: number) {
    if (!buzzerChar) throw new Error("Not connected");
    const payload = new ArrayBuffer(4);
    const view = new DataView(payload);
    view.setInt32(0, Math.trunc(freq) || 0, true);
    await buzzerChar.writeValue(view);
  }

  async function setLed(index: number, r: number, g: number, b: number) {
    if (!ledChar) throw new Error("Not connected");
    const payload = new Uint8Array([index, r & 255, g & 255, b & 255]);
    await ledChar.writeValue(payload);
  }

  const controller: BLEController = {
    connect,
    disconnect,
    setRelay1,
    setRelay2,
    setBuzzer,
    setLed,
  };

  return controller;
}
