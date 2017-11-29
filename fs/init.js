load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_net.js');
load('api_sys.js');
load('api_timer.js');
load('api_uart.js');

let uartNo = 1;
let button = Cfg.get('pins.button');
let scaleRxPin  = Cfg.get('pins.scale.rx');
let scaleTxPin  = Cfg.get('pins.scale.tx');
let topic = '/devices/' + Cfg.get('device.id') + '/events';
let setupActive = false;

function tareScale() {
  UART.write(uartNo, 'x');
  UART.write(uartNo, '1');
  UART.write(uartNo, 'x');
  UART.write(uartNo, 'x');
  Timer.set(5000, false, function() {
    setupActive = false;
  }, null)
}

MQTT.sub('/scale/tare', function(conn, topic, msg) {
  setupActive = true;
  print(setupActive);
  tareScale();
}, null);


// Publish to MQTT topic on a button press. Button is wired to GPIO pin 0
GPIO.set_button_handler(button, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 200, function() {
  tareScale();
  // let message = 'message';
  // let ok = MQTT.pub(topic, message, 1);
  // print('Published:', ok, topic, '->', message);
}, null);

// Configure UART at 115200 baud
UART.setConfig(uartNo, {
  baudRate: 115200,
  esp32: {
    gpio: {
      rx: scaleRxPin,
      tx: scaleTxPin,
    },
  },
});

// Set dispatcher callback, it will be called whenver new Rx data or space in
// the Tx buffer becomes available

UART.setDispatcher(uartNo, function(uartNo) {
  let ra = UART.readAvail(uartNo);
  if (ra > 0 && !setupActive) {
    let data = JSON.parse(UART.read(uartNo));
    let dataa = UART.read(uartNo);
    print(dataa);
    let ok = MQTT.pub(topic, JSON.stringify({weight: data.w}), 1);
  }
}, null);

// Enable Rx
UART.setRxEnabled(uartNo, true);
                                  