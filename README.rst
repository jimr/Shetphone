=============
The Shetphone
=============

Make and receive Twilio_-powered phone calls in your web browser.
Powered by Flask_ + Flask-Login_, Vue.js_, and Socket.io_ + Flask-SocketIO_.
Icons by `Font Awesome`_, number validation & formatting by libphonenumber-js_, styles mostly by Skeleton_.
Originally derived from example code[1_] [2_] from Twilio Developer Education.

.. _Twilio: https://www.twilio.com/
.. _Flask: http://flask.pocoo.org/
.. _Flask-Login: https://flask-login.readthedocs.io/en/latest/
.. _Vue.js: https://vuejs.org/
.. _Socket.io: https://socket.io/
.. _Flask-SocketIO: https://flask-socketio.readthedocs.io/en/latest/
.. _`Font Awesome`: http://fontawesome.io/
.. _libphonenumber-js: https://github.com/catamphetamine/libphonenumber-js
.. _Skeleton: http://getskeleton.com/
.. _1: https://github.com/TwilioDevEd/clicktocall-flask
.. _2: https://github.com/TwilioDevEd/browser-dialer-vue

Installation
============

Make a virtual environment and ``pip install -r requirements.txt`` in it.

Setup
=====

In order for the code to work, you'll need to define the following environment variables::

    TWILIO_ACCOUNT_SID
    TWILIO_AUTH_TOKEN
    TWILIO_APP_SID
    TWILIO_NUMBER

From your Twilio account, you'll need to buy a phone number and hook it up to a TwiML app that sends voice requests to the ``/voice`` route.

Running the server
==================

First, copy ``uwsgi.ini.example`` to ``uwsgi.ini`` and edit as required.
Then, in your virtual environment, run ``uwsgi --ini uwsgi.ini``.
Once that's done, stick an HTTP proxy in front of it and host it somewhere Twilio can see it.
I've included an example NGINX configuration file that covers how to set up all the various routes, including the websockets.

Notes on deployment
===================

User authentication is via an ``.htpasswd`` file that you need to put next to ``app.py``.
The file can be created with the ``htpasswd`` command as you would to use with Apache HTTPD or NGINX.
Users are authenticated against this using PassLib_.

.. _PassLib: http://passlib.readthedocs.io/en/stable/

Presets
=======

The Shetphone supports presets in case you need to call the same numbers frequently.
All you need to do is make a ``presets.csv`` file next to ``app.py`` that has three columns: alias, country code, and number.
See ``presets.csv.example`` for the format.
The numbers are served to the application via the ``/presets`` route, so if you wanted to get fancy you could change the code to read from another source pretty easily.

Why Shetphone?
==============

Because I'm in Shetland, I have no mobile signal, and I need a phone.

.. image:: https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Flag_of_Shetland.svg/200px-Flag_of_Shetland.svg.png
    :height: 120 px
    :width: 200 px
    :scale: 50 %
    :align: center
    :target: http://www.shetland.org/
