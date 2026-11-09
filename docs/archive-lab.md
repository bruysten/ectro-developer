# Archiv Lab

Das projektbezogene Lernlabor begleitet „Datenarchive im Griff“: **Bestand → Finden → Prüfen**. Es zeigt anhand eigener Texte und eines bewusst unvollständigen synthetischen Bestands, wie Erschließung, Herkunft und Versionsstatus das Wiederfinden beeinflussen. Es ersetzt keine Originalablage oder revisionssichere Langzeitarchivierung.

## Lernen mit dem Beispiel

1. Eine neue Arbeit leer oder mit Lernbeispiel anlegen. Der Beispielbestand enthält einen aktuellen Prozess, einen überholten Prozess, eine identische Textkopie, eine noch nicht beschlossene Idee und einen Scan ohne Textebene.
2. Unter **Finden** nach „Retoure“ suchen: kein Treffer allein über Dateinamen, ein Treffer durch Schlagwörter. Die Fundgründe nennen die tatsächlich passenden Felder.
3. Nach „Rücksendung“ suchen: alte, neue und ungeprüfte Texte erscheinen. „Nur als aktuell gekennzeichnete Dokumente“ schließt die ungeprüfte Kopie und die alte Fassung aus. „Aktuell“ ist eine manuelle Kennzeichnung, kein Wahrheitsbeweis.
4. Unter **Prüfen** fehlende Angaben und identische Texte öffnen. Schlagwörter ändern und die Wirkung in der Suche untersuchen. Keine automatische Löschung oder Zusammenführung von Dubletten.
5. Bei freigegebener RAG-Werkstatt ein Dokument über **In RAG öffnen** als neue, unabhängige RAG-Arbeit übernehmen. Herkunft, Inhaltsstand und Status bleiben im Text. Es erfolgt dabei kein Modellaufruf. Änderungen am Archiv ändern den übernommenen RAG-Stand nicht.

## Material und Metadaten

Manueller Text, lokale TXT/Markdown/CSV/TSV/JSON-Dateien, Projekttextdateien und PDFs sowie PNG-, JPEG- und WebP-Bilder. Der Import öffnet zunächst einen bearbeitbaren Entwurf; Abbrechen speichert nichts. PDF-Text wird lokal ausgelesen; Seiten ohne Textebene werden mit der mitgelieferten OCR erkannt. Die Option „Alle Seiten per OCR“ übergeht bei Bedarf unvollständige Textebenen. Vor der Übernahme stehen Originalvorschau und bearbeitbarer Text nebeneinander, auf schmalen Geräten untereinander. Kein PDF-Scripting und keine externen Dienste. Office-Dateien werden in dieser ersten Fassung nicht importiert.

Felder: Titel, Originaldateiname, Text, Schlagwörter, Zuständigkeit, Inhaltsstand, Herkunft/Fundstelle, Status (aktuell/ungeprüft/überholt), Vertraulichkeitskennzeichnung und Notiz. Die Kennzeichnung ist **kein zusätzliches Zugriffssystem**; der Editor nennt ausdrücklich die bestehenden Projektberechtigungen. Persönliche Projekte bleiben persönlich, Gruppenprojekte für berechtigte Projektmitglieder gemeinsam sichtbar und bearbeitbar.

Suche: Unicode-NFKC, deutsche Kleinschreibung, alle Suchwörter als UND, Wortteile zählen. Dateinamensuche und Suche über Titel, Schlagwörter, Inhalt und Dateiname verwenden dieselben Status-/Kennzeichnungsfilter. Die Reihenfolge gewichtet Titel mit 4, Schlagwörter mit 3 und Inhalt/Dateiname mit 1 je gefundenem Begriff; kein semantischer Score oder Konfidenzwert. Textdubletten bedeuten identischen normalisierten Text, keine ähnliche Bedeutung. Leere Texte werden nicht zu Dublettengruppen zusammengefasst.

Inventar als formelsicheres CSV, einzelne Texte mit Herkunft/Stand/Status als TXT und vollständige Arbeiten über den gemeinsamen JSON-Export. Entfernen eines Dokuments verlangt eine Bestätigung und löscht ausschließlich den gespeicherten Textstand samt Metadaten. Das Original wird nicht angefasst.

## Grenzen, Rechte und Speichern

`archive_lab` ist in der bestehenden Rechteverwaltung pro Gruppe und global einstellbar; die Rechte aktiver Gruppen werden wie bei allen Labs vereinigt. Zusätzlich gelten persönliche Einschränkungen und der Projektwerkzeugkatalog. Das Lab benötigt `files`, keinen KI-Zugang. Der RAG-Übergang erscheint nur mit RAG-Recht und freigegebenem Projektwerkzeug und wird auch serverseitig geprüft.

