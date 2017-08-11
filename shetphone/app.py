# -*- coding: utf-8 -*-

import csv
import os

from backports.configparser import ConfigParser

from flask import Flask, jsonify, request, Response, redirect, url_for, abort
from flask_login import current_user, login_required
from flask_socketio import SocketIO, disconnect, emit
from twilio.jwt.client import ClientCapabilityToken
from twilio.twiml.voice_response import VoiceResponse, Dial

from shetphone import auth

cfg = ConfigParser()
cfg.read('shetphone.ini')

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['USE_SESSION_FOR_NEXT'] = True

socketio = SocketIO(app)
socketio.init_app(app)

auth.init_app(app, socketio)


@app.route('/')
@login_required
def index():
    return app.send_static_file('index.html')


@app.route('/presets')
def presets():
    if not current_user.is_authenticated:
        abort(401)

    records = []
    if os.path.exists('presets.csv'):
        with open('presets.csv', 'rb') as csvfile:
            reader = csv.reader(csvfile, delimiter=',')
            for i, row in enumerate(reader):
                records.append(
                    dict(index=i, name=row[0], prefix=row[1], number=row[2])
                )
    return jsonify(presets=records)


@app.route('/auth-urls')
def auth_urls():
    return jsonify(
        login=url_for('login'),
        logout=url_for('logout'),
    )


@app.route('/token')
def token():
    if not current_user.is_authenticated:
        abort(401)

    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    application_sid = os.getenv('TWILIO_APP_SID')

    capability = ClientCapabilityToken(account_sid, auth_token, ttl=86400)
    capability.allow_client_outgoing(application_sid)
    capability.allow_client_incoming(current_user.id)
    token = capability.to_jwt()

    return jsonify(identity=current_user.id, token=token.decode('utf-8'))


@app.route("/voice", methods=['POST'])
def voice():
    resp = VoiceResponse()

    numbers = dict(cfg['shetphone:numbers'].items())
    if 'shetphone:clients' in cfg:
        clients = dict(cfg['shetphone:clients'].items())
    else:
        # If preferred client -> number maps aren't provided, we just flip the
        # number -> client map around, possibly clobbering some numbers if
        # clients have more than one assigned.
        clients = dict([(y, x) for (x, y) in numbers.items()])

    if 'number' in request.form and 'room' in request.form:
        number = request.form['From'].split(':')[1]
        # Status callback events are routed to initiating clients
        callback_url = url_for(
            'status', room=request.form['room'], _external=True,
        )

        dial = Dial(caller_id=clients[number], answer_on_bridge=True)
        dial.number(
            request.form["number"],
            status_callback=callback_url,
            status_callback_event='initiated ringing answered completed',
        )
        resp.append(dial)
    elif request.form['To'] in numbers:
        dial = Dial()
        dial.client(numbers[request.form['To']])
        resp.append(dial)
    else:
        resp.say("We are unable to connect your call at this time.")

    return Response(str(resp), mimetype='text/xml')


@app.route("/status/<room>", methods=['POST'])
def status(room):
    # `room` is the unique session ID for the client that initiated the call
    socketio.emit('status', request.form, room=room)
    return Response('ok')


@socketio.on('connect')
def connect_handler():
    if current_user.is_authenticated:
        emit('connect', current_user.id)
    else:
        disconnect()
