=============
The Shetphone
=============

Make and receive Twilio_-powered phone calls in your web browser.
Powered by Flask_ and Vue.js_, and largely derived from example code[1_] [2_] from Twilio Developer Education.
Icons by `Font Awesome`_, number formatting by libphonenumber-js_, styles mostly by Skeleton_.

.. _Twilio: https://www.twilio.com/
.. _Flask: http://flask.pocoo.org/
.. _Vue.js: https://vuejs.org/
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
    TWILIO_IDENTITY

The last one (``TWILIO_IDENTITY``) is required to match up incoming requests to those linked with the token we generate for ourselves.

From your Twilio account, you'll need to buy a phone number and hook it up to a TwiML app that sends voice requests to the ``/voice`` route.

Presets
=======

The Shetphone supports presets in case you need to call the same numbers frequently.
All you need to do is make a ``presets.csv`` file next to ``app.py`` that has three columns: alias, country code, and number.
See ``presets.csv.example`` for the format.
The numbers are served to the application via the ``/presets`` route, so if you wanted to get fancy you could change the code to read from another source pretty easily.

Running the server
==================

In your virtual environment, ``gunicorn app:app``.
Once that's done, stick an HTTP proxy in front of it and host it somewhere Twilio can see it.

Notes on deployment
===================

You probably want all routes except ``/voice`` to be restricted, otherwise anyone will be able to use your Shetphone.
The easiest way to achieve that is by setting up HTTP basic authentication in a proxy in front of the ``gunicorn`` server.

Why Shetphone?
==============

Because I'm in Shetland, I have no mobile signal, and I need a phone.

.. image:: https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Flag_of_Shetland.svg/200px-Flag_of_Shetland.svg.png
    :height: 120 px
    :width: 200 px
    :scale: 50 %
    :align: center
    :target: http://www.shetland.org/
