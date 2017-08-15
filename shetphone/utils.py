# -*- coding: utf-8 -*-

def get_routes(app):
    import urllib
    from flask import url_for
    output = []
    for rule in app.url_map.iter_rules():
        options = {}
        for arg in rule.arguments:
            options[arg] = "[{0}]".format(arg)

        methods = ','.join(rule.methods)
        url = url_for(rule.endpoint, **options)
        line = urllib.unquote("{:30s} {:25s} {}".format(rule.endpoint, methods, url))
        output.append(line)

    return sorted(output)
