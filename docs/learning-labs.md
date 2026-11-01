# Projektgebundene Lernlabore

Die Werkzeuge ergänzen die vorhandenen Projekte, Gruppen und Rollen. Gruppen bleiben die betreuten Kurse. Es entsteht kein zusätzliches Kurs-/Prüfungssystem.

## Einstieg

- **Daten-Labor** (`/#data-lab`): Unter **Datensätze** Daten importieren, Zellen bearbeiten, Datentypen festlegen, Qualitätsprobleme prüfen, filtern, aggregieren, verknüpfen und visualisieren. **Umwandeln** integriert den bisherigen Converter für CSV, TSV, JSON und XML; `/#converter` wird weitergeleitet. Projektdatensätze lassen sich direkt laden und Ergebnisse ausdrücklich als neue Datensätze speichern. Die Quelle wird nicht überschrieben. Verschachtelte Werte werden beim Übernehmen als JSON-Text in Zellen gespeichert. Reines Umwandeln bleibt lokal im Browser und benötigt keine Projektfreigabe; Projektzugriff und Speichern benötigen zusätzlich `files`, `data_lab` sowie das freigegebene Daten-Labor im Projekt. Gruppenrechte heißen entsprechend „Daten-Labor · Umwandeln“ und „Daten-Labor · Datensätze“. Formatfreigaben bleiben erhalten. Ungespeicherte lokale Eingaben werden beim Verlassen geschützt. Die Dozentenansicht erhält Datensatz-ID und Formatauswahl, keine lokalen Eingabetexte.
- **Graph-Labor** (`/#graph`): Knoten verschieben, Eigenschaften bearbeiten, gerichtete Beziehungen anlegen und Pfade/Nachbarn untersuchen. Beim Verbinden und Bearbeiten einer Kante werden passende Beziehungstypen angeboten; neue Typen lassen sich direkt anlegen. Unter **Modell / Ontologie → Beziehungstypen** stehen Filter, Verwendungszahlen sowie das Bearbeiten von Bezeichnung, Start- und Zieltyp bereit. Vorhandene freie Beziehungen erscheinen automatisch im Katalog. Umbenennen aktualisiert die betroffenen Kanten; verwendete Typen können nicht entfernt oder auf unpassende Endpunkttypen umgestellt werden. Ein Name kann für mehrere ausdrücklich definierte Start-/Zielpaare gelten. Knotentypen lassen sich ebenfalls direkt beim Anlegen eines Knotens erstellen, wiederverwenden und zentral filtern/bearbeiten. Sie tragen ein lokales Icon und eine frei wählbare HEX-Farbe; eine kontrastreiche Textfarbe wird automatisch gewählt. Die gleiche Gestaltung erscheint in Typkarten, Auswahlvorschauen und Graphknoten. Umbenennen führt Knoten, Beziehungstypen und Modelleigenschaften konsistent weiter; verwendete Knotentypen sind gegen Entfernen geschützt. Mehrere Kanten zwischen denselben Knoten werden getrennt dargestellt und bleiben beim Ziehen angeheftet. Eigenschaften und Pflichtfelder werden schrittweise ergänzt. Änderungen an Typen und neu angelegte Knoten/Beziehungen werden vor der Übernahme in den Entwurf serverseitig validiert und mit „Speichern“ versioniert im Projekt abgelegt. JSON-Import und -Export erlauben den Austausch zwischen Projekten; Importe werden vor der Darstellung serverseitig validiert.
- **KI-Labor** (`/#ai-lab`): Promptvarianten mit derselben Eingabe vergleichen, RAG manuell durchlaufen und kleine neuronale Netze trainieren.

Das Projekt wird oben ausgewählt. Objektlisten übertragen nur Metadaten; Inhalte werden gezielt geladen. Laborobjekte werden ausdrücklich gespeichert; veraltete Versionen erhalten HTTP 409. Der Entwurf bleibt für Export und Korrektur erhalten. „Neu laden“ verwirft ihn erst nach Rückfrage. Gespeicherte Änderungen anderer Gruppenmitglieder werden bei sauberem Entwurf regelmäßig abgeglichen.

## Graphspeicher und Ontologie

Die Anwendung implementiert einen Property-Graph auf SQLite. Knoten und gerichtete Kanten mit eigenen IDs, Typen und Eigenschaften werden persistent als versioniertes Projektobjekt gespeichert. Das ist keine native Cypher-Datenbank; es gibt keine behauptete Cypher-Kompatibilität. Die Graph-API stellt ausdrücklich definierte Operationen bereit.

