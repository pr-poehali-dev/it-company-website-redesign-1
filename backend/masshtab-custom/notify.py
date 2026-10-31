import os
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr

import requests

TO = 'maksT77@yandex.ru'


def esc(v):
    return str(v or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')


def send(subject, html):
    key = os.environ.get('UNISENDER_API_KEY')
    if key:
        try:
            r = requests.post('https://go2.unisender.ru/ru/transactional/api/v1/email/send.json', headers={'X-API-KEY': key}, timeout=5,
                              json={'message': {'recipients': [{'email': TO}], 'subject': subject, 'body': {'html': html},
                                                'from_email': os.environ.get('UNISENDER_SENDER_EMAIL', 'atyurin2@yandex.ru'), 'from_name': 'Масштаб'}}).json()
            if r.get('status') != 'error':
                return True
        except Exception as e:
            print(f'[masshtab] unisender: {e}')
    for frm, env in (('atyurin2@yandex.ru', 'SMTP_PASSWORD'), (TO, 'SMTP_PASSWORD_MAKST')):
        pw = os.environ.get(env)
        if not pw:
            continue
        msg = MIMEText(html, 'html', 'utf-8')
        msg['Subject'], msg['From'], msg['To'] = subject, formataddr(('Журнал «Масштаб»', frm)), TO
        try:
            with smtplib.SMTP_SSL('smtp.yandex.ru', 465, timeout=5) as s:
                s.login(frm, pw)
                s.sendmail(frm, [TO], msg.as_bytes())
            return True
        except Exception as e:
            print(f'[masshtab] smtp {frm}: {e}')
    return False
