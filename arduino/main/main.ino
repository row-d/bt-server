#include <Arduino.h>
#include <ArduinoBLE.h>
#include <Arduino_MKRIoTCarrier.h>
#include <TimeLib.h>

#include "AlarmConfig.h"
#include "DisplayController.h"
#include "MelodyManager.h"

MKRIoTCarrier carrier;
DisplayController displayController(carrier);
BLEService alarmService("4e2b8b44-b494-4d79-af1e-3bf62ec2c614");
BLEByteCharacteristic switchAlarm("1df56013-b380-45fd-b3e2-b7785d55b1d4", BLEWrite | BLERead);
BLECharacteristic alarmTime("d48e347c-28ec-4054-9170-a4d19330361a",
                            BLEWrite | BLERead, TIME_PAYLOAD_SIZE);
BLECharacteristic localTime("2c469837-3418-44d1-b123-2b9a03099c0f",
                            BLEWrite | BLERead, TIME_PAYLOAD_SIZE);
BLECharacteristic melodySequenceCharacteristic(
  "07a25765-1304-48d4-9b13-1b0bbef6b418", BLEWrite | BLERead,
  MELODY_CHAR_BUFFER);

MelodyManager melodyManager;

uint8_t alarmH = 0;
uint8_t alarmM = 0;
uint8_t localH = 0;
uint8_t localM = 0;
bool alarmOn = false;
int lastAlarmMinute = -1;

void onBLEConnected(BLEDevice central);
void onBLEDisconnected(BLEDevice central);

void writeTimeCharacteristic(BLECharacteristic &characteristic, uint8_t hourValue,
                             uint8_t minuteValue) {
  uint8_t payload[TIME_PAYLOAD_SIZE] = {hourValue, minuteValue};
  characteristic.writeValue(payload, sizeof(payload));
}

void setup() {
  // 1. SERIAL
  Serial.begin(SERIAL_BAUD_RATE);
  
  // 2. CARRIER
  carrier.noCase();
  carrier.begin(); // Inicia el carrier antes de usar la pantalla o sensores

  // 3. INICIALIZAR BLE (ESTO DEBE IR PRIMERO)
  if (!BLE.begin()) {
    Serial.println("¡Fallo al iniciar el módulo BLE!");
    while (1); // Detener si falla el hardware
  }

  // 4. CONFIGURAR BLE (Ahora que ya está iniciado)
  BLE.setLocalName("ARDUINO ALARMA");
  BLE.setAdvertisedService(alarmService); // Importante para que app lo detecte al escanear
  
  // Añadir características al servicio
  alarmService.addCharacteristic(switchAlarm);
  alarmService.addCharacteristic(localTime);
  alarmService.addCharacteristic(alarmTime);
  alarmService.addCharacteristic(melodySequenceCharacteristic);
  
  // Añadir el servicio al dispositivo
  BLE.addService(alarmService);

  // 5. CONFIGURAR EVENT HANDLERS
  switchAlarm.setEventHandler(BLEWritten, setSwitchAlarm);
  localTime.setEventHandler(BLEWritten, setLocalTime);
  alarmTime.setEventHandler(BLEWritten, setAlarmTime);
  melodySequenceCharacteristic.setEventHandler(BLEWritten, setMelodySequence);
  BLE.setEventHandler(BLEConnected, onBLEConnected);
  BLE.setEventHandler(BLEDisconnected, onBLEDisconnected);

  melodyManager.attachCharacteristic(&melodySequenceCharacteristic);

  // 6. VALORES INICIALES
  writeTimeCharacteristic(localTime, localH, localM);
  writeTimeCharacteristic(alarmTime, alarmH, alarmM);
  melodyManager.publishSequence();

  // 7. COMENZAR A ANUNCIAR
  BLE.advertise();
  Serial.println("BLE ALARM SERVICE ADVERTISED");
}

void loop() {
  BLE.poll();
  displayController.update();
  checkAlarm(carrier);
  melodyManager.update(carrier);
}

