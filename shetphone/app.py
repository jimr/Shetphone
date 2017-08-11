# -*- coding: utf-8 -*-

import csv
import os

from flask import Flask, jsonify, request, Response, redirect, url_for, abort
from flask_login import current_user, login_required
from flask_socketio import SocketIO, emit
from twilio.jwt.client import ClientCapabilityToken
from twilio.twiml.voice_response import VoiceResponse, Dial

from shetphone import auth

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
    my_number = os.getenv('TWILIO_NUMBER')

    def for_me(form):
        return'From' in form and 'To' in form and form['To'] == my_number

    if "number" in request.form and request.form["number"] != '':
        dial = Dial(caller_id=my_number, answer_on_bridge=True)
        dial.number(
            request.form["number"],
            status_callback=url_for('status', _external=True),
            status_callback_event='initiated ringing answered completed',
        )
        resp.append(dial)
    elif for_me(request.form):
        dial = Dial()
        dial.client(current_user.id)
        resp.append(dial)
    else:
        resp.say("We are unable to connect your call at this time.")

    return Response(str(resp), mimetype='text/xml')


@app.route("/status", methods=['POST'])
def status():
    socketio.emit('status', request.form)
    return Response('ok')


@socketio.on('connect')
def connect_handler():
    if current_user.is_authenticated:
        emit('connect', current_user.id)
    else:
        return False
