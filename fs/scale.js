load('api_config.js');
load('api_gpio.js');
load('api_uart.js');
load('api_aws.js');

let Scale = {
  tareCharacter: 'y',
  readingCharacter: 'z',
  uartNo: 1,
  init: function () {
    this.topic = '/devices/' + Cfg.get('device.id') + '/events';
    this.setupUART();
    this.listenForScaleUpdates();
    this.setShadowHandlers();
    this.handleBtnPress();
  },
  setupUART: function () {
    UART.setConfig(this.uartNo, {
      baudRate: 115200,
      esp32: {
        gpio: {
          rx: Cfg.get('pins.scale.rx'),
          tx: Cfg.get('pins.scale.tx')
        }
      }
    });
    UART.setRxEnabled(this.uartNo, true);
  },
  listenForScaleUpdates: function () {
    UART.setDispatcher(this.uartNo, function (uartNo) {
      let ra = UART.readAvail(uartNo);
      if (ra > 0) {
        let ud = UART.read(uartNo);
        if (ud.at(0) === 123) {
          let data = JSON.parse(ud);
          AWS.Shadow.update(0, { reported: { temperature: data.t, weight: data.w } });
        }
      }
    }, null);
  },
  setShadowHandlers: function () {
    AWS.Shadow.setStateHandler(function (data, event, reported, desired) {
      if (event === AWS.Shadow.CONNECTED) {
        Scale.triggerReading();
      } else if (event === AWS.Shadow.UPDATE_DELTA) {
        if (desired.tare) {
          Scale.tare();
        }
        AWS.Shadow.update(0, { desired: null });  // Report device state
      }
    }, null);
  },
  handleBtnPress: function () {
    GPIO.set_button_handler(Cfg.get('pins.button'), GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 200, function () {
      Scale.tare();
    }, null);
  },
  tare: function () {
    UART.write(this.uartNo, this.tareCharacter);
  },
  triggerReading: function () {
    UART.write(this.uartNo, this.readingCharacter);
  }
}