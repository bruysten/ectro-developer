# Statistik Lab

Die erste Funktion ist eine Warenkorbanalyse. Das Lab gehört unter „Daten & Erkenntnisse“ und verwendet dieselbe Projekt-, Speicher-, Versions- und Freigabelogik wie die übrigen projektbezogenen Labs. `statistics_lab` lässt sich im Backend pro Gruppe, Konto und systemweit sperren. Eingeschränkte Projekt-/Vorlagenkataloge bleiben eingeschränkt. Nur ein bisher vollständig freigegebener Projektkatalog wird bei der Migration um das neue Lab erweitert.

## Lernablauf

- Mit Modekäufen (19 Warenkörbe), Veröffentlichungen und Werbeformaten (7 Zeilen) oder einer leeren Analyse beginnen.
- Links und rechts eine Kombination aus bis zu fünf unterschiedlichen Artikeln auswählen. Innerhalb einer Seite gilt UND. Die Seiten sind disjunkt.
- Support, Konfidenz und Lift lesen. Die ausgewählte Kennzahl hebt Zähler und Vergleichsmenge in der bearbeitbaren Matrix hervor.
- Die Warenkörbe einzeln oder automatisch zählen. Zwischenstände beziehen sich ausdrücklich nur auf die bereits gezählten Zeilen; die aktive Zeile und ihr Beitrag werden sichtbar. Pause und Gesamtergebnis sind jederzeit erreichbar. Animationen beachten `prefers-reduced-motion`.
- Zellen ändern und beobachten, wie sich die Kennzahlen verändern. Weitere Regeln mit je einem Artikel pro Seite nach Support und Konfidenz filtern, auswählen oder als CSV exportieren.

## Datenübernahme

Der vorhandene Quellenwähler bietet Projektdatensätze, JSON-Dateien, JSON-Upload, Graphentabellen und freigegebene MySQL-/MariaDB-Tabellen an. Das Lab übernimmt eine bearbeitbare Kopie und verändert die Quelle nicht. Erneutes Einlesen und Übernehmen ist eine ausdrückliche Aktion.

Zwei Datenformen:

1. Bestellpositionen: Warenkorb-ID und Artikelspalte zuordnen. Gleiche IDs bilden einen Warenkorb. Doppelte Artikel werden darin dedupliziert; Mengen werden nicht als Transaktionen gezählt. Leere IDs/Artikel werden abgewiesen.
2. Artikelmatrix: eine Zeile pro Warenkorb, optional eine eindeutige ID-Spalte. Gewählte Artikelspalten enthalten ausschließlich 0/1 oder true/false (auch die entsprechenden kleingeschriebenen Zeichenketten). Unbekannte/fehlende Werte werden nicht stillschweigend als Nichtkauf gewertet. Ein Warenkorb mit lauter Nullen bleibt ausdrücklich im Nenner.

Grenzen: höchstens 1 MB pro gespeicherter Analyse (wie bei den übrigen Laborobjekten), 50 Artikel, bis zu 1.000 Warenkörbe bzw. die niedrigere konfigurierte Zeilengrenze; eine Quelltabelle darf bis zu 1.000 vollständige Zeilen umfassen. Als unvollständig markierte Quellen werden abgewiesen, weil abgeschnittene Positionen die Zusammensetzung von Warenkörben verändern können. Die Matrix zeigt 12 Zeilen pro Seite und scrollt bei vielen Artikeln innerhalb ihres Bereichs. Artikelauswahl ab neun Artikeln ist kompakt aufklappbar. Verglichen werden höchstens 2.450 gerichtete Einzelartikel-Regeln; Mehrartikel-Regeln lassen sich gezielt zusammensetzen.

## Berechnung und Interpretation

Mit N Warenkörben, n(A) Warenkörben mit allen Ausgangsartikeln, n(B) mit allen Zielartikeln und n(A ∩ B) mit beiden Kombinationen:

- Support = n(A ∩ B) / N
- Konfidenz = n(A ∩ B) / n(A)
- Lift = Konfidenz / (n(B) / N)

Gerechnet wird mit ungerundeten Werten. Die Anzeige rundet auf höchstens zwei Nachkommastellen. Bei Nenner null steht „–“, nicht 0 oder unendlich. Ohne gemeinsame Käufe, aber mit gültigen Nennern, sind Support, Konfidenz und Lift 0. Beim Umkehren bleiben Support und Lift gleich; Konfidenz kann sich ändern.