void setSwitchAlarm(BLEDevice central, BLECharacteristic characteristic) {
  if (switchAlarm.written()) {
    bool switchValue = switchAlarm.value();
    alarmOn = switchValue;
    if (!alarmOn) {
      melodyManager.stop();
      carrier.Buzzer.noSound();
      carrier.leds.fill(0);
      carrier.leds.show();
    }
    Serial.print("[BLE] switchAlarm updated by ");
    Serial.print(central.address());
    Serial.print(" -> ");
    Serial.println(alarmOn ? "ON" : "OFF");
  }
}

void setLocalTime(BLEDevice central, BLECharacteristic characteristic) {
  if (localTime.written()) {
    uint8_t payload[TIME_PAYLOAD_SIZE] = {0};
    int bytesRead = localTime.readValue(payload, sizeof(payload));
    if (bytesRead == TIME_PAYLOAD_SIZE) {
      localH = constrain(payload[0], MIN_HOUR_VALUE, MAX_HOUR_VALUE);
      localM = constrain(payload[1], MIN_MINUTE_VALUE, MAX_MINUTE_VALUE);
      timeStatus_t status = timeStatus();
      int currentSecond = second();
      int currentDay = day();
      int currentMonth = month();
      int currentYear = year();
      if (status == timeNotSet) {
        // Pick a sane baseline date when the RTC has not been initialized yet.
        currentSecond = DEFAULT_SECOND;
        currentDay = DEFAULT_DAY;
        currentMonth = DEFAULT_MONTH;
        currentYear = DEFAULT_YEAR;
      }
      setTime(localH, localM, currentSecond, currentDay, currentMonth,
              currentYear);
      localH = hour();
      localM = minute();
      writeTimeCharacteristic(localTime, localH, localM);
      Serial.print("[BLE] localTime set by ");
      Serial.print(central.address());
      Serial.print(" -> ");
      Serial.print(localH);
      Serial.print(":");
      Serial.println(localM);
    }
  }
}

void setAlarmTime(BLEDevice central, BLECharacteristic characteristic) {
  if (alarmTime.written()) {
    uint8_t payload[TIME_PAYLOAD_SIZE] = {0};
    int bytesRead = alarmTime.readValue(payload, sizeof(payload));
    if (bytesRead == TIME_PAYLOAD_SIZE) {
      alarmH = constrain(payload[0], MIN_HOUR_VALUE, MAX_HOUR_VALUE);
      alarmM = constrain(payload[1], MIN_MINUTE_VALUE, MAX_MINUTE_VALUE);
      writeTimeCharacteristic(alarmTime, alarmH, alarmM);
      Serial.print("[BLE] alarmTime set by ");
      Serial.print(central.address());
      Serial.print(" -> ");
      Serial.print(alarmH);
      Serial.print(":");
      Serial.println(alarmM);
    }
  }
}

void setMelodySequence(BLEDevice central, BLECharacteristic characteristic) {
  if (melodyManager.handleWrite()) {
    Serial.print("[BLE] melody sequence updated by ");
    Serial.print(central.address());
    Serial.print(" (steps: ");
    Serial.print(melodyManager.stepCount());
    Serial.println(")");
  }
}

void checkAlarm(MKRIoTCarrier &carrier) {
  // Ensure time is set before checking alarm
  if (timeStatus() == timeNotSet) return;

  if (alarmOn && hour() == alarmH && minute() == alarmM) {
    // We are in the alarm minute.
    // Check if we have already triggered for this specific minute.
    if (lastAlarmMinute != minute()) {
      lastAlarmMinute = minute();
      Serial.print("Alarm Triggered at ");
      Serial.print(hour());
      Serial.print(":");
      Serial.println(minute());
      
      // Start the melody if not already playing
      melodyManager.start();
    }
  } else {
    // We are NOT in the alarm minute.
    // Reset the latch so it can trigger again next time (e.g. tomorrow).
    // We check minute() != alarmM to avoid flickering if time is adjusting.
    if (minute() != alarmM) {
      lastAlarmMinute = -1;
    }
  }
}

void onBLEConnected(BLEDevice central) {
  Serial.print("[BLE] Central connected: ");
  Serial.println(central.address());
}

void onBLEDisconnected(BLEDevice central) {
  Serial.print("[BLE] Central disconnected: ");
  Serial.println(central.address());
}
