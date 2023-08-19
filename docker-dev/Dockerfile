FROM php:8.2.9-apache
COPY php.ini /usr/local/etc/php/
RUN apt-get update 
#RUN apt-get install -y libfreetype6-dev
#RUN apt-get install -y libjpeg62-turbo-dev
#RUN apt-get install -y libmcrypt-dev
#RUN apt-get install -y libpng-dev
#RUN docker-php-ext-install -j$(nproc) iconv
#RUN docker-php-ext-configure gd --with-freetype --with-jpeg
#RUN docker-php-ext-install -j$(nproc) gd
RUN a2enmod rewrite