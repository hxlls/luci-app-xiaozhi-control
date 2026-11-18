#!/bin/sh
# 下载 IEEE OUI 库，提取精简版到 /tmp/oui.csv（给 routerapi 查厂商）
# 开机由 init 脚本调用，网络不通时重试等待

URL="https://standards-oui.ieee.org/oui/oui.txt"
RAW="/tmp/oui_raw.txt"
OUT="/tmp/oui.csv"
RETRY=12

i=0
while [ $i -lt $RETRY ]; do
    if wget -q --no-check-certificate -T 15 -O "$RAW" "$URL" 2>/dev/null && [ -s "$RAW" ]; then
        # 提取 XX-XX-XX (hex) 厂商名 → 前缀,厂商名
        awk '
            /^[0-9A-F][0-9A-F]-[0-9A-F][0-9A-F]-[0-9A-F][0-9A-F][ \t]+\(hex\)/ {
                p = $1; gsub(/-/, "", p); p = tolower(p)
                s = $0
                sub(/^[0-9A-F-]+[ \t]+\(hex\)[ \t]+/, "", s)
                gsub(/[ \t]+/, " ", s); sub(/^[ ]+/, "", s)
                print p "," substr(s, 1, 40)
            }
        ' "$RAW" | sort -u > "$OUT"
        rm -f "$RAW"
        [ -s "$OUT" ] && exit 0
    fi
    i=$((i + 1))
    sleep 10
done
# 失败不留半成品
rm -f "$RAW"
exit 1
