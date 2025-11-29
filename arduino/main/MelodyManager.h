#pragma once

#include <Arduino.h>
#include <ArduinoBLE.h>
#include <Arduino_MKRIoTCarrier.h>
#include "AlarmConfig.h"

class MelodyManager {
 public:
  MelodyManager();

  void attachCharacteristic(BLECharacteristic *characteristic);
  void publishSequence();
  bool handleWrite();
  
  void start();
  void stop();
  void update(MKRIoTCarrier &carrier);
  bool isPlaying() const { return isPlaying_; }
  
  size_t stepCount() const { return stepCount_; }

 private:
  void parseSequence(const char *buffer);
    String buildPayload() const;
    String readCharacteristicValue() const;
    const char *skipWhitespace(const char *text) const;
    const char *skipToNextToken(const char *text) const;
    bool tryParseNumber(const char *text, long &value,
                        const char **next) const;
    uint16_t clampToRange(long value, long minValue, long maxValue) const;
    void resetStepsFrom(size_t startIndex);

  BLECharacteristic *characteristic_ = nullptr;
  uint16_t frequencies_[MAX_ALARM_STEPS];
  uint16_t durations_[MAX_ALARM_STEPS];
  size_t stepCount_ = 0;

  // Playback state
  bool isPlaying_ = false;
  size_t currentStep_ = 0;
  unsigned long lastStateChangeTime_ = 0;
  bool isNoteActive_ = false;
};
