import os

import requests

from flask import Flask
from flask import jsonify
from flask import redirect
from flask import render_template
from flask import request
from flask import session
from flask import url_for

app = Flask(__name__, static_url_path='/s', static_folder='static')
app.secret_key = os.environ['FLASK_SECRET']

ACCESS_TOKEN_URL = 'https://coinbase.com/oauth/token'
API_CLIENT_ID = os.environ['API_CLIENT_ID']
API_CLIENT_SECRET = os.environ['API_CLIENT_SECRET']
REDIRECT_URL = os.environ['REDIRECT_URL']


@app.route('/callback')
def callback():
    # Customize this code depending on Oauth API.
    response = requests.post(ACCESS_TOKEN_URL, params={
        'grant_type': 'authorization_code',
        'client_id': API_CLIENT_ID,
        'client_secret': API_CLIENT_SECRET,
        'code': request.args.get('code', ''),
        'redirect_uri': REDIRECT_URL
    })

    if response.ok:
        session['access_token'] =  response.json()['access_token']
        session['refresh_token'] =  response.json()['refresh_token']

    return redirect(url_for('.index'))


@app.route('/refresh')
def refresh():
    response = requests.post(ACCESS_TOKEN_URL, params={
        'grant_type': 'refresh_token',
        'client_id': API_CLIENT_ID,
        'client_secret': API_CLIENT_SECRET,
        'refresh_token': session.get('refresh_token', ''),
        'redirect_uri': REDIRECT_URL
    })

    access_token = None
    if response.ok:
        json_response = response.json()
        access_token = json_response['access_token']
        session['access_token'] = access_token
        session['refresh_token'] =  json_response['refresh_token']

    return jsonify(access_token=access_token)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('.index'))


@app.route('/')
@app.route('/<path:path>')
def index(path=None):
    return render_template('index.html',
                           token=session.get('access_token', ''),
                           redirect_url=REDIRECT_URL,
                           client_id=API_CLIENT_ID)
