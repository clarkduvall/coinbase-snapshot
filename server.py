import os

import requests

from flask import Flask
from flask import redirect
from flask import render_template
from flask import request
from flask import session
from flask import url_for

app = Flask(__name__, static_url_path='/s', static_folder='static')
app.secret_key = os.environ['FLASK_SECRET']

ACCESS_TOKEN_URL = '<API ACCESS TOKEN ENDPOINT HERE>'
API_CLIENT_ID = os.environ['API_CLIENT_ID']
API_CLIENT_SECRET = os.environ['API_CLIENT_SECRET']


@app.route('/callback')
def callback():
    # Customize this code depending on Oauth API.
    response = requests.post(ACCESS_TOKEN_URL, params={
        'grant_type': 'authorization_code',
        'client_id': API_CLIENT_ID,
        'client_secret': API_CLIENT_SECRET,
        'code': request.args.get('code', '')
    }, headers={'Accept': 'application/json'})

    if response.ok:
        session['access_token'] =  response.json()['access_token']

    return redirect(url_for('.index'))


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('.index'))


@app.route('/')
@app.route('/<path:path>')
def index(path=None):
    return render_template('index.html',
                           token=session.get('access_token', ''),
                           client_id=API_CLIENT_ID)
