#include "MelodyManager.h"

#include <ctype.h>
#include <stdlib.h>

MelodyManager::MelodyManager() {
  memset(frequencies_, 0, sizeof(frequencies_));
  memset(durations_, 0, sizeof(durations_));
}

void MelodyManager::attachCharacteristic(BLECharacteristic *characteristic) {
  characteristic_ = characteristic;
}

void MelodyManager::publishSequence() {
  if (!characteristic_) {
    return;
  }

  const String payload = buildPayload();
  characteristic_->writeValue(payload.c_str());
}

bool MelodyManager::handleWrite() {
  if (!characteristic_ || !characteristic_->written()) {
    return false;
  }

  const String incoming = readCharacteristicValue();
  parseSequence(incoming.c_str());
  publishSequence();
  return true;
}

void MelodyManager::start() {
  if (stepCount_ > 0 && !isPlaying_) {
    isPlaying_ = true;
    currentStep_ = 0;
    lastStateChangeTime_ = 0;
    isNoteActive_ = false;
  }
}

void MelodyManager::stop() {
  isPlaying_ = false;
  currentStep_ = 0;
  isNoteActive_ = false;
}

void MelodyManager::update(MKRIoTCarrier &carrier) {
  if (!isPlaying_) {
    return;
  }

  unsigned long now = millis();

  // If we finished the sequence
  if (currentStep_ >= stepCount_) {
    stop();
    carrier.Buzzer.noSound();
    carrier.leds.fill(0);
    carrier.leds.show();
    return;
  }

  uint16_t freq = frequencies_[currentStep_];
  uint16_t duration = durations_[currentStep_];

  // Skip invalid steps
  if (freq == MIN_FREQUENCY_HZ || duration == 0) {
    currentStep_++;
    return;
  }

  if (isNoteActive_) {
    // We are currently playing a note. Check if it's time to stop.
    if (now - lastStateChangeTime_ >= duration) {
      carrier.Buzzer.noSound();
      carrier.leds.fill(0);
      carrier.leds.show();
      
      isNoteActive_ = false;
      lastStateChangeTime_ = now;
      currentStep_++;
    }
  } else {
    // We are in the gap between notes (or just starting). Check if gap is over.
    // For the first note, lastStateChangeTime_ is 0, so this is true immediately.
    if (now - lastStateChangeTime_ >= NOTE_GAP_DELAY_MS) {
      // Start playing the note
      uint32_t color = 0;
      if (freq <= 300) {
        color = carrier.leds.Color(255, 0, 0); // Red (C4, D4 approx)
      } else if (freq <= 370) {
        color = carrier.leds.Color(0, 255, 0); // Green (E4, F4 approx)
      } else if (freq <= 470) {
        color = carrier.leds.Color(0, 0, 255); // Blue (G4, A4 approx)
      } else if (freq <= 600) {
        color = carrier.leds.Color(255, 255, 0); // Yellow (B4, C5, D5 approx)
      } else {
        color = carrier.leds.Color(255, 0, 255); // Purple (E5+)
      }

      carrier.leds.fill(color);
      carrier.leds.show();
      carrier.Buzzer.sound(freq);

      isNoteActive_ = true;
      lastStateChangeTime_ = now;
    }
  }
}

void MelodyManager::parseSequence(const char *buffer) {
  if (!buffer) {
    resetStepsFrom(0);
    stepCount_ = 0;
    return;
  }

  size_t count = 0;
  const char *cursor = buffer;

  while (*cursor != '\0' && count < MAX_ALARM_STEPS) {
    cursor = skipWhitespace(cursor);
    if (*cursor == '\0') {
      break;
    }

    const char *afterFrequency = cursor;
    long rawFrequency = MIN_FREQUENCY_HZ;
    const bool hasFrequency =
        tryParseNumber(cursor, rawFrequency, &afterFrequency);
    if (!hasFrequency) {
      cursor = skipToNextToken(cursor + 1);
      continue;
    }
    cursor = afterFrequency;
    const uint16_t clampedFrequency =
        clampToRange(rawFrequency, MIN_FREQUENCY_HZ, MAX_FREQUENCY_HZ);

    long rawDuration = FALLBACK_BUZZER_DURATION;
    if (*cursor == '@') {
      ++cursor;
      const char *afterDuration = cursor;
      if (tryParseNumber(cursor, rawDuration, &afterDuration)) {
        cursor = afterDuration;
      }
    }
    const uint16_t clampedDuration =
        clampToRange(rawDuration, MIN_DURATION_MS, MAX_DURATION_MS);

    frequencies_[count] = clampedFrequency;
    durations_[count] = clampedDuration;
    ++count;

    cursor = skipToNextToken(cursor);
  }

  resetStepsFrom(count);
  stepCount_ = count;
}

String MelodyManager::buildPayload() const {
  String payload;
  payload.reserve(MELODY_CHAR_BUFFER);

  for (size_t i = 0; i < stepCount_; ++i) {
    if (i > 0) {
      payload += ' ';
    }
    payload += String(frequencies_[i]);
    payload += '@';
    payload += String(durations_[i]);

    if (payload.length() >= MELODY_CHAR_BUFFER - MELODY_PADDING_GUARD) {
      break;
    }
  }

  return payload;
}

String MelodyManager::readCharacteristicValue() const {
  if (!characteristic_) {
    return String();
  }

  char buffer[MELODY_CHAR_BUFFER + 1] = {0};
  const int bytesRead = characteristic_->readValue(
      reinterpret_cast<uint8_t *>(buffer), MELODY_CHAR_BUFFER);

  int safeLength = bytesRead;
  if (safeLength < 0) {
    safeLength = 0;
  }
  if (safeLength > MELODY_CHAR_BUFFER) {
    safeLength = MELODY_CHAR_BUFFER;
  }

  buffer[safeLength] = '\0';
  return String(buffer);
}

const char *MelodyManager::skipWhitespace(const char *text) const {
  while (text && *text != '\0' && isspace(*text)) {
    ++text;
  }
  return text;
}

const char *MelodyManager::skipToNextToken(const char *text) const {
  while (text && *text != '\0' && *text != '-' && *text != '+' &&
         !isdigit(*text)) {
    ++text;
  }
  return text;
}

bool MelodyManager::tryParseNumber(const char *text, long &value,
                                   const char **next) const {
  char *endPtr = nullptr;
  long parsedValue = strtol(text, &endPtr, 10);
  if (text == endPtr) {
    return false;
  }

  value = parsedValue;
  if (next) {
    *next = endPtr;
  }
  return true;
}

uint16_t MelodyManager::clampToRange(long value, long minValue,
                                     long maxValue) const {
  if (value < minValue) {
    return static_cast<uint16_t>(minValue);
  }
  if (value > maxValue) {
    return static_cast<uint16_t>(maxValue);
  }
  return static_cast<uint16_t>(value);
}

void MelodyManager::resetStepsFrom(size_t startIndex) {
  for (size_t i = startIndex; i < MAX_ALARM_STEPS; ++i) {
    frequencies_[i] = 0;
    durations_[i] = 0;
  }
}