Ein Modell kann leer beginnen. Sobald Entitätstypen definiert sind, müssen Knoten einem vorhandenen Typ entsprechen. Regeln prüfen Text, Zahl, Ja/Nein sowie Pflichtfelder. Sobald Beziehungstypen definiert sind, müssen Kanten zu deren Quell- und Zieltyp passen. Nicht passende Bestandsdaten müssen vor dem Speichern korrigiert werden; Entwürfe können dabei unvollständig bleiben.

## Zugriff aus Teilnehmercode

„Codebeispiel“ legt eine echte Datei im ausgewählten Projekt an und öffnet sie im vorhandenen Editor. Die IDs im Beispiel gehören zum aktuellen Laborobjekt.

```python
import academy

graph = academy.Graph("ID-DES-GRAPHEN")
print(await graph.nodes())
person = await graph.add_node("Mara", "Person", {"name": "Mara"})
print(await graph.neighbors(person["id"]))

net = academy.Network("ID-DES-NETZES")
print(await net.predict([0, 1]))
await net.train(100, 0.3)
```

```php
<?php
$graph = academy_graph('ID-DES-GRAPHEN');
print_r($graph->nodes());
print_r(academy_predict('ID-DES-NETZES', [0, 1]));
academy_train('ID-DES-NETZES', 100, 0.3);
```

```javascript
const graph = academy.graph('ID-DES-GRAPHEN');
console.log(await graph.nodes());
console.log(await academy.network('ID-DES-NETZES').predict([0, 1]));
```

Weitere Operationen: `list`, `get`, versioniertes `save`, `graph.edges`, `graph.add_edge`, `graph.update_node`, `graph.remove_node`, `graph.remove_edge`, `graph.neighbors`, `graph.path`, `dataset.rows`, `network.predict`, `network.train`, `sql`, `ai.connections` und `ai`. Auch Code kann freigegebene KI-Verbindungen über `academy.ai()`, `await academy.ai()` oder `academy_ai()` nutzen; Schlüssel bleiben im Backend. Die JavaScript-/Python-Helfer kapseln diese Operationen; PHP kann sie auch über `academy_call()` aufrufen.

Die Browserlaufzeiten verwenden eine Nachrichtenbrücke zur authentifizierten Elternanwendung. PHP-WASM unterstützt dafür `post_message_to_js`; Python verwendet eine asynchrone JS-Brücke. HTML-/JavaScript-Vorschauen besitzen eine eigene geprüfte Brücke. Anfragen sind an das ausführende Projekt gebunden. Der isolierte Code erhält weder Session-/CSRF-Daten noch Datenbank- oder KI-Schlüssel. Jede Operation wird im Backend erneut autorisiert.

Optionales Server-PHP verwendet zusätzliche Pipes zum vertrauenswürdigen Elternprozess und dieselbe API; die bisherigen Ausführungsgrenzen bleiben bestehen. Je Run beziehungsweise HTML-Vorschau sind höchstens 100 Brückenanfragen vorgesehen; zusätzlich greifen serverseitige Ratenlimits.

Unter Datenbanken kann zwischen persönlicher und projektgebundener MySQL-/MariaDB-Verbindung gewählt werden. Eine vorhandene persönliche Verbindung kann ausdrücklich für ein Projekt übernommen werden. Projektverbindungen folgen dem bestehenden Projekt-Sharing. `academy.sql()`, `academy_sql()` beziehungsweise `await academy.sql()` verwenden die Verbindung des Projekts. Host-/TLS-Prüfung und SQL-Policy bleiben wirksam. Nutzer mit Zugriff dürfen Daten bearbeiten; Verbindungsänderungen sind auf Projektverantwortliche und Dozenten begrenzt.

## KI-Zugänge und Freigaben

Im Profil gibt es den Reiter **KI-Zugänge**. Unterstützt werden OpenAI-Textgenerierung/Embeddings, Anthropic-Textgenerierung sowie die dokumentierten Daimon-Dienste für Chat, Embeddings und Reranking. Modellkennung und Funktion werden ausdrücklich konfiguriert. API-Abonnements und externe Schlüssel werden nicht automatisch angelegt.

Daimon-Verbindungen können ausschließlich Administratoren anlegen, ändern und für Projekte freigeben. Lernende und Dozenten erhalten für freigegebene Daimon-Modelle nur Nutzungsmetadaten; weder Serveradresse noch Tokens werden an sie übertragen.

