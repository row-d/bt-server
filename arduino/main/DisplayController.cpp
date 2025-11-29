#include "DisplayController.h"

#include <Arduino.h>
#include <TimeLib.h>

DisplayController::DisplayController(MKRIoTCarrier &carrier)
    : carrier_(carrier) {}

void DisplayController::begin() {
  carrier_.display.setTextColor(0xFFFF, DISPLAY_BACKGROUND_COLOR);
}

void DisplayController::update() {
  if (millis() - lastUpdate_ < 1000) {
    return;
  }
  lastUpdate_ = millis();

  char timeBuffer[sizeof(lastTime_)];
  snprintf(timeBuffer, sizeof(timeBuffer), "%02d%c%02d%c%02d", hour(),
           TIME_SEPARATOR, minute(), TIME_SEPARATOR, second());

  if (strcmp(timeBuffer, lastTime_) == 0) {
    return;
  }

  drawCenteredTime(timeBuffer);
  strncpy(lastTime_, timeBuffer, sizeof(lastTime_));
}

void DisplayController::drawCenteredTime(const char *timeText) {
  carrier_.display.setTextSize(DISPLAY_FONT_SIZE);

  int16_t x1, y1;
  uint16_t w, h;
  carrier_.display.getTextBounds(timeText, 0, 0, &x1, &y1, &w, &h);
  int16_t x = (carrier_.display.width() - w) / 2;
  int16_t y = (carrier_.display.height() - h) / 2;

  // Optimize: Clear only the area where text will be drawn (plus some margin)
  // instead of the full screen, to reduce blocking time.
  int16_t clearHeight = h + 10;
  int16_t clearY = (carrier_.display.height() - clearHeight) / 2;
  carrier_.display.fillRect(0, clearY, carrier_.display.width(),
                            clearHeight, DISPLAY_BACKGROUND_COLOR);

  carrier_.display.setCursor(x, y);
  carrier_.display.print(timeText);
}
