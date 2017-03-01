FROM debian:jessie

# properly setup debian sources
ENV DEBIAN_FRONTEND noninteractive
RUN echo "deb http://http.debian.net/debian jessie main\n\
deb-src http://http.debian.net/debian jessie main\n\
deb http://http.debian.net/debian jessie-updates main\n\
deb-src http://http.debian.net/debian jessie-updates main\n\
deb http://security.debian.org jessie/updates main\n\
deb-src http://security.debian.org jessie/updates main\n\
" > /etc/apt/sources.list
RUN apt-get update -qq && \
    # install package building helpers
    apt-get -y --force-yes --fix-missing install dpkg-dev debhelper && \
    apt-get -y build-dep pure-ftpd && \
    cd /tmp && apt-get source pure-ftpd && \
    cd pure-ftpd-* && \
    sed -i '/^optflags=/ s/$/ --without-capabilities/g' ./debian/rules && \
    sed -i 's/ --with-largefile//g' ./debian/rules && \
    ./configure --without-capabilities --disable-largefile && \
    dpkg-buildpackage -b -uc && \
    dpkg -i /tmp/pure-ftpd-common*.deb && \
    apt-get -y install openbsd-inetd && \
    dpkg -i /tmp/pure-ftpd_*.deb && \
    apt-mark hold pure-ftpd pure-ftpd-common && \
    rm -rf /tmp/* && \
    groupadd ftpgroup && \
    useradd -g ftpgroup -d /dev/null -s /etc ftpuser && \
    mkdir -p /home/ftpusers/travis && \
    (echo travis; echo travis) | pure-pw useradd travis -d /home/ftpusers/travis -u ftpuser && \
    pure-pw mkdb

RUN chown -hR ftpuser:ftpgroup /home/ftpusers
CMD pure-ftpd -c 1 -C 5 -l puredb:/etc/pure-ftpd/pureftpd.pdb -Ep 30000:30009
