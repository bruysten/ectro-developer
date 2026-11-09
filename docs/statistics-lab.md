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