Persönliche Verbindungen bleiben dem Konto zugeordnet und werden durch Projekt-Sharing nicht freigegeben. Dozenten können eine eigene Verbindung für ausdrückliche Projektfreigaben bereitstellen. Im Projekt legen sie das Anfragebudget fest oder entziehen die Freigabe mit Budget 0. Administratoren können bereitgestellte Verbindungen zentral deaktivieren und Projektfreigaben widerrufen. Andere Personen erhalten niemals den Schlüssel über die API, auch nicht als Dozent oder Administrator.

Schlüssel werden mit dem vorhandenen libsodium-Schlüssel verschlüsselt gespeichert. Der Browser erhält nur Metadaten. Bei Anbieter-/Serverwechsel ist ein neuer passender Schlüssel nötig. Anbieteranfragen laufen ausschließlich serverseitig über cURL, mit HTTPS, Zertifikatsprüfung, Zeit-/Antwortlimits und ohne Redirects. OpenAI/Anthropic haben feste Ziele. Daimon ist auf öffentliche Modellhosts unter `*.daimon.intelligence-gmbh.com/vllm/.../v1` beschränkt; DNS-Adressen werden geprüft und für den Request fixiert.

Anfragen erhalten eine Wiederholungskennung. Erfolgreiche Wiederholungen liefern das gespeicherte Ergebnis, ohne erneut den Anbieter aufzurufen. Globale Parallelgrenzen und Projektbudgets werden in einer kurzen SQLite-Transaktion reserviert. Während des externen Aufrufs bleiben weder SQLite-Schreibtransaktion noch PHP-Session-Lock offen. Die Oberfläche wartet bei belegten lokalen KI-Plätzen begrenzt und zeigt diesen Zustand an. Ein abgebrochener Browseraufruf ist kein Beleg dafür, dass der Anbieter den Auftrag nicht verarbeitet hat; derselbe gestartete Auftrag wird nicht automatisch neu gesendet.

KI-Antwortcaches zählen zum Workspace-Speicher. Ein laufender Aufruf reserviert 1 MB; größere Antworten werden nicht gespeichert. Antwortcaches werden bei weiteren Aufrufen nach sieben Tagen freigegeben, die Kennung bleibt zur Vermeidung doppelter Aufrufe erhalten. Gespeicherte Laborergebnisse bleiben bis zur ausdrücklichen Löschung bestehen.

Die Grenzen sind Anfragebudgets, keine garantierten Euro- oder Tokenbudgets. Verbrauchsdaten der Anbieter werden zusätzlich erfasst. Produktionszugänge und reale Providerkapazität müssen mit den vorgesehenen Academy-Freigaben abgenommen werden. Bestehende temporäre Integrationsschlüssel anderer Projekte werden nicht übernommen.

## RAG und Modelltraining

Der RAG-Wizard hat sechs Schritte: Text, überlappende Zeichenabschnitte, echte Embeddings, Suche, explizite Kontextauswahl und Antwort. Stichwortsuche und Kosinusähnlichkeit werden getrennt ausgewiesen. Ein separater Reranking-Zugang kann Treffer neu bewerten. Dokumente und Fragen müssen mit demselben konfigurierten Embeddingmodell vektorisiert werden; Dimensionen werden geprüft. Abschnitte lassen sich mit Projektgraph-Knoten verknüpfen, sodass deren Beziehungen in den Kontext aufgenommen werden können. Antworten werden als Text dargestellt, Modellinhalt wird nicht ausgeführt. Quellenverweise des Modells sind Lernmaterial und kein automatisch geprüfter Wahrheitsnachweis.

Die RAG-Werkstatt zeigt vorhandene Embeddings außerdem als **2D-Netzwerk**, drehbares **3D-Netzwerk**, **Punktkarte**, **Kosinus-Ähnlichkeitsmatrix** und **Dimensions-Heatmap**. X/Y/Z wählen Hauptkomponenten (PCA) oder originale Dimensionen. PCA wird auf normierten Dokumentvektoren berechnet; die Frage wird auf dieselben Achsen projiziert und verändert deren Berechnung nicht. Angezeigte Varianz beschreibt den erhaltenen Anteil der Streuung. Projizierte Abstände sind Annäherungen; Kanten und Nachbarlisten verwenden die vollständigen Originalrichtungen. Farben markieren zusammenhängende Gruppen der gewählten Kantenschwelle, keine automatisch benannten Themen. Kurze Punktbeschriftungen stammen aus häufigen Wörtern des Textes.

