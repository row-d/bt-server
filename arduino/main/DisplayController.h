#pragma once

#include <Arduino_MKRIoTCarrier.h>
#include "AlarmConfig.h"

class DisplayController {
 public:
  explicit DisplayController(MKRIoTCarrier &carrier);

  void begin();
  void update();

 private:
  void drawCenteredTime(const char *timeText);

  MKRIoTCarrier &carrier_;
  unsigned long lastUpdate_ = 0;
  char lastTime_[16] = {0};
};
