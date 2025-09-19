FROM php:8.3.22RC1-apache
COPY php.ini /usr/local/etc/php/
RUN apt-get update && apt-get install -y \
    libc-client-dev \
    libkrb5-dev \
    && docker-php-ext-configure imap --with-kerberos --with-imap-ssl \
    && docker-php-ext-install imap \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
RUN a2enmod rewrite