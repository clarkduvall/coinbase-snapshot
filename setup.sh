#!/usr/bin/env bash

# Set up the virtual env.
virtualenv venv --distribute
source venv/bin/activate
pip install -r requirements.txt

# Create a new heroku app.
read -p 'Enter app name (will be used for <name>.herokuapp.com): ' app_name
heroku create $app_name

# Set up the keys for the API/Flask.
read -p 'Enter API client id: ' client_id
heroku config:set "API_CLIENT_ID=$client_id"

read -p 'Enter API client secret: ' client_secret
heroku config:set "API_CLIENT_ID=$client_secret"

heroku config:set "FLASK_SECRET=`cat /dev/urandom | head -c 1 | md5sum - | awk '{print $1}'`"

# Put config in .env so foreman can use it.
heroku config | tail -n+2 > .env

# Push and open the app.
git push heroku master
heroku ps:scale web=1
heroku open
