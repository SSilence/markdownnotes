FROM php:8.2.1-apache
LABEL maintainer="Tobias Zeising <tobias.zeising@aditu.de>"
RUN apt-get update
RUN a2enmod rewrite
ADD dist /var/www/html
RUN rm -rf /var/www/html/data