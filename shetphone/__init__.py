# -*- coding: utf-8 -*-

from backports.configparser import ConfigParser

cfg = ConfigParser(defaults={'debug': 'false'})
cfg.optionxform = str
cfg.read('shetphone.ini')
