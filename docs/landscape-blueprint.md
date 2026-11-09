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

Der Einstieg zeigt Systemname, Typ, Verantwortliche, Bereich/Realm und Status sowie Betriebsmodell und Standort/Cloud-Region. Die übrigen Angaben liegen in kompakten, aufklappbaren Bereichen:

| Bereich | Angaben |
|---|---|
| System | Beschreibung, Version, Anbieter/Vendor |
| Zuständigkeit & Kontakte | Administratoren, Notfallkontakt, Datum der letzten Aktualisierung |
| Technik | Sprachen/Plattformen, Servertyp, Betriebssystem, Datenbanksystem, APIs/Schnittstellen, Backup/Wiederherstellung |
| Geschäft & Nutzen | Unterstützte Prozesse, Schlüsselfunktionen, KPIs, Geschäftsrisiken, Prozesszielgruppen, Wettbewerbsvorteile |
| Governance | Regulatory relevance (AI Act, DSA, DMA, GDPR), Sicherheits- und Compliance-Anforderungen, SLAs/Wartung/Support, Lizenzen, Redaktion/fachliche Pflege, Datenqualität |
| Kosten & Wirtschaftlichkeit | Anschaffung, Wartung, Betrieb, Amortisationszeitraum, Migration, Training |
| Nutzung & Berechtigungen | Benutzeranzahl, Abteilungen, Rollen, Rechte, Rechte-Administration, Aktivität/Zufriedenheit |

Kosten werden als beschreibende Angaben mit Währung und Zeitraum erfasst. Unvergleichbare Kosten werden nicht automatisch summiert. Das Datum ist eine manuelle Angabe, keine automatisch behauptete fachliche Prüfung.

Quellen und Ziele werden aus Datenflüssen abgeleitet und nicht noch einmal als widersprüchliche Textlisten im Systemprofil gepflegt. Die Verbindung benennt System A und System B; die Datenrichtung ist A → B, A ← B oder A ↔ B. Die Pfeile zeigen immer den tatsächlichen Datenweg. Übertragene Bestände müssen zu einer Quelle der gewählten Richtung gehören; bei beidseitigen Flüssen sind Bestände beider Systeme möglich. Bei einem Richtungs- oder Systemwechsel bleiben unpassende Zuordnungen sichtbar markiert und blockieren die Übernahme, bis sie bewusst entfernt oder korrigiert wurden. Es wird nichts stillschweigend verworfen. Beim Entfernen eines Systems benennt die Rückfrage die Anzahl zugehöriger Bestände und Flüsse. Das Entfernen eines Bestands entfernt dessen Zuordnungen in Flüssen, nicht die Flüsse selbst.

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


### Datenrichtung und Zugriffsart (09.11.2026)

`direction` verwendet `forward`, `reverse` oder `both`, bezogen auf die unverändert gespeicherten Endpunkte `from` (System A) und `to` (System B). Altbestände ohne Richtung bleiben A → B. Die Karte zeigt den Pfeil am richtigen Ende bzw. an beiden Enden; ein Richtungswechsel ordnet die Systeme nicht neu an. Eingehende, ausgehende und beidseitige Verbindungen, Systemzählungen und Ausfallszenario folgen denselben Datenwegen. Die Karte und Listen benennen die Zugriffsart zusätzlich im Klartext.

`access` ist `unknown` (noch offen), `read` (lesend), `write` (schreibend) oder `readwrite` (beides). Bei A → B heißt lesend: **B liest aus A**; schreibend: **A schreibt nach B**. Beides dokumentiert beide Übertragungsweisen auf diesem Datenweg, nicht automatisch eine Gegenrichtung. Bei A ↔ B gelten die gewählten Übertragungsweisen für beide Datenwege. Unterschiedliche Zugriffsarten, Inhalte oder Frequenzen je Richtung werden als zwei einzelne Flüsse erfasst. Die Live-Vorschau erklärt die Auswahl anhand der wirklichen Systemnamen. Altbeständen werden keine Zugriffsarten unterstellt. Die Angaben dokumentieren die Landschaft und verändern keine realen Datenbankrechte.

