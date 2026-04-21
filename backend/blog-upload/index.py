"""
Загрузка обложки статьи блога в S3. Принимает base64-изображение, сохраняет в S3, возвращает CDN URL.
"""
import json
import os
import base64
import uuid
import boto3
import psycopg2

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

ALLOWED_TYPES = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif'}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ.get('MAIN_DB_SCHEMA', 'public')}")


def is_admin(token: str) -> bool:
    if not token:
        return False
    raw = token.rsplit('.', 1)[0] if '.' in token else token
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM admin_sessions WHERE token = %s", (raw,))
    result = cur.fetchone()
    conn.close()
    return result is not None


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    headers = event.get('headers') or {}
    token = headers.get('X-Session-Token', '')

    if not is_admin(token):
        return {'statusCode': 403, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет доступа'})}

    body = json.loads(event.get('body') or '{}')
    image_data = body.get('image')
    content_type = body.get('content_type', 'image/jpeg')

    if not image_data:
        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет изображения'})}

    if content_type not in ALLOWED_TYPES:
        return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Неподдерживаемый формат'})}

    if ',' in image_data:
        image_data = image_data.split(',', 1)[1]

    image_bytes = base64.b64decode(image_data)

    ext = ALLOWED_TYPES[content_type]
    key = f"blog/covers/{uuid.uuid4().hex}.{ext}"

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=image_bytes, ContentType=content_type)

    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

    return {
        'statusCode': 200,
        'headers': CORS_HEADERS,
        'body': json.dumps({'url': cdn_url}),
    }