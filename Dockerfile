FROM node:14-slim

# Fonts as packages
RUN echo "deb http://httpredir.debian.org/debian buster main contrib non-free" > /etc/apt/sources.list \
    && echo "deb http://httpredir.debian.org/debian buster-updates main contrib non-free" >> /etc/apt/sources.list \
    && echo "deb http://security.debian.org/ buster/updates main contrib non-free" >> /etc/apt/sources.list \
    && echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections \
    && apt-get update \
    && apt-get install -y \
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
    && rm -rf /var/lib/apt/lists/* \
    && apt update

# Fonts from google
RUN wget -O /tmp/master.tar.gz "https://github.com/google/fonts/archive/main.tar.gz" -q --progress=bar; \
    mkdir -p /tmp/google-fonts/fonts; \
    tar -zxf /tmp/master.tar.gz -C /tmp/google-fonts/fonts; \
    find /tmp/google-fonts/fonts/ -type f -name "*.ttf" -exec cp {} "/usr/local/share/fonts/" \\\;; \
    rm -f /tmp/master.tar.gz; \
    rm -rf /tmp/google-fonts;

# Install Go for MITM sockets
RUN set -eux; \
	wget -O go.tgz "https://golang.org/dl/go1.14.2.linux-amd64.tar.gz" -q --progress=bar; \
	tar -C /usr/local -xzf go.tgz; \
	rm go.tgz; \
	export PATH="/usr/local/go/bin:$PATH"; \
	go version
ENV GOPATH /go
ENV PATH $GOPATH/bin:/usr/local/go/bin:$PATH
RUN mkdir -p "$GOPATH/src" "$GOPATH/bin" && chmod -R 777 "$GOPATH"

RUN npm install -g npm

WORKDIR /app/www
COPY ./ /app/www

ENV NODE_ENV build
RUN npm config set update-notifier false; \
    npm install;

RUN sh $(npx install-browser-deps)

ENV NODE_ENV production
RUN npm run build; \
    npm install;

EXPOSE 8080

ENV SA_SHOW_REPLAY=0
CMD ["npm", "run", "start"]