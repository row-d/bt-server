// Service and characteristic UUIDs (mirror arduino/main/main.ino)
export const SERVICE_UUID = "4e2b8b44-b494-4d79-af1e-3bf62ec2c614";
export const SWITCH_UUID = "1df56013-b380-45fd-b3e2-b7785d55b1d4"; // byte flag
export const ALARM_TIME_UUID = "d48e347c-28ec-4054-9170-a4d19330361a"; // hour/minute
export const LOCAL_TIME_UUID = "2c469837-3418-44d1-b123-2b9a03099c0f"; // hour/minute
export const MELODY_SEQUENCE_UUID = "07a25765-1304-48d4-9b13-1b0bbef6b418"; // ascii

// Payload sizes
export const TIME_PAYLOAD_BYTES = 2;
export const MELODY_CHAR_BUFFER = 512;

// Alarm composition helpers (match Arduino sketch)
export const MAX_ALARM_STEPS = 100;
export const MIN_NOTE_FREQ = 0;
export const MAX_NOTE_FREQ = 20000;
export const MIN_NOTE_DURATION_MS = 1;
export const MAX_NOTE_DURATION_MS = 1000;
export const DEFAULT_NOTE_DURATION_MS = 500;




