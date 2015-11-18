#!/bin/sh
grep -Rn 'goog\.[a-zA-Z0-9\.]' src/ | sed 's/.*\(goog\.[a-zA-Z0-9\.]*\).*/\1/' | sort | uniq -c
