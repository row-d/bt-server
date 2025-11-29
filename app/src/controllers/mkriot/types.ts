export type StatusLevel = "muted" | "ok" | "warn";

export interface MelodyStep {
  freq: number;
  duration: number;
}

export interface AlarmConfig {
  hour: number;
  minute: number;
  steps: MelodyStep[];
}

export interface BLECentralOptions {
  onStatus?: (text: string, level: StatusLevel) => void;
  onConnected?: (connected: boolean) => void;
  onDisconnected?: () => void;
}

export interface BLEController {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setAlarmEnabled(enabled: boolean): Promise<void>;
  setLocalTime(hour: number, minute: number): Promise<void>;
  setAlarmTime(hour: number, minute: number): Promise<void>;
  setMelodySequence(sequence: string): Promise<void>;
  getAlarmTime(): Promise<{ hour: number; minute: number }>;
  getMelodySequence(): Promise<string>;
}

export interface BLEAppState {
  connected: boolean;
  busy: boolean;
  statusText: string;
  statusLevel: StatusLevel;
  ble: BLEController | null;
  init(): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  configureAlarm(time: string, melody: string): Promise<void>;
  readSettings(): Promise<{ time: string; melody: string } | null>;
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
    getPrimaryServices?: (
      service?: string | number
    ) => Promise<BluetoothRemoteGATTService[]>;
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
    bleAppInstance?: BLEAppState;
  }
}
