import re

def parse_markdown(md_text):
    columns = {}
    current_col = "Входящие"
    columns[current_col] = []
    
    for line in md_text.split('\n'):
        line = line.strip()
        # Находим заголовки колонок
        if line.startswith('## '):
            current_col = line[3:].strip()
            columns[current_col] = []
        # Находим невыполненные задачи
        elif line.startswith('- [ ]'):
            columns[current_col].append({'text': line[6:], 'done': False})
        # Находим выполненные задачи
        elif line.startswith('- [x]'):
            columns[current_col].append({'text': line[6:], 'done': True})
            
    return columns

def generate_html(columns):
    html = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Доска Дарьи</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f4f5f7; margin: 0; padding: 20px; color: #172b4d; }
  h1 { text-align: center; font-size: 24px; margin-bottom: 30px; }
  .board { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 20px; align-items: flex-start; }
  .column { background: #ebecf0; border-radius: 10px; padding: 12px; min-width: 280px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .column h2 { font-size: 16px; margin-top: 0; padding: 4px 8px; color: #5e6c84; text-transform: uppercase; letter-spacing: 1px; }
  .card { background: white; border-radius: 6px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.15); font-size: 14px; line-height: 1.4; word-break: break-word; }
  .card.done { text-decoration: line-through; color: #8993a4; background: #fafbfc; box-shadow: none; }
</style>
</head>
<body>
<h1>Моя Доска</h1>
<div class="board">
"""
    for col_name, tasks in columns.items():
        html += f'<div class="column"><h2>{col_name}</h2>'
        for task in tasks:
            done_class = 'done' if task['done'] else ''
            html += f'<div class="card {done_class}">{task["text"]}</div>'
        html += '</div>'
        
    html += '</div></body></html>'
    return html

# Читаем данные
with open('notes.md', 'r', encoding='utf-8') as f:
    md_content = f.read()

# Генерируем HTML
parsed_data = parse_markdown(md_content)
final_html = generate_html(parsed_data)

# Сохраняем результат
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(final_html)
