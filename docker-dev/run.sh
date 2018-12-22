#!/bin/sh
docker build -t php-dev-image .
docker run -v $PWD/../:/var/www/html -p 80:80 php-dev-image