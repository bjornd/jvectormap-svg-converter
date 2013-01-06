#!/bin/bash

gacode=`cat gacode`
sed '/%gacode%/r gacode' <index-dev.html >index-prod.html
sed -i -e 's/%gacode%//g' index-prod.html