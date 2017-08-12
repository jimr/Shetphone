=============
The Shetphone
=============

Turn your web browser into a telephone with The Shetphone!
Powered by Twilio_, Flask_ , Vue.js_, and Socket.io_.
Icons by `Font Awesome`_, number validation & formatting by libphonenumber-js_, styles mostly by Skeleton_.
Originally derived from example code[1_] [2_] from Twilio Developer Education.

.. _Twilio: https://www.twilio.com/
.. _Flask: http://flask.pocoo.org/
.. _Vue.js: https://vuejs.org/
.. _Socket.io: https://socket.io/
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

First things first, copy ``shetphone.ini.example`` to ``shetphone.ini`` and set a ``secret_key`` in the ``[app]`` section.

The ``[uwsgi]`` section should work well with the provided example NGINX configuration.

Twilio
------

You need to set the following entries in the ``[twilio]`` section of your ``shetphone.ini``::

    account_sid = <your account>
    app_sid = <your app>
    auth_token = <your auth token>

With your Twilio account, you'll need to buy a phone number and hook it up to a TwiML app that sends voice requests to the ``/voice`` route.

The ``[numbers]`` section of ``shetphone.ini`` is required so we know which clients to map incoming calls to (keys are unformated numbers, values are user IDs).
We only route incoming calls to one client; you need to make sure your client IDs match up to the users in your ``.htpasswd`` file.

When making outgoing calls, we use the optional ``[clients]`` section to pick outgoing caller IDs (keys are user IDs, values are numbers).
If this section isn't defined, we take ``[numbers]`` and swap the keys & values around.

Presets
-------

The Shetphone supports presets in case you need to call the same numbers frequently.
All you need to do is make a ``[presets]`` section in your ``shetphone.ini`` and set the keys to be the preset alias (e.g "Mum") and the value to be a number, complete with international dialling prefix (e.g. ``+1 555 123 4567``).
The numbers are served to the application via the ``/presets`` route, so if you wanted to get fancy you could change the code to read from another source pretty easily.

Authentication
--------------

User authentication is via an ``.htpasswd`` file that you need to put next to ``app.py``.
If you want to read it from somewhere else, you can set ``htpasswd`` in the ``[app]`` section of your ``shetphone.ini``.
The file can be created with the ``htpasswd`` command as you would to use with Apache HTTPD or NGINX.
Users are authenticated against this using PassLib_.

.. _PassLib: http://passlib.readthedocs.io/en/stable/

Running the server
==================

In your virtual environment, run ``uwsgi --ini shetphone.ini``.
Once that's done, stick an HTTP server in front of it and host it somewhere Twilio can see it.
I've included an example NGINX configuration file that covers how to set up all the various routes, including the websockets.

If you're developing, you might find it easier to just run ``python run.py`` which will kick off a local server on port ``5000``.
In order to get this to talk to Twilio, you'll need to use a proxy service such as ngrok_.

.. _ngrok: https://ngrok.com/

TODO
====

* Validate presets and incoming / outgoing numbers on load
* Might be useful to pass incoming calls to more than one client. Not my use-case, but Twilio supports it.
* Allow multiple outgoing caller IDs per connected client, maybe switching between them depending on the country of the target.

Why Shetphone?
==============

Because I'm in Shetland, I have no mobile signal, and I need a phone.

.. image:: https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Flag_of_Shetland.svg/200px-Flag_of_Shetland.svg.png
    :height: 120 px
    :width: 200 px
    :scale: 50 %
    :align: center
    :target: http://www.shetland.org/
