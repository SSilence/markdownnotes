FROM php:8.4-apache
COPY php.ini /usr/local/etc/php/
RUN apt-get update && \
    apt-get install -y \
        unzip \
        git \
        libssl-dev \
        libzip-dev \
        zip \
    && docker-php-ext-install zip \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN a2enmod rewrite