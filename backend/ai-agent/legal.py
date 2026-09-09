"""
ИИ-юрист: дела, консультации, анализ договоров, генерация документов, стратегия.
Специализация — взыскание задолженности с контрагентов по договорам РФ.
"""
import json
import os
import urllib.request
import psycopg2
import psycopg2.extras

AI_URL = 'https://api.polza.ai/v1/chat/completions'
S = os.environ.get('MAIN_DB_SCHEMA', 'public')

COMPANY_PROFILE = """
МАТ-Лабс — российская IT-компания полного цикла (разработка ПО, ИИ-решения,
веб и мобильная разработка, автоматизация). Работает с юрлицами по договорам
подряда и возмездного оказания услуг. Типовые споры: неоплата выполненных работ,
разногласия по актам сдачи-приёмки, права на созданное ПО.
"""

LEGAL_SYSTEM = f"""Ты — опытный российский юрист (арбитражная практика, 15+ лет),
специализация: договорные споры, взыскание задолженности с юрлиц, подряд и оказание услуг,
интеллектуальная собственность на ПО.

КОМПАНИЯ-КЛИЕНТ (от её имени ведётся спор):
{COMPANY_PROFILE}

ПРАВИЛА:
- Опирайся на действующее законодательство РФ: ГК РФ (гл. 37 подряд, гл. 39 услуги,
  ст. 309-310 исполнение обязательств, ст. 395 проценты, ст. 330 неустойка,
  ст. 720/753 приёмка работ, ст. 196/200 исковая давность), АПК РФ (претензионный
  порядок ст. 4, подсудность), НК РФ по госпошлине (ст. 333.21).
- ВСЕГДА указывай конкретные статьи и нормы, на которые опираешься.
- Пиши по-деловому, структурированно, на русском языке.
- Давай практичные пошаговые действия, а не общие рассуждения.
- Если не хватает данных для вывода — прямо скажи, какие документы/факты нужны.
- Предупреждай о сроках: претензионный порядок (30 дней), исковая давность (3 года).
- Не выдумывай судебную практику и номера дел, которых не знаешь наверняка.
- В конце важных ответов добавляй блок «Что сделать сейчас» со списком шагов."""

DOC_TYPES = {
    'offer': 'Коммерческое предложение на разработку и сопровождение ПО с расчётом стоимости по этапам',
    'contract': 'Договор на оказание услуг по разработке и сопровождению программного обеспечения',
    'objection': 'Возражения на исковое заявление с ходатайством о снижении неустойки по ст. 333 ГК РФ',
    'claim': 'Досудебная претензия с требованием погасить задолженность',
    'lawsuit': 'Исковое заявление в арбитражный суд о взыскании задолженности',
    'agreement': 'Соглашение о рассрочке / урегулировании задолженности',
    'demand': 'Требование о предоставлении документов и подписании актов',
    'reply': 'Ответ на претензию контрагента',
    'termination': 'Уведомление об одностороннем отказе от договора',
}


def _db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def _ai(system: str, user: str, max_tokens: int = 2500,
        history=None, as_json: bool = False):
    api_key = os.environ.get('POLZA_AI_API_KEY', '')
    if not api_key:
        raise ValueError('Нет ключа POLZA_AI_API_KEY')
    msgs = [{'role': 'system', 'content': system}]
    for m in (history or [])[-8:]:
        role = 'assistant' if m.get('role') == 'assistant' else 'user'
        msgs.append({'role': role, 'content': str(m.get('content', ''))[:3000]})
    msgs.append({'role': 'user', 'content': user})

    payload = {
        'model': 'gpt-4o',
        'messages': msgs,
        'temperature': 0.3,
        'max_tokens': max_tokens,
    }
    if as_json:
        payload['response_format'] = {'type': 'json_object'}

    req = urllib.request.Request(
        AI_URL, data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read().decode())
    content = data['choices'][0]['message']['content'].strip()
    if not as_json:
        return content
    if content.startswith('```'):
        content = content.split('```')[1]
        if content.startswith('json'):
            content = content[4:]
    return json.loads(content.strip())


def _case_ctx(case) -> str:
    if not case:
        return ''
    return f"""
КОНТЕКСТ ДЕЛА:
- Название: {case.get('title', '')}
- Тип спора: {case.get('case_type', '')}
- Оппонент: {case.get('opponent', '')} (ИНН {case.get('opponent_inn') or 'не указан'})
- Сумма требований: {case.get('amount') or 0} руб.
- Статус: {case.get('status', '')}
- Обстоятельства: {(case.get('description') or '')[:3000]}
"""


