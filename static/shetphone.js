(function() {
new Vue({
  el: '#shetphone',

  data: {
    countryPrefix: '44',
    currentNumber: '',
    formatter: null,
    muted: false,
    onPhone: false,
    connection: null,
    incoming: null,
    history: [],
    historyCount: 0,
    online: false,
    countries: [
      { name: 'United States', prefix: '1', code: 'US' },
      { name: 'Great Britain', prefix: '44', code: 'GB' },
      { name: 'Colombia', prefix: '57', code: 'CO' },
      { name: 'Ecuador', prefix: '593', code: 'EC' },
      { name: 'Estonia', prefix: '372', code: 'EE' },
      { name: 'Germany', prefix: '49', code: 'DE' },
      { name: 'Hong Kong', prefix: '852', code: 'HK' },
      { name: 'Ireland', prefix: '353', code: 'IE' },
      { name: 'Singapore', prefix: '65', code: 'SG' },
      { name: 'Spain', prefix: '34', code: 'ES' },
      { name: 'Brazil', prefix: '55', code: 'BR' },
    ],
    presets: []
  },

  created: function() {
    var self = this;

    self.formatter = new libphonenumber.asYouType();

    self.setup();

    // Configure event handlers for Twilio Device
    Twilio.Device.disconnect(function() {
      self.onPhone = false;
      self.connection = null;
      self.log('Call ended');
    });

    Twilio.Device.connect(function(connection) {
      self.incoming = null;
      self.onPhone = true;
      var number = self.getNumber(connection);
    });

    Twilio.Device.incoming(function (connection) {
      var number = self.getNumber(connection);
      var message = 'Incoming call from ' + self.formatNumber(number);
      self.incoming = connection;
      self.log(message);
      self.notify(message);
    });

    Twilio.Device.cancel(function() {
      self.incoming = null;
      self.log('Call cancelled');
    });

    Twilio.Device.ready(function() {
      self.online = true;
      self.log('Online');
    });

    Twilio.Device.offline(function(device) {
      self.online = false;
      self.log('Offline');
    });

    Twilio.Device.error(function (e) {
      self.log('Error: ' + e.message);
    });

    // respond to keyboard input 
    document.addEventListener('keydown', function(event) {
      var buttons = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
      if ($('input[type=tel]').is(':focus')) {
        if (event.key === 'Escape') {
          self.clear();
        } else {
          // Reformat phone number as the user types. Might be annoying if they
          // try to put their own spaces in. It also won't let you type an
          // invalid number for that country. Let's hope it's never wrong!
          self.formatter.reset();
          self.formatter.reset_country(self.countryCode);
          self.formatter.input(self.fullNumber);
          self.currentNumber = self.formatter.format_national_phone_number('');
        }
      } else if (self.onPhone && buttons.indexOf(event.key) >= 0) {
        self.sendDigit(event.key);
      }
    });
  },

  computed: {
    status: function() {
      return this.history[0];
    },

    validPhone: function() {
      try {
        return libphonenumber.isValidNumber(this.fullNumber);
      } catch(err) {
        return false;
      }
    },

    fullNumber: function() {
      return '+' + this.countryPrefix + this.currentNumber;
    },

    countryCode: function() {
      var self = this;
      return this.countries.find(function(country) {
        return country.prefix === self.countryPrefix;
      }).code;
    },

    ringing: function() {
      if (this.incoming !== null) {
        return this.incoming.status() !== "closed";
      }
      return false;
    },

    canConnect: function() {
      if (!this.online) {
        return false;
      } else if (this.incoming !== null) {
        return this.incoming.status() === "pending";
      } else if (this.connection === null) {
        return this.validPhone;
      } else {
        return false;
      }
    }
  },

  methods: {
    log: function(message) {
      this.historyCount++;
      this.history.unshift({date: new Date(), message: message });
      while (this.history.length > 10) {
        this.history.pop();
      }
    },

    formatNumber: function(number) {
      try {
        var country = libphonenumber.parse(number).country;
        formatted = libphonenumber.format(number, country, 'International');
        return formatted;
      } catch(err) {
        return number;
      }
    },

    setup: function() {
      var self = this;

      Notification.requestPermission().then(function(result) {
        self.log('Desktop notifications ' + result);
      });

      self.log('Connecting...');

      // Fetch Twilio capability token from the server
      $.getJSON('token').done(function(data) {
        Twilio.Device.setup(data.token);
        self.online = true;
      }).fail(function(err) {
        console.log(err);
        self.log('Could not fetch token, see console.log');
      });

      $.getJSON('presets').done(function(data) {
        self.presets = data.presets;
      });
    },

    // Handle country code selection
    selectCountry: function(country) {
      this.countryPrefix = country.prefix;
    },

    // Handle muting
    toggleMute: function() {
      this.muted = !this.muted;
      Twilio.Device.activeConnection().mute(this.muted);
    },

    loadPreset: function() {
      var preset = this.presets[$('select[name=preset]').val()];

      this.currentNumber = preset.number;
      this.countryPrefix = preset.prefix;
      this.log('Loaded preset "' + preset.name + '"');
    },

    clear: function() {
      this.currentNumber = '';
      this.countryPrefix = '44';
    },

    // Make an outbound call with the current number or answer an incoming call
    connect: function() {
      if (!this.onPhone) {
        this.muted = false;
        this.onPhone = true;

        if (this.ringing) {
          this.connection = this.incoming;
          this.connection.accept();
        } else {
          var n = this.fullNumber;
          this.log('Calling ' + this.formatNumber(n));
          this.connection = Twilio.Device.connect({ number: n });
        }
      }
    },
    
    disconnect: function() {
      // hang up call in progress / decline incoming call
      if (this.ringing) {
        this.incoming.reject();
        this.incoming = null;
      }
      Twilio.Device.disconnectAll();
    },

    // Handle numeric buttons
    sendDigit: function(digit) {
      this.pressButton(digit);
      this.connection.sendDigits(digit);
    },

    getNumber: function(connection) {
      var number = null;
      if (connection.message) {
        number = connection.message.number;;
      }
      if (!number) {
        number = connection.parameters['From'];
      }
      return number;
    },

    notify: function(body) {
      var self = this;
      var options = {
        body: body,
        icon: 'static/shetphone.png'
      };
      var n = new Notification('The Shetphone', options);
      n.onclick = function(event) {
        self.connect();
      };
    },

    // add a fake 'active' state when responding to keyboard input
    pressButton: function(digit) {
      var button = '#';
      if (!isNaN(digit)) {
        button += 'num' + digit;
      } else {
        if (digit === '#') {
          button += 'hash';
        } else if (digit === '*') {
          button += 'asterisk';
        }
      }
      // we use a CSS animation to fade in / out so we have to wait until it's
      // done before removing the class
      $(button).addClass('active').delay(750).queue(
        function(next) {
          $(this).removeClass('active');
          next();
        }
      );
    }
  }
});
})();
