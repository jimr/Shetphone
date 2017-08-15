# -*- coding: utf-8 -*-

import os

from flask import (
    Flask, Response, abort, jsonify, request, redirect, render_template,
    url_for,
)
from flask_login import current_user, login_required
from flask_socketio import SocketIO, disconnect, emit
from twilio.jwt.client import ClientCapabilityToken
from twilio.twiml.voice_response import VoiceResponse, Dial

from shetphone import auth
from shetphone import cfg
from shetphone import utils

app = Flask(__name__)
app.config['SECRET_KEY'] = cfg['app']['secret_key']
app.config['USE_SESSION_FOR_NEXT'] = True
app.config['DEBUG'] = cfg['app'].getboolean('debug')

socketio = SocketIO(app)
socketio.init_app(app)

auth.init_app(app, socketio)


@app.route('/')
@login_required
def index():
    return render_template('index.html')


@app.route('/presets')
def presets():
    if not current_user.is_authenticated:
        abort(401)

    if 'presets' in cfg:
        records = [
            {'name': name, 'number': number}
            for name, number in cfg['presets'].items()
        ]
    else:
        records = []

    return jsonify(presets=records)


@app.route('/token')
def token():
    if not current_user.is_authenticated:
        abort(401)

    account_sid = cfg['twilio']['account_sid']
    auth_token = cfg['twilio']['auth_token']
    application_sid = cfg['twilio']['application_sid']

    capability = ClientCapabilityToken(account_sid, auth_token, ttl=86400)
    capability.allow_client_outgoing(application_sid)
    capability.allow_client_incoming(current_user.id)
    token = capability.to_jwt()

    return jsonify(identity=current_user.id, token=token.decode('utf-8'))


@app.route("/voice", methods=['POST'])
def voice():
    resp = VoiceResponse()

    numbers = dict(cfg['numbers'].items())
    if 'clients' in cfg:
        clients = dict(cfg['clients'].items())
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


@app.errorhandler(404)
def page_not_found(e):
    routes = utils.get_routes(app)
    message = [
        '404 detected: {}'.format(request.url),
        'Registered routes:'
    ]
    app.logger.warn('\n'.join(message + routes))
    return render_template(
        'error.html', message='Page not found', code=404
    ), 404


@app.errorhandler(500)
def page_not_found(e):
    return render_template(
        'error.html', message='Server error', code=500
    ), 500