Lift vergleicht mit der allgemeinen Häufigkeit von B, **nicht** mit der Häufigkeit von B ausschließlich ohne A. Ein beobachteter Zusammenhang belegt weder Kausalität noch zeitliche Reihenfolge. Es gibt keine Signifikanzprüfung, keinen Beleg für eine Kaufwirkung und keine Schätzung außerhalb der gewählten Daten. Kleine Fallzahlen und Stichprobenauswahl bleiben sichtbar.

Methodische Referenz: [IBM: Lift in an association rule](https://www.ibm.com/docs/en/db2/11.1.0?topic=SSEPGG_11.1.0/com.ibm.im.model.doc/c_lift_in_an_association_rule.htm). Die Umsetzung benötigt keine externe Bibliothek oder externen Dienst.

## Verifikation

`node tests/statistics.mjs` prüft Zählungen, jede Zählungspräfixmenge, Richtungsumkehr, Mehrartikel-Regeln, unabhängige und negative Zusammenhänge, Nullnenner, Regeln-Ranking und Importvalidierung. Der PHP-Vertrag prüft Persistenz, ungültige Inhalte und Gruppen-/Projektfreigaben sowie die Migration einer bestehenden Datenbank einschließlich Readiness-Historie. Die Tests sind in `node tests/lab-models.mjs` eingebunden.

`python3 tests/labs-integration.py` prüft zusätzlich HTTP-Persistenz, Versionskonflikte, Isolation und wirksames Entziehen/Wiedererteilen der Gruppenfreigabe. Browserprüfung: Datenübernahme mit doppelten Positionen, Speichern/Neuladen, manueller Start, Regelumkehr, Einzelzählung, Wiedergabe und responsive Ansichten.

## Zweites Verfahren: einfache lineare Regression

Die Verfahrensleiste bietet Warenkorbanalyse und lineare Regression. Jede gespeicherte Statistik-Arbeit kann beide Experimente unabhängig enthalten. Bestehende Warenkorbinhalte ohne Verfahrenskennung bleiben unverändert les- und speicherbar. Beim Anlegen einer neuen Arbeit lässt sich das Verfahren auswählen. Beide Verfahren verwenden dieselbe Gruppenfreigabe `statistics_lab`.

Die Regression arbeitet mit einem X-Wert und einem Y-Wert je Beobachtung:

- Direkt verschiebbare Punkte; Pfeiltasten und explizite Wertefelder als Alternative. Ziehen verwendet Pointer Capture, gebündelte Bildaktualisierung und korrekte SVG-Koordinaten; Abbruch stellt den Ausgangspunkt wieder her.
- Steigung und Achsenabschnitt manuell verändern. Die angezeigte Gleichung, senkrechten Residuen und ihre Quadrate beziehen sich immer auf die angezeigte Gerade. Die numerische Berechnung bleibt ungerundet, obwohl Eingabefelder und Anzeigen kompakt formatiert sind.
- „Beste Gerade finden“ berechnet die OLS-Lösung und zeigt eine kurze Annäherung. Jeder Zwischenstand zeigt den tatsächlich berechneten Fehler dieser interpolierten Geraden; die Animation behauptet kein iteratives Optimierungsverfahren. Reduzierte Bewegung überspringt die Animation.
- Einen Ausreißer ergänzen und über „Für Berechnung verwenden“ ausschließen. Ausgeschlossene Punkte bleiben sichtbar und beeinflussen weder Mittelwerte noch Anpassung, Fehler oder R².
- Die aufklappbaren Schritte zeigen Mittelwertkreuz, Abweichungen eines ausgewählten Punktes, die Summen aller eingeschlossenen Punkte, Steigung und Achsenabschnitt. Die Detailtabelle ist paginiert. Eine gestrichelte Referenz unterscheidet die beste von der manuell eingestellten Geraden.
- Für einen frei gewählten X-Wert mit der angezeigten Geraden schätzen. X-Werte außerhalb des eingeschlossenen Datenbereichs sind ausdrücklich als Extrapolation gekennzeichnet.
- Projekttabellen/JSON/MySQL über den bestehenden Quellenwähler als Kopie übernehmen. X, Y und optional eine Punktbezeichnung zuordnen. Fehlende Werte, Zeichenketten anstelle von Zahlen und unvollständige Quellausschnitte werden abgewiesen. Bis zu 1.000 Punkte bzw. die niedrigere konfigurierte Zeilengrenze; bestehendes 1-MB-Objektlimit. CSV exportiert Punkte, Einschlussstatus und Werte der angezeigten Geraden.

Mit ΔX = X − ØX und ΔY = Y − ØY gilt für die beste Gerade mit Achsenabschnitt:

- m = Σ(ΔX × ΔY) / Σ(ΔX²)
- b = ØY − m × ØX
- Ŷ = b + m × X
- Residuum e = Y − Ŷ; Fehler = Σe²
- R² = 1 − Σe² / Σ(Y − ØY)², bezogen auf die beste Gerade und die eingeschlossenen Daten.

Zentrierte Summen vermeiden die Subtraktion großer, fast gleicher Rohsummen. Zur Vorhersage im angepassten Modell wird die zentrierte Form verwendet. Gleiche X-Werte ergeben keine eindeutige Steigung; konstante Y-Werte ergeben R² „–“. Numerisch zu kleine Unterschiede oder unvertretbare Koeffizientengrößen liefern einen Hinweis auf passendere Einheiten. Das Lab führt keine Signifikanztests aus und liefert keine Konfidenz-/Vorhersageintervalle. Ein gutes R² belegt keine Kausalität und keine Prognosequalität auf neuen Daten.

Methodik: [NIST: Least Squares](https://www.itl.nist.gov/div898/handbook/pmd/section4/pmd431.htm), [Penn State: Simple Linear Regression](https://online.stat.psu.edu/stat501/Lesson01).

`node tests/regression.mjs` prüft bekannte Ergebnisse, das Minimum der Fehlerquadratsumme, Vorzeichen, Mittelwert-/Konstantfälle, große Offsets, Ausschluss von Punkten, Importvalidierung und reale Fehler in der Animation. PHP-Vertragstests prüfen Validierung, Speicherung beider Verfahren, Legacy-Kompatibilität und Berechtigungen. In den Lab-HTTP-Tests werden auch Regressionsinhalte und fehlende Koordinaten über die API geprüft.

### Drei Branchenbeispiele für lineare Regression

„Beispiel wählen“ gruppiert die bisherigen Grundlagen und drei zusätzliche Praxisfälle. Eine kurze Vorschau erklärt die Beobachtungseinheit und den Schätzauftrag vor der Übernahme. Im Arbeitsbereich bleibt der Auftrag kompakt sichtbar; Datenrahmen und Lernauftrag sind aufklappbar.

| Beispiel | Ein Punkt | X → Y | Beobachtungen / Schätzauftrag |
| --- | --- | --- | --- |
| Verlag & Medien | Newsletter-Kampagne mit gleichem Digitalabo-Angebot und einheitlicher Zuordnung | Eindeutige Klicks in Tausend → zugeordnete neue Probeabos innerhalb von sieben Tagen | 14 / 4.500 Klicks |
| Deutsche Industrie | Vergleichbares Fertigungslos auf derselben Maschine mit gleicher Bearbeitungsfolge | Losgröße in Stück → Maschinenbelegungsstunden einschließlich Rüsten | 12 / Los mit 450 Teilen |
| Versicherung | Teamwoche mit vergleichbaren standardisierten Kfz-Glasschäden | Bearbeitete Fälle → erfasste Netto-Bearbeitungsstunden | 14 / 450 Fälle |

Alle Daten sind konstruierte, streuende Übungsdaten und keine Unternehmensbeobachtungen oder Branchenbenchmarks. Die Schätzaufträge liegen innerhalb der jeweiligen X-Spanne. Die Beispiele beginnen mit einer waagerechten Geraden; Lernende verändern sie selbst oder verwenden „Beste Gerade finden“. Beobachtungen haben passende Kampagnen-, Fertigungslos- und Teamwochen-Bezeichnungen.

Die aufklappbaren Hinweise behandeln die jeweilige Übertragbarkeit: Zielgruppen und Saison bei Kampagnen; Rüstanteil, Störungen und Prozesswechsel in der Fertigung; Fallmix sowie die Abgrenzung von Arbeitsstunden, Kalenderwartezeit und Personalstellen bei Versicherungen. Es werden weder individuelle Versicherungsentscheidungen noch Tarifierungen abgebildet.

Die optionale Kennung `regression.example` erhält den Lernkontext beim Speichern und erneuten Laden. Eigene Tabellenimporte verwenden keine solche Kennung; beim Umbenennen von Achsen wird sie entfernt. Bestehende Statistik-Arbeiten ohne Kennung bleiben unverändert. Es entstehen unabhängige Datenkopien; die Warenkorbanalyse derselben Arbeit bleibt erhalten. Zu niedrige konfigurierte Zeilengrenzen werden vor der Übernahme benannt, ohne Punkte stillschweigend abzuschneiden.

Verifikation: `node tests/regression.mjs` prüft zusätzlich alle drei Datensätze, Streuung, Einheiten, gültige Interpolation, Verbesserung gegenüber der Ausgangsgeraden, unveränderte Vorlagen nach Bearbeitung sowie PHP-Speicherung und Verfahrenswechsel einschließlich Kennung. Browserprüfung: Auswahl aller drei Fälle, Anpassung, Schätzung, Speichern/Neuladen und Arbeitsbereich bzw. Dialog bei 320, 768 und 1280 Pixeln.

### Drei Praxisbeispiele für Warenkorbanalyse (B2C und B2B)

„Beispiel wählen“ bietet zusätzlich drei synthetische Auftragsdatensätze. Vorschau und aufklappbarer Lernkontext verwenden dieselbe Gestaltung wie die Regression. Der Warenkorb-Begriff wird je Fall ausdrücklich benannt:

| Fall | Warenkorb | Artikel | Startregel | Startzählung: alle / Ausgang / Ziel / gemeinsam |
| --- | --- | --- | --- | --- |
| B2C · Buchshop | Abgeschlossene Bestellung; Buchtitel sind zu Kategorien zusammengefasst | 6 | Kinderbuch → Geschenkverpackung | 24 / 10 / 9 / 6 |
| B2B · Industriebedarf | Beschaffungsauftrag für eine vergleichbare Anlagenfamilie; Einzelpositionen statt Wartungssets | 6 | Filtereinsatz → Dichtungssatz | 24 / 12 / 13 / 9 |
| B2B · Medienvermarktung | Beauftragte Kampagne mit frei wählbaren Bausteinen | 6 | Newsletterplatzierung → Advertorial | 20 / 10 / 9 / 6 |

Die Lernaufträge behandeln den Vergleich mit der Grundhäufigkeit, die Richtungsumkehr und den Unterschied zwischen verbreiteten Artikeln und überdurchschnittlichen Assoziationen. Im Medienbeispiel ist Display-Werbung insgesamt häufig (13/20), bei Newsletter-Aufträgen aber nur in 5/10 Aufträgen enthalten: Lift kleiner als 1. Stückzahlen, Umsätze, Kundenanzahlen, Anzeigenkontakte und Werbewirkung werden nicht aus den Warenkörben abgeleitet. Alle Daten sind konstruierte Übungsdaten und keine Branchenbenchmarks.

Die optionale Kennung `basketExample` bleibt beim Speichern und beim Wechsel zur Regression erhalten. Der Import eigener Tabellen und das Laden bisheriger Grundlagenbeispiele entfernen den Branchenkontext. Beim Laden eines anderen Warenkorbbeispiels bleibt eine vorhandene Regression unverändert. Konfigurierte Zeilengrenzen werden vor der Übernahme geprüft; Beispiele werden nicht gekürzt.

Zusätzliche Verifikation in `tests/statistics.mjs` / `tests/statistics.php`: exakte Anfangszählungen aller drei Fälle, Richtungsumkehr, jede Zählpräfixmenge, eindeutige IDs und Artikel, unabhängige Kopien, Speicher-Roundtrip, ungültige Kennungen und Erhalt beider Verfahren beim Umschalten. Browserprüfung: alle drei Beispiele laden/speichern, Neuladen, Einzelzählung, Umkehr, unveränderte Regression sowie Ansichten/Dialog bei 320, 768 und 1280 Pixeln. Der Statistik-Arbeitsbereich erhält `min-width:0`, damit breite Matrizen intern scrollen und nicht das umgebende Grid verbreitern. Beim Entfernen eines Artikels wird der Fokus auf ein tatsächlich vorhandenes Auswahlfeld gesetzt.