def handle(action: str, body: dict, params: dict, json_resp, err):
    """Роутер действий ИИ-юриста. Возвращает ответ или None, если action не наш."""

    # ── Список дел ──
    if action == 'legal_cases':
        conn = _db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"""
            SELECT c.*,
                   (SELECT COUNT(*) FROM {S}.legal_documents d WHERE d.case_id = c.id) AS docs_count
            FROM {S}.legal_cases c
            ORDER BY c.updated_at DESC LIMIT 100
        """)
        cases = [dict(r) for r in cur.fetchall()]
        conn.close()
        return json_resp({'cases': cases, 'doc_types': DOC_TYPES})

    # ── Одно дело ──
    if action == 'legal_case':
        case_id = body.get('id') or params.get('id')
        if not case_id:
            return err('Не указан id дела')
        conn = _db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"SELECT * FROM {S}.legal_cases WHERE id = %s", (int(case_id),))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дело не найдено', 404)
        case = dict(row)
        cur.execute(f"SELECT * FROM {S}.legal_messages WHERE case_id = %s ORDER BY created_at",
                    (int(case_id),))
        messages = [dict(r) for r in cur.fetchall()]
        cur.execute(f"SELECT * FROM {S}.legal_documents WHERE case_id = %s ORDER BY created_at DESC",
                    (int(case_id),))
        documents = [dict(r) for r in cur.fetchall()]
        conn.close()
        return json_resp({'case': case, 'messages': messages, 'documents': documents})

    # ── Создать дело ──
    if action == 'legal_case_create':
        title = (body.get('title') or '').strip()
        if not title:
            return err('Укажите название дела')
        conn = _db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"""
            INSERT INTO {S}.legal_cases
              (title, case_type, opponent, opponent_inn, amount, description, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *
        """, (title, body.get('case_type') or 'debt', body.get('opponent') or '',
              body.get('opponent_inn') or '', body.get('amount') or 0,
              body.get('description') or '', 'new'))
        case = dict(cur.fetchone())
        conn.commit()
        conn.close()
        return json_resp({'case': case})

    # ── Обновить дело ──
    if action == 'legal_case_update':
        case_id = body.get('id')
        if not case_id:
            return err('Не указан id дела')
        fields, args = [], []
        for f in ['title', 'case_type', 'opponent', 'opponent_inn', 'status',
                  'description', 'next_step', 'contract_text']:
            if f in body:
                fields.append(f"{f} = %s")
                args.append(body[f])
        if 'amount' in body:
            fields.append("amount = %s")
            args.append(body['amount'] or 0)
        if not fields:
            return err('Нет полей для обновления')
        fields.append("updated_at = now()")
        args.append(int(case_id))
        conn = _db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"UPDATE {S}.legal_cases SET {', '.join(fields)} WHERE id = %s RETURNING *", args)
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return json_resp({'case': dict(row) if row else None})

    # ── Консультация ──
    if action == 'legal_chat':
        question = (body.get('question') or '').strip()
        if not question:
            return err('Введите вопрос')
        case_id = body.get('case_id')
        case, history = None, []
        conn = _db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if case_id:
            cur.execute(f"SELECT * FROM {S}.legal_cases WHERE id = %s", (int(case_id),))
            r = cur.fetchone()
            case = dict(r) if r else None
            cur.execute(
                f"SELECT role, content FROM {S}.legal_messages WHERE case_id = %s ORDER BY created_at",
                (int(case_id),))
            history = [dict(x) for x in cur.fetchall()]
        try:
            reply = _ai(LEGAL_SYSTEM + _case_ctx(case), question, 2000, history)
        except Exception as e:
            conn.close()
            return err(f'Ошибка ИИ: {str(e)[:200]}', 500)
        if case_id:
            cur.execute(f"INSERT INTO {S}.legal_messages (case_id, role, content) VALUES (%s,%s,%s)",
                        (int(case_id), 'user', question))
            cur.execute(f"INSERT INTO {S}.legal_messages (case_id, role, content) VALUES (%s,%s,%s)",
                        (int(case_id), 'assistant', reply))
            cur.execute(f"UPDATE {S}.legal_cases SET updated_at = now() WHERE id = %s", (int(case_id),))
            conn.commit()
        conn.close()
        return json_resp({'reply': reply})

    # ── Анализ договора ──
    if action == 'legal_analyze':
        text = (body.get('text') or '').strip()
        if len(text) < 100:
            return err('Вставьте текст договора (минимум 100 символов)')
        prompt = f"""Проанализируй договор с позиции ЗАЩИТЫ ИНТЕРЕСОВ НАШЕЙ КОМПАНИИ (исполнителя).
Найди рискованные и невыгодные условия, пробелы, которые помешают взыскать оплату.

ТЕКСТ ДОГОВОРА:
{text[:14000]}

Верни ТОЛЬКО JSON:
{{
  "summary": "<суть договора: предмет, стороны, цена, сроки>",
  "risk_level": "<низкий|средний|высокий>",
  "risk_score": <0-100, где 100 — максимальный риск для нас>,
  "risks": [
    {{"clause": "<пункт или цитата>", "risk": "<чем опасно для нас>",
      "severity": "<высокая|средняя|низкая>", "fix": "<как исправить>"}}
  ],
  "missing": ["<чего критично не хватает>"],
  "payment_terms": "<порядок оплаты и приёмки, зацепки для взыскания>",
  "our_leverage": ["<наши сильные позиции>"],
  "recommendations": ["<действие 1>", "<2>", "<3>"]
}}"""
        try:
            data = _ai(LEGAL_SYSTEM, prompt, 3000, as_json=True)
        except Exception as e:
            return err(f'Ошибка анализа: {str(e)[:200]}', 500)
        case_id = body.get('case_id')
        if case_id:
            conn = _db()
            cur = conn.cursor()
            cur.execute(f"UPDATE {S}.legal_cases SET contract_text = %s, updated_at = now() WHERE id = %s",
                        (text[:20000], int(case_id)))
            conn.commit()
            conn.close()
        return json_resp({'analysis': data})

    # ── Стратегия по спору ──
    if action == 'legal_strategy':
        case_id = body.get('case_id')
        if not case_id:
            return err('Не указано дело')
        conn = _db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"SELECT * FROM {S}.legal_cases WHERE id = %s", (int(case_id),))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err('Дело не найдено', 404)
        case = dict(row)
        prompt = f"""{_case_ctx(case)}

Дай стратегию ведения спора: оцени перспективы взыскания и составь план действий.

Верни ТОЛЬКО JSON:
{{
  "win_probability": <0-100 шанс взыскать через суд>,
  "assessment": "<честная оценка: сильные и слабые места позиции>",
  "legal_grounds": [
    {{"norm": "<статья, напр. ст. 309 ГК РФ>", "why": "<как применяется в нашем деле>"}}
  ],
  "evidence_needed": ["<документ 1>", "<2>", "<3>"],
  "money_claim": {{
    "debt": "<основной долг>",
    "penalty": "<неустойка или ст. 395 ГК РФ — как считать>",
    "court_fee": "<госпошлина по ст. 333.21 НК РФ>",
    "total_hint": "<итого к взысканию ориентировочно>"
  }},
  "steps": [
    {{"step": "<шаг>", "deadline": "<срок>", "detail": "<что именно сделать>"}}
  ],
  "risks": ["<риск 1>", "<2>"],
  "settlement_option": "<стоит ли мировое и на каких условиях>",
  "conclusion": "<рекомендация: судиться / договариваться / собрать документы>"
}}"""
        try:
            data = _ai(LEGAL_SYSTEM, prompt, 3000, as_json=True)
        except Exception as e:
            conn.close()
            return err(f'Ошибка ИИ: {str(e)[:200]}', 500)
        cur.execute(f"UPDATE {S}.legal_cases SET strategy = %s::jsonb, updated_at = now() WHERE id = %s",
                    (json.dumps(data, ensure_ascii=False), int(case_id)))
        conn.commit()
        conn.close()
        return json_resp({'strategy': data})

    # ── Генерация документа ──
    if action == 'legal_doc':
        doc_type = (body.get('doc_type') or '').strip()
        if doc_type not in DOC_TYPES:
            return err('Неизвестный тип документа')
        case_id = body.get('case_id')
        case = None
        if case_id:
            conn = _db()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(f"SELECT * FROM {S}.legal_cases WHERE id = %s", (int(case_id),))
            r = cur.fetchone()
            case = dict(r) if r else None
            conn.close()
        extra = (body.get('details') or '').strip()
        prompt = f"""{_case_ctx(case)}
ДОПОЛНИТЕЛЬНЫЕ ОБСТОЯТЕЛЬСТВА:
{extra or 'не указаны'}

Составь документ: {DOC_TYPES[doc_type]}.

Требования:
- Готовый к отправке текст на русском, деловой стиль.
- Полная структура: шапка (кому/от кого), заголовок, фактические обстоятельства,
  правовое обоснование со ссылками на статьи ГК РФ / АПК РФ, чёткие требования,
  расчёт суммы, срок исполнения, перечень приложений, подпись.
- Где нужны точные данные — ставь плейсхолдеры в квадратных скобках:
  [номер договора], [дата], [сумма], [реквизиты].
- Для претензии укажи срок ответа и предупреждение об обращении в суд.
- Для иска укажи цену иска, расчёт госпошлины и подсудность.

Верни ТОЛЬКО текст документа, без пояснений и markdown."""
        try:
            content = _ai(LEGAL_SYSTEM, prompt, 3000)
        except Exception as e:
            return err(f'Ошибка генерации: {str(e)[:200]}', 500)
        doc = None
        if case_id:
            conn = _db()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(f"""
                INSERT INTO {S}.legal_documents (case_id, doc_type, title, content)
                VALUES (%s,%s,%s,%s) RETURNING *
            """, (int(case_id), doc_type, DOC_TYPES[doc_type], content))
            doc = dict(cur.fetchone())
            cur.execute(f"UPDATE {S}.legal_cases SET updated_at = now() WHERE id = %s", (int(case_id),))
            conn.commit()
            conn.close()
        return json_resp({'document': doc, 'content': content})

    return None