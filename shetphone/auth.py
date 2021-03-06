# -*- coding: utf-8 -*-

from flask import Flask, abort, request, redirect, render_template, url_for
from flask_login import (
    LoginManager, UserMixin, current_user, login_required, login_user,
    logout_user,
)
from passlib.apache import HtpasswdFile

from shetphone import cfg


class User(UserMixin):
    def __init__(self, username):
        self.id = username

    @staticmethod
    def get(username):
        return User(username)


def init_app(app, socketio):
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "login"

    @login_manager.user_loader
    def load_user(username):
        return User.get(username)

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form['username']
            password = request.form['password']

            ht = HtpasswdFile(cfg['app'].get('htpasswd', '.htpasswd'))
            if ht.check_password(username, password):
                user = User.get(username)
                login_user(user, False)
                return redirect(url_for('index'))
            else:
                return abort(401)
        else:
            if current_user.is_authenticated:
                return redirect(url_for('index'))
            else:
                return render_template('login.html')

    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        socketio.emit('logout')
        return redirect(url_for('login'))
