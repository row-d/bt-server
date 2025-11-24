#include <ArduinoBLE.h>
#include <Arduino_MKRIoTCarrier.h>

// BT
// > Sensors
BLEService sensorService("f2c9bbaa-7595-4b33-99e9-0ce1cd1422f9");
BLEFloatCharacteristic temperatureCharacteristic("bcd3a81a-20cc-4e27-be8c-89df34325729", BLERead | BLENotify);
BLEFloatCharacteristic humidityCharacteristic("2c394694-e7a4-481c-84c7-60faebe166fd", BLERead | BLENotify);
BLEFloatCharacteristic pressureCharacteristic("fbdd96a8-e40f-467a-ab5d-15955cf5ded1", BLERead | BLENotify);
BLEIntCharacteristic lightCharacteristic("2743dc8f-6162-4b48-b2db-ebfd9faa4075", BLERead | BLENotify);

// Additional sensor characteristics (RGB color sensor + IMU)
BLEIntCharacteristic colorRCharacteristic("5f5b4d30-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLENotify);
BLEIntCharacteristic colorGCharacteristic("5f5b4d31-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLENotify);
BLEIntCharacteristic colorBCharacteristic("5f5b4d32-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLENotify);

BLEFloatCharacteristic gxCharacteristic("5f5b4d40-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLENotify);
BLEFloatCharacteristic gyCharacteristic("5f5b4d41-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLENotify);
BLEFloatCharacteristic gzCharacteristic("5f5b4d42-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLENotify);
BLEFloatCharacteristic axCharacteristic("5f5b4d43-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLENotify);
BLEFloatCharacteristic ayCharacteristic("5f5b4d44-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLENotify);
BLEFloatCharacteristic azCharacteristic("5f5b4d45-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLENotify);

// > Controls (new control service)
BLEService controlService("5f5b4d2a-3b2b-4f8d-a2a7-1a2b3c4d5e6f");
BLEByteCharacteristic relay1Characteristic("5f5b4d2b-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLEWrite | BLENotify);
BLEByteCharacteristic relay2Characteristic("5f5b4d2c-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLEWrite | BLENotify);
BLEIntCharacteristic buzzerCharacteristic("5f5b4d2d-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLERead | BLEWrite | BLENotify);
BLECharacteristic ledCharacteristic("5f5b4d2e-3b2b-4f8d-a2a7-1a2b3c4d5e6f", BLEWrite, 4); // [index(0-4 or 255=all), R, G, B]

// Carrier
MKRIoTCarrier carrier;
float temperature;
float humidity;
float pressure;
int light;
int r, g, b;
float Gx, Gy, Gz;
float Ax, Ay, Az;

// Handlers for control writes
void onRelay1Written(BLEDevice central, BLECharacteristic characteristic) {
  uint8_t v = relay1Characteristic.value();
  if (v) {
    carrier.Relay1.close();
  } else {
    carrier.Relay1.open();
  }
  relay1Characteristic.writeValue(v);
}

void onRelay2Written(BLEDevice central, BLECharacteristic characteristic) {
  uint8_t v = relay2Characteristic.value();
  if (v) {
    carrier.Relay2.close();
  } else {
    carrier.Relay2.open();
  }
  relay2Characteristic.writeValue(v);
}

void onBuzzerWritten(BLEDevice central, BLECharacteristic characteristic) {
  int freq = buzzerCharacteristic.value();
  if (freq > 0) {
    carrier.Buzzer.sound(freq);
  } else {
    carrier.Buzzer.noSound();
  }
}

void onLedWritten(BLEDevice central, BLECharacteristic characteristic) {
  uint8_t buf[4];
  int len = ledCharacteristic.valueLength();
  if (len == 4) {
    ledCharacteristic.readValue(buf, 4);
    uint8_t index = buf[0];
    uint8_t R = buf[1];
    uint8_t G = buf[2];
    uint8_t B = buf[3];

    if (index == 255) {
      for (int i = 0; i < 5; i++) {
        carrier.leds.setPixelColor(i, R, G, B);
      }
    } else if (index < 5) {
      carrier.leds.setPixelColor(index, R, G, B);
    }
    carrier.leds.show();
  }
}

void setup() {
  //SERIAL
  Serial.begin(9600);
  while (!Serial) {}

  //BT
  if (!BLE.begin()) {
    Serial.println("starting BLE failed!");
    while (1)
      ;
  }
  BLE.setLocalName("Arduino MKR IoT Carrier");
  BLE.setAdvertisedService(sensorService);
  sensorService.addCharacteristic(temperatureCharacteristic);
  sensorService.addCharacteristic(humidityCharacteristic);
  sensorService.addCharacteristic(lightCharacteristic);
  sensorService.addCharacteristic(pressureCharacteristic);
  sensorService.addCharacteristic(colorRCharacteristic);
  sensorService.addCharacteristic(colorGCharacteristic);
  sensorService.addCharacteristic(colorBCharacteristic);
  sensorService.addCharacteristic(gxCharacteristic);
  sensorService.addCharacteristic(gyCharacteristic);
  sensorService.addCharacteristic(gzCharacteristic);
  sensorService.addCharacteristic(axCharacteristic);
  sensorService.addCharacteristic(ayCharacteristic);
  sensorService.addCharacteristic(azCharacteristic);
  BLE.addService(sensorService);

  // Control service
  controlService.addCharacteristic(relay1Characteristic);
  controlService.addCharacteristic(relay2Characteristic);
  controlService.addCharacteristic(buzzerCharacteristic);
  controlService.addCharacteristic(ledCharacteristic);
  BLE.addService(controlService);

  // Init control defaults
  relay1Characteristic.writeValue((uint8_t)0);
  relay2Characteristic.writeValue((uint8_t)0);
  buzzerCharacteristic.writeValue(0);

  // Event handlers
  relay1Characteristic.setEventHandler(BLEWritten, onRelay1Written);
  relay2Characteristic.setEventHandler(BLEWritten, onRelay2Written);
  buzzerCharacteristic.setEventHandler(BLEWritten, onBuzzerWritten);
  ledCharacteristic.setEventHandler(BLEWritten, onLedWritten);

  //CARRIER
  carrier.noCase();
  carrier.begin();

  // FINALLY
  BLE.advertise();
  Serial.println("Bluetooth® device active, waiting for connections...");
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    // READ
    temperature = carrier.Env.readTemperature();
    humidity = carrier.Env.readHumidity();
    pressure = carrier.Pressure.readPressure();

    carrier.IMUmodule.readGyroscope(Gx, Gy, Gz);
    carrier.IMUmodule.readAcceleration(Ax, Ay, Az);

    while (!carrier.Light.colorAvailable()) {
      delay(5);
    }
    carrier.Light.readColor(r, g, b, light);

    // WRITE & NOTIFY
    temperatureCharacteristic.writeValue(temperature);
    humidityCharacteristic.writeValue(humidity);
    lightCharacteristic.writeValue(light);
    pressureCharacteristic.writeValue(pressure);

    colorRCharacteristic.writeValue(r);
    colorGCharacteristic.writeValue(g);
    colorBCharacteristic.writeValue(b);

    gxCharacteristic.writeValue(Gx);
    gyCharacteristic.writeValue(Gy);
    gzCharacteristic.writeValue(Gz);
    axCharacteristic.writeValue(Ax);
    ayCharacteristic.writeValue(Ay);
    azCharacteristic.writeValue(Az);

    BLE.poll();
  }
}
