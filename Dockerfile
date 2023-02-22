FROM node:18-slim

ENV DEBIAN_FRONTEND noninteractive

# Fonts as packages
RUN echo "deb http://httpredir.debian.org/debian buster main contrib non-free" > /etc/apt/sources.list \
    && echo "deb http://httpredir.debian.org/debian buster-updates main contrib non-free" >> /etc/apt/sources.list \
    && echo "deb http://security.debian.org/ buster/updates main contrib non-free" >> /etc/apt/sources.list \
    && echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections \
    && apt-get update

RUN apt-get install -y \
        wget \
        fonts-arphic-ukai \
        fonts-arphic-uming \
        fonts-ipafont-mincho \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-ipafont-gothic \
        fonts-unfonts-core \
        ttf-wqy-zenhei \
        ttf-mscorefonts-installer \
        fonts-freefont-ttf \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

## Fonts from google
#RUN wget -O /tmp/master.tar.gz "https://github.com/google/fonts/archive/main.tar.gz" -q --progress=bar; \
#    mkdir -p /tmp/google-fonts/fonts; \
#    tar -zxf /tmp/master.tar.gz -C /tmp/google-fonts/fonts; \
#    find /tmp/google-fonts/fonts/ -type f -name "*.ttf" -exec cp {} "/usr/local/share/fonts/" \\\;; \
#    rm -f /tmp/master.tar.gz; \
#    rm -rf /tmp/google-fonts;


WORKDIR /app/www
RUN mkdir -p /opt/bin && chmod +x /dev/shm

COPY ./dist /app/www/dist
COPY ./config.json /app/www
COPY ./package.json /app/www
COPY ./package-lock.json /app/www

#ENV ULX_DEBUG true
#ENV DEBUG true
ENV NODE_ENV production
ENV ULX_NO_CHROME_SANDBOX true

RUN npm install -g npm@latest
RUN npm config set update-notifier false
RUN npm install --production

RUN sh $(npx install-browser-deps)

EXPOSE 8080
CMD ["npm", "run", "start"]