Änderungen an Endpunkten, Richtung, Zugriffsart oder Bestandszuordnung setzen einen dokumentierten Fluss zur erneuten Belegprüfung auf „Annahme“. JSON enthält beide neuen Felder; CSV behält die A-/B-Endpunkte (`from`/`to`) und ergänzt Richtung, Zugriffsart, lesbaren Datenweg und Bedeutung. Suche erkennt auch deutsche Zugriffsbezeichnungen. Backendtests prüfen sämtliche zwölf Kombinationen einschließlich Speicherung/Neuladen, Bestandszuordnung und ungültiger Werte; Modelltests zusätzlich Erreichbarkeit, Zählungen, Altbestände und Exportbedeutung.

### Betriebsmodell und regulatorische Relevanz

Das Betriebsmodell steht direkt neben Standort/Cloud-Region: Noch offen, On-Premises, Cloud (einschließlich SaaS), Hybrid oder externes klassisches Hosting. Bestehende Angaben zu Standort/Hosting bleiben erhalten; ältere Profile erhalten keinen erfundenen Betriebsstandort. Die Auswahl wird im Profil, in der Systemliste, Suche und im CSV-Export berücksichtigt.

Unter Governance erfasst ein kompakter englischer Bereich **Regulatory relevance** die vier Regelwerke separat: **Not assessed**, **Relevant**, **Not relevant**. Alle beginnen mit „Not assessed“. Es handelt sich um eine manuelle Relevanzeinschätzung pro System; daraus wird kein Compliance-Status berechnet. Kopieren, JSON-Speicherung und strukturierter CSV-Export erhalten die Einzelangaben. Die englischen Namen folgen den offiziellen Referenzen: [AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), [Digital Services Act](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act), [Digital Markets Act](https://digital-markets-act.ec.europa.eu/about-dma/legislation_en), [General Data Protection Regulation](https://commission.europa.eu/law/law-topic/data-protection/legal-framework-eu-data-protection_en).

## Journey × Landscape: Systeme & Daten

Eine Journey kann genau eine vorhandene Landscape desselben Projekts auswählen. Pro Phase lassen sich die ganze Phase, Ziel, Handlung, Touchpoint, Kanal, Hürde, Verbesserung, Erfolgskriterium sowie einzelne Service-Blueprint-Aktivitäten mit mehreren Systemen und Datenbeständen verknüpfen. Datenbestände bringen ihr besitzendes System als abgeleitete Abhängigkeit mit. Durchgezogene Linien kennzeichnen direkte Zuordnungen, gestrichelte Linien diese Ableitung.

„Systeme & Daten“ zeigt alle Phasen ohne abgeschnittene Randkarten. Ein Journey-Element hebt seine Ressourcen hervor; ein System oder Datenbestand hebt umgekehrt die betroffenen Elemente und Phasen hervor. Journey-Elemente und Blueprint-Aktivitäten haben getrennte Ansichten. Auf schmalen Bildschirmen stehen beide Seiten untereinander; eine namentliche Auswahlzeile hält den Zusammenhang auch ohne Verbindungslinien und unabhängig von Farbe lesbar. Der Suchdialog gruppiert Bestände unter ihren Systemen; vorhandene Zuordnungen lassen sich dort bearbeiten oder ausdrücklich entfernen. CSV exportiert die aktuellen Namen und den gelesenen Quellstand.

Gespeichert werden ausschließlich stabile IDs (`infrastructure.landscape` und `bindings` mit `stage`, `element`, optional `blueprint`, `systems`, `stores`). Namen und Inhalte werden frisch mit den bestehenden Projekt- und Laborrechten gelesen. Quelländerungen erzeugen keine stillen Kopien; Aktualisieren liest den neuen Stand. Entfernte Einzelobjekte werden als fehlende Verweise markiert, entfernte oder gesperrte Landschaften als nicht verfügbar. Unveränderte Verweise bleiben bei gewöhnlichen Journey-Änderungen erhalten. Ein Quellenwechsel entfernt nach Rückfrage die alten Zuordnungen. Die Modellverknüpfung ist keine automatische Prüfung tatsächlicher Betriebsabhängigkeiten.

Serverseitig werden Quellenprojekt, Laborart, Freigaben, Phasen-/Aktivitätszugehörigkeit und alle neuen Ressourcen-IDs geprüft. Höchstens 300 Elementzuordnungen und je 100 System-/Bestandsverweise pro Zuordnung. Beim Entzug von `landscape_lab` werden die Verweise aus Antworten entfernt und beim gewöhnlichen Bearbeiten erhalten. Entzug von `blueprint_lab` blendet auch die zugehörigen Aktivitätsverweise aus und bewahrt sie verlustfrei. Kopieren, Verschieben und Entfernen von Phasen bzw. Aktivitäten berücksichtigen die Zuordnungen.

## Vier zusammenpassende Branchenbeispiele

In beiden Labs über „Beispiel laden“ auswählbar. Bei Freigabe beider Labs entstehen eine neue Landscape und eine zugehörige Journey **in einer gemeinsamen Transaktion**; bei Fehlern oder Quotenüberschreitung entsteht kein halbes Paar. Bestehende Arbeiten werden zuvor gespeichert und nicht ersetzt. Ohne Journey-Freigabe kann ein Landscape-Beispiel einzeln angelegt werden. Der kompakte Einstieg bleibt separat verfügbar.

| Synthetisches Szenario | Systeme / Bestände / Flüsse | Journey |
| --- | --- | --- |
| Deutscher Fach- und Publikumsverlag, 450 Beschäftigte | 20 / 20 / 33 | Digitalabo: Entdecken bis Verlängern oder Beenden |
| Deutscher Kompositversicherer, 6.000 Beschäftigte | 23 / 23 / 38 | Leitungswasserschaden: Orientierung bis Abschluss |
| Regionale Stadtwerke-Gruppe, 1.800 Beschäftigte | 22 / 22 / 34 | Einzug: Tarifwahl bis Rechnung und Klärung |
| Deutsche Maschinenbaugruppe, 20.000 Beschäftigte | 25 / 25 / 46 | Maschinenbeschaffung: Anforderungen bis Betrieb und Service |

Jede Journey enthält sieben Phasen, bei Blueprint-Freigabe 28 Aktivitäten und 56 konkrete Elementzuordnungen. Alle Aussagen, Stimmungen, Kosten und Systemgrößen sind fiktive Lernannahmen. Die Profile enthalten Verantwortungen, Betriebsmodelle, technische Angaben, Geschäftsnutzen, Governance, regulatorische Relevanzeinschätzung und Kosten-/Nutzungsangaben. Energie-Marktrollen bleiben getrennt; OT-Grenzen und kontrollierte Schnittstellen sind ausdrücklich modelliert. Geplante KI-Piloten sind als geplant gekennzeichnet.

Fachliche Bezugspunkte für die Modellierung: [VLB · ONIX-Titeldaten](https://vlb.de/hilfe/datenbezug/onix-titeldaten), [VLB · Datenanlieferung](https://vlb.de/hilfe/datenanlieferung), [BiPRO · Branchenstandards](https://bipro.net/ueber-bipro/bipro-normen/), [Bundesnetzagentur · Digitalisierung der Netzsektoren](https://www.bundesnetzagentur.de/SharedDocs/Downloads/DE/Sachgebiete/Telekommunikation/Unternehmen_Institutionen/Digitalisierung/Grundsatzpapier/Digitalisierung.pdf?__blob=publicationFile&v=1), [VDMA · OPC UA im Maschinenbau](https://www.vdma.eu/de/opcua). Die konkreten Architekturen sind eigene synthetische Lernmodelle.

Zusätzliche Prüfung: `node tests/journey-landscape.mjs` prüft alle vier Paarvorlagen, vollständige Referenzen, Kopier-/Verschiebe-/Löschlogik, atomare Speicherung einschließlich Quotenfehlern, Quellenisolation, Freigabeentzug, verlustfreie Redaktion sowie veraltete Verweise. `python3 tests/studio-integration.py` prüft den HTTP-Vertrag einschließlich CSRF, POST-Pflicht, fremden Projekten und Transaktionsrollback. Browserprüfung mit dem bestehenden Testkonto: vier Beispielpaare anlegen, manuelle Auswahl einer bestehenden Landschaft, Datenpool-Zuordnung mit abgeleitetem System, Speichern/Neuladen, Systemfokus über mehrere Phasen, Blueprint-Direkteinstieg und Ansichten/Formulare bei 320, 768 und 1280 px.
