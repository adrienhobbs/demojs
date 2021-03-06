load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_net.js');
load('api_sys.js');
load('api_timer.js');
load('api_uart.js');
load('api_aws.js');

let uartNo = 1;
let button = Cfg.get('pins.button');
let scaleRxPin = Cfg.get('pins.scale.rx');
let scaleTxPin = Cfg.get('pins.scale.tx');
let topic = '/devices/' + Cfg.get('device.id') + '/events';
let tareCharacter = 'y';
let readingCharacter = 'z';
let state;

function tareScale() {
  UART.write(uartNo, tareCharacter);
}

function triggerReadings() {
  UART.write(uartNo, readingCharacter);
}

GPIO.set_button_handler(button, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 200, function () {
  tareScale();
}, null);

UART.setConfig(uartNo, {
  baudRate: 115200,
  esp32: {
    gpio: {
      rx: scaleRxPin,
      tx: scaleTxPin,
    },
  },
});

UART.setDispatcher(uartNo, function (uartNo) {
  let ra = UART.readAvail(uartNo);
  if (ra > 0) {
    let ud = UART.read(uartNo);
    if (ud.at(0) === 123) {
      let data = JSON.parse(ud);
      AWS.Shadow.update(0, { reported: { temperature: data.t, weight: data.w } });
    }
  }
}, null);


AWS.Shadow.setStateHandler(function (data, event, reported, desired) {
  if (event === AWS.Shadow.CONNECTED) {
    triggerReadings();
  } else if (event === AWS.Shadow.UPDATE_DELTA) {
    for (let key in state) {
      if (desired[key] !== undefined) state[key] = desired[key];
    }
    AWS.Shadow.update(0, { reported: state, desired: null });  // Report device state
    // print(JSON.stringify(state));
  }
}, null);

UART.setRxEnabled(uartNo, true);
// load('api_config.js');
// load('api_gpio.js');
// load('api_uart.js');
// load('api_aws.js');
load('scale.js');

Scale.init();

// let state = {};
// let uartNo = 1;
// let tareCharacter = 'y';
// let readingCharacter = 'z';
// let topic = '/devices/' + Cfg.get('device.id') + '/events';

// function triggerReading() {
//   UART.write(uartNo, readingCharacter);
// }

// GPIO.set_button_handler(Cfg.get('pins.button'), GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 200, function () {
//   tareScale();
// }, null);

// function tareScale() {
//   UART.write(uartNo, tareCharacter);
// }

// UART.setConfig(uartNo, {
//   baudRate: 115200,
//   esp32: {
//     gpio: {
//       rx: Cfg.get('pins.scale.rx'),
//       tx: Cfg.get('pins.scale.tx'),
//     },
//   },
// });

// UART.setDispatcher(uartNo, function (uartNo) {
//   let ra = UART.readAvail(uartNo);
//   if (ra > 0) {
//     let ud = UART.read(uartNo);
//     if (ud.at(0) === 123) {
//       let data = JSON.parse(ud);
//       AWS.Shadow.update(0, { reported: { temperature: data.t, weight: data.w } });
//     }
//   }
// }, null);

// AWS.Shadow.setStateHandler(function (data, event, reported, desired) {
//   if (event === AWS.Shadow.CONNECTED) {
//     triggerReading();
//   } else if (event === AWS.Shadow.UPDATE_DELTA) {
//     if (desired.tare) {
//       tareScale();
//     }
//     AWS.Shadow.update(0, { desired: null });  // Report device state
//   }
// }, null);

// UART.setRxEnabled(uartNo, true);