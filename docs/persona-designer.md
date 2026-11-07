# Persona-Designer im Customer Journey Lab

Stand: 07.11.2026. Einstieg im Customer Journey Lab über **Persona-Designer**; die Bibliothek gehört zum ausgewählten Projekt. Journey und Bibliothek haben getrennte Speicherabläufe: Persona-Dialoge speichern ihre Profile, **Speichern** in der Journey speichert deren Perspektive und Phasen. Im Designer ist der Journey-Speicherknopf ausgeblendet.

## Forschung und Modellwahl

Die fünf Modelle sind unterschiedliche Arbeitsansichten auf denselben Datenbestand. Ein umfangreicher ausgefülltes Formular ist kein Nachweis besserer Forschung. NN/g unterscheidet [Proto-, qualitative und statistische Personas](https://www.nngroup.com/articles/persona-types/) nach ihrer Forschungsgrundlage. Der Designer führt deshalb den Umfang des Modells und den vom Team eingeordneten Wissensstand getrennt. Statistische Personas werden nicht automatisch erzeugt oder behauptet.

| Modell | Geeignet für | Zusätzliche Angaben |
| --- | --- | --- |
| Kurzprofil | Schneller Einstieg, zunächst als Annahme | Name, Kurzbeschreibung, Ziel, Situation, Bedürfnisse, Hürden |
| Ziele & Verhalten | Bedürfnisse und heutiges Handeln verstehen | Motivation, Verhalten, Kanäle, Kenntnisse |
| Jobs-to-be-done | Kontext, Aufgabe und gewünschten Fortschritt untersuchen | Auslöser, Aufgabe, Erfolgskriterium, heutige Alternativen |
| Empathieprofil | Beobachtungen und Interpretationen strukturieren | Sagt, tut, denkt, fühlt |
| Umfassendes Profil | Mehrere Perspektiven zusammenführen | Alle Angaben sowie Rolle, Rahmenbedingungen, Zugänglichkeit und offene Fragen |

Die Kombination von Verhaltensprofilen und Aufgabenperspektive folgt der Empfehlung, [Personas und Jobs-to-be-done ergänzend zu nutzen](https://www.nngroup.com/articles/personas-jobs-be-done/). Das Empathieprofil übernimmt die vier Bereiche aus [Empathy Mapping](https://www.nngroup.com/articles/empathy-mapping/). Die Feldhinweise trennen dokumentierte Aussagen und sichtbare Handlungen von vermuteten Gedanken und Gefühlen. Ziele, Kontext, Hindernisse und Unterstützungsbedarf orientieren sich außerdem an [GOV.UK: Start by learning user needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs). Diese Quellen begründen die Gestaltung; sie validieren keine konkreten Nutzerprofile.

Bewusst keine Pflichtfelder für Alter, Geschlecht, Einkommen, erfundene Biografien oder Portraits. Nur der Name ist erforderlich. Relevante Rahmenbedingungen lassen sich gezielt ergänzen. Keine KI-Aufrufe, neuen Zugangsdaten oder externen Profilbilder.

## Bedienung

- **Anlegen / Bearbeiten:** einfacher Einstieg mit Live-Vorschau, wenige Kernfelder und aufklappbare Vertiefungen. Ein Modellwechsel behält alle Angaben, auch vorübergehend unsichtbare. Beispielprofile sind ausdrücklich synthetisch; das Ersetzen eigener Eingaben erfordert eine Rückfrage.
- **Wissensstand:** standardmäßig **Annahme**. **Teilweise belegt** und **Mit Belegen** verlangen mindestens eine Quelle mit konkreter Beobachtung. Der Status ist eine Einschätzung des Teams, keine automatische inhaltliche Quellenprüfung. Bis zu sechs Belege je Profil.
- **Vergleichen:** zwei oder drei Profile auswählen. Der Vergleich umfasst die Modellfelder und zusätzlich alle bereits ausgefüllten Merkmale. **Nicht erfasst** markiert Lücken; **Nur Unterschiede anzeigen** reduziert die Ansicht. Auf kleinen Bildschirmen stehen die beschrifteten Werte je Merkmal untereinander.
- **Bibliothek:** Suche nach Name, Kurzbeschreibung und Ziel; CSV-Export aller Profile einschließlich Archiv; Duplizieren; reversibles Archivieren und Wiederherstellen. Höchstens 20 Profile einschließlich Archiv pro Projekt. Archivieren schafft keinen zusätzlichen Platz.
- **In Journey nutzen:** Ziel und Kontext übernehmen; vorhandene Phasen bleiben erhalten. Bei einer anderen Perspektive und vorhandenen Phasen erfolgt eine Rückfrage mit Hinweis auf die nötige fachliche Prüfung.
- **Neue Journey anlegen:** eigener Name; leerer Kundenweg als Standard oder Kopie der vorhandenen Phasen. Kopien erhalten neue IDs und werden als Annahmen markiert. Belegtexte bleiben zur Prüfung erhalten und werden dadurch nicht zu Belegen für die neue Persona.
- **Als neue Persona speichern:** eine Journey-Perspektive einschließlich vorhandener Profildetails in ein neues Bibliotheksprofil übernehmen. Lokal geänderte Kerndaten setzen dessen Wissensstand auf Annahme.

Native beschriftete Formulare und Dialoge unterstützen Tastaturbedienung. Dialoge scrollen intern; Kopf und Aktionen bleiben erreichbar. Desktop-Vorschau neben dem Formular, auf schmalen Bildschirmen darunter. Kein horizontales Tabellenraster auf Mobilgeräten. Ein Abbruch schützt ungespeicherte Änderungen; **Entwurf exportieren** sichert den aktuellen Stand als JSON, auch nach einem Speicherkonflikt. Dieser Entwurfsexport hat keinen eigenen Wiederimport. Gespeicherte Persona-Snapshots sind im bestehenden Journey-JSON-Export enthalten.

## Daten, Rechte und Kompatibilität

`lab_personas` speichert die projektweite Bibliothek mit Versionszähler und Archivstatus. Die Tabelle und der Index werden mit der bestehenden idempotenten Schema-Initialisierung angelegt; Projektlöschung entfernt Bibliotheksprofile über den bestehenden Fremdschlüsselmechanismus. Bisherige Journey-Daten bleiben lesbar und bearbeitbar.

Journey-Inhalte enthalten optional `personaRef` (ID, übernommene Version) und `personaSnapshot` (vollständiger Profilstand), neben den bisherigen Kerndaten `persona`. Bearbeiten oder Archivieren eines Bibliotheksprofils verändert gespeicherte Journeys nicht. **Neueren Stand übernehmen** ist eine ausdrückliche Aktion. Lokale Änderungen an den Journey-Kerndaten werden als Anpassung gekennzeichnet. Importierte Referenzen sind historische Metadaten; die Anwendung liest dadurch keine fremden Projekte. Ein Aktualisierungsangebot kommt ausschließlich aus der autorisierten Projektbibliothek.

Alle drei API-Aktionen (`studio.personas`, `studio.persona.save`, `studio.persona.archive`) prüfen serverseitig Projektzugriff, `journey_lab` und die Projektwerkzeug-Freigabe. POST-Anfragen verwenden den bestehenden CSRF-Schutz. Gruppenmitgliedschaft und Freigaben werden je Anfrage erneut geprüft. Keine zusätzliche eigenständige Gruppenfreigabe: Der Designer ist Teil des Customer Journey Lab und wird damit gemeinsam aktiviert oder deaktiviert.

Speichern und Archivieren sind transaktional und prüfen die erwartete Version. Veraltete Bearbeitungen liefern 409 und behalten den geöffneten Entwurf. Die Bibliothek muss anschließend neu geladen werden. Textlängen, Modell-/Feldlisten, Belegstruktur, Profilanzahl und Workspace-Quota werden serverseitig begrenzt. Bibliotheksinhalte zählen auch beim Wechsel in einen Gruppen-Workspace zum bestehenden Speicherlimit. Texte werden beim Rendern maskiert; CSV-Zellen verwenden die bestehende Absicherung gegen Formelinjektion.

## Prüfung

`tests/persona-models.mjs` und `tests/personas.php` sind in den vorhandenen Studio-Modelllauf eingebunden: alle fünf Modelle, verlustfreies Umschalten, Snapshot-Unabhängigkeit, Unterschiede und Lücken im Vergleich sowie 40 PHP-Prüfungen für Validierung, Versionen, Archiv, Quota, Projekt-/Gruppenisolation, Werkzeug- und Feature-Sperren, Obergrenze und Fremdschlüssel. `tests/studio-integration.py` prüft die neuen HTTP-Routen einschließlich CSRF, fremder Projekte, gesperrter Vorlagen und widerrufener Freigaben.

Lokale Browserprüfung mit synthetischen Daten: Erstellen, Bearbeiten, Modellwechsel, Validierungsfehler und Korrektur, Vergleich, explizites Aktualisieren, Persona-Wechsel, neue Journey, Vorlagenkopie und Archiv. Editor-, Bibliotheks- und Vergleichsprüfung bei Smartphone-, Tablet- und Desktopbreiten. Externe Nutzerforschung und Produktionsbetrieb werden damit nicht ersetzt.

## Bewusste Grenzen und mögliche Erweiterungen

Die Anwendung erfasst Belege pro Profil; einzelne Aussagen sind noch nicht jeweils mit einer konkreten Belegstelle verknüpft. Interviews, statistisches Clustering und Nutzerrekrutierung werden nicht durchgeführt. Vergleichbare Persona-Journeys lassen sich separat anlegen; ein automatischer Vergleich ihrer Phasen und Kennzahlen fehlt. Die Bibliothek wird beim Öffnen, Speichern und mit **Neu laden** aktualisiert; es gibt keinen gemeinsamen Echtzeit-Editor und keine durchsuchbare Versionshistorie. Diese Erweiterungen sollten sich an tatsächlicher Nutzung orientieren, ohne den einfachen Einstieg mit weiteren Pflichtfeldern zu belasten.
