import { createBLECentral } from "./central";
import type { BLEAppState, RGBColor } from "./types";

export function bleApp(): BLEAppState {
  return {
    connected: false,
    busy: false,
    statusText: "Desconectado",
    statusLevel: "muted",
    temp: null,
    hum: null,
    pres: null,
    light: null,
    colorR: null,
    colorG: null,
    colorB: null,
    gx: null,
    gy: null,
    gz: null,
    ax: null,
    ay: null,
    az: null,
    relay1: 0,
    relay2: 0,
    buzzerFreq: 0,
    ledColor: "#ffffff",
    ledIndex: 255,
    ble: null,

    init() {
      this.ble = createBLECentral({
        onTemp: (value) => (this.temp = value),
        onHum: (value) => (this.hum = value),
        onPres: (value) => (this.pres = value),
        onLight: (value) => (this.light = value),
        onColorR: (value) => (this.colorR = value),
        onColorG: (value) => (this.colorG = value),
        onColorB: (value) => (this.colorB = value),
        onGx: (value) => (this.gx = value),
        onGy: (value) => (this.gy = value),
        onGz: (value) => (this.gz = value),
        onAx: (value) => (this.ax = value),
        onAy: (value) => (this.ay = value),
        onAz: (value) => (this.az = value),
        onConnected: (connected) => {
          this.connected = connected;
          this.busy = false;
        },
        onStatus: (text, level = "muted") => {
          this.statusText = text;
          this.statusLevel = level;
        },
        onDisconnected: () => {
          this.connected = false;
          this.busy = false;
        },
      });
    },

    async connect() {
      this.busy = true;
      try {
        await this.ble?.connect();
      } finally {
        this.busy = false;
      }
    },

    async disconnect() {
      this.busy = true;
      try {
        await this.ble?.disconnect();
      } finally {
        this.busy = false;
      }
    },

    async toggleRelay1() {
      this.relay1 = this.relay1 ? 0 : 1;
      await this.ble?.setRelay1(this.relay1);
    },

    async toggleRelay2() {
      this.relay2 = this.relay2 ? 0 : 1;
      await this.ble?.setRelay2(this.relay2);
    },

    async buzzerOn() {
      await this.ble?.setBuzzer(this.buzzerFreq || 800);
    },

    async buzzerOff() {
      this.buzzerFreq = 0;
      await this.ble?.setBuzzer(0);
    },

    async applyLed() {
      const { r, g, b } = this.hexToRgb(this.ledColor);
      await this.ble?.setLed(this.ledIndex, r, g, b);
    },

    num(value, digits = 2) {
      return Number.isFinite(value) ? Number(value).toFixed(digits) : "—";
    },

    int(value) {
      return Number.isFinite(value) ? String(value) : "—";
    },

    hexToRgb(hex: string): RGBColor {
      const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || "#ffffff");
      return match
        ? { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) }
        : { r: 255, g: 255, b: 255 };
    },
  };
}
