(function() {
new Vue({
  el: '#shetphone',

  data: {
    countryCode: '44',
    currentNumber: '',
    muted: false,
    onPhone: false,
    connection: null,
    incoming: null,
    log: 'connecting...',
    countries: [
      { name: 'United States', cc: '1', code: 'us' },
      { name: 'Great Britain', cc: '44', code: 'gb' },
      { name: 'Colombia', cc: '57', code: 'co' },
      { name: 'Ecuador', cc: '593', code: 'ec' },
      { name: 'Estonia', cc: '372', code: 'ee' },
      { name: 'Germany', cc: '49', code: 'de' },
      { name: 'Hong Kong', cc: '852', code: 'hk' },
      { name: 'Ireland', cc: '353', code: 'ie' },
      { name: 'Singapore', cc: '65', code: 'sg' },
      { name: 'Spain', cc: '34', code: 'es' },
      { name: 'Brazil', cc: '55', code: 'br' },
    ],
    presets: []
  },

  created: function() {
    var self = this;

    self.setup();

    // Configure event handlers for Twilio Device
    Twilio.Device.disconnect(function() {
      self.onPhone = false;
      self.connection = null;
      self.log = 'call ended';
    });

    Twilio.Device.connect(function(connection) {
      self.incoming = null;
      self.onPhone = true;
      self.log = 'connected to ' + connection.parameters['From'];
    });

    Twilio.Device.incoming(function (connection) {
      self.log = 'incoming call from ' + connection.parameters['From'];
      self.incoming = connection;
    });

    Twilio.Device.cancel(function() {
      self.incoming = null;
      self.log = 'ready';
    });

    Twilio.Device.ready(function() {
      self.log = 'ready';
    });
  },

  computed: {
    // Computed property to validate the current phone number
    validPhone: function() {
      try {
        return /^([0-9]|#|\*)+$/.test(this.currentNumber.replace(/[-()\s]/g,''));
      } catch(err) {
        return false;
      }
    },
    ringing: function() {
      if (this.incoming !== null) {
        return this.incoming.status() !== "closed";
      }
      return false;
    },
    canConnect: function() {
      if (this.incoming !== null) {
        return this.incoming.status() === "pending";
      } else if (this.connection === null) {
        return this.validPhone;
      } else {
        return false;
      }
    }
  },

  methods: {
    setup: function() {
      this.log = 'connecting...';
      window.app = this;

      // Fetch Twilio capability token from the server
      $.getJSON('token').done(function(data) {
        Twilio.Device.setup(data.token);
      }).fail(function(err) {
        console.log(err);
        window.app.log = 'could not fetch token, see console.log';
      });

      $.getJSON('presets').done(function(data) {
        window.app.presets = data.presets;
      });
    },

    // Handle country code selection
    selectCountry: function(country) {
      this.countryCode = country.cc;
    },

    // Handle muting
    toggleMute: function() {
      this.muted = !this.muted;
      Twilio.Device.activeConnection().mute(this.muted);
    },

    loadPreset: function() {
      var preset = this.presets[$('select[name=preset]').val()];
      this.currentNumber = preset.number;
      this.countryCode = preset.cc;
    },

    reset: function() {
      this.currentNumber = '';
      this.countryCode = '44';
    },

    // Make an outbound call with the current number,
    // or hang up the current call
    connect: function() {
      if (!this.onPhone) {
        this.muted = false;
        this.onPhone = true;

        if (this.ringing) {
          this.connection = this.incoming;
          this.connection.accept();
        } else {
          // make outbound call with current number
          var n = '+' + this.countryCode + this.currentNumber.replace(/\D/g, '');
          this.connection = Twilio.Device.connect({ number: n });
          this.log = 'calling ' + n;
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
      this.connection.sendDigits(digit);
    },
  }
});

})();
