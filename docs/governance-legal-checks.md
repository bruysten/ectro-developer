# Legal & Compliance im Governance Lab

Katalogstand: 11. November 2026. Eigenständige, lokal ausgeführte Academy-Funktion ohne weitere Laufzeitabhängigkeit oder Übermittlung von Prüfinhalten an einen externen Dienst.

## Arbeitsweg

Unter **Governance Lab → Legal & Compliance → Check beginnen** einen Datenbestand, Datenfluss, ein System oder die gesamte Organisation auswählen und den konkreten Verwendungszweck benennen. Mehrere Zwecke derselben Ressource sind separate Fälle. Der geführte Ablauf trennt:

1. **Relevanz klären:** wenige, schrittweise eingeblendete Auswahlfragen zu Anwendungsbereich, Rolle und Tätigkeit; fachlich verantwortete Einordnung mit Begründung und Datum.
2. **Pflichten prüfen:** nur zum Kontext passende Prüfschritte. Stand, Nachweis bzw. Abweichung, Verantwortlichkeit, interner Maßnahmentermin und optionale Wiedervorlage; vorhandene Governance-Regeln lassen sich als zusätzliche Nachweise verknüpfen.
3. **Ergebnis & To-dos:** konkrete Befunde und nächste Schritte. Direkte Links öffnen den passenden Prüfschritt. Die Gesamtansicht zeigt die vier Rechtsrahmen je Fall, Filter, offene Aufgaben, überfällige Termine und CSV-Export.

Eine Vorlage übernimmt Kontextantworten und ausdrücklich ungeprüfte Planungshinweise. Erfüllungen, Ausnahmen und Bestätigungen werden dabei zurückgesetzt. Ein vorhandener Check kann unter **Datenbezug & Zweck bearbeiten** entfernt werden; das folgt der vorhandenen versionierten Speicherlogik.

## Aussage und Grenzen des Ergebnisses

Der Katalog umfasst 49 thematisch gebündelte Prüfschritte: GDPR 14, DMA 10, DSA 12, AI Act 13. Er ist eine didaktische, nachvollziehbare Selbsteinschätzung und keine erschöpfende Prüfung aller gesetzlichen Einzelpflichten, nationalen Sonderregeln oder branchenspezifischen Anforderungen. **„Prüfliste belegt“** bedeutet, dass die einschlägigen Katalogschritte mit aktuellen dokumentierten Nachweisen bzw. zulässigen begründeten Ausnahmen erfasst wurden. Es bedeutet keine Rechtskonformitäts-Zertifizierung.

- **Einordnung offen:** notwendige Kontextantworten fehlen oder widersprechen sich.
- **Nachweise offen:** Anwendungsbereich oder passende Kontrollen sind noch nicht ausreichend dokumentiert.
- **Abweichung:** ein einschlägiger aktueller Pflichtenschritt weist eine dokumentierte Abweichung auf; mögliche verbotene KI-Verwendungen erzeugen zusätzlich einen ausdrücklichen Klärungsbefund.
- **Erneut prüfen:** Quellkontext geändert, Quelle nicht verfügbar oder Wiedervorlage fällig.
- **Nicht relevant · begründet:** eine aktuelle fachlich verantwortete Nichtanwendbarkeit liegt vor.
- **Indirekter Bezug:** praktische Rechte und Abhängigkeiten als Nutzer eines fremden Dienstes, ohne dessen Anbieter-/Gatekeeper-Pflichten der eigenen Organisation aufzuerlegen.
- **Vorbereitung offen:** noch offene Vorbereitung auf künftig einschlägige Katalogpflichten, getrennt von heutigen Abweichungen.

Risiken zählen dokumentierte aktuelle Pflichtabweichungen und mögliche Verbotstatbestände. Offene/ungeklärte Prüfungen bleiben als Aufgaben sichtbar; aus ihrer Abwesenheit wird keine Sicherheit abgeleitet. Die Abdeckung nennt ausdrücklich erfasste Ressourcen gegenüber allen Systemen, Beständen und Flüssen der Landscape. Ein Organisationscheck ersetzt keine ressourcenbezogenen Einzelchecks. Es gibt keinen künstlichen prozentualen „Legal Score“.

