import * as Tone from "tone";
import { createBLECentral } from "./central";
import { normalizeMelodySequence } from "./sequence";
import { DEFAULT_NOTE_DURATION_MS } from "./constants";
import type { BLEAppState } from "./types";

function parseTimeValue(value: string) {
  const match = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value || "");
  if (!match) {
    throw new Error("Hora inválida. Usa el formato HH:MM");
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("La hora está fuera de rango");
  }
  return { hour, minute };
}

function twoDigits(value: number) {
  return value.toString().padStart(2, "0");
}

export function bleApp(): BLEAppState {
  return {
    connected: false,
    busy: false,
    statusText: "Desconectado",
    statusLevel: "muted",
    ble: null,

    init() {
      this.ble = createBLECentral({
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

      if (typeof window !== "undefined") {
        (window as Window & { bleAppInstance?: BLEAppState }).bleAppInstance = this;
      }
    },

    async connect() {
      this.busy = true;
      try {
        await this.ble?.connect();
        if (this.connected && this.ble) {
          const now = new Date();
          await this.ble.setLocalTime(now.getHours(), now.getMinutes());
          const settings = await this.readSettings();
          if (settings) {
            window.dispatchEvent(
              new CustomEvent("ble-settings-loaded", { detail: settings })
            );
          }
        }
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
    async configureAlarm(time, melody) {
      if (!this.ble) {
        throw new Error("Inicializa la conexión BLE desde la parte superior");
      }
      if (!this.connected) {
        throw new Error("Conecta tu placa antes de programar la alarma");
      }
      const { sequence } = normalizeMelodySequence(melody);

      const controller = this.ble;
      const { hour, minute } = parseTimeValue(time);
      const now = new Date();

      this.busy = true;
      try {
        await Promise.all([
          controller.setLocalTime(now.getHours(), now.getMinutes()),
          controller.setAlarmTime(hour, minute),
        ]);
        await controller.setMelodySequence(sequence);
        await controller.setAlarmEnabled(true);
        this.statusText = `Alarma programada a las ${twoDigits(hour)}:${twoDigits(minute)}`;
        this.statusLevel = "ok";
      } finally {
        this.busy = false;
      }
    },

    async readSettings() {
      if (!this.ble || !this.connected) {
        return null;
      }
      this.busy = true;
      try {
        const [alarmTime, rawMelody] = await Promise.all([
          this.ble.getAlarmTime(),
          this.ble.getMelodySequence(),
        ]);
        
        // Convert raw melody (ms) to UI melody (multipliers)
        const melody = rawMelody
          .split(" ")
          .map((token) => {
            const [freqStr, durationMs] = token.split("@");
            
            let note = freqStr;
            const freq = Number(freqStr);
            if (Number.isFinite(freq) && freq > 0) {
              try {
                note = Tone.Frequency(freq).toNote();
              } catch {}
            }

            if (!durationMs) return note;
            
            const ms = parseInt(durationMs, 10);
            if (isNaN(ms)) return note;

            const multiplier = ms / DEFAULT_NOTE_DURATION_MS;
            // If multiplier is 1, we can omit it as it is the default
            if (multiplier === 1) {
              return note;
            }
            // Use up to 2 decimal places for cleaner output (e.g. 0.5 instead of 0.50000)
            return `${note}@${parseFloat(multiplier.toFixed(2))}`;
          })
          .join(" ");

        const time = `${twoDigits(alarmTime.hour)}:${twoDigits(alarmTime.minute)}`;
        this.statusText = "Configuración leída de la placa";
        this.statusLevel = "ok";
        return { time, melody };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error leyendo configuración";
        this.statusText = message;
        this.statusLevel = "warn";
        return null;
      } finally {
        this.busy = false;
      }
    },
  };
}