Ein Punkt öffnet Quelltext, Nachbarn und Vektorwerte und lässt sich direkt in die vorhandene Kontextauswahl übernehmen. Eine bereits vektorisierte Frage erscheint als Raute. Die Dimensionsansicht zeigt je 24 originale Dimensionen mit blätterbarer Auswahl. Vektoren bleiben unverändert; Projektion und Matrix werden lokal im Worker berechnet, ohne neue KI-Aufrufe. Fehlende, ungültige oder unvereinbare Vektoren erhalten keine erfundenen Koordinaten. Ansichtsart, Achsen und ausgewählter Abschnitt werden über den bestehenden strukturierten Dozentenkontext weitergegeben.

Neuronale Netze sind kleine vollständig verbundene Sigmoid-Netze mit echten Gewichten, Biases, Vorwärtsrechnung und Backpropagation. Schichten können ergänzt, verschoben und entfernt werden; Neuronenanzahl, Gewichte und Biases sind editierbar. Strukturänderungen initialisieren Gewichte neu. Browsertraining läuft im stoppbaren Worker. Code-Training ist mit einem begrenzten Rechenbudget ebenfalls möglich. Testbeispiele werden nicht trainiert. Fehlerkurven, Vorwärtsaktivierungen und Verwechslungsmatrizen machen Verhalten sichtbar. Die Beispiele behandeln XOR, Zahlenzusammenhänge, RGB-Farben und einfache 8×8-Rasterbuchstaben. Zeichnungen und lokal gerasterte Bilder können zu eigenen Beispielen werden. Das ist keine allgemeine OCR-Anwendung.

## Administration

- **Benutzer** (`/admin/#users`): Gruppenfilter einschließlich „Ohne Gruppe“, kombinierbare Suche/Rollen-/Statusfilter und wahlweise eine Liste oder einklappbare Gruppenbereiche. Sortiert werden kann nach Name, E-Mail, Gruppe, Rolle, Status oder letztem Login, jeweils in beide Richtungen. Mehrfachmitglieder erscheinen in jeder zugehörigen Gruppe; Gesamtzahlen zählen unterschiedliche Konten. Gruppen-Chips und die Mitgliederaktion der Gruppenkarte führen direkt zur passenden Auswahl. Die Ansicht wird pro Administrator für die aktuelle Browsersitzung gemerkt; die Darstellung verändert keine Zuordnung oder Rechte.
- **Gruppen → Zeiträume**: **Zugriffszeitraum** mit „Zugriff ab/bis“ und optionaler **Kurszeitraum** mit „Kursbeginn/-ende“. Der Kurszeitraum ist entweder vollständig oder leer und liegt innerhalb vorhandener Zugriffsgrenzen. Leere Zugriffsgrenzen bleiben offen. Tage gelten in **Europe/Berlin**, das Enddatum einschließlich; Sommer-/Winterzeit wird berücksichtigt. Der Kurszeitraum beschreibt die Veranstaltung und schränkt den Zugriff nicht zusätzlich ein. Gruppenkarte und Freigabenansicht zeigen den aktuellen Zugriffsstatus.
- **Zeitliche Zugriffskontrolle**: Konten mit Gruppenzuordnungen benötigen mindestens eine aktuell offene Gruppe für den gesamten Lernzugang. Bei mehreren offenen Gruppen wirken die bisherigen Rechtebeschränkungen gemeinsam; nicht offene Gruppen erteilen keine Rechte und beschränken andere aktive Kurse nicht. Ihre Projekte, Chats, Teams und Dozentenzugriffe bleiben gesondert gesperrt. Bestehende Sitzungen werden bei jeder Serveranfrage geprüft; bekannte Zeitgrenzen werden zusätzlich anhand der Serverzeit im Browser beobachtet. Konten ohne Gruppen behalten ihren persönlichen Zugang; Administratoren werden durch Gruppenzeiträume nicht ausgesperrt. Daten werden beim Ablauf nicht gelöscht. Bereits gestartete externe Anfragen können noch abschließen; lokal geladene oder exportierte Daten werden nicht nachträglich gelöscht.
- **Projekttypen**: Werkzeuge kombinieren, Startbereich wählen, Laborstartinhalte vorbereiten und Gruppenverfügbarkeit festlegen. Typen duplizieren sowie JSON importieren/exportieren. Importe und Kopien beginnen deaktiviert. Änderungen gelten für neue Projekte. Zugangsschlüssel sind kein Bestandteil von Vorlagen.
- **Freigaben** (`/admin/#features`): Zuerst eine Lerngruppe wählen. Jedes Set umfasst alle 14 Werkzeugrechte, geordnet nach Projekte/Code, Daten/Graphen, KI/Modellen und Zusammenarbeit. Suche sowie Bereichs- und Statusfilter begrenzen die Anzeige; Sammelaktionen ändern nur sichtbare Rechte. Ausgeblendete Rechte bleiben erhalten. Dieselben Rechte sind im Dialog **Gruppe bearbeiten → Freigaben** verfügbar. Ein Speichern auf der Freigabenseite verändert weder Gruppendetails noch Mitglieder.
- **Änderungsschutz**: Beide Verwaltungswege verwenden dieselbe Gruppenrevision. Auch Änderungen der Mitgliedschaft über die Benutzerverwaltung erhöhen sie. Ein veralteter Entwurf erhält HTTP 409 und überschreibt nichts. Auf der Freigabenseite kann er exportiert oder nach Rückfrage neu geladen werden. Die API `admin.group.features.save` erwartet `id`, die aktuelle ganzzahlige `version` und ein Set bekannter boolescher `features`; bestehende Gruppen verlangen die Revision auch bei `admin.group.save`.
- **Systemeinstellungen** (`/admin/#system`): Technische Plattformgrenzen sind von den Gruppenfreigaben getrennt. Bestehende System-, Konto- und andere Gruppensperren bleiben aus Sicherheitsgründen wirksam; eine aktivierte Gruppenfreigabe hebt solche Sperren nicht auf. Neue Rechte nutzen denselben serverseitigen Prüfpfad unabhängig von der Navigation.
- **Labore & KI**: Objekt-/Graph-/Daten-/RAG-Grenzen, parallele KI-Aufrufe, Projektübersicht, bereitgestellte Verbindungen, Projektfreigaben und Verbrauch. Der vorhandene 20-MB-Workspace umfasst auch Laborobjekte. Ein Objekt darf höchstens 1 MB groß sein.

