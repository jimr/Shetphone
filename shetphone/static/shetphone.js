(function() {
new Vue({
  el: '#shetphone',

  data: {
    countryPrefix: '44',
    currentNumber: '',
    formatter: null,
    muted: false,
    onPhone: false,
    online: false,
    incoming: null,
    connection: null,
    history: [],
    historyCount: 0,
    login_url: null,
    logout_url: null,
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

    $.getJSON('auth-urls').done(function(urls) {
      self.login_url = urls['login'];
      self.logout_url = urls['logout'];
    });

    self.fetchToken();

    $.getJSON('presets').done(function(data) {
      self.presets = data.presets;
    });

    Notification.requestPermission().then(function(result) {
      self.log('Desktop notifications ' + result);
    });

    // Set up a socket to handle call status change events from Twilio
    socket = io(
      location.protocol + '//' + document.domain + ':' + location.port,
      {path: location.pathname + 'socket.io/'}
    );

    socket.on('connect', function(message) {
      if (message !== undefined) {
        self.log('Socket connected as ' + message);
      }
    });

    socket.on('logout', function() {
      self.log('Logout detected.');
      self.fetchToken();
    });

    socket.on('disconnect', function() {
      self.log('Socket disconnected');
    });

    socket.on('status', function(data) {
      if (data['Direction'] === 'outbound-dial') {
        var status = data['CallStatus'];
        if (status === 'ringing') {
          self.log('[ringing]');
        } else if (status === 'in-progress') {
          self.log('[answered]');
        }
      }
    });

    self.socket = socket;

    // Configure event handlers for Twilio Device
    Twilio.Device.disconnect(function() {
      self.onPhone = false;
      self.connection = null;
      self.log('Disconnected')
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

    fetchToken: function() {
      var self = this;

      self.log('Fetching token...');

      $.getJSON('token').done(function(data) {
        Twilio.Device.setup(data.token);
        self.online = true;
      }).fail(function(err) {
        self.online = false;
        // If the token request fails because the user isn't logged in, let's
        // redirect them to the login page.
        if (err.status === 401) {
          window.location = self.login_url;
        } else {
          self.log('Could not fetch token, see console.log');
        }
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
          this.connection = Twilio.Device.connect({
            number: n,
            room: this.socket.id
          });
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
