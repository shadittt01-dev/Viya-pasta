#!/bin/sh
# Self-host the three open-licensed (SIL OFL 1.1) fonts used by the design.
# Run once on a machine with internet access, then commit public/fonts/.
# Until this runs, the site uses locally installed copies or system fonts.
set -eu
cd "$(dirname "$0")/../public/fonts"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
CSS_URL="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Readex+Pro:wght@160..700&family=IBM+Plex+Mono:wght@400;500&display=swap"
curl -fsSL -A "$UA" "$CSS_URL" -o google.css
# download every woff2 the stylesheet references and rewrite URLs to local files
grep -o 'https://fonts.gstatic.com/[^)]*\.woff2' google.css | sort -u | while read -r url; do
  f="$(echo "$url" | sed 's#.*/##')"
  [ -f "$f" ] || curl -fsSL "$url" -o "$f"
done
sed 's#https://fonts.gstatic.com/[^)]*/\([^/)]*\.woff2\)#\1#g' google.css > fonts.css
rm google.css
echo "Fonts self-hosted in public/fonts (licence: SIL Open Font License 1.1)."
