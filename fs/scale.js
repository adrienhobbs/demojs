load('api_config.js');
load('api_gpio.js');
load('api_uart.js');
load('api_aws.js');
load('api_neopixel.js');

let pin = 13, numPixels = 8, colorOrder = NeoPixel.GRB;
let capacity = 8;

let Scale = {
  tareCharacter: 'y',
  readingCharacter: 'z',
  uartNo: 1,
  taring: false,
  capacity: 0,
  initStatusLED: function() {
    this.strip = NeoPixel.create(pin, numPixels, colorOrder);
    this.strip.clear();
    this.strip.show();
  },
  updateStatusLED: function(currentWeight) {
    let pixelsToShow = (currentWeight / capacity) * numPixels;
    this.strip.clear();
    for (let i = 0; i <= pixelsToShow; i++) {
      if (pixelsToShow >= numPixels / 2) {
        this.strip.setPixel(i, 0, 255, 0);  
      } else if (pixelsToShow <= numPixels / 2 && currentWeight / capacity > 0.25) {
        this.strip.setPixel(i, 255, 255, 0);  
      } else {
        this.strip.setPixel(i, 255, 0, 0);
      }
    }
    this.strip.show();
  },
  init: function () {
    this.topic = '/devices/' + Cfg.get('device.id') + '/events';
    this.setupUART();
    this.listenForScaleUpdates();
    this.setShadowHandlers();
    this.handleBtnPress();
    this.initStatusLED();
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
    let updateLED = this.updateStatusLED;
    UART.setDispatcher(this.uartNo, function (uartNo) {
      let ra = UART.readAvail(uartNo);
      if (ra > 0) {
        let ud = UART.read(uartNo);
        if (Scale.taring && ud === 'TARE_DONE') {
          Scale.taring = false;
        }
        if (ud.at(0) === 123) { // data returned is JSON
          let data = JSON.parse(ud);
          AWS.Shadow.update(0, { reported: { temperature: data.t, weight: data.w, capacity: Scale.capacity || 40 } });
          Scale.updateStatusLED(data.w);
        }
      }
    }, null);
  },
  setShadowHandlers: function () {
    AWS.Shadow.setStateHandler(function (data, event, reported, desired) {
      if (event === AWS.Shadow.CONNECTED) {
        print("YAHH", JSON.stringify(reported));
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
    GPIO.set_button_handler(34, GPIO.PULL_DOWN, GPIO.INT_EDGE_NEG, 200, function(x) {
      if (!Scale.taring) {
        Scale.taring = true;
        Scale.tare();
        print('Button press, pin: ', x); 
      }
    }, null);
  },
  tare: function () {
    UART.write(this.uartNo, this.tareCharacter);
  },
  triggerReading: function () {
    UART.write(this.uartNo, this.readingCharacter);
  }
}
