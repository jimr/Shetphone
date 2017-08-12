#!/usr/bin/env python
# -*- coding: utf-8 -*-

from shetphone.app import app, socketio

if __name__ == '__main__':
    socketio.run(app)
