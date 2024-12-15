from django import template

register = template.Library()


@register.filter
def hex_to_rgb(value):
    """Convert a hex color code to RGB"""
    if value.startswith('#'):
        value = value[1:]

    if len(value) == 6:
        r = int(value[0:2], 16)
        g = int(value[2:4], 16)
        b = int(value[4:6], 16)
        return f'{r}, {g}, {b}'
    return value
