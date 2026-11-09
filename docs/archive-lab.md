# Archiv Lab

Das projektbezogene Lernlabor begleitet „Datenarchive im Griff“: **Bestand → Finden → Prüfen**. Es zeigt anhand eigener Texte und eines bewusst unvollständigen synthetischen Bestands, wie Erschließung, Herkunft und Versionsstatus das Wiederfinden beeinflussen. Es ersetzt keine Originalablage oder revisionssichere Langzeitarchivierung.

## Lernen mit dem Beispiel

1. Eine neue Arbeit leer oder mit Lernbeispiel anlegen. Der Beispielbestand enthält einen aktuellen Prozess, einen überholten Prozess, eine identische Textkopie, eine noch nicht beschlossene Idee und einen Scan ohne Textebene.
2. Unter **Finden** nach „Retoure“ suchen: kein Treffer allein über Dateinamen, ein Treffer durch Schlagwörter. Die Fundgründe nennen die tatsächlich passenden Felder.
3. Nach „Rücksendung“ suchen: alte, neue und ungeprüfte Texte erscheinen. „Nur als aktuell gekennzeichnete Dokumente“ schließt die ungeprüfte Kopie und die alte Fassung aus. „Aktuell“ ist eine manuelle Kennzeichnung, kein Wahrheitsbeweis.
4. Unter **Prüfen** fehlende Angaben und identische Texte öffnen. Schlagwörter ändern und die Wirkung in der Suche untersuchen. Keine automatische Löschung oder Zusammenführung von Dubletten.
5. Bei freigegebener RAG-Werkstatt ein Dokument über **In RAG öffnen** als neue, unabhängige RAG-Arbeit übernehmen. Herkunft, Inhaltsstand und Status bleiben im Text. Es erfolgt dabei kein Modellaufruf. Änderungen am Archiv ändern den übernommenen RAG-Stand nicht.

## Material und Metadaten

Manueller Text, lokale TXT/Markdown/CSV/TSV/JSON-Dateien, Projekttextdateien und PDFs mit Textebene. Der Import öffnet zunächst einen bearbeitbaren Entwurf; Abbrechen speichert nichts. PDF-Text wird mit dem bereits gebündelten PDF.js lokal ausgelesen, einschließlich Seitenkennungen. Keine externen Bibliotheks- oder KI-Aufrufe, kein PDF-Scripting, keine OCR. PDFs ohne auslesbaren Text erhalten einen deutlichen Hinweis und bleiben über Metadaten auffindbar. Office-Dateien werden in dieser ersten Fassung nicht importiert.

Felder: Titel, Originaldateiname, Text, Schlagwörter, Zuständigkeit, Inhaltsstand, Herkunft/Fundstelle, Status (aktuell/ungeprüft/überholt), Vertraulichkeitskennzeichnung und Notiz. Die Kennzeichnung ist **kein zusätzliches Zugriffssystem**; der Editor nennt ausdrücklich die bestehenden Projektberechtigungen. Persönliche Projekte bleiben persönlich, Gruppenprojekte für berechtigte Projektmitglieder gemeinsam sichtbar und bearbeitbar.

Suche: Unicode-NFKC, deutsche Kleinschreibung, alle Suchwörter als UND, Wortteile zählen. Dateinamensuche und Suche über Titel, Schlagwörter, Inhalt und Dateiname verwenden dieselben Status-/Kennzeichnungsfilter. Die Reihenfolge gewichtet Titel mit 4, Schlagwörter mit 3 und Inhalt/Dateiname mit 1 je gefundenem Begriff; kein semantischer Score oder Konfidenzwert. Textdubletten bedeuten identischen normalisierten Text, keine ähnliche Bedeutung. Leere Texte werden nicht zu Dublettengruppen zusammengefasst.

Inventar als formelsicheres CSV, einzelne Texte mit Herkunft/Stand/Status als TXT und vollständige Arbeiten über den gemeinsamen JSON-Export. Entfernen eines Dokuments verlangt eine Bestätigung und löscht ausschließlich den gespeicherten Textstand samt Metadaten. Das Original wird nicht angefasst.

## Grenzen, Rechte und Speichern

`archive_lab` ist in der bestehenden Rechteverwaltung pro Gruppe und global einstellbar; die Rechte aktiver Gruppen werden wie bei allen Labs vereinigt. Zusätzlich gelten persönliche Einschränkungen und der Projektwerkzeugkatalog. Das Lab benötigt `files`, keinen KI-Zugang. Der RAG-Übergang erscheint nur mit RAG-Recht und freigegebenem Projektwerkzeug und wird auch serverseitig geprüft.

Bis zu 50 Dokumente, 12.000 Textzeichen je Dokument, insgesamt 200.000 Textzeichen je Archiv. Bis zu 12 eindeutige Schlagwörter mit je 50 Zeichen. PDF: 5 MB, 30 Seiten, 15 Sekunden; Textdateien: 100 KB. Keine stille Kürzung importierter Inhalte. Die gemeinsamen JSON-/Speichergrenzen gelten zusätzlich. Der PDF-Parser wird auch bei Abbruch/Fehler zerstört.

Dokumentänderungen werden vor Übernahme validiert und mit der bestehenden optimistischen Objektversion gespeichert. Bei Konflikten bleibt der lokale Entwurf erhalten; alte Versionen können entfernte Dokumente nicht wiederherstellen. Die Datenbankmigration erhält abhängige Readiness-Verläufe und erweitert ausschließlich vorher vollständige Werkzeugkataloge. Bewusst eingeschränkte Kataloge bleiben unverändert.

## Prüfung

`tests/archive.mjs` und `tests/archive.php`: Suchvergleich, UND-Verknüpfung, keine still verworfenen Suchbegriffe, Feldnachweise, Status-/Klassifikationsfilter, fehlende Texte, Normalisierung und Dubletten, RAG-Vertrag, lokale PDF-Einstellungen/Leertext/Grenzen/Cleanup, JS/PHP-Validierung, Rechte und fremde Projekte, alte Speicherstände, Löschen/Neuanlegen und Migration mit FK-/Readiness-Erhalt. Der vollständige Labor-, API- und Sicherheitstestlauf wird zusätzlich ausgeführt.

Im Browser geprüft: Bestand, Suche, Metadatenänderung/Speichern, PDF-Import bis zum überprüfbaren Entwurf und alle drei Ansichten bei 320, 768 und 1280 Pixeln; mobile Formulare einspaltig und ohne Seitenüberlauf.