## Fachliche Differenzierung und Primärquellen

Der versionierte Katalog `app/governance-legal-catalog.json` enthält Quellenlinks und Artikelbezüge direkt an den Fragen und Prüfschritten. Die Oberfläche hält sie aufklappbar bereit. Grundlage der eigenen Fragen und Gruppierungen:

- **GDPR:** Personenbezug, räumlicher Geltungsbereich, Verantwortlicher/Auftragsverarbeiter/gemeinsame Rollen; Art. 9/10, Unterauftragsverarbeitung, Drittlandzugriff, hohes Risiko und automatisierte Entscheidungen. Die Rolle beeinflusst die Pflichtliste. Art.-30-Dokumentation und DPO-Prüfung werden separat behandelt; eine Ausnahme benötigt eine konkrete Begründung. Quellen: [Verordnung 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng), [EDPB Grundlagen](https://www.edpb.europa.eu/sme/learn-the-basics/data-protection-basics_en), [Rollen](https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en), [rechtmäßige Verarbeitung](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en), [Betroffenenrechte](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en).
- **DMA:** förmliche Benennung des konkreten Dienstes und mögliche Meldepflicht von bloßer Geschäftsnutzung trennen. Geschäftsnutzer erhalten praktische Datenzugangs-/Werbetransparenzchecks, keine eigenen Gatekeeper-Pflichten. Quellen: [Verordnung 2022/1925](https://eur-lex.europa.eu/eli/reg/2022/1925/oj/eng), [Kommission: DMA](https://digital-markets-act.ec.europa.eu/about-dma_en), [benannte Gatekeeper](https://competition-cases.ec.europa.eu/gatekeepers).
- **DSA:** eigene Dienste von Fremddienstnutzung trennen; Durchleitung, Caching, Hosting, Plattform, Marktplatz, VLOP/VLOSE sowie einschlägige Größen-Ausnahmen unterscheiden. Eine kleine Organisation ist nicht pauschal von allen Hostingpflichten befreit. Werbung, Minderjährige und Empfehlungssysteme werden gesondert abgefragt. Quellen: [Verordnung 2022/2065](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng), [Kommission: DSA](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act), [Eurojust-Faktenblatt](https://www.eurojust.europa.eu/sites/default/files/assets/eurojust-digital-services-act-factsheet-2024-en.pdf), [Kommissionsleitlinien zum Minderjährigenschutz](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ%3AC_202505519).
- **AI Act:** Betreiber, Anbieter, gemeinsame Rolle, GPAI-Anbieter und Einführer/Händler unterscheiden. Einsatz-/Risikoklasse, Transparenz, Kontrolle über Eingabedaten, Grundrechte-Folgenabschätzung und Übergangsregeln bestimmen die Liste. Der am 11.11.2026 recherchierte [Service-Desk-Text zu Art. 113](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113) basiert auf der konsolidierten Fassung vom 27.07.2026: Hochrisiko nach Anhang III ab **02.12.2027**, nach Art. 6 Abs. 1/Anhang I ab **02.08.2028**. Die betreffenden Kontrollen erscheinen vorher als Vorbereitung. Bereits geltende Kompetenz-, Verbots-, Transparenz- oder GPAI-Prüfungen werden dadurch nicht pauschal verschoben. Besondere Altbestands-/Übergangssituationen verlangen eine fallbezogene Prüfung. Weitere Quellen: [Art. 111](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-111), [Art. 10](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-10), [Art. 26](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-26), [Art. 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50), [Art. 53](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-53).

Der Katalog ist bewusst statisch/versioniert, keine automatische Rechtsänderungsüberwachung. Bei fachlichen Änderungen Katalogversion und Prüfdatum erhöhen, Quellen nachprüfen und Tests aktualisieren; bestehende Bestätigungen werden dadurch erneut prüfbedürftig.

## Integration, Speicherung und Sicherheit

- Neuer Arbeitsreiter innerhalb des vorhandenen Governance Labs, keine zusätzliche Freigabe. Die bestehenden Gruppen-, Projekt- und Werkzeugberechtigungen gelten; bei deaktiviertem Governance Lab erscheinen auch keine Legal-Einblendungen in anderen Labs.
- Landscape-Systeme, Bestände und Flüsse sowie Journey-Phasen zeigen den explizit zugeordneten Datenkontext und Direktlinks. Aus Nachbarschaft oder einer verknüpften Ressource wird keine Konformität vererbt. Bestehende grobe Regulatory-Labels sind lediglich Hinweise, keine Antworten oder Nachweise.
- Lebenszyklus und AI-Readiness/Rechte zeigen dieselben Fälle im Kontext; keine zweite Datenhaltung. Project-Lab-Momentaufnahmen und Zustandsvergleiche berücksichtigen Legal-Checks.
- Optionales `legal`-Array in Governance-Inhalten; ältere Arbeiten ohne dieses Feld bleiben gültig. Höchstens 80 Fälle je Arbeit, feste Frage-/Kontrollkataloge, begrenzte Texte, validierte Daten und vorhandene Stakeholder-/Regel-/Ressourcenreferenzen.
- POST/CSRF, optimistische Objektversionen und vorhandene Projektprüfungen bleiben bestehen. Neue Bestätigungen benötigen eine verfügbare Quelle. Entzogene/entfernte Quellen erzeugen keine neuen Nachweise; alte Verweise bleiben als erneut prüfbedürftige Dokumentation erhalten.
- Bestätigungen hängen an Katalogversion, Landscape, Datenbezug, Zweck, Kontextantworten, relevanten Ressourcen-/Systemangaben und optional verknüpfter Regel. PHP und JavaScript verwenden dieselbe kanonische UTF-16-Kontextsignatur zur Änderungserkennung. Diese ist kein kryptografisches Zertifikat und keine Zugriffsprüfung.
- Ein neues Bestätigungstoken bindet den bewussten Prüfschritt an den aktuell angezeigten Kontext. Der Server prüft die Signatur unabhängig; bei inzwischen geändertem Kontext Antwort 409. Gewöhnliches Speichern erneuert keine Bestätigung. Fehlende Signaturen importierter Nachweise werden nicht automatisch als aktuell anerkannt. Reine Kartenbewegungen lösen keine fachliche Wiederprüfung aus.
- Saubere, nicht fokussierte Governance-Arbeiten lesen die verknüpfte Landscape alle 30 Sekunden neu. Während eines ungespeicherten Entwurfs oder geöffneten Dialogs wird dieser nicht überschrieben. Speicherkonflikte bleiben ausdrücklich sichtbar.

## Validierung

`tests/governance-legal.mjs` und `tests/governance-legal.php` sind über die bestehende Governance-/Lab-Suite eingebunden. Geprüft werden insbesondere Rollen-/Anwendbarkeitslogik, bedingte und widersprüchliche Antworten, indirekte Rechte, DSA-Größen-Ausnahmen, AI-Zeitpunkte, Nachweisalter, Kontextänderungen, PHP/JS-Signaturparität mit Unicode, gefälschte/fehlende Signaturen, Quellzugriff, Projektisolation, Konflikte und Momentaufnahmen.

Browserprüfung mit ausschließlich synthetischen Daten: neuen Kundenbestands-Check anlegen; GDPR-Einordnung, Erfüllung und Abweichung mit Nachweis/Verantwortlichkeit/Termin speichern; DMA-Geschäftsnutzer, begründete DSA-Nichtanwendbarkeit und AI-Hochrisiko-Vorbereitung durchlaufen; Vorlage ohne Erfüllungsübernahme; Direktlinks aus Landscape und Journey; Ansichten bei 320, 390, 768 und 1440 px ohne horizontalen Seitenüberlauf. Keine Warnungen oder Fehler in der Browserkonsole.
