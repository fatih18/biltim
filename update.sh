#!/usr/bin/env bash
# Kisayol. Sunucuda:  cd /root/apps/biltim && bash update.sh
# Asil betik ve aciklamasi: Nucleus/deploy/update.sh
exec bash "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/Nucleus/deploy/update.sh" "$@"