## Dozentenansicht im Chat

Die Anwendung meldet bei sichtbarem Tab ungefähr alle 15 Sekunden und bei Ansichtswechseln einen begrenzten Ansichtskontext. Er enthält nur die freigegebene Route, Projekt-/Objekt-/Datei-ID sowie strukturelle Auswahl wie Modellreiter, Tabelle, Datensatzfilter/Diagrammauswahl oder RAG-Schritt. Es werden keine beliebigen URLs, Passwörter, Prompts oder Editorentwürfe gemeldet.

Dozenten sehen im Mitgliederbereich des Gruppenchats die aktuelle Ansicht. „Ansicht öffnen“ prüft erneut Gruppenzugehörigkeit und Projektrechte und navigiert in der eigenen Sitzung zum selben Projektobjekt. Persönliche SQL-Verbindungen und Übungsdaten können Dozenten innerhalb ihrer Gruppe im Teilnehmerkontext bearbeiten; persönliche Zugangsdaten können sie dabei nicht ändern. Nach ungefähr 60 Sekunden ohne Meldung wird der Ansichtskontext nicht mehr angeboten. Die Anzeige ist eine ungefähre Aktivitätsanzeige, keine Live-Bildschirmübertragung. Nicht gespeicherte Entwürfe werden nicht mit übertragen.

## Prüfen

```sh
python3 tests/integration.py
python3 tests/labs-integration.py
python3 tests/php-runner.py
php tests/lab-ai.php
php tests/group-periods.php
python3 tests/group-periods-integration.py
node tests/lab-models.mjs
node tests/vector-space.mjs
npm run build
python3 scripts/preflight.py
```

Die Laborsuite verwendet temporäre Datenbanken und prüft unter anderem fremde Projekte, Lehrerrechte, Sharing, Ontologieregeln, Konflikte, Schlüsselisolation, Widerruf, Vorlagen, Server-PHP und 25 getrennte Teilnehmersitzungen. Providerverträge, Budgetreservierung und Wiederholungsschutz werden mit synthetischem Transport geprüft, ohne reale Schlüssel oder externe Modellaufrufe. Ein erfolgreicher lokaler Lesetest bestätigt keine GPU-Kapazität oder die konkrete Produktionskonfiguration.