Bis zu 50 Dokumente, 12.000 Textzeichen je Dokument, insgesamt 200.000 Textzeichen je Archiv. Bis zu 12 eindeutige Schlagwörter mit je 50 Zeichen. PDF/Bild: 5 MB, PDF bis zu 30 Seiten; OCR maximal 180 Sekunden insgesamt, 60 Sekunden je Worker-Schritt. Bilder maximal 24 Megapixel, Verarbeitung auf höchstens 6 Megapixel / 3.000 Pixel Kantenlänge begrenzt; Textdateien: 100 KB. Keine stille Kürzung importierter Inhalte. Die gemeinsamen JSON-/Speichergrenzen gelten zusätzlich. Der PDF-Parser wird auch bei Abbruch/Fehler zerstört.

Dokumentänderungen werden vor Übernahme validiert und mit der bestehenden optimistischen Objektversion gespeichert. Bei Konflikten bleibt der lokale Entwurf erhalten; alte Versionen können entfernte Dokumente nicht wiederherstellen. Die Datenbankmigration erhält abhängige Readiness-Verläufe und erweitert ausschließlich vorher vollständige Werkzeugkataloge. Bewusst eingeschränkte Kataloge bleiben unverändert.

## Prüfung

`tests/archive.mjs` und `tests/archive.php`: Suchvergleich, UND-Verknüpfung, keine still verworfenen Suchbegriffe, Feldnachweise, Status-/Klassifikationsfilter, fehlende Texte, Normalisierung und Dubletten, RAG-Vertrag, lokale PDF-Einstellungen/Leertext/Grenzen/Cleanup, JS/PHP-Validierung, Rechte und fremde Projekte, alte Speicherstände, Löschen/Neuanlegen und Migration mit FK-/Readiness-Erhalt. Der vollständige Labor-, API- und Sicherheitstestlauf wird zusätzlich ausgeführt.

Im Browser geprüft: Bestand, Suche, Metadatenänderung/Speichern, PDF-Import bis zum überprüfbaren Entwurf und alle drei Ansichten bei 320, 768 und 1280 Pixeln; mobile Formulare einspaltig und ohne Seitenüberlauf.

## Lokale OCR

Tesseract.js 7.0.0 mit LSTM-Kernen für normale, SIMD- und Relaxed-SIMD-Ausführung und mitgelieferten deutschen/englischen Sprachdaten. Sämtliche Worker, Kerne und Sprachdaten werden aus `/assets/runtime/ocr/` geladen. Sprachdaten werden unkomprimiert als `.traineddata` ausgeliefert, damit automatische HTTP-Dekomprimierung auf dem Webserver keine doppelte Dekomprimierung auslöst. Die Pakete sind exakt festgeschrieben; Build und Integritätsmanifest enthalten alle Laufzeitdateien und Quellenangaben. Kein CDN, kein externer OCR-Dienst, keine KI-Tokens, kein Browser-Cache mit Dokumenten.

Bei vorhandener Textebene startet kein OCR-Worker. Gemischte PDFs behalten Seitenreihenfolge und `[Seite N]`-Kennungen. OCR-Importe speichern Erkennungsart, Sprache, Seitenzahl, OCR-Seiten und ursprüngliche Engine-Konfidenz als optionale Metadaten. Konfidenz ist keine Wahrscheinlichkeit fachlicher Richtigkeit; niedrige Werte führen nur zu einem Prüfhinweis. OCR-Dokumente bleiben zunächst „Ungeprüft“ und erscheinen mit dem Hinweis „OCR-Text prüfen“.

Sprache und Drehung lassen sich unter „Sprache & Ausrichtung“ ändern. Eine Änderung verlangt eine neue Erkennung und übernimmt keine veralteten Resultate. Abbrechen, Escape, Schließen oder Projekt-/Ansichtswechsel stoppen die Verarbeitung einschließlich laufender Initialisierung. Ein eigener Supervisor-Worker besitzt den OCR-Unterworker; beide werden beim Abbruch beendet. PDF-Parser, Canvas-Flächen, Bitmaps und Vorschau-URLs werden freigegeben. Ergebnisse überschreiben keine Archivarbeit ohne abschließendes Speichern im Metadaten-Editor. Kopf und Aktionen des OCR-Dialogs bleiben sichtbar, der Inhalt scrollt.

Zusätzliche Tests: `tests/archive-ocr.mjs` für Sprach-/Drehoptionen, Bildgrößen, Worker-Abbruch während Initialisierung, späte Antworten, gemischte PDFs, erzwungene OCR, Seitenzuordnung, Textgrenzen und Cleanup. Echte Browserprüfung mit synthetischem deutschem Bild und PDF ohne Textebene: „fünf Werktage“ und Auftragsnummer korrekt erkannt, Speicherung/Metadaten und Abbruch geprüft.

Primärdokumentation: [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [lokale Installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md). Die Anwendung nutzt ausschließlich explizite lokale Pfade und `workerBlobURL: false`; die bestehende Dokument-CSP bleibt unverändert.
