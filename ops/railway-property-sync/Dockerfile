# Dedicated scheduled runner; do not reuse mail/scrape servers.
FROM alpine:3.22
RUN apk add --no-cache ca-certificates curl jq
COPY run.sh /app/run.sh
CMD ["/bin/sh", "/app/run.sh"]
