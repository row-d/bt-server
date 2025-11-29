import {
  SERVICE_UUID,
  SWITCH_UUID,
  ALARM_TIME_UUID,
  LOCAL_TIME_UUID,
  MELODY_SEQUENCE_UUID,
  TIME_PAYLOAD_BYTES,
  MELODY_CHAR_BUFFER,
} from "./constants";

import type { BLECentralOptions, BLEController } from "./types";

export function createBLECentral(options: BLECentralOptions = {}): BLEController {
  const noop = () => { };
  const onStatus = options.onStatus || noop;
  const onConnected = options.onConnected || noop;
  const onDisconnected = options.onDisconnected || noop;
  const encoder = new TextEncoder();
  const normalizedServiceUuid = SERVICE_UUID.toLowerCase();

  let device: BluetoothDevice | null = null;
  let server: BluetoothRemoteGATTServer | null = null;
  let service: BluetoothRemoteGATTService | null = null;
  let switchChar: BluetoothRemoteGATTCharacteristic | null = null;
  let alarmTimeChar: BluetoothRemoteGATTCharacteristic | null = null;
  let localTimeChar: BluetoothRemoteGATTCharacteristic | null = null;
  let melodySequenceChar: BluetoothRemoteGATTCharacteristic | null = null;

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
          { services: [normalizedServiceUuid] },
        ],
        optionalServices: [normalizedServiceUuid],
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

      service = await ensureService(server);

      onStatus("Preparando características…", "muted");
      const [fetchedSwitch, fetchedAlarmTime, fetchedLocalTime, fetchedMelody] =
        await Promise.all([
          service.getCharacteristic(SWITCH_UUID),
          service.getCharacteristic(ALARM_TIME_UUID),
          service.getCharacteristic(LOCAL_TIME_UUID),
          service.getCharacteristic(MELODY_SEQUENCE_UUID),
        ]);

      switchChar = fetchedSwitch;
      alarmTimeChar = fetchedAlarmTime;
      localTimeChar = fetchedLocalTime;
      melodySequenceChar = fetchedMelody;

      onConnected(true);
      onStatus("Conectado", "ok");
    } catch (err: any) {
      console.error(err);
      onStatus(`Error: ${err.message || err}`, "warn");
      throw err;
    }
  }

  async function ensureService(gattServer: BluetoothRemoteGATTServer) {
    try {
      return await gattServer.getPrimaryService(normalizedServiceUuid);
    } catch (error) {
      const available = await listAvailableServices(gattServer);
      const hint = available.length
        ? `Servicios expuestos: ${available.join(", ")}`
        : "No se pudo obtener la lista de servicios";
      const message =
        `No se encontró el servicio BLE ${SERVICE_UUID}. ` +
        "Verifica que la placa tenga el sketch actualizado y vuelve a intentarlo. " +
        hint;
      console.warn(message, error);
      throw new Error(message);
    }
  }

  async function listAvailableServices(gattServer: BluetoothRemoteGATTServer) {
    const getServices = gattServer.getPrimaryServices?.bind(gattServer);
    if (!getServices) {
      return [];
    }
    try {
      const services = await getServices();
      return services.map((svc) => svc.uuid.toLowerCase());
    } catch {
      return [];
    }
  }

  async function disconnect() {
    try {
      if (device && device.gatt && device.gatt.connected) {
        device.gatt.disconnect();
      }
    } catch { }
    cleanup();
  }

  function handleDisconnected() {
    cleanup();
  }

  function cleanup() {
    device = null;
    server = null;
    service = null;
    switchChar = null;
    alarmTimeChar = null;
    localTimeChar = null;
    melodySequenceChar = null;
    onConnected(false);
    onStatus("Desconectado", "muted");
    onDisconnected();
  }

  function requireCharacteristic(
    characteristic: BluetoothRemoteGATTCharacteristic | null,
    name: string
  ) {
    if (!characteristic) {
      throw new Error(`La característica ${name} no está disponible`);
    }
    return characteristic;
  }

  function clampNumber(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(Math.trunc(value), min), max);
  }

  async function writeByteCharacteristic(
    characteristic: BluetoothRemoteGATTCharacteristic,
    value: number
  ) {
    const payload = new Uint8Array([value & 0xff]);
    await characteristic.writeValue(payload);
  }

  async function writeTimeCharacteristic(
    characteristic: BluetoothRemoteGATTCharacteristic,
    hour: number,
    minute: number
  ) {
    const payload = new Uint8Array(TIME_PAYLOAD_BYTES);
    payload[0] = hour & 0xff;
    payload[1] = minute & 0xff;
    await characteristic.writeValue(payload);
  }

  async function setAlarmEnabled(enabled: boolean) {
    const characteristic = requireCharacteristic(switchChar, "switchAlarm");
    await writeByteCharacteristic(characteristic, enabled ? 1 : 0);
  }

  async function setLocalTime(hour: number, minute: number) {
    const safeHour = clampNumber(hour, 0, 23);
    const safeMinute = clampNumber(minute, 0, 59);
    const characteristic = requireCharacteristic(localTimeChar, "localTime");
    await writeTimeCharacteristic(characteristic, safeHour, safeMinute);
  }

  async function setAlarmTime(hour: number, minute: number) {
    const safeHour = clampNumber(hour, 0, 23);
    const safeMinute = clampNumber(minute, 0, 59);
    const characteristic = requireCharacteristic(alarmTimeChar, "alarmTime");
    await writeTimeCharacteristic(characteristic, safeHour, safeMinute);
  }

  async function setMelodySequence(sequence: string) {
    const characteristic = requireCharacteristic(
      melodySequenceChar,
      "melodySequence"
    );
    const trimmed = sequence.trim();
    if (!trimmed) {
      throw new Error("La melodía no puede estar vacía");
    }
    const payload = encoder.encode(trimmed);
    if (payload.length > MELODY_CHAR_BUFFER) {
      throw new Error(
        `La melodía supera el límite de ${MELODY_CHAR_BUFFER} bytes; reduce la cantidad de notas.`
      );
    }
    await characteristic.writeValue(payload);
  }

  async function getAlarmTime() {
    const characteristic = requireCharacteristic(alarmTimeChar, "alarmTime");
    const value = await characteristic.readValue();
    const hour = value.getUint8(0);
    const minute = value.getUint8(1);
    return { hour, minute };
  }

  async function getMelodySequence() {
    const characteristic = requireCharacteristic(
      melodySequenceChar,
      "melodySequence"
    );
    const value = await characteristic.readValue();
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(value);
  }

  const controller: BLEController = {
    connect,
    disconnect,
    setAlarmEnabled,
    setLocalTime,
    setAlarmTime,
    setMelodySequence,
    getAlarmTime,
    getMelodySequence,
  };

  return controller;
}
