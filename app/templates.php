<?php
declare(strict_types=1);
function starterFiles(string $template): array {
    return match($template) {
        'python' => ['main.py' => "# Ihr erster Python-Workspace\nfrom datetime import date\n\nname = 'Welt'\nprint(f'Hallo, {name}.')\nprint(f'Heute ist {date.today():%d.%m.%Y}.')\n\nfor zahl in range(1, 6):\n    print(f'{zahl} × {zahl} = {zahl ** 2}')\n"],
        'php' => ['index.php' => "<?php\n\$titel = 'Meine erste PHP-Seite';\n\$sprachen = ['HTML', 'CSS', 'JavaScript', 'PHP', 'Python'];\n?>\n<!doctype html>\n<html lang=\"de\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title><?= htmlspecialchars(\$titel) ?></title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <main>\n    <span class=\"label\">MEIN WORKSPACE // PHP</span>\n    <h1><?= htmlspecialchars(\$titel) ?><span>.</span></h1>\n    <p>Diese Seite wird mit PHP im Browser gerendert.</p>\n    <ul><?php foreach (\$sprachen as \$sprache): ?>\n      <li><?= htmlspecialchars(\$sprache) ?></li>\n    <?php endforeach; ?></ul>\n  </main>\n</body>\n</html>", 'style.css' => starterCss()],
        default => ['index.html' => "<!doctype html>\n<html lang=\"de\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Mein erster Entwurf</title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <main>\n    <span class=\"label\">MEIN WORKSPACE // WEB</span>\n    <h1>Eine Idee. Ihr <span>Code.</span></h1>\n    <p>Verändern Sie diese Seite. Probieren Sie etwas aus.</p>\n    <button id=\"hello\">Hallo sagen</button>\n    <p id=\"output\" aria-live=\"polite\"></p>\n  </main>\n  <script src=\"script.js\"></script>\n</body>\n</html>", 'style.css' => starterCss(), 'script.js' => "const button = document.querySelector('#hello');\nconst output = document.querySelector('#output');\n\nbutton.addEventListener('click', () => {\n  output.textContent = 'Es funktioniert. Machen Sie weiter.';\n});\n"]
    };
}
function starterCss(): string {
    return "* { box-sizing: border-box; }\nbody { margin: 0; background: #f9f9f9; color: #1a1c1c; font: 16px/1.6 system-ui, sans-serif; }\nmain { max-width: 760px; margin: 12vh auto; padding: 32px; }\n.label { font: 11px monospace; letter-spacing: .14em; }\nh1 { font-size: clamp(36px, 6vw, 64px); line-height: 1.05; letter-spacing: -.04em; font-weight: 500; }\nh1 span { color: #b2026c; }\np { color: #5e5e62; }\nbutton { margin-top: 24px; padding: 14px 24px; background: #b2026c; color: white; border: 0; border-radius: 999px; cursor: pointer; }\n";
}
function createProject(array $u, string $name, string $template): string {
    return transaction(function () use ($u,$name,$template) {
        if ((int)query('SELECT COUNT(*) FROM projects WHERE user_id=?', [$u['id']])->fetchColumn() >= 30) fail(422, 'Sie können bis zu 30 Projekte anlegen.');
        $pid = id(); query('INSERT INTO projects VALUES(?,?,?,?,?)', [$pid, $u['id'], $name, now(), now()]);
        foreach (starterFiles($template) as $path => $content) query('INSERT INTO files(id,project_id,path,content,updated_at) VALUES(?,?,?,?,?)', [id(),$pid,$path,$content,now()]);
        audit($u['id'], 'project.create'); return $pid;
    });
}
