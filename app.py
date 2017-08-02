#!/usr/bin/env python

import csv
import os
import re

from flask import Flask, jsonify, request, Response
from twilio.jwt.client import ClientCapabilityToken
from twilio.twiml.voice_response import VoiceResponse, Dial

app = Flask(__name__)
phone_pattern = re.compile(r"^[\d\+\-\(\) ]+$")
ttl = 86400
my_number = os.getenv('TWILIO_NUMBER')
identity = os.getenv('TWILIO_IDENTITY')


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/presets', methods=['GET'])
def presets():
    records = []
    if os.path.exists('presets.csv'):
        with open('presets.csv', 'rb') as csvfile:
            reader = csv.reader(csvfile, delimiter=',')
            for i, row in enumerate(reader):
                records.append(
                    dict(index=i, name=row[0], cc=row[1], number=row[2])
                )
    return jsonify(presets=records)


@app.route('/token', methods=['GET'])
def token():
    # get credentials for environment variables
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    application_sid = os.getenv('TWILIO_APP_SID')

    capability = ClientCapabilityToken(account_sid, auth_token, ttl=ttl)
    capability.allow_client_outgoing(application_sid)
    capability.allow_client_incoming(identity)
    token = capability.to_jwt()

    # Return token info as JSON
    return jsonify(identity=identity, token=token.decode('utf-8'))


@app.route("/voice", methods=['POST'])
def voice():
    resp = VoiceResponse()

    def for_me(form):
        return'From' in form and 'To' in form and form['To'] == my_number

    if "number" in request.form and request.form["number"] != '':
        dial = Dial(caller_id=my_number)
        if phone_pattern.match(request.form["number"]):
            dial.number(request.form["number"])
        else:
            dial.client(request.form["number"])
        resp.append(dial)
    elif for_me(request.form):
        dial = Dial()
        dial.client(identity)
        resp.append(dial)
    else:
        resp.say("We are unable to connect your call at this time.")

    return Response(str(resp), mimetype='text/xml')
