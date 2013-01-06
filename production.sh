#!/bin/bash

sed '/%gacode%/{
    s/%gacode%//g
    r gacode
}' <index-dev.html >index-prod.html