"""
CRUD для статей блога. Публичный GET (список/одна статья), защищённые POST/PUT/DELETE для админа.
"""
import json
import os
import psycopg2
import psycopg2.extras
from datetime import datetime

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

TAG_COLORS = {
    'AI/ML': 'from-violet-500 to-purple-600',
    'DevOps': 'from-cyan-500 to-blue-600',
    'Frontend': 'from-pink-500 to-rose-600',
    'Backend': 'from-emerald-500 to-teal-600',
    'Безопасность': 'from-orange-500 to-amber-600',
    'Аналитика': 'from-indigo-500 to-blue-600',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ.get('MAIN_DB_SCHEMA', 'public')}")


def row_to_post(row) -> dict:
    return {
        'id': row[0],
        'title': row[1],
        'tag': row[2],
        'read': row[3],
        'color': row[4],
        'content': row[5],
        'published': row[6],
        'date': row[7].strftime('%-d %B %Y').replace('January','января').replace('February','февраля')
               .replace('March','марта').replace('April','апреля').replace('May','мая')
               .replace('June','июня').replace('July','июля').replace('August','августа')
               .replace('September','сентября').replace('October','октября')
               .replace('November','ноября').replace('December','декабря'),
        'created_at': row[7].isoformat(),
        'updated_at': row[8].isoformat() if row[8] else row[7].isoformat(),
        'cover_url': row[9],
    }


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    headers = event.get('headers') or {}
    token = headers.get('X-Session-Token', '')

    def is_admin():
        if not token:
            return False
        cur2 = conn.cursor()
        cur2.execute("SELECT 1 FROM admin_sessions WHERE token = %s", (token,))
        return cur2.fetchone() is not None

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET /  — список опубликованных (публично) или всех (admin)
        if method == 'GET' and (path.endswith('/') or path.endswith('/blog-admin')):
            if is_admin():
                cur.execute("SELECT id, title, tag, read_time, color, content, published, created_at, updated_at, cover_url FROM blog_posts ORDER BY created_at DESC")
            else:
                cur.execute("SELECT id, title, tag, read_time, color, content, published, created_at, updated_at, cover_url FROM blog_posts WHERE published = true ORDER BY created_at DESC")
            rows = cur.fetchall()
            posts = [row_to_post(r) for r in rows]
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'posts': posts}, ensure_ascii=False)}

        # GET /{id}
        if method == 'GET':
            post_id = path.rstrip('/').split('/')[-1]
            cur.execute("SELECT id, title, tag, read_time, color, content, published, created_at, updated_at, cover_url FROM blog_posts WHERE id = %s", (post_id,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Не найдено'})}
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps(row_to_post(row), ensure_ascii=False)}

        # Все остальные методы — только для админа
        if not is_admin():
            return {'statusCode': 403, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Нет доступа'})}

        body = json.loads(event.get('body') or '{}')

        # POST / — создать статью
        if method == 'POST':
            title = body.get('title', '').strip()
            tag = body.get('tag', 'AI/ML')
            read_time = body.get('read_time', '5 мин')
            color = body.get('color') or TAG_COLORS.get(tag, 'from-violet-500 to-purple-600')
            content = body.get('content', '')
            published = body.get('published', True)
            cover_url = body.get('cover_url') or None

            if not title:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Заголовок обязателен'})}

            cur.execute(
                "INSERT INTO blog_posts (title, tag, read_time, color, content, published, cover_url) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (title, tag, read_time, color, content, published, cover_url)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 201, 'headers': CORS_HEADERS, 'body': json.dumps({'id': new_id}, ensure_ascii=False)}

        # PUT /{id} — обновить статью
        if method == 'PUT':
            post_id = path.rstrip('/').split('/')[-1]
            title = body.get('title', '').strip()
            tag = body.get('tag', 'AI/ML')
            read_time = body.get('read_time', '5 мин')
            color = body.get('color') or TAG_COLORS.get(tag, 'from-violet-500 to-purple-600')
            content = body.get('content', '')
            published = body.get('published', True)
            cover_url = body.get('cover_url') or None

            cur.execute(
                "UPDATE blog_posts SET title=%s, tag=%s, read_time=%s, color=%s, content=%s, published=%s, cover_url=%s, updated_at=NOW() WHERE id=%s",
                (title, tag, read_time, color, content, published, cover_url, post_id)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

        # DELETE /{id}
        if method == 'DELETE':
            post_id = path.rstrip('/').split('/')[-1]
            cur.execute("DELETE FROM blog_posts WHERE id = %s", (post_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': json.dumps({'ok': True})}

    finally:
        conn.close()

    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Not found'})}