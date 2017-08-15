# -*- coding: utf-8 -*-

from backports.configparser import ConfigParser

cfg = ConfigParser()
cfg.optionxform = str
cfg.read('shetphone.ini')
