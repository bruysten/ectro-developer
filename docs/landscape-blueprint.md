# Service-Blueprint und Digital Landscape Lab

Stand: 08.11.2026. Beide Bereiche sind native Bestandteile der Anwendung, ohne zusätzliche externe Dienste, CDN-Module oder Bibliotheken.

## Service-Blueprint im Journey Lab

Die zusätzliche Ansicht verwendet dieselben Phasen und dieselbe Perspektive wie die Journey. Kundenhandlungen und Touchpoints werden aus den Phasen gelesen. Kontaktmittel, sichtbare Leistungen, interne Aktivitäten und unterstützende Prozesse werden als eigene Aktivitäten ergänzt. Interaktionslinie, Sichtbarkeitslinie und Linie der internen Zusammenarbeit trennen die Ebenen. Die Struktur orientiert sich an [Service Blueprints: Definition, Nielsen Norman Group](https://www.nngroup.com/articles/service-blueprints-definition/); die Oberfläche verwendet das eigene Designsystem, keine übernommenen Vorlagen oder Grafiken.

Aktivitäten enthalten Beschreibung, Zuständigkeit, beschreibende System- und Datenbezüge, eine optionale Modelldauer in Minuten sowie Annahme/Beobachtung und Beleg. Systembezeichnungen sind hier beschreibende Angaben, keine automatisch synchronisierten Verweise auf eine Landscape. Gerichtete Abhängigkeiten verbinden Aktivitäten auch über Phasengrenzen. Ein Pfeil A → B bedeutet: A ermöglicht B.

Die Übersicht zeigt Phasen als Spalten und Leistungsebenen als Zeilen. Der breite Arbeitsbereich scrollt intern; eine mobile Phasenansicht zeigt dieselben Ebenen untereinander. Verbindungen einer gewählten Aktivität werden als Pfeile hervorgehoben. Das Störungsszenario markiert über erfasste Verbindungen erreichbare Aktivitäten und betroffene Phasen. Dies zeigt das eingetragene Modell, keine gesicherte Wirkung eines realen Ausfalls. Das Szenario verändert keine gespeicherten Aktivitäten.

Phasenumbenennung und Reihenfolge bleiben mit der Journey verbunden. Entfernen einer Phase entfernt zugehörige Aktivitäten und Abhängigkeiten aus dem Entwurf. Duplizieren kopiert deren Aktivitäten mit neuen IDs sowie Verbindungen innerhalb der kopierten Phase; Aussagen werden als Annahmen gekennzeichnet. Beim Ersetzen von Phasen aus einer Quelle weist die Rückfrage auf den Austausch der zugehörigen Blueprint-Inhalte hin. Das synthetische Blueprint-Beispiel ergänzt die vorhandenen Phasen, ohne die Journey zu ersetzen.

CSV exportiert Aktivitäten mit Phase, Ebene und Abhängigkeiten; der bestehende Labor-JSON-Export enthält den vollständigen Blueprint. Szenarioauswahl und Ansicht sind lokale Arbeitszustände.

## Digital Landscape Lab

Route: `/#landscape-lab`. Eine gespeicherte Landschaft gehört zu einem persönlichen oder gemeinsamen Projekt. In einer Arbeit lassen sich viele Systeme, deren Datenbestände und gerichtete Datenflüsse erfassen. Mehrere Landschaften pro Projekt sind möglich.

Vier Ansichten verwenden denselben Bestand:

- **Übersicht:** interaktive Systemkarte mit Auswahl, Profil, Datenbeständen und direkten ein-/ausgehenden Datenflüssen; Zoomen, Verschieben und Einpassen sind auch per Tastatur möglich.
- **Systeme:** durchsuchbares Verzeichnis mit Zuständigkeit, Bereich und Anzahl zugeordneter Bestände und Flüsse.
- **Datenbestände:** Datenarten, Formate, Umfang, Klassifikation, Qualität, Zweck, Aufbewahrung und Notizen, jeweils einem System zugeordnet.
- **Datenflüsse:** Quelle, Ziel, übertragene Bestände, Inhalt, Methode, Frequenz, Format, Umfang, Übertragungssicherheit, Verantwortung, Kritikalität und Belegstatus.

Mobile Verzeichnisse stellen Einträge als kompakte Karten dar. Such- und Bereichsfilter gelten für den gemeinsamen Bestand. Die gefilterte Karte zeigt zusätzlich direkte Nachbarn, damit Schnittstellen über Bereichsgrenzen erkennbar bleiben. CSV enthält sämtliche gefilterten Einträge, unabhängig von der aktuellen Seite. JSON verwendet die vorhandene validierte Import-/Exportfunktion.

### Systemprofil nach der bereitgestellten Vorlage

Der Einstieg zeigt Systemname, Typ, Verantwortliche, Bereich/Realm und Status. Die übrigen Angaben liegen in kompakten, aufklappbaren Bereichen:

| Bereich | Angaben |
|---|---|
| System | Beschreibung, Version, Anbieter/Vendor, Standort/Hosting |
| Zuständigkeit & Kontakte | Administratoren, Notfallkontakt, Datum der letzten Aktualisierung |
| Technik | Sprachen/Plattformen, Servertyp, Betriebssystem, Datenbanksystem, APIs/Schnittstellen, Backup/Wiederherstellung |
| Geschäft & Nutzen | Unterstützte Prozesse, Schlüsselfunktionen, KPIs, Geschäftsrisiken, Prozesszielgruppen, Wettbewerbsvorteile |
| Governance | Sicherheits- und Compliance-Anforderungen, SLAs/Wartung/Support, Lizenzen, Redaktion/fachliche Pflege, Datenqualität |
| Kosten & Wirtschaftlichkeit | Anschaffung, Wartung, Betrieb, Amortisationszeitraum, Migration, Training |
| Nutzung & Berechtigungen | Benutzeranzahl, Abteilungen, Rollen, Rechte, Rechte-Administration, Aktivität/Zufriedenheit |

Kosten werden als beschreibende Angaben mit Währung und Zeitraum erfasst. Unvergleichbare Kosten werden nicht automatisch summiert. Das Datum ist eine manuelle Angabe, keine automatisch behauptete fachliche Prüfung.

Quellen und Ziele werden aus Datenflüssen abgeleitet und nicht noch einmal als widersprüchliche Textlisten im Systemprofil gepflegt. Übertragene Datenbestände dürfen ausschließlich zum Quellsystem gehören. Ein Richtungstausch leert deshalb die Bestandsauswahl. Für einen Rückweg wird ein eigener Datenfluss erfasst. Beim Entfernen eines Systems benennt die Rückfrage die Anzahl zugehöriger Bestände und Flüsse. Das Entfernen eines Bestands entfernt dessen Zuordnungen in Flüssen, nicht die Flüsse selbst.

Das Ausfallszenario verfolgt gerichtete Datenflüsse und markiert nachgelagerte Systeme; es ist eine Erreichbarkeitsanalyse des dokumentierten Modells. Offene Zuständigkeiten, fehlende Flüsse, unbekannte Klassifikationen und unbelegte Flüsse sind separat untersuchbar. Sie sind Hinweise auf Dokumentationslücken, kein automatisches Audit. Ein synthetisches Handelsunternehmen dient als bearbeitbares Beispiel.

## Gruppenfreigaben, Speicherung und Grenzen

Unter den bestehenden Gruppenrechten sind zwei unabhängige Schalter ergänzt:

- `journey_lab` + `blueprint_lab`: Journey und darin die Service-Blueprint-Erweiterung. Beide benötigen den bestehenden Projektzugriff.
- `landscape_lab`: Digital Landscape Lab; zusätzlich gelten Projektzugriff und die Werkzeugfreigabe der Projektvorlage.

Globale Sperren, persönliche Einschränkungen und aktive Gruppenzeiträume gelten unverändert. Ein gesperrter Blueprint wird serverseitig aus Journey-Antworten entfernt. Normale Journey-Änderungen erhalten den verborgenen Blueprint; Phasen mit verborgenen Aktivitäten lassen sich dabei nicht löschen. Direkte Schreib- und Validierungsversuche für die gesperrte Erweiterung werden abgewiesen. Landscape-Objekte werden bei gesperrtem Gruppenrecht nicht in der Objektliste angeboten.

Formulare warnen vor dem Verwerfen nicht übernommener Eingaben. Übernehmen ändert den lokalen Entwurf; erst das gemeinsame Speichern schreibt die Laborarbeit. Bestehende Versionsprüfungen verhindern das Überschreiben paralleler Änderungen. Andere gespeicherte Versionen werden bei unverändertem lokalem Stand über die vorhandene Laboraktualisierung geladen; es gibt keine automatische Zusammenführung gleichzeitig geänderter Systemprofile.

Die bestehende 1-MB-Grenze pro Laborarbeit und der Workspace-Speicher gelten weiter. Standardmäßig gelten 500 Systeme, 1.000 Bestände und 1.500 Flüsse, abgeleitet aus den administrierbaren Laborgrenzen. Die Karte begrenzt die gleichzeitige Darstellung auf 120 Systeme und 360 Flüsse und kennzeichnet Ausschnitte sichtbar; Verzeichnis, Suche und Export behalten den vollständigen Bestand. Ein Blueprint unterstützt 20 Journey-Phasen, 300 Aktivitäten und 600 Abhängigkeiten. Diese Grenzen verhindern unbrauchbare oder blockierende Arbeitsflächen.

Die SQLite-Erweiterung erhält bestehende Laborobjekte, IDs, Inhalte und Versionen. Ehemals vollständige Werkzeugkataloge mit fünf oder elf Arten werden erweitert; eingeschränkte Vorlagen und Projekte bleiben eingeschränkt.

## Prüfung

`tests/landscape-blueprint.mjs` und der zugehörige PHP-Vertrag prüfen alle Profilfelder, Bestände und Quellzuordnung, Modellkopien, Löschabhängigkeiten, zyklische Erreichbarkeit, Grenzen der Kartendarstellung, Zwischenmigration, private/geteilte Zugriffe, Versionskonflikte und verlustfreie Blueprint-Redaktion. Der bestehende HTTP-Test prüft zusätzlich CSRF, gesperrte Validierung, Objektlisten und Widerruf/Reaktivierung beider Gruppenrechte.

Browserprüfung: Blueprint-Übersicht und Phasenansicht sowie alle vier Landscape-Ansichten bei 320, 390, 768 und 1280 px; mobile Formulare und Eintragskarten; Anlegen/Verknüpfen/Speichern/Neuladen; dynamische Datenbestandsauswahl bei Richtungswechsel; Formulardiscard; stabile Kartenauswahl und Tastaturzoom. Physische Touchgeräte sind damit nicht abgenommen.

## Nächste mögliche Ergänzungen

Wie besprochen nach Abschluss wieder aufgreifen: **Datenfluss Lab** für wiederholbare Verarbeitungsschritte und **Experiment Lab** für simulierte Versuche und belastbare Entscheidungen. Das Landscape Lab dokumentiert Systemlandschaften und Schnittstellen; ausführbare Transformationsabläufe wären die Aufgabe des späteren Datenfluss Labs.
