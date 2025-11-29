#pragma once

#include <Arduino.h>

constexpr uint32_t SERIAL_BAUD_RATE = 9600;
constexpr uint8_t MIN_HOUR_VALUE = 0;
constexpr uint8_t MAX_HOUR_VALUE = 23;
constexpr uint8_t MIN_MINUTE_VALUE = 0;
constexpr uint8_t MAX_MINUTE_VALUE = 59;
constexpr uint8_t DEFAULT_DAY = 1;
constexpr uint8_t DEFAULT_MONTH = 1;
constexpr uint8_t DEFAULT_SECOND = 0;
constexpr uint16_t DEFAULT_YEAR = 2025;
constexpr uint16_t FALLBACK_BUZZER_FREQ = 1000;
constexpr uint16_t FALLBACK_BUZZER_DURATION = 500;
constexpr uint16_t NOTE_GAP_DELAY_MS = 10;
constexpr uint16_t MIN_FREQUENCY_HZ = 0;
constexpr uint16_t MAX_FREQUENCY_HZ = 20000;
constexpr uint16_t MAX_DURATION_MS = 10000;
constexpr uint16_t MIN_DURATION_MS = 1;
constexpr uint8_t DISPLAY_FONT_SIZE = 3;
constexpr uint16_t DISPLAY_BACKGROUND_COLOR = 0x0000;
constexpr char TIME_SEPARATOR = ':';
constexpr size_t MAX_ALARM_STEPS = 100;
constexpr size_t MELODY_CHAR_BUFFER = 512;
constexpr size_t TIME_PAYLOAD_SIZE = 2;
constexpr size_t MELODY_PADDING_GUARD = 8;
