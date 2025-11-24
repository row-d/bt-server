export type StatusLevel = "muted" | "ok" | "warn";

export interface BLECentralOptions {
  onTemp?: (value: number) => void;
  onHum?: (value: number) => void;
  onPres?: (value: number) => void;
  onLight?: (value: number) => void;
  onColorR?: (value: number) => void;
  onColorG?: (value: number) => void;
  onColorB?: (value: number) => void;
  onGx?: (value: number) => void;
  onGy?: (value: number) => void;
  onGz?: (value: number) => void;
  onAx?: (value: number) => void;
  onAy?: (value: number) => void;
  onAz?: (value: number) => void;
  onStatus?: (text: string, level: StatusLevel) => void;
  onConnected?: (connected: boolean) => void;
  onDisconnected?: () => void;
}

export interface BLEController {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setRelay1(state: number): Promise<void>;
  setRelay2(state: number): Promise<void>;
  setBuzzer(freq: number): Promise<void>;
  setLed(index: number, r: number, g: number, b: number): Promise<void>;
}

export type RGBColor = { r: number; g: number; b: number };

export interface BLEAppState {
  connected: boolean;
  busy: boolean;
  statusText: string;
  statusLevel: StatusLevel;
  temp: number | null;
  hum: number | null;
  pres: number | null;
  light: number | null;
  colorR: number | null;
  colorG: number | null;
  colorB: number | null;
  gx: number | null;
  gy: number | null;
  gz: number | null;
  ax: number | null;
  ay: number | null;
  az: number | null;
  relay1: number;
  relay2: number;
  buzzerFreq: number;
  ledColor: string;
  ledIndex: number;
  ble: BLEController | null;
  init(): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  toggleRelay1(): Promise<void>;
  toggleRelay2(): Promise<void>;
  buzzerOn(): Promise<void>;
  buzzerOff(): Promise<void>;
  applyLed(): Promise<void>;
  num(value: number | null, digits?: number): string;
  int(value: number | null): string;
  hexToRgb(hex: string): RGBColor;
}

export type CreateBLECentralFn = (options?: BLECentralOptions) => BLEController;
export type BleAppFactory = () => BLEAppState;

// --- Web Bluetooth types (merged when lib.dom already defines them) ---
declare global {
  interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    uuid: string;
    device: BluetoothDevice;
    getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    uuid: string;
    service: BluetoothRemoteGATTService;
    value?: DataView;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
  }

  interface Bluetooth extends EventTarget {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: (string | number)[];
    acceptAllDevices?: boolean;
  }

  interface BluetoothLEScanFilter {
    name?: string;
    namePrefix?: string;
    services?: (string | number)[];
  }

  interface Navigator {
    bluetooth: Bluetooth;
  }

  interface Window {
    createBLECentral?: CreateBLECentralFn;
    bleApp?: BleAppFactory;
  }
}
