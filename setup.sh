#!/usr/bin/env bash

# Set up the virtual env.
virtualenv venv --distribute
source venv/bin/activate
pip install -r requirements.txt

# Set up the keys for the API/Flask.
read client_id -e -p 'Enter API client id: '
heroku config:set "API_CLIENT_ID=$client_id"

read client_secret -e -p 'Enter API client secret: '
heroku config:set "API_CLIENT_ID=$client_secret"

heroku config:set "FLASK_SECRET=`cat /dev/urandom | head -c 1 | md5sum - | awk '{print $1}'`"

# Put config in .env so foreman can use it.
heroku config | tail -n+2 > .env

# Create a new heroku app.
read app_name -e -p 'Enter app name (will be used for <name>.herokuapp.com): '
heroku create $app_name

# Push and open the app.
git push heroku master
heroku ps:scale web=1
heroku open